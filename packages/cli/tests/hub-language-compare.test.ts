import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const COMPARE = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-language-compare.mjs", import.meta.url),
);

test("hub language compare: ranks outputs for python origin (G72)", async () => {
  const { compareHubLanguages, HUB_LANGUAGE_COMPARE_KIND } = await import(COMPARE);
  const report = compareHubLanguages("python", ["java", "hono", "markdown"]);
  expect(report.kind).toBe(HUB_LANGUAGE_COMPARE_KIND);
  expect(report.candidates.length).toBe(3);
  expect(report.recommended).toBeTruthy();
  const hono = report.candidates.find((c) => c.output === "hono");
  expect(hono?.riskLevel).toBeDefined();
  expect(hono?.pros?.length).toBeGreaterThan(0);
});
