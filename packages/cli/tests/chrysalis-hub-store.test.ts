import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const HUB_STORE = fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url));

test("hub store: matrix covers every EXT_TO_LANGUAGE id", async () => {
  const hub = await import(HUB_STORE);
  expect(hub.matrixCoverageGaps()).toEqual([]);
  hub.assertMatrixCoversExtLanguages();
});

test("hub store: detectLanguagesFromFileList groups by extension", async () => {
  const { detectLanguagesFromFileList } = await import(HUB_STORE);
  const langs = detectLanguagesFromFileList([
    "app/Http/Controllers/Foo.php",
    "resources/views/welcome.blade.php",
    "routes/web.php",
    "assets/app.js",
    "assets/app.ts",
    "readme.md",
  ]);
  const byLang = Object.fromEntries(langs.map((l) => [l.language, l.fileCount]));
  expect(byLang.php).toBe(3);
  expect(byLang.javascript).toBe(1);
  expect(byLang.typescript).toBe(1);
  expect(byLang.readme).toBeUndefined();
});

test("hub store: resolveHubRoute gold path for php → typescript-chrysalis", async () => {
  const { resolveHubRoute } = await import(HUB_STORE);
  const route = resolveHubRoute("php", "typescript-chrysalis");
  expect(route.ok).toBe(true);
  expect(route.kind).toBe("chrysalis-ingest");
});

test("hub store: resolveHubRoute blocks planned python", async () => {
  const { resolveHubRoute } = await import(HUB_STORE);
  const route = resolveHubRoute("python", "typescript-wptp");
  expect(route.ok).toBe(false);
  expect(route.code).toBe("target-planned");
  expect(route.hole).toBe("hub:planned:python:typescript-wptp");
});

test("hub store: resolveHubRoute documents WPTP CI-only targets", async () => {
  const { resolveHubRoute } = await import(HUB_STORE);
  const route = resolveHubRoute("javascript", "wptp-openapi-hono");
  expect(route.ok).toBe(false);
  expect(route.kind).toBe("wptp-ci");
  expect(route.wptpCi?.script).toContain("wptp-d3-silver-harness");
});

test("hub store: planHubTranslation runnable only for php chrysalis", async () => {
  const { planHubTranslation } = await import(HUB_STORE);
  const plan = planHubTranslation({
    id: "p1",
    targets: {
      php: "typescript-chrysalis",
      python: "typescript-wptp",
      javascript: "unchanged",
    },
    detection: {
      languages: [
        { language: "php", fileCount: 10, sampleFiles: [] },
        { language: "python", fileCount: 2, sampleFiles: [] },
        { language: "javascript", fileCount: 1, sampleFiles: [] },
      ],
    },
  });
  expect(plan.runnable).toEqual([{ sourceLang: "php", targetId: "typescript-chrysalis", action: "chrysalis-ingest" }]);
  expect(plan.skipped).toEqual([{ sourceLang: "javascript", targetId: "unchanged" }]);
  expect(plan.errors).toHaveLength(1);
  expect(plan.holes).toHaveLength(1);
  expect(plan.holes[0]?.name).toBe("hub:planned:python:typescript-wptp");
});
