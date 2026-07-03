import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const COVERAGE = resolve(ROOT, "scripts/hub-ingest/hub-gold-coverage.mjs");

test("hub gold coverage: zero gaps across open matrix (G40)", async () => {
  const m = await import(COVERAGE);
  const { hubDirectedPairCount } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/language-catalog.mjs", import.meta.url)),
  );
  const report = m.buildHubGoldCoverageReport();
  const pairCount = hubDirectedPairCount();
  expect(report.kind).toBe(m.HUB_GOLD_COVERAGE_KIND);
  expect(report.summary.pairCount).toBe(pairCount);
  expect(report.summary.goldMatrix).toBe(pairCount);
  expect(report.summary.oracleTier).toBe(4);
  expect(report.summary.structuralTier).toBe(180);
  expect(report.summary.coverageGaps).toBe(0);
  expect(report.summary.hubCiStructuralPairs).toBeGreaterThan(10);
  expect(report.summary.chrysalisCiGoldPairs).toBe(4);

  const phpHono = report.pairs.find((p) => p.origin === "php" && p.output === "hono");
  expect(phpHono?.chrysalisCiGold).toBe(true);
  expect(phpHono?.hubCiStructural).toBe(true);

  const jsHono = report.pairs.find((p) => p.origin === "javascript" && p.output === "hono");
  expect(jsHono?.hubCiStructural).toBe(true);
  expect(jsHono?.suiteIds?.length).toBeGreaterThanOrEqual(3);
});

test("hub gold coverage CLI exits 0 (G40)", () => {
  const r = spawnSync(process.execPath, [COVERAGE], { cwd: ROOT, encoding: "utf8" });
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout);
  expect(report.summary.coverageGaps).toBe(0);
});
