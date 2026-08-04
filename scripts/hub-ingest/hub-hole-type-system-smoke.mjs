#!/usr/bin/env node
/**
 * Hole Type System smoke (G10116 / D6541).
 * Categories existing hole reasons; refuses invent-/demo-only-/force-settle- prefixes.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHoleTypeTaxonomy,
  classifyHoleReason,
  classifyHoleReasons,
  classifyTaxonomyCatalogFixtures,
} from "../lib/hole-type-system.mjs";
import { CWL_FULLSTACK_HOLE_CATALOG } from "./cwl-fullstack-holes.mjs";

export const HOLE_TYPE_SYSTEM_SMOKE_KIND = "chrysalis.hub.hole-type-system-smoke";
export const HOLE_TYPE_SYSTEM_SMOKE_SCHEMA_VERSION = 1;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function runHoleTypeSystemSmoke() {
  const taxonomy = loadHoleTypeTaxonomy();
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  checks.push({
    id: "taxonomy-file",
    ok: taxonomy.kind === "chrysalis.hole.type-taxonomy" && taxonomy.schemaVersion === 1,
  });

  checks.push({
    id: "refuse-silent-completion-flag",
    ok: taxonomy.refuseSilentCompletion === true,
  });

  const sampleOk = [
    "legacy:db-query-unknown-receiver",
    "hub-go:handler-body",
    "hub-svelte:arcgis-map",
    "cwl:empty-handler",
    "auth:session-bridge",
    "copy:EXTFMAP",
    "openapi:non-flat-body",
  ];
  const sampleClass = classifyHoleReasons(sampleOk, taxonomy);
  checks.push({
    id: "classify-known-prefixes",
    ok: sampleClass.ok === true && sampleClass.classified.length === sampleOk.length,
    detail: sampleClass.ok ? undefined : JSON.stringify(sampleClass.unknown),
  });

  const invent = classifyHoleReason("invent:bing-basemap", taxonomy);
  const demo = classifyHoleReason("demo-only:login-shell", taxonomy);
  const force = classifyHoleReason("force-settle:hole-zero", taxonomy);
  checks.push({
    id: "refuse-invent-prefixes",
    ok: invent.invent && demo.invent && force.invent && !invent.ok && !demo.ok && !force.ok,
  });

  const catalogReasons = Object.keys(CWL_FULLSTACK_HOLE_CATALOG);
  const catClass = classifyHoleReasons(catalogReasons, taxonomy);
  checks.push({
    id: "fullstack-catalog-typed",
    ok: catClass.inventHits.length === 0 && catClass.unknown.length === 0,
    detail:
      catClass.unknown.length > 0
        ? catClass.unknown.map((u) => u.reason).slice(0, 5).join(",")
        : undefined,
  });

  const dialectCats = classifyTaxonomyCatalogFixtures(taxonomy);
  checks.push({
    id: "dialect-honesty-catalogs-typed",
    ok: dialectCats.ok === true,
    detail: dialectCats.ok
      ? dialectCats.results.map((r) => r.fixture.split("/").pop()).join(",")
      : JSON.stringify(
          dialectCats.results
            .filter((r) => !r.ok)
            .map((r) => ({ fixture: r.fixture, unknown: r.unknown })),
        ),
  });

  checks.push({
    id: "runtime-category-present",
    ok: Boolean(taxonomy.categories?.runtime?.prefix?.length),
  });

  const docs = join(ROOT, "docs/AGENT-ERA-SUBSTRATE.md");
  checks.push({
    id: "docs-agent-era",
    ok: existsSync(docs) && readFileSync(docs, "utf8").includes("Hole Type System"),
  });

  const ok = checks.every((c) => c.ok);
  return {
    kind: HOLE_TYPE_SYSTEM_SMOKE_KIND,
    schemaVersion: HOLE_TYPE_SYSTEM_SMOKE_SCHEMA_VERSION,
    ok,
    gate: "G10116",
    decision: "D6541",
    checks,
    failed: checks.filter((c) => !c.ok),
    sampleCategories: sampleClass.classified.map((c) => ({ reason: c.reason, category: c.category })),
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = runHoleTypeSystemSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-hole-type-system-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
