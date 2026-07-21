import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  liftStaticSveltePageHtml,
  liftStructuralSveltePageHtml,
  liftUiMarkup,
  stampClosedUiChrome,
  hasBooleanHiddenAttr,
  svelteKitMarkupAdapter,
  svelteKitPageFileToRouteId,
} from "@chrysalis/ingest";
import { verifyUiRouteMarkupParity } from "@chrysalis/verify";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/ui-markup-svelte");

describe("liftStaticSveltePageHtml", () => {
  test("lifts static markup and strips script/style", () => {
    const html = liftStaticSveltePageHtml(`<script>const x=1</script><main class="a">ok</main>`);
    expect(html).toBe('<main class="a">ok</main>');
  });

  test("returns null for dynamic blocks", () => {
    expect(liftStaticSveltePageHtml("<div>{name}</div>")).toBeNull();
  });
});

describe("stampClosedUiChrome (boolean hidden vs aria-hidden)", () => {
  test("hasBooleanHiddenAttr ignores aria-hidden", () => {
    expect(hasBooleanHiddenAttr('<div aria-hidden="true">')).toBe(false);
    expect(hasBooleanHiddenAttr('<div hidden aria-hidden="true">')).toBe(true);
    expect(hasBooleanHiddenAttr("<div hidden>")).toBe(true);
  });

  test("aria-hidden alone still gets boolean hidden (overlay paint)", () => {
    const stamped = stampClosedUiChrome(
      `<div class="modal-overlay" role="presentation" aria-hidden="true" tabindex="-1">body</div>`,
    );
    expect(hasBooleanHiddenAttr(stamped.slice(0, stamped.indexOf(">") + 1))).toBe(true);
    expect(stamped).toMatch(/\bhidden\b/);
    expect(stamped).toContain('aria-hidden="true"');
  });

  test("scrubs poisoned \\\\r text and class:directive (Wizards chrome)", async () => {
    const { scrubStructuralMarkupArtifacts } = await import("@chrysalis/ingest");
    const cleaned = scrubStructuralMarkupArtifacts(
      `<div class="module-wizard-menu">\\r\n    <button class:open\\r\n      title="Wizards">\\r\n      <span>Wizards</span>\\r\n    </button>\\r\n  </div>`,
    );
    expect(cleaned).not.toMatch(/\\r/);
    expect(cleaned).not.toMatch(/\bclass:open\b/);
    expect(cleaned).toContain("Wizards");
  });
});

describe("liftStructuralSveltePageHtml (D6367)", () => {
  test("static pages stay static mode", () => {
    const r = liftStructuralSveltePageHtml(`<main class="a">ok</main>`);
    expect(r?.liftMode).toBe("static");
    expect(r?.html).toBe('<main class="a">ok</main>');
    expect(r?.holes).toEqual([]);
  });

  test("interpolations become explicit holes", () => {
    const r = liftStructuralSveltePageHtml(`<div class="x">{name}</div>`);
    expect(r).not.toBeNull();
    expect(r?.liftMode).toBe("structural-shell");
    expect(r?.html).toContain('data-cwl-hole="legacy:markup-lift-svelte-interp"');
    expect(r?.holes.some((h) => h.reason === "legacy:markup-lift-svelte-interp")).toBe(true);
  });

  test("supported dynamics compile to runtime bindings in one-pass mode", () => {
    const r = liftStructuralSveltePageHtml(
      `<main>
  <h1>{title}</h1>
  {#if selected}<section>{selected.name}</section>{/if}
  {#each rows as row}<p>{row.name}</p>{/each}
</main>`,
      { applyShowcaseLoadBools: false, promoteRuntimeBindings: true },
    );
    expect(r?.html).toContain('data-cwl-bind="interp"');
    expect(r?.html).toContain('data-cwl-bind="if"');
    expect(r?.html).toContain('data-cwl-bind="each"');
    expect(r?.html).not.toContain("data-cwl-hole=");
    expect(r?.holes).toEqual([]);
  });

  test("modal shell components collapse without component holes (G9660)", () => {
    const r = liftStructuralSveltePageHtml(`<TipsModal><main class="app">body</main></TipsModal>`);
    expect(r?.html).toContain('data-cwl-modal-shell="TipsModal"');
    expect(r?.html).not.toContain('data-cwl-hole="legacy:markup-lift-svelte-component"');
    expect(r?.html).toContain('class="app"');
    expect(r?.holes.some((h) => h.detail === "TipsModal")).toBe(false);
  });

  test("WISP setup and base wizards compile to runtime shells", () => {
    for (const name of ["CBRSSetupWizard", "MonitoringSetupWizard", "BaseWizard"]) {
      const r = liftStructuralSveltePageHtml(`<${name} />`, {
        promoteRuntimeBindings: true,
      });
      expect(r?.html).toContain(`data-cwl-wizard-shell="${name}"`);
      expect(r?.html).not.toContain("data-cwl-hole=");
      expect(r?.holes).toEqual([]);
    }
  });

  test("template-literal interp does not leave $`} junk (customers fullName)", () => {
    const r = liftStructuralSveltePageHtml(
      `<h3>{customer.fullName || \`\${customer.firstName} \${customer.lastName}\`}</h3>`,
      { applyShowcaseLoadBools: false },
    );
    expect(r?.html ?? "").not.toMatch(/\$`\}/);
    expect(r?.html ?? "").not.toContain("$`}");
    expect(r?.html ?? "").toMatch(/data-cwl-hole="legacy:markup-lift-svelte-interp"|<h3>\s*<\/h3>|<h3>\s*<span/);
  });

  test("map and chart shells collapse without component holes (G9680)", () => {
    const map = liftStructuralSveltePageHtml(`<SharedMap />`);
    // SharedMap lifts to coverage-map iframe island (D6442), not an empty map shell.
    expect(map?.html).toMatch(/data-cwl-(?:map-shell|lifted-component)="SharedMap"/);
    expect(map?.html).not.toContain("legacy:markup-lift-svelte-component");
    const chart = liftStructuralSveltePageHtml(`<TR069RSSIChart />`);
    expect(chart?.html).toContain('data-cwl-chart-shell="TR069RSSIChart"');
  });

  test("nav and wizard shells collapse without component holes (G9710)", () => {
    const nav = liftStructuralSveltePageHtml(`<MainMenu />`);
    expect(nav?.html).toContain('data-cwl-nav-shell="MainMenu"');
    expect(nav?.html).not.toContain("legacy:markup-lift-svelte-component");
    const wizard = liftStructuralSveltePageHtml(`<DeploymentWizard />`);
    expect(wizard?.html).toContain('data-cwl-wizard-shell="DeploymentWizard"');
  });

  test("arrow-fn props do not leak true}/ /> tails (G9904)", () => {
    const r = liftStructuralSveltePageHtml(`<div>
      <ModuleWizardMenu
        wizards={getWizardsForPath('/modules/hardware')}
        on:select={() => showEPCWizard = true}
      />
</div>`);
    // Without componentSources, structural inline cannot read the .svelte file → component hole.
    expect(r?.html).toMatch(/ModuleWizardMenu/);
    expect(r?.html).toMatch(/data-cwl-hole(?:-detail)?="(?:legacy:markup-lift-svelte-component"|ModuleWizardMenu)/);
    expect(r?.html).not.toMatch(/true\}\s*\/>/);
    expect(r?.html).not.toContain("true}");
    expect(r?.html).not.toMatch(/\n\s*\/>/);
  });

  test("apostrophe in // comment does not break Pascal tag end (D6443 HardwareDeployment)", () => {
    const src = `<HardwareDeploymentModal
  show={show}
  on:view-inventory={(e) => {
    // Check if we're in embedded mode
    const x = 'ok';
    goto(\`/modules/inventory?siteId=\${tower.id}\`);
  }}
/>
<main class="after">x</main>`;
    const r = liftStructuralSveltePageHtml(src, {
      structuralInlineComponents: new Set(["HardwareDeploymentModal"]),
      componentSources: new Map([
        [
          "HardwareDeploymentModal",
          // inline via temporary — use empty structural fail path: without sources it shells/holes
          join(FIXTURE, "does-not-exist.svelte"),
        ],
      ]),
    });
    // Tag must be consumed (not left raw) even when inline file missing → component hole or empty
    expect(r?.html ?? "").not.toMatch(/<HardwareDeploymentModal\b/);
    expect(r?.html ?? "").toContain('class="after"');
  });

  test("widget shells collapse without component holes (G9730)", () => {
    const w = liftStructuralSveltePageHtml(`<DeviceList />`);
    expect(w?.html).toContain('data-cwl-widget-shell="DeviceList"');
    expect(w?.html).not.toContain("legacy:markup-lift-svelte-component");
  });

  test("unknown components become hole wrappers", () => {
    const r = liftStructuralSveltePageHtml(`<WidgetPanel><main class="app">body</main></WidgetPanel>`);
    expect(r?.html).toContain('data-cwl-hole="legacy:markup-lift-svelte-component"');
    expect(r?.html).toContain('class="app"');
  });

  test("layout passthrough unwraps TenantGuard without a hole (G9490)", () => {
    const r = liftStructuralSveltePageHtml(`<TenantGuard><main class="app">body</main></TenantGuard>`);
    expect(r?.html).toContain('class="app"');
    expect(r?.html).toContain("body");
    expect(r?.html).not.toContain("TenantGuard");
    expect(r?.holes.some((h) => h.detail === "TenantGuard")).toBe(false);
  });

  test("nested if/each do not emit fake /if interp holes (G9500)", () => {
    const r = liftStructuralSveltePageHtml(
      `{#if outer}<div>{#if inner}<span>x</span>{/if}</div>{/if}<main>ok</main>`,
      { applyShowcaseLoadBools: false },
    );
    expect(r?.html).not.toContain('data-cwl-hole-detail="/if"');
    expect(r?.html).not.toContain('data-cwl-hole-detail="/each"');
    expect(r?.holes.every((h) => h.detail !== "/if" && h.detail !== "/each")).toBe(true);
  });

  test("showcase loadBools settle loading/error ifs (G9500)", () => {
    const r = liftStructuralSveltePageHtml(
      `{#if isLoading}<div class="spin">wait</div>{/if}{#if error}<p>err</p>{/if}<main class="ok">done</main>`,
      { applyShowcaseLoadBools: true },
    );
    expect(r?.html).toContain('class="ok"');
    expect(r?.html).not.toContain("wait");
    expect(r?.html).not.toContain(">err<");
    expect(r?.holes.some((h) => h.detail === "isLoading")).toBe(false);
    expect(r?.holes.some((h) => h.detail === "error")).toBe(false);
  });

  test("showcase settle wins over script let loading = true (sites table)", () => {
    const r = liftStructuralSveltePageHtml(
      `<script>let loading = true;</script>
{#if loading}
  <div class="loading-state"><p>Loading sites...</p></div>
{:else if filteredSites.length === 0}
  <div class="empty-state"><p>No sites found</p></div>
{:else}
  <div class="sites-table-container"><table class="sites-table"><tbody></tbody></table></div>
{/if}`,
      { applyShowcaseLoadBools: true },
    );
    expect(r?.html).toContain("sites-table");
    expect(r?.html).not.toContain("Loading sites...");
  });

  test("empty length===0 keeps table else; !isLoading compound keeps inventory (hardware)", () => {
    const r = liftStructuralSveltePageHtml(
      `<script>
  let isLoading = true;
  let activeHardwareTab = 'all';
</script>
{#if isLoading}
  <div class="loading-state"><p>Loading hardware...</p></div>
{:else}
  <p class="idle">ready</p>
{/if}
{#if !isLoading && (activeHardwareTab === 'inventory' || activeHardwareTab === 'all')}
  {#if items.length === 0 && activeHardwareTab === 'inventory'}
    <div class="empty-state"><p>No inventory</p></div>
  {:else}
    <table class="hardware-table"><tbody></tbody></table>
  {/if}
{/if}
{#if activeHardwareTab === 'epc'}
  <div class="epc-only">epc</div>
{:else}
  <div class="all-tab">all</div>
{/if}`,
      { applyShowcaseLoadBools: true },
    );
    expect(r?.html).toContain("hardware-table");
    expect(r?.html).toContain("all-tab");
    // Off-tab panels stay in DOM (hidden bind) so data-cwl-set can reveal them.
    expect(r?.html).toContain("epc-only");
    expect(r?.html).toMatch(/epc-only[\s\S]*?hidden|hidden[\s\S]*?epc-only/);
    expect(r?.html).toMatch(/loading-state[^>]*\bhidden\b/);
  });

  test("loading else-if chain keeps first idle tab not only final else (voice)", () => {
    const r = liftStructuralSveltePageHtml(
      `<script>
  let loading = true;
  let activeTab = 'overview';
</script>
{#if loading}
  <div class="loading-state">wait</div>
{:else if activeTab === 'overview' && schema}
  <div class="overview-panel"><div class="table-wrap"><table><tbody></tbody></table></div></div>
{:else if activeTab === 'accounts'}
  <div class="accounts-panel">accounts</div>
{:else if activeTab === 'locations'}
  <div class="locations-panel">locations</div>
{/if}`,
      { applyShowcaseLoadBools: true },
    );
    expect(r?.html).toContain("overview-panel");
    // Sibling tab panels stay stamped closed for client tab toggles.
    expect(r?.html).toContain("locations-panel");
    expect(r?.html).toMatch(/locations-panel[\s\S]*?hidden|hidden[\s\S]*?locations-panel/);
    expect(r?.html).not.toContain(">wait<");
  });

  test("string-array each expands filter options from script truth", () => {
    const r = liftStructuralSveltePageHtml(
      `<script>const statuses = ['open', 'assigned', 'completed'];</script>
<select>
  <option value="">All</option>
  {#each statuses as status}
    <option value={status}>{status}</option>
  {/each}
</select>`,
      { applyShowcaseLoadBools: true },
    );
    expect(r?.html).toContain('value="open"');
    expect(r?.html).toContain(">completed<");
    expect(r?.html).not.toContain("data-cwl-hole");
  });

  test("arr.length and scalar-ternary interps settle from script truth", () => {
    const r = liftStructuralSveltePageHtml(
      `<script>
  const steps = [{ id: 'a' }, { id: 'b' }];
  let activeTab = 'all';
</script>
<p class="count">{steps.length}</p>
<p class="tab">{activeTab === 'all' ? 'Everything' : 'Some'}</p>`,
      { applyShowcaseLoadBools: true },
    );
    expect(r?.html).toContain(">2<");
    expect(r?.html).toContain("Everything");
  });

  test("optional presence and *Message stamp closed (deploy banners)", () => {
    const r = liftStructuralSveltePageHtml(
      `{#if mapState?.activePlan}<div class="plan-banner">plan</div>{/if}
{#if deploymentMessage}<div class="toast">msg</div>{/if}
{#if plan.description}<p class="desc">d</p>{/if}
<main class="ok">done</main>`,
      { applyShowcaseLoadBools: true },
    );
    expect(r?.html).toContain('class="ok"');
    expect(r?.html).toMatch(/plan-banner[^>]*\bhidden\b|hidden[\s\S]*plan-banner/);
    expect(r?.html).toMatch(/toast[^>]*\bhidden\b|hidden[\s\S]*toast/);
    expect(r?.holes.some((h) => h.detail === "deploymentMessage")).toBe(false);
  });

  test("if blocks keep true-branch shell with hole", () => {
    const r = liftStructuralSveltePageHtml(
      `{#if customFlag}<div class="spin">wait</div>{/if}<main class="ok">done</main>`,
      { applyShowcaseLoadBools: false },
    );
    expect(r?.html).toContain("spin");
    expect(r?.html).toContain('data-cwl-hole="legacy:markup-lift-svelte-if"');
  });

  test("UI toggle overlays stamp hidden instead of deleting (D6442)", () => {
    const r = liftStructuralSveltePageHtml(
      `{#if showFilters && !isDeployMode}<div class="modal-overlay" onclick={() => showFilters = false}><div class="filters-modal">filters</div></div>{/if}<main class="ok">done</main>`,
      { applyShowcaseLoadBools: false },
    );
    expect(r?.html).toContain("filters-modal");
    expect(r?.html).toMatch(/modal-overlay[^>]*\bhidden\b/);
    expect(r?.html).not.toContain('data-cwl-hole-detail="showFilters');
  });

  test("structural-inline FilterPanel lifts filter-panel class (D6442)", () => {
    const dir = mkdtempSync(join(tmpdir(), "chrysalis-filter-"));
    try {
      writeFileSync(
        join(dir, "FilterPanel.svelte"),
        `<div class="filter-panel"><label class="filter-checkbox">Towers</label></div>`,
        "utf8",
      );
      const sources = new Map([["FilterPanel", join(dir, "FilterPanel.svelte")]]);
      const r = liftStructuralSveltePageHtml(`<main><FilterPanel /></main>`, {
        applyShowcaseLoadBools: false,
        componentSources: sources,
      });
      expect(r?.html).toContain("filter-panel");
      expect(r?.html).toContain('data-cwl-lifted-component="FilterPanel"');
      expect(r?.html).not.toContain('data-cwl-nav-shell="FilterPanel"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("does not inject hole markers into class attributes", () => {
    const r = liftStructuralSveltePageHtml(`<div class="card {active}">Hi {name}</div>`);
    expect(r?.html).toMatch(/class="card"/);
    expect(r?.html).not.toMatch(/class="[^"]*data-cwl-hole/);
    expect(r?.classNames).toEqual(["card"]);
    expect(r?.html).toContain('data-cwl-hole="legacy:markup-lift-svelte-interp"');
  });

  test("scrubs nested-quote class expressions without corrupting attributes", () => {
    const r = liftStructuralSveltePageHtml(
      `<div class="sync-message {msg.includes('Error') ? 'error' : 'success'}">{msg}</div>`,
    );
    expect(r?.html).toMatch(/class="sync-message"/);
    expect(r?.classNames).toEqual(["sync-message"]);
    expect(r?.html).not.toMatch(/class="[^"]*</);
  });

  test("holes store interpolations and drops empty href attrs", () => {
    const r = liftStructuralSveltePageHtml(
      `<a class="card" href={item.href}><strong>{$tenant.name}</strong></a>`,
    );
    expect(r?.html).toContain('data-cwl-hole="legacy:markup-lift-svelte-interp"');
    expect(r?.html).toContain('data-cwl-hole-detail="$tenant.name"');
    expect(r?.html).not.toMatch(/\bhref\s*=/);
    expect(r?.html).not.toMatch(/<strong>\{\$/);
  });
});

describe("liftUiMarkup (sveltekit fixture)", () => {
  const result = liftUiMarkup({ buildRoot: FIXTURE, adapter: svelteKitMarkupAdapter });

  test("lifts per-route html bundles", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.framework).toBe("sveltekit");
    expect(result.bundles.map((b) => b.routeId).sort()).toEqual(["/login", "/portal/login"]);
    // /dashboard is dynamic — skipped in static mode
    expect(result.routesSkipped).toBeGreaterThanOrEqual(1);
  });

  test("preserves per-route structural isolation", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const login = result.bundles.find((b) => b.routeId === "/login");
    const portal = result.bundles.find((b) => b.routeId === "/portal/login");
    expect(login?.html).toContain("Sign in");
    expect(login?.html).not.toContain("portal-shell");
    expect(portal?.html).toContain("Portal Sign in");
    expect(portal?.html).toContain("portal-shell");
  });

  test("passes markup parity verification", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parity = verifyUiRouteMarkupParity(result.map, result.bundles);
    expect(parity.ok).toBe(true);
  });

  test("maps page files to route ids", () => {
    expect(
      svelteKitPageFileToRouteId(
        resolve(FIXTURE, "src/routes"),
        resolve(FIXTURE, "src/routes/portal/login/+page.svelte"),
      ),
    ).toBe("/portal/login");
  });
});

describe("rewriteSvelteEventAttributes", () => {
  test("converts nested goto template literals to data-cwl-nav without residue", async () => {
    const { rewriteSvelteEventAttributes, liftStructuralSveltePageHtml } = await import(
      "@chrysalis/ingest"
    );
    const raw = `<button class="btn-icon" on:click={() => goto(\`/modules/inventory/\${item._id}\`)} title="View">👁</button>`;
    const rewritten = rewriteSvelteEventAttributes(raw);
    expect(rewritten).toContain('data-cwl-nav="/modules/inventory/{item._id}"');
    expect(rewritten).not.toContain("on:click");
    expect(rewritten).not.toContain("goto(");
    expect(rewritten).toContain('title="View"');

    const lifted = liftStructuralSveltePageHtml(
      `<script>let items=[];</script>{#each items as item (item._id)}<button on:click={() => goto(\`/modules/inventory/\${item._id}\`)} title="View">👁</button>{/each}`,
      { promoteRuntimeBindings: true, applyShowcaseLoadBools: true },
    );
    expect(lifted?.html ?? "").not.toMatch(/goto\(/);
    expect(lifted?.html ?? "").toMatch(/data-cwl-nav=|data-cwl-each-tpl=/);
  });

  test("ignores event plumbing and preserves the meaningful handler", async () => {
    const { rewriteSvelteEventAttributes } = await import("@chrysalis/ingest");
    const submit = rewriteSvelteEventAttributes(
      `<form onsubmit={(e) => { e.preventDefault(); handleTicketCreated(e); }}>`,
    );
    expect(submit).toContain('data-cwl-on-submit="action:handleTicketCreated"');
    expect(submit).not.toContain('data-cwl-action="preventDefault"');

    const propagationOnly = rewriteSvelteEventAttributes(
      `<div onclick={(e) => e.stopPropagation()}>content</div>`,
    );
    expect(propagationOnly).not.toContain("data-cwl-action");
    expect(propagationOnly).not.toContain("onclick");

    const delayedSet = rewriteSvelteEventAttributes(
      `<button onblur={() => setTimeout(() => (open = false), 150)}>Close</button>`,
    );
    expect(delayedSet).toContain('data-cwl-on-blur="toggle:open:false"');
    expect(delayedSet).not.toContain('data-cwl-action="setTimeout"');

    const direct = rewriteSvelteEventAttributes(
      `<button onclick={loadAllRemoteAgents}>Refresh</button>`,
    );
    expect(direct).toContain('data-cwl-action="loadAllRemoteAgents"');

    const accessible = rewriteSvelteEventAttributes(
      `<button on:click={selectItem} on:keydown={handleKeydown}>Select</button>`,
    );
    expect(accessible).toContain('data-cwl-action="selectItem"');
    expect(accessible).toContain('data-cwl-on-keydown="action:handleKeydown"');
    expect(accessible.match(/\sdata-cwl-action="/g)).toHaveLength(1);
  });

  test("converts conditional handlers and removes competing legacy wiring", async () => {
    const { rewriteSvelteEventAttributes } = await import("@chrysalis/ingest");
    const camera = rewriteSvelteEventAttributes(
      `<button on:click={usingCamera ? stopCamera : startCamera}>Camera</button>`,
    );
    expect(camera).toContain('data-cwl-action="startCamera"');
    expect(camera).toContain('data-cwl-action-true="stopCamera"');
    expect(camera).toContain('data-cwl-action-state="usingCamera:false"');
    expect(camera).toContain('aria-label="Start Camera"');
    expect(camera).not.toContain("on:click");

    const back = rewriteSvelteEventAttributes(
      `<button data-action="back" data-cwl-set="href:/dashboard" on:click={() => goto('/dashboard')}>Back</button>`,
    );
    expect(back).toContain('data-cwl-nav="/dashboard"');
    expect(back).not.toContain("data-action=");
    expect(back).not.toContain("data-cwl-set=");
  });

  test("preserves supported dynamic attributes as CWL bindings", async () => {
    const { rewriteSvelteDynamicAttributes } = await import("@chrysalis/ingest");
    const rewritten = rewriteSvelteDynamicAttributes(
      `<button title={usingCamera ? 'Stop Camera' : 'Start Camera'} aria-label={label} disabled={loading}>Camera</button>`,
    );
    expect(rewritten).toContain(
      "data-cwl-attr-title=\"usingCamera ? 'Stop Camera' : 'Start Camera'\"",
    );
    expect(rewritten).toContain('data-cwl-attr-aria-label="label"');
    expect(rewritten).toContain('data-cwl-attr-disabled="loading"');
    expect(rewritten).not.toContain("title={");
  });
});

describe("liftUiMarkup structural-shell mode", () => {
  test("lifts dynamic pages that static mode skips", () => {
    const staticResult = liftUiMarkup({ buildRoot: FIXTURE, adapter: svelteKitMarkupAdapter, mode: "static" });
    expect(staticResult.ok).toBe(true);
    if (!staticResult.ok) return;

    const shellResult = liftUiMarkup({
      buildRoot: FIXTURE,
      adapter: svelteKitMarkupAdapter,
      mode: "structural-shell",
    });
    expect(shellResult.ok).toBe(true);
    if (!shellResult.ok) return;
    expect(shellResult.bundles.length).toBeGreaterThan(staticResult.bundles.length);
    expect(shellResult.routesSkipped).toBe(0);
    const dash = shellResult.bundles.find((b) => b.routeId === "/dashboard");
    expect(dash?.liftMode).toBe("structural-shell");
    expect(dash?.html).toContain("dashboard-shell");
  });
});

describe("slot fold + isOpen gate alias (full-lift residuals)", () => {
  test("BaseWizard folds slot bodies inside self-gated shell", () => {
    const tmp = join(tmpdir(), `cwl-slot-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    writeFileSync(
      join(tmp, "BaseWizard.svelte"),
      `<script>export let show = false;</script>
{#if show}
  <div class="wizard-overlay"><div class="wizard-content"><slot name="content" /></div><div class="wizard-footer"><slot name="footer" /></div></div>
{/if}`,
    );
    const sources = new Map([["BaseWizard", join(tmp, "BaseWizard.svelte")]]);
    const r = liftStructuralSveltePageHtml(
      `<BaseWizard show={showDeploymentWizard}>
  <div slot="content"><p class="step-body">Welcome</p></div>
  <div slot="footer"><button type="button">Next</button></div>
</BaseWizard>`,
      {
        componentSources: sources,
        structuralInlineComponents: new Set(["BaseWizard"]),
        loadBools: { showDeploymentWizard: false },
      },
    );
    expect(r?.html).toContain('data-cwl-shell-key="showDeploymentWizard"');
    expect(r?.html).toContain("Welcome");
    expect(r?.html).toContain(">Next<");
    expect(r?.html).not.toMatch(/\sslot="content"/);
  });

  test("SiteEditor isOpen aliases parent showSiteEditor shell key", () => {
    const tmp = join(tmpdir(), `cwl-isopen-${Date.now()}`);
    mkdirSync(tmp, { recursive: true });
    writeFileSync(
      join(tmp, "SiteEditor.svelte"),
      `<script>export let isOpen = false;</script>
{#if isOpen}
  <div class="modal-overlay"><div class="modal-content">Site editor</div></div>
{/if}`,
    );
    const sources = new Map([["SiteEditor", join(tmp, "SiteEditor.svelte")]]);
    const r = liftStructuralSveltePageHtml(`<SiteEditor isOpen={showSiteEditor} />`, {
      componentSources: sources,
      structuralInlineComponents: new Set(["SiteEditor"]),
      loadBools: { showSiteEditor: false },
    });
    expect(r?.html).toContain('data-cwl-shell-key="showSiteEditor"');
    expect(r?.html).not.toContain('data-cwl-shell-key="isOpen"');
    expect(r?.html).toContain("Site editor");
  });
});
