#!/usr/bin/env node
/**
 * G9909 — convert ALL shell kinds at once (modal/map/chart/wizard/nav/widget).
 *
 * Run: pnpm run hub:wisp-cwl-all-shells-smoke
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_ALL_SHELLS_SMOKE_KIND = "chrysalis.wisp.cwl-all-shells-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CLIENT = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-client.js");
const CSS = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-app.css");
const EXPORT = join(ROOT, "fixtures/hub-wisp-management/cwl-static-export");

function walkHtml(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

export function runWispCwlAllShellsSmoke() {
  const client = existsSync(CLIENT) ? readFileSync(CLIENT, "utf8") : "";
  const css = existsSync(CSS) ? readFileSync(CSS, "utf8") : "";

  const clientChecks = {
    convertsModal: client.includes("[data-cwl-modal-shell]"),
    convertsWizard: client.includes("[data-cwl-wizard-shell]"),
    convertsNav: client.includes("[data-cwl-nav-shell]"),
    convertsMap: client.includes("[data-cwl-map-shell]"),
    convertsChart: client.includes("[data-cwl-chart-shell]"),
    convertsWidget: client.includes("[data-cwl-widget-shell]"),
    ensureInline: client.includes("ensureInlineShell"),
    ensureOverlay: client.includes("ensureOverlayChrome"),
    openers: client.includes("ensureShellOpeners") || client.includes("data-cwl-shell-open"),
    mapLabel: client.includes("live map embed not lifted"),
  };

  const cssChecks = {
    chartReady: css.includes(".cwl-chart-shell-ready"),
    widgetReady: css.includes(".cwl-widget-shell-ready"),
    inlineShell: css.includes(".cwl-inline-shell"),
    modalOpen: css.includes(".cwl-modal-shell.cwl-shell-open"),
  };

  const counts = { modal: 0, map: 0, chart: 0, wizard: 0, nav: 0, widget: 0 };
  for (const file of walkHtml(EXPORT)) {
    const html = readFileSync(file, "utf8");
    for (const kind of Object.keys(counts)) {
      const re = new RegExp(`data-cwl-${kind}-shell=`, "g");
      const m = html.match(re);
      if (m) counts[kind] += m.length;
    }
  }

  const exportHasAll =
    counts.modal > 0 &&
    counts.map > 0 &&
    counts.chart > 0 &&
    counts.wizard > 0 &&
    counts.nav > 0 &&
    counts.widget > 0;

  const ok =
    Object.values(clientChecks).every(Boolean) &&
    Object.values(cssChecks).every(Boolean) &&
    exportHasAll;

  return {
    kind: WISP_CWL_ALL_SHELLS_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    clientChecks,
    cssChecks,
    exportShellCounts: counts,
    exportHasAll,
    note: "All six shell kinds converted to honest CWL island chrome — no invented live widgets",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispCwlAllShellsSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-all-shells-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
