import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("hub verify tiers: oracle lane is PHP→framework only (G52 / core boundary)", async () => {
  const { hubPairsForVerifyTier, buildHubVerifyTiersReport } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/hub-verify-tiers.mjs", import.meta.url))
  );
  const oracle = hubPairsForVerifyTier("oracle");
  expect(oracle).toHaveLength(4);
  const pairs = oracle.map((p) => `${p.origin}:${p.output}`).sort();
  expect(pairs).toEqual(["php:fastify", "php:hono", "php:nextjs", "php:typescript"]);
  for (const row of oracle) {
    expect(row.origin).toBe("php");
    expect(row.grade).toBe("gold");
  }

  const report = buildHubVerifyTiersReport();
  expect(report.summary.oracleTier).toBe(4);
  expect(report.summary.structuralTier).toBeGreaterThan(20);
  expect(report.tierCounts.oracle).toBe(4);
});
