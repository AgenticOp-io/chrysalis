import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const MANIFEST = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-gold-manifest.mjs", import.meta.url),
);

test("hub gold manifest: pair coverage and suite inventory (G37)", async () => {
  const m = await import(MANIFEST);
  expect(m.hubGoldStructuralSuiteIds().length).toBeGreaterThanOrEqual(20);
  expect(m.hubGoldTraceReplaySuiteIds().length).toBeGreaterThanOrEqual(14);
  const jsHono = m.hubGoldSuitesForPair("javascript", "hono");
  expect(jsHono.map((s: { id: string }) => s.id)).toEqual(
    expect.arrayContaining(["js-literal-hono", "js-structured-hono", "js-middleware-hono"]),
  );
  const coverage = m.buildHubGoldSuiteCoverage("cwl", "fastify");
  expect(coverage.suiteIds).toContain("cwl-gold-fastify");
  expect(coverage.emitTarget).toBe("fastify");
  const phpTs = m.hubGoldSuitesForPair("php", "typescript");
  expect(phpTs.length).toBe(0);
});
