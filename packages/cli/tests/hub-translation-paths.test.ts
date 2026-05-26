import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const PATHS = fileURLToPath(
  new URL("../../../scripts/hub-ingest/hub-translation-paths.mjs", import.meta.url),
);
const HUB_STORE = fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url));

test("hub paths: matrix covers every HUB_ROUTES pair", async () => {
  const paths = await import(PATHS);
  const hub = await import(HUB_STORE);
  const matrix = paths.buildHubTranslationPathMatrix();
  const expected =
    hub.INPUT_LANGUAGES.length * hub.OUTPUT_LANGUAGES.length - hub.INPUT_LANGUAGES.length;
  expect(matrix.kind).toBe(paths.HUB_PATH_MATRIX_KIND);
  expect(matrix.schemaVersion).toBe(1);
  expect(matrix.pairCount).toBe(expected);
  expect(matrix.pairs.length).toBe(expected);
  expect(matrix.laneCatalog.ingest).toContain("hub-cwl-direct");

  for (const src of hub.INPUT_LANGUAGES) {
    for (const out of hub.OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      const route = hub.HUB_ROUTES[`${src.id}:${out.id}`];
      const pair = matrix.pairs.find((p) => p.origin === src.id && p.output === out.id);
      expect(pair?.grade).toBe(route?.grade);
      expect(paths.HUB_INGEST_LANES).toContain(pair?.ingest.lane);
      expect(paths.HUB_EMIT_LANES).toContain(pair?.emit.lane);
      for (const v of pair?.verify.lanes ?? []) {
        expect(paths.HUB_VERIFY_LANES).toContain(v);
      }
    }
  }
});

test("hub paths: php ingest lane and gold verify", async () => {
  const { describeTranslationPath } = await import(PATHS);
  const p = describeTranslationPath("php", "hono");
  expect(p.ingest.lane).toBe("chrysalis-ingest");
  expect(p.emit.lane).toBe("chrysalis-emit");
  expect(p.verify.lanes).toContain("legacy-oracle-php");
  expect(p.grade).toBe("gold");
  expect(p.steps.some((s) => s.id === "chrysalis-verify")).toBe(true);
});

test("hub paths: javascript literal gold uses hub verify lanes", async () => {
  const { describeTranslationPath } = await import(PATHS);
  const p = describeTranslationPath("javascript", "hono");
  expect(p.ingest.lane).toBe("hub-ast-lift");
  expect(p.emit.lane).toBe("hub-webir-typescript");
  expect(p.verify.lanes).toContain("hub-structural-gold");
  expect(p.verify.lanes).toContain("hub-trace-replay");
});

test("hub paths: python to hono is gold (G30)", async () => {
  const { describeTranslationPath } = await import(PATHS);
  const p = describeTranslationPath("python", "hono");
  expect(p.grade).toBe("gold");
  expect(p.verify.lanes).toContain("hub-structural-gold");
});

test("hub paths: python to java gold scaffold has native emit and no verify lane", async () => {
  const { describeTranslationPath } = await import(PATHS);
  const p = describeTranslationPath("python", "java");
  expect(p.ingest.lane).toBe("hub-ast-lift");
  expect(p.emit.lane).toBe("hub-native-java");
  expect(p.verify.lanes).toEqual(["none"]);
  expect(p.grade).toBe("gold");
});

test("hub paths: contract alternate on framework outputs", async () => {
  const { describeTranslationPath } = await import(PATHS);
  const p = describeTranslationPath("ruby", "nextjs");
  expect(p.alternates).toHaveLength(1);
  expect(p.alternates[0]?.emitLane).toBe("wptp-compose");
});

test("hub paths: readiness pairs include lane fields", async () => {
  const { buildLanguageReadinessReport } = await import(HUB_STORE);
  const report = buildLanguageReadinessReport();
  const sample = report.pairs.find((p) => p.origin === "python" && p.output === "java");
  expect(sample?.ingestLane).toBe("hub-ast-lift");
  expect(sample?.emitLane).toBe("hub-native-java");
  expect(sample?.verifyLanes).toEqual(["none"]);
});
