import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const SYNTH = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-cross-language-synthesis.mjs", import.meta.url),
);
const CATALOG = fileURLToPath(
  new URL("../../../scripts/hub-ingest/language-catalog.mjs", import.meta.url),
);

test("cross-language synthesis: primitives and full open matrix", async () => {
  const m = await import(SYNTH);
  const { hubDirectedPairCount, HUB_WEB_ORIGIN_LANGUAGE_IDS } = await import(CATALOG);
  const db = m.buildCrossLanguageSynthesis();
  expect(db.kind).toBe(m.HUB_CROSS_LANGUAGE_SYNTHESIS_KIND);
  expect(db.universe.pairCount).toBe(hubDirectedPairCount());
  expect(db.consolidationPrimitives.length).toBeGreaterThanOrEqual(10);
  expect(db.origins).toHaveLength(HUB_WEB_ORIGIN_LANGUAGE_IDS.length);
  expect(db.goldPairs.length).toBe(hubDirectedPairCount());
  expect(db.cwlSpec).toBe("docs/CWL.md");
  expect(db.featureMatrix.length).toBeGreaterThanOrEqual(6);
});
