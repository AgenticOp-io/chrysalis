#!/usr/bin/env node
/**
 * Honest surface census for the converted WISP CWL site.
 *
 * Unlike the cosmetic "wired control" audit, this measures whether each
 * emitted data-cwl-action will actually be handled by routeCwlAction in
 * wisp-cwl-client.js, and whether origin Svelte handlers were silently
 * dropped during conversion.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWispModuleRoot } from "./wisp-origin-paths.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// Mirror of the semantic families routeCwlAction() matches. An action whose
// lowercase "name args" string matches none of these falls through to the
// "not wired" toast.
export const CLIENT_SEMANTIC_FAMILIES = [
  // Origin handler-name families (normalized from camelCase in routeCwlAction)
  /backdrop|overlay click|overlay keydown/,
  /google sign|sign in\b|\blogin\b|log in|signup|sign up|demo visitor/,
  /password reset|reset password/,
  /go to step|goto step/,
  /module click/,
  /\bsort\b/,
  /(role|group|category|technology|site|status|permission type|location type) change/,
  /^load\b|\bload (customers|sites|report|status)\b/,
  /basemap|map type/,
  /generate (ki|opc|o pc|random password)/,
  /test connection/,
  /lookup item|location lookup/,
  /analysis|analyze|optimization|purchase order/,
  /upgrade/,
  /pfx upload|\bimport\b|upload/,
  /device click/,
  /\binventory\b/,
  /record payment/,
  /feature click|button click/,
  /use bundle/,
  /\bdeploy\b|deployment/,
  /finalize|push active plan/,
  /blur|keypress|key press|keydown|key down|mouse|focus/,
  /^(networks|towers|conflicts|recommendations|optimize)\b/,
  /generate subdomain/,
  /manage users/,
  /^clear\b|\bclear (customer|selection|all)\b|reset all|\breset\b/,
  /verification code|send code/,
  /alert click/,
  /^change\b/,
  /^click$/,
  // Generic semantic families
  /close|cancel|dismiss/,
  /goback|backtodashboard|navigateback|go back|back to dashboard/,
  /logout|signout|log out|sign out/,
  /refresh|reload|loadall|loadremote|loadstatus/,
  /filter|search/,
  /page|pagination|next|prev/,
  /select|choose|switchtab|navigatetotab|switch tab/,
  /switchmode|switch mode/,
  /edit|update/,
  /delete|remove/,
  /view|detail/,
  /assign|start|complete|close|resolve|acknowledge|approve|reject|suspend|activate|pause|finish|authorize/,
  /open|show|toggle/,
  /scan|barcode|qr/,
  /transfer/,
  /add|create|new/,
  /save|submit|apply|link|register|grant|relinquish/,
  /export|download/,
  /print/,
  // Deep-lift families (RemoteEPCs, ScanModal, CellEditor, NotificationCenter…)
  /browser notifications?/,
  /^check (in|out)$/,
  /^monitor( (all|epc))?$/,
  /uninstall component/,
  /configure device/,
  /generate report/,
  /primary channel/,
  /smart input|earfcn change|center freq change/,
  /^archive$/,
  // Wizard dispatch types + panel/tab deep-lift handlers (client branches exist)
  /^add tower$/,
  /^setup (cbrs|acs|monitoring|admin)$/,
  /skip to dashboard|skip payment/,
  /^back to list$/,
  /install component/,
  /take over plan/,
  /pair device/,
  /reboot/,
  /discover/,
  /^test\b|test .*connection/,
  /generate ((random |wireless |acs )?(key|keys|password|value)\b|configuration script)/,
  /^remove row$/,
  /file change/,
  /verify resolution/,
  /email verification/,
  /copy to clipboard|^copy\b/,
];

/** Mirror of routeCwlAction's camelCase → words normalization. */
export function normalizeActionName(action) {
  return String(action || "")
    .replace(/^(?:handle|on)(?=[A-Z])/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .toLowerCase();
}

// Actions that are DOM plumbing noise; they should never be emitted as
// data-cwl-action by the compiler.
export const NOISE_ACTIONS = new Set([
  "preventdefault",
  "stoppropagation",
  "settimeout",
  "setinterval",
  "if",
  "for",
  "while",
  "switch",
  "dispatch",
  "goto",
  "console",
  "log",
]);

// Buttons that have no click handler in the origin Svelte source — the
// converted export keeps them inert on purpose (true rendering of origin).
const ORIGIN_DEAD_LABELS = new Set(["Search Customer"]);

/** Remove each region opened by a tag matching `openRe` through its balanced </div>. */
export function stripBalancedDivs(html, openRe) {
  let out = "";
  let last = 0;
  for (const m of html.matchAll(openRe)) {
    if (m.index < last) continue;
    let i = m.index + m[0].length;
    let depth = 1;
    const tagRe = /<div\b|<\/div>/g;
    tagRe.lastIndex = i;
    let t;
    while (depth > 0 && (t = tagRe.exec(html))) {
      depth += t[0] === "</div>" ? -1 : 1;
      i = tagRe.lastIndex;
    }
    out += html.slice(last, m.index);
    last = i;
  }
  return out + html.slice(last);
}

function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(p, out);
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function walkSvelte(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (/node_modules|\.svelte-kit|dist|build/.test(entry.name)) continue;
      walkSvelte(p, out);
    } else if (entry.name.endsWith(".svelte")) out.push(p);
  }
  return out;
}

export function actionIsClientHandled(name, args = "") {
  const norm = normalizeActionName(name);
  const semantic = `${String(name).toLowerCase()} ${norm} ${String(args).toLowerCase()}`;
  return CLIENT_SEMANTIC_FAMILIES.some((re) => re.test(norm) || re.test(semantic));
}

// Text/title families the client's inferred-button fallback handles when a
// button carries no data-cwl-* wiring at all.
const INFERRED_TEXT_FAMILY =
  /view|detail|👁|edit|settings|✏|deploy|🚀|add|create|new|➕|approved|filter|camera|scan|qr|📷|voice|sip|toggle|layer|advanced|statistics|map type|device management|close|cancel|previous|next|×|✕|←|→|topographic|satellite|street|hybrid|fit to screen/i;

export function censusStaticExport(exportDir) {
  const files = walkHtml(exportDir);
  const actions = new Map(); // name -> { count, pages:Set, args:Set }
  let emptyFormShells = 0;
  let emptyOverlayShells = 0;
  let deadButtons = 0;
  const deadButtonSamples = [];
  const emptyShellSamples = [];

  for (const file of files) {
    const html = readFileSync(file, "utf8");
    const page = "/" + relative(exportDir, file).replace(/\\/g, "/").replace(/\/?index\.html$/, "");

    for (const m of html.matchAll(
      /<[^>]*data-cwl-action="([^"]*)"(?:[^>]*data-cwl-action-args="([^"]*)")?[^>]*>/g,
    )) {
      const name = m[1];
      const rec = actions.get(name) || { count: 0, pages: new Set(), args: new Set() };
      rec.count += 1;
      rec.pages.add(page);
      if (m[2]) rec.args.add(m[2]);
      actions.set(name, rec);
    }
    for (const m of html.matchAll(
      /\bdata-cwl-on-[a-z]+="action:([^"]+)"(?:[^>]*\bdata-cwl-on-[a-z]+-args="([^"]*)")?/g,
    )) {
      const name = m[1];
      const rec = actions.get(name) || { count: 0, pages: new Set(), args: new Set() };
      rec.count += 1;
      rec.pages.add(page);
      if (m[2]) rec.args.add(m[2]);
      actions.set(name, rec);
    }

    for (const m of html.matchAll(/<[^>]*data-cwl-form-shell-empty[^>]*>/g)) {
      emptyFormShells += 1;
      if (emptyShellSamples.length < 20) emptyShellSamples.push({ page, tag: "form-shell", snippet: m[0].slice(0, 160) });
    }

    for (const m of html.matchAll(
      /<div[^>]*data-cwl-(modal|wizard|nav)-shell[^>]*>\s*<\/div>/g,
    )) {
      emptyOverlayShells += 1;
      if (emptyShellSamples.length < 20) emptyShellSamples.push({ page, tag: `${m[1]}-shell`, snippet: m[0].slice(0, 160) });
    }

    // Each-placeholder rows are inert by design — hydration re-renders them
    // from the wired row template, so their buttons are not dead surface.
    const scanHtml = stripBalancedDivs(html, /<div[^>]*data-cwl-bind="each"[^>]*>/g);
    for (const m of scanHtml.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) {
      const tag = m[0].slice(0, m[0].indexOf(">") + 1);
      if (
        /data-cwl-nav=|data-cwl-action=|data-cwl-set=|data-cwl-toggle=|data-cwl-on-[a-z]+=|data-cwl-shell-open=|data-action=|type="submit"/.test(
          tag,
        )
      )
        continue;
      // Delegated classes the client handles without explicit data attrs.
      if (
        /class="[^"]*\b(tab-btn|wizard-step|module-back-btn|wisp-back-btn|back-button|btn-back|close-btn|close-button|modal-close)\b/.test(
          tag,
        )
      )
        continue;
      const label = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
      const titleMatch = /title="([^"]*)"/.exec(tag);
      const ariaMatch = /aria-label="([^"]*)"/.exec(tag);
      const inferable = `${label} ${titleMatch ? titleMatch[1] : ""} ${ariaMatch ? ariaMatch[1] : ""}`;
      if (INFERRED_TEXT_FAMILY.test(inferable) || label === "+") continue;
      // Buttons with no handler in the origin Svelte are faithfully inert.
      if (ORIGIN_DEAD_LABELS.has(label)) continue;
      // Runtime-labeled buttons (Svelte interp label) are wired by the
      // client's btn-primary submit fallback.
      if (!label && /data-cwl-bind/.test(m[1])) continue;
      deadButtons += 1;
      if (deadButtonSamples.length < 40) deadButtonSamples.push({ page, label, tag: tag.slice(0, 160) });
    }
  }

  const unbound = [];
  const noise = [];
  for (const [name, rec] of actions) {
    const lower = name.toLowerCase();
    if (NOISE_ACTIONS.has(lower)) {
      noise.push({ name, count: rec.count, pages: [...rec.pages].slice(0, 5) });
      continue;
    }
    const argSample = [...rec.args][0] || "";
    if (!actionIsClientHandled(name, argSample)) {
      unbound.push({ name, count: rec.count, pages: [...rec.pages].slice(0, 5) });
    }
  }
  unbound.sort((a, b) => b.count - a.count);
  noise.sort((a, b) => b.count - a.count);

  return {
    pages: files.length,
    distinctActions: actions.size,
    actionNames: [...actions.keys()].sort(),
    unboundActions: unbound,
    noiseActions: noise,
    emptyFormShells,
    emptyOverlayShells,
    emptyShellSamples,
    deadButtons,
    deadButtonSamples,
  };
}

export function censusOriginHandlers(wispRoot) {
  const srcDir = join(wispRoot, "src");
  const files = walkSvelte(srcDir);
  const handlers = new Map(); // functionName -> { count, files:Set }
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const rel = relative(wispRoot, file).replace(/\\/g, "/");
    // on:click={handler} | on:click={() => handler(...)} | onclick={...}
    for (const m of text.matchAll(
      /\bon(?::|)(?:click|submit|change|input|keydown|keyup)\s*(?:\|[a-z]+)*=\s*\{([\s\S]*?)\}(?=[\s>/])/g,
    )) {
      const body = m[1];
      const calls = [...body.matchAll(/(^|[^\w$.])([a-zA-Z_$][\w$]*)\s*\(/g)]
        .map((c) => c[2])
        .filter(
          (n) =>
            !NOISE_ACTIONS.has(n.toLowerCase()) &&
            !["function", "return", "await", "new"].includes(n),
        );
      const direct = /^\s*([a-zA-Z_$][\w$]*)\s*$/.exec(body);
      const names = calls.length ? calls : direct ? [direct[1]] : [];
      for (const name of names) {
        const rec = handlers.get(name) || { count: 0, files: new Set() };
        rec.count += 1;
        rec.files.add(rel);
        handlers.set(name, rec);
      }
    }
  }
  return handlers;
}

export function runWispSurfaceCensus(opts = {}) {
  const exportDir =
    opts.exportDir || join(REPO, "fixtures", "hub-wisp-management", "cwl-static-export");
  const wispRootCandidates = [
    opts.wispRoot,
    process.env.CHRYSALIS_WISP_ROOT,
    process.env.WISP_MODULE_DIR,
    // Current AgenticOps layout (products/), then legacy clients/ path.
    join(REPO, "..", "..", "products", "wisptools", "Module_Manager"),
    join(REPO, "..", "..", "clients", "wisptools", "Module_Manager"),
  ].filter(Boolean);
  const wispRoot =
    wispRootCandidates.find((p) => existsSync(join(String(p), "src", "routes"))) ||
    wispRootCandidates[0];

  const exportCensus = censusStaticExport(exportDir);

  let origin = null;
  try {
    const handlers = censusOriginHandlers(wispRoot);
    const emitted = new Set(exportCensus.actionNames.map((n) => n.toLowerCase()));
    const dropped = [];
    for (const [name, rec] of handlers) {
      if (!emitted.has(name.toLowerCase())) {
        dropped.push({ name, count: rec.count, files: [...rec.files].slice(0, 3) });
      }
    }
    dropped.sort((a, b) => b.count - a.count);
    origin = {
      distinctHandlers: handlers.size,
      droppedHandlers: dropped,
    };
  } catch (err) {
    origin = { error: String(err && err.message) };
  }

  const report = {
    kind: "chrysalis.wisp.surface-census",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    exportDir,
    wispRoot,
    export: exportCensus,
    origin,
    gates: {
      unboundActions: exportCensus.unboundActions.length,
      noiseActions: exportCensus.noiseActions.length,
      emptyFormShells: exportCensus.emptyFormShells,
      emptyOverlayShells: exportCensus.emptyOverlayShells,
      deadButtons: exportCensus.deadButtons,
    },
    ok:
      exportCensus.unboundActions.length === 0 &&
      exportCensus.noiseActions.length === 0 &&
      exportCensus.deadButtons === 0,
  };

  const outPath = opts.outPath || join(REPO, "reports", "wisp", "wisp-surface-census.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  return report;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\\/g, "/").replace(/\//g, "\\") ? true : process.argv[1] && process.argv[1].endsWith("cwl-surface-census.mjs");
if (isMain) {
  const report = runWispSurfaceCensus();
  const g = report.gates;
  console.log(JSON.stringify({ ok: report.ok, ...g }, null, 2));
  console.log("\n== Unbound actions (client will toast 'not wired') ==");
  for (const a of report.export.unboundActions.slice(0, 60)) {
    console.log(`  ${String(a.count).padStart(4)}  ${a.name}  [${a.pages.join(", ")}]`);
  }
  console.log("\n== Noise actions (compiler bug) ==");
  for (const a of report.export.noiseActions) {
    console.log(`  ${String(a.count).padStart(4)}  ${a.name}  [${a.pages.join(", ")}]`);
  }
  console.log("\n== Dead buttons (no wiring at all) ==");
  for (const b of report.export.deadButtonSamples.slice(0, 30)) {
    console.log(`  ${b.page}  "${b.label}"`);
  }
  if (report.origin && report.origin.droppedHandlers) {
    console.log(`\n== Origin handlers never emitted as actions: ${report.origin.droppedHandlers.length} ==`);
    for (const d of report.origin.droppedHandlers.slice(0, 40)) {
      console.log(`  ${String(d.count).padStart(4)}  ${d.name}  [${d.files.join(", ")}]`);
    }
  }
  console.log(`\nFull report: ${join(REPO, "reports", "wisp", "wisp-surface-census.json")}`);
}
