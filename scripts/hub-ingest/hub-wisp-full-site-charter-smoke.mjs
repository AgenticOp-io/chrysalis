#!/usr/bin/env node
/** WISP full-site charter smoke (G7701 core). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispFullSiteCharter } from "./hub-wisp-full-site-charter.mjs";

export const WISP_FULL_SITE_CHARTER_SMOKE_KIND = "chrysalis.wisp.full-site-charter-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispFullSiteCharterDocGate() {
  const path = join(scriptRoot, "docs/WISP-FULL-SITE-CWL-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-full-site-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    (text.includes("**Status:** **active**") || text.includes("Program closed")) &&
    text.includes("G7700") &&
    text.includes("G7790") &&
    text.includes("D6268") &&
    text.includes("native CWL") &&
    text.includes("hub:wisp-full-site-close-smoke");
  return { ok, docOk: ok };
}

export function runWispFullSiteCharterGate(_opts = {}) {
  const doc = runWispFullSiteCharterDocGate();
  const loaded = loadWispFullSiteCharter();
  return {
    kind: WISP_FULL_SITE_CHARTER_SMOKE_KIND,
    schemaVersion: 1,
    ok: doc.ok === true && loaded.ok === true,
    doc,
    charter: loaded,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispFullSiteCharterGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-full-site-charter-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
