import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const SYNTH = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-cross-language-synthesis.mjs", import.meta.url),
);

test("cross-language synthesis: primitives and 23 origins", async () => {
  const m = await import(SYNTH);
  const db = m.buildCrossLanguageSynthesis();
  expect(db.kind).toBe(m.HUB_CROSS_LANGUAGE_SYNTHESIS_KIND);
  expect(db.universe.pairCount).toBe(575);
  expect(db.consolidationPrimitives.length).toBeGreaterThanOrEqual(10);
  expect(db.origins).toHaveLength(23);
  expect(db.goldPairs.length).toBe(575);
  expect(db.cwlSpec).toBe("docs/CWL.md");
  expect(db.featureMatrix.length).toBeGreaterThanOrEqual(6);
});
