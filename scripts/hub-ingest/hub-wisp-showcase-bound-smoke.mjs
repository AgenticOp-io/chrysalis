#!/usr/bin/env node
/**
 * WISP showcase bound (G9610 / D6380) — honest ~1260 residual holes on fixture CWL.
 * Does not re-run convert; reads committed fixture and asserts intentional categories.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyWispHoleBuckets,
  countWispMarkupHoles,
  evaluateWispShowcaseBound,
} from "../wisp-hole-metrics-lib.mjs";

export const WISP_SHOWCASE_BOUND_KIND = "chrysalis.hub.wisp-showcase-bound-smoke";
export const WISP_SHOWCASE_BOUND_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {object} [opts]
 */
export async function runWispShowcaseBoundSmoke(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const boundPath =
    opts.boundPath ?? join(repoRoot, "fixtures/ci/wisp-showcase-bound.v1.json");
  if (!existsSync(boundPath)) {
    return {
      kind: WISP_SHOWCASE_BOUND_KIND,
      schemaVersion: WISP_SHOWCASE_BOUND_SCHEMA_VERSION,
      ok: false,
      skip: "bound-fixture-missing",
      boundPath,
    };
  }
  const bound = JSON.parse(readFileSync(boundPath, "utf8"));
  const cwlPath = join(repoRoot, bound.fixtureRel ?? "fixtures/hub-wisp-management/routes.cwl");
  if (!existsSync(cwlPath)) {
    return {
      kind: WISP_SHOWCASE_BOUND_KIND,
      schemaVersion: WISP_SHOWCASE_BOUND_SCHEMA_VERSION,
      ok: false,
      skip: "cwl-fixture-missing",
      cwlPath,
    };
  }

  const metrics = countWispMarkupHoles(readFileSync(cwlPath, "utf8"));
  const evaluation = evaluateWispShowcaseBound(metrics, bound);
  const buckets = classifyWispHoleBuckets(metrics.reasons);

  const docOk = (() => {
    const roadmap = join(repoRoot, "ROADMAP.md");
    const whole = join(repoRoot, "docs/WHOLE-SITE-CWL-CONVERSION.md");
    if (!existsSync(roadmap) || !existsSync(whole)) return false;
    const rt = readFileSync(roadmap, "utf8");
    const wt = readFileSync(whole, "utf8");
    return (
      (rt.includes("564") || rt.includes("~564") || rt.includes("545")) &&
      (wt.includes("564") || wt.includes("~564") || wt.includes("545"))
    );
  })();

  const checks = {
    ...evaluation.checks,
    boundKindOk: bound.kind === "chrysalis.wisp.showcase-bound",
    docMentionsResidual: docOk,
  };
  const ok = Object.values(checks).every(Boolean);

  const artifact = {
    kind: WISP_SHOWCASE_BOUND_KIND,
    schemaVersion: WISP_SHOWCASE_BOUND_SCHEMA_VERSION,
    ok,
    generatedAt: new Date().toISOString(),
    cwlPath,
    boundPath,
    metrics,
    buckets,
    intentionalCategories: bound.intentionalCategories ?? [],
    outOfScope: bound.outOfScope ?? [],
    checks,
    honestNote:
      "WISP lab ships with ~564 declared markup holes after G9750 enriched traces. 39 no-source /add remain intentional; complex calls stay holes.",
  };

  const outDir = join(repoRoot, "reports/wisp");
  mkdirSync(outDir, { recursive: true });
  const artifactPath = join(outDir, "showcase-bound.v1.json");
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  return { ...artifact, artifactPath };
}

async function main() {
  const report = await runWispShowcaseBoundSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-showcase-bound-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
