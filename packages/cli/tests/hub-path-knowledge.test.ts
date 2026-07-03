import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const KNOWLEDGE = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-path-knowledge.mjs", import.meta.url),
);
const HUB_STORE = fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url));

test("path knowledge: full grid 575 pairs with similarities and practices", async () => {
  const kb = await import(KNOWLEDGE);
  const hub = await import(HUB_STORE);
  const db = kb.buildHubPathKnowledgeBase();
  const expected = hub.hubDirectedPairCount();

  expect(db.kind).toBe(kb.HUB_PATH_KNOWLEDGE_KIND);
  expect(db.pairCount).toBe(expected);
  expect(db.pairs.length).toBe(expected);
  expect(db.languages.cwl).toBeDefined();
  expect(db.bestPractices.length).toBeGreaterThanOrEqual(8);
  expect(Object.keys(db.languages).length).toBeGreaterThanOrEqual(22);

  expect(db.schemaVersion).toBe(3);
  expect(db.webDatabaseCatalog.count).toBeGreaterThanOrEqual(20);

  for (const pair of db.pairs) {
    expect(pair.similarities.length).toBeGreaterThanOrEqual(2);
    expect(pair.differences.length).toBeGreaterThanOrEqual(2);
    expect(pair.bestPracticeIds.length).toBeGreaterThanOrEqual(2);
    expect(pair.bestPracticeIds).toContain("bp-webir-spine");
    expect(pair.bestPracticeIds).toContain("bp-holes-not-guesses");
    expect(pair.pros.length).toBeGreaterThanOrEqual(1);
    expect(pair.cons.length).toBeGreaterThanOrEqual(1);
    expect(["low", "medium", "high"]).toContain(pair.riskLevel);
    expect(pair.canonicalWebIrPattern).toMatch(/^web\.request|^cwl:/);
  }
});

test("path knowledge: query single pair includes practices", async () => {
  const { queryPathKnowledge } = await import(KNOWLEDGE);
  const q = queryPathKnowledge("php", "hono");
  expect(q.path.grade).toBe("gold");
  expect(q.bestPractices.some((p) => p.id === "bp-php-capture-staging")).toBe(true);
  expect(q.pair.similarities.some((s) => s.kind === "shared-ir")).toBe(true);
});

test("path knowledge: origin clusters cover all web origins", async () => {
  const { buildHubPathKnowledgeBase } = await import(KNOWLEDGE);
  const { HUB_WEB_ORIGIN_LANGUAGE_IDS } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/language-catalog.mjs", import.meta.url))
  );
  const db = buildHubPathKnowledgeBase();
  const clustered = new Set(Object.values(db.originClusters).flat());
  for (const id of HUB_WEB_ORIGIN_LANGUAGE_IDS) {
    expect(clustered.has(id)).toBe(true);
  }
});
