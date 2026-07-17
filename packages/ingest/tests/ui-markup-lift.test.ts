import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import {
  liftStaticSveltePageHtml,
  liftStructuralSveltePageHtml,
  liftUiMarkup,
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

  test("modal shell components collapse without component holes (G9660)", () => {
    const r = liftStructuralSveltePageHtml(`<TipsModal><main class="app">body</main></TipsModal>`);
    expect(r?.html).toContain('data-cwl-modal-shell="TipsModal"');
    expect(r?.html).not.toContain('data-cwl-hole="legacy:markup-lift-svelte-component"');
    expect(r?.html).toContain('class="app"');
    expect(r?.holes.some((h) => h.detail === "TipsModal")).toBe(false);
  });

  test("map and chart shells collapse without component holes (G9680)", () => {
    const map = liftStructuralSveltePageHtml(`<SharedMap />`);
    expect(map?.html).toContain('data-cwl-map-shell="SharedMap"');
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
    expect(r?.html).toContain('data-cwl-nav-shell="ModuleWizardMenu"');
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
