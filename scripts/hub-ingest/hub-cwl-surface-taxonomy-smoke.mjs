#!/usr/bin/env node
/** CWL surface taxonomy governance (G6340) — D6193 strategic amendment. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const CWL_SURFACE_TAXONOMY_SMOKE_KIND = "chrysalis.cwl.surface-taxonomy-smoke";
export const CWL_SURFACE_TAXONOMY_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const taxonomyPath = join(scriptRoot, "docs/CWL-SURFACE-TAXONOMY.md");

/** G6340 — CWL surface taxonomy doc + strategic cross-links. */
export function runCwlSurfaceTaxonomyDocGate() {
  if (!existsSync(taxonomyPath)) {
    return { ok: false, skip: "missing-cwl-surface-taxonomy-doc" };
  }
  const text = readFileSync(taxonomyPath, "utf8");
  const strategicPath = join(scriptRoot, "docs/STRATEGIC-PLAN.md");
  const strategic = existsSync(strategicPath) ? readFileSync(strategicPath, "utf8") : "";
  const scopePath = join(scriptRoot, "docs/CWL-FULLSTACK-SCOPE-RFC.md");
  const scope = existsSync(scopePath) ? readFileSync(scopePath, "utf8") : "";
  const designPath = join(scriptRoot, "DESIGN.md");
  const design = existsSync(designPath) ? readFileSync(designPath, "utf8") : "";

  const surfaces =
    text.includes("CWL API") &&
    text.includes("CWL Pages") &&
    text.includes("CWL Data") &&
    text.includes("CWL UI") &&
    text.includes("CWL Effects");
  const syntax =
    text.includes("@route") &&
    text.includes("@page") &&
    text.includes("load {");
  const thesis =
    text.includes("consolidated web language") &&
    text.includes("Replacement ladder");
  const governance =
    strategic.includes("CWL-SURFACE-TAXONOMY.md") &&
    strategic.includes("D6193") &&
    scope.includes("CWL-SURFACE-TAXONOMY.md") &&
    design.includes("D6193");

  const ok = surfaces && syntax && thesis && governance;
  return {
    ok,
    surfaces,
    syntax,
    thesis,
    governance,
    taxonomyPath,
  };
}

export async function runCwlSurfaceTaxonomySmokeGate() {
  const progress = createSmokeProgress("cwl-surface-taxonomy");
  const t0 = progress.start("CWL surface taxonomy (G6340)");
  const gate = runCwlSurfaceTaxonomyDocGate();
  progress.end("CWL surface taxonomy (G6340)", gate.ok === true, t0);
  return {
    kind: CWL_SURFACE_TAXONOMY_SMOKE_KIND,
    schemaVersion: CWL_SURFACE_TAXONOMY_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runCwlSurfaceTaxonomySmokeGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-surface-taxonomy-smoke")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
