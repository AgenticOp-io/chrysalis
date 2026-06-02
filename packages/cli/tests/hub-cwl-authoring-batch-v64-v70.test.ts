import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Gate-only skipPriorChain smokes — one vitest per queue (G1793–G1853). */
const AUTHORING_BATCH_V64_V70 = [
  { v: 64, roadmap: "G1793", mode: "formatter-lint", ms: 60_000 },
  { v: 65, roadmap: "G1803", mode: "project-to-cwl-mandatory", ms: 120_000 },
  { v: 66, roadmap: "G1813", mode: "fullstack-scope-rfc", ms: 60_000 },
  { v: 67, roadmap: "G1823", mode: "node-express-oracle", ms: 300_000 },
  { v: 68, roadmap: "G1833", mode: "post60-authoring-composite", ms: 180_000 },
  { v: 69, roadmap: "G1843", mode: "emit-verify-mega", ms: 480_000 },
  { v: 70, roadmap: "G1853", mode: "authoring-graduation-lock", ms: 600_000 },
] as const;

for (const spec of AUTHORING_BATCH_V64_V70) {
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
