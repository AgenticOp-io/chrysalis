import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Gate-only skipPriorChain smokes — one vitest per queue (G1863–G2053). */
const AUTHORING_BATCH_V71_V90 = [
  { v: 71, roadmap: "G1863", mode: "runtime-hono-parity", ms: 90_000 },
  { v: 72, roadmap: "G1873", mode: "page-load-parity", ms: 60_000 },
  { v: 73, roadmap: "G1883", mode: "gold-runtime-fullstack", ms: 180_000 },
  { v: 74, roadmap: "G1893", mode: "fullstack-flagship-pilot", ms: 180_000 },
  { v: 75, roadmap: "G1903", mode: "fullstack-flagship-http", ms: 300_000 },
  { v: 76, roadmap: "G1913", mode: "express-depth", ms: 120_000 },
  { v: 77, roadmap: "G1923", mode: "nextjs-search-export", ms: 120_000 },
  { v: 78, roadmap: "G1933", mode: "svelte-search-export", ms: 120_000 },
  { v: 79, roadmap: "G1943", mode: "svelte-deep-export", ms: 180_000 },
  { v: 80, roadmap: "G1953", mode: "nextjs-deep-export", ms: 180_000 },
  { v: 81, roadmap: "G1963", mode: "html-interpolation", ms: 60_000 },
  { v: 82, roadmap: "G1973", mode: "chimera-cutover", ms: 60_000 },
  { v: 83, roadmap: "G1983", mode: "verify-gaps-fullstack-action", ms: 60_000 },
  { v: 84, roadmap: "G1993", mode: "translate-e2e", ms: 180_000 },
  { v: 85, roadmap: "G2003", mode: "contract-roundtrip", ms: 60_000 },
  { v: 86, roadmap: "G2013", mode: "post-translate-verify-express", ms: 180_000 },
  { v: 87, roadmap: "G2023", mode: "fullstack-roundtrip", ms: 60_000 },
  { v: 88, roadmap: "G2033", mode: "post70-month2-composite", ms: 180_000 },
  { v: 89, roadmap: "G2043", mode: "post80-month2-mega", ms: 480_000 },
  { v: 90, roadmap: "G2053", mode: "evidence-trend", ms: 120_000 },
] as const;

for (const spec of AUTHORING_BATCH_V71_V90) {
  test(`authoring batch v${spec.v} smoke (${spec.roadmap})`, async () => {
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
