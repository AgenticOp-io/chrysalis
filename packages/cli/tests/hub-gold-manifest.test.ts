import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const MANIFEST = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-gold-manifest.mjs", import.meta.url),
);

test("hub gold manifest: pair coverage and suite inventory (G37)", async () => {
  const m = await import(MANIFEST);
  expect(m.hubGoldStructuralSuiteIds().length).toBe(62);
  expect(m.hubGoldTraceReplaySuiteIds().length).toBe(34);
  const jsNext = m.hubGoldSuitesForPair("javascript", "nextjs");
  expect(jsNext.map((s: { id: string }) => s.id)).toContain("js-literal-nextjs");
  const jsHono = m.hubGoldSuitesForPair("javascript", "hono");
  expect(jsHono.map((s: { id: string }) => s.id)).toEqual(
    expect.arrayContaining(["js-literal-hono", "js-structured-hono", "js-middleware-hono"]),
  );
  const coverage = m.buildHubGoldSuiteCoverage("cwl", "fastify");
  expect(coverage.suiteIds).toContain("cwl-gold-fastify");
  expect(coverage.emitTarget).toBe("fastify");
  const tsHono = m.buildHubGoldSuiteCoverage("typescript", "hono");
  expect(tsHono.suiteIds).toEqual(
    expect.arrayContaining(["ts-literal-hono", "ts-structured-hono"]),
  );
  const phpTs = m.hubGoldSuitesForPair("php", "typescript");
  expect(phpTs.length).toBe(0);
  const pyNative = m.hubGoldSuitesForPair("python", "python");
  expect(pyNative.map((s: { id: string }) => s.id)).toContain("python-native-python");
  expect(m.hubGoldEmitTargetForOutput("java")).toBe("java");
});
