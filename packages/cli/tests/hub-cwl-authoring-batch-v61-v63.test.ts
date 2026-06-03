import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const AUTHORING_BATCH_V61_V63 = [
  { v: 61, roadmap: "G1763", mode: "post60-composite", ms: 180_000 },
  { v: 62, roadmap: "G1773", mode: "post61-composite", ms: 180_000 },
  { v: 63, roadmap: "G1783", mode: "post62-composite", ms: 900_000 },
] as const;

for (const spec of AUTHORING_BATCH_V61_V63) {
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
