#!/usr/bin/env node
/**
 * G9903 — modal/map shell island chrome (honest open/close, no invented widgets).
 *
 * Run: pnpm run hub:wisp-cwl-shell-island-smoke
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const WISP_CWL_SHELL_ISLAND_SMOKE_KIND = "chrysalis.wisp.cwl-shell-island-smoke";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CLIENT = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-client.js");
const CSS = join(ROOT, "fixtures/hub-wisp-management/wisp-cwl-app.css");
const INVENTORY = join(
  ROOT,
  "fixtures/hub-wisp-management/cwl-static-export/modules/inventory/index.html",
);
const PLAN = join(ROOT, "fixtures/hub-wisp-management/cwl-static-export/modules/plan/index.html");

export function runWispCwlShellIslandSmoke() {
  const client = existsSync(CLIENT) ? readFileSync(CLIENT, "utf8") : "";
  const css = existsSync(CSS) ? readFileSync(CSS, "utf8") : "";
  const inventory = existsSync(INVENTORY) ? readFileSync(INVENTORY, "utf8") : "";
  const plan = existsSync(PLAN) ? readFileSync(PLAN, "utf8") : "";

  const checks = {
    initShellIslands: client.includes("function initShellIslands"),
    calledFromBoot: /initShellIslands\s*\(\s*\)/.test(client),
    modalChrome: client.includes("cwl-shell-chrome") && client.includes("Modal shell — interactive content not lifted"),
    tipsOpen: client.includes("TipsModal"),
    helpOpen: client.includes("HelpModal"),
    mapPlaceholder: client.includes("cwl-map-shell-label") && client.includes("live map embed not lifted"),
    chartWidget: client.includes("[data-cwl-chart-shell]") && client.includes("[data-cwl-widget-shell]"),
    scrubJunk: client.includes("scrubShellJunk"),
    cssOpen: css.includes(".cwl-modal-shell.cwl-shell-open"),
    cssMap: css.includes(".cwl-map-shell-ready"),
    inventoryHasTips: inventory.includes('data-cwl-modal-shell="TipsModal"'),
    planHasMap: plan.includes('data-cwl-map-shell="SharedMap"'),
  };
  const ok = Object.values(checks).every(Boolean);

  return {
    kind: WISP_CWL_SHELL_ISLAND_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    checks,
    note: "Modal/map shells open as honest chrome — no invented Tips/Help/map widgets",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispCwlShellIslandSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-shell-island-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
