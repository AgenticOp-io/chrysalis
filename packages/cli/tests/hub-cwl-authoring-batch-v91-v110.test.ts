import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const AUTHORING_BATCH_V91_V110 = [
  { v: 91, roadmap: "G2063", mode: "verify-gaps-express", ms: 60000 },
  { v: 92, roadmap: "G2073", mode: "verify-gaps-symfony", ms: 120000 },
  { v: 93, roadmap: "G2083", mode: "verify-gaps-laravel-min", ms: 120000 },
  { v: 94, roadmap: "G2093", mode: "verify-gaps-ingest-standalone", ms: 120000 },
  { v: 95, roadmap: "G2103", mode: "laravel-verify-gaps-closure", ms: 120000 },
  { v: 96, roadmap: "G2113", mode: "laravel-auth-probe-reingest-http", ms: 300000 },
  { v: 97, roadmap: "G2123", mode: "laravel-auth-probe-reingest-fastify", ms: 300000 },
  { v: 98, roadmap: "G2133", mode: "post-translate-verify-origin", ms: 300000 },
  { v: 99, roadmap: "G2143", mode: "ir-helper-lifting", ms: 300000 },
  { v: 100, roadmap: "G2153", mode: "ir-helper-semantic-lifting", ms: 300000 },
  { v: 101, roadmap: "G2163", mode: "session-stub", ms: 300000 },
  { v: 102, roadmap: "G2173", mode: "runtime-production", ms: 300000 },
  { v: 103, roadmap: "G2183", mode: "emit-page-probe", ms: 300000 },
  { v: 104, roadmap: "G2193", mode: "evidence-trend", ms: 300000 },
  { v: 105, roadmap: "G2203", mode: "migration-os-mega", ms: 300000 },
  { v: 106, roadmap: "G2213", mode: "oracle-product-ultra", ms: 480000 },
  { v: 107, roadmap: "G2223", mode: "verify-standalone-mega", ms: 480000 },
  { v: 108, roadmap: "G2233", mode: "post90-verify-gaps-composite", ms: 600000 },
  { v: 109, roadmap: "G2243", mode: "evidence-trend", ms: 120000 },
  { v: 110, roadmap: "G2253", mode: "post90-hub-graduation-lock", ms: 900_000 },
] as const;

const HEAVY_AUTHORING_BATCH = new Set([106, 107, 108, 109, 110]);

for (const spec of AUTHORING_BATCH_V91_V110) {
  const runTest =
    HEAVY_AUTHORING_BATCH.has(spec.v) && process.env.CHRYSALIS_RUN_HUB_HEAVY_AUTHORING_BATCH !== "1"
      ? test.skip
      : test;
  runTest(`authoring batch v${spec.v} smoke (${spec.roadmap})`, async () => {
    const mod = await import(
      resolve(ROOT, `scripts/hub-ingest/hub-cwl-authoring-batch-v${spec.v}-smoke.mjs`),
    );
    const run = mod[`runCwlAuthoringBatchV${spec.v}Smoke` as keyof typeof mod] as (
      opts: { skipPriorChain?: boolean },
    ) => Promise<Record<string, unknown>>;
    expect(typeof run).toBe("function");
    const report = await run({ skipPriorChain: true });
    expect(report.ok).toBe(true);
    const gate = report[`gate${spec.v}`] as { ok?: boolean } | undefined;
    expect(gate?.ok).toBe(true);
    expect(report[`gate${spec.v}Mode`]).toBe(spec.mode);
    expect(report.skipPriorChain).toBe(true);
  }, spec.ms);
}
