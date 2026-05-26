import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const HUB_STORE = fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url));

test("hub store: matrix covers every hub web origin", async () => {
  const hub = await import(HUB_STORE);
  expect(hub.matrixCoverageGaps()).toEqual([]);
  hub.assertMatrixCoversOriginLanguages();
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

test("hub store: resolveHubRoute gold path for php → typescript", async () => {
  const { resolveHubRoute } = await import(HUB_STORE);
  const route = resolveHubRoute("php", "typescript");
  expect(route.ok).toBe(true);
  expect(route.action).toBe("chrysalis-ingest-emit");
  expect(route.grade).toBe("gold");
});

test("hub store: resolveHubRoute hub-translate for python → java", async () => {
  const { resolveHubRoute } = await import(HUB_STORE);
  const route = resolveHubRoute("python", "java");
  expect(route.ok).toBe(true);
  expect(route.action).toBe("hub-translate");
  expect(route.grade).toBe("open");
});

test("hub store: resolveHubRoute php → java is open and runnable", async () => {
  const { resolveHubRoute } = await import(HUB_STORE);
  const route = resolveHubRoute("php", "java");
  expect(route.ok).toBe(true);
  expect(route.action).toBe("hub-translate");
  expect(route.grade).toBe("open");
});

test("hub store: HUB_MISSION_OPEN and full route grid", async () => {
  const { HUB_MISSION_OPEN, HUB_ROUTES, INPUT_LANGUAGES, OUTPUT_LANGUAGES } = await import(HUB_STORE);
  expect(HUB_MISSION_OPEN).toBe(true);
  const expected = INPUT_LANGUAGES.length * OUTPUT_LANGUAGES.length - INPUT_LANGUAGES.length;
  expect(Object.keys(HUB_ROUTES).length).toBe(expected);
  for (const spec of Object.values(HUB_ROUTES)) {
    expect(spec.status).toBe("ready");
    expect(["gold", "silver", "open"]).toContain(spec.grade);
  }
});

test("hub store: resolveHubRoute rejects same language", async () => {
  const { resolveHubRoute } = await import(HUB_STORE);
  const route = resolveHubRoute("php", "php");
  expect(route.ok).toBe(false);
  expect(route.code).toBe("same-language");
});

test("hub store: planHubTranslation single origin output pair", async () => {
  const { planHubTranslation } = await import(HUB_STORE);
  const plan = planHubTranslation({
    id: "p1",
    originLanguage: "php",
    outputLanguage: "typescript",
    detection: { languages: [{ language: "php", fileCount: 10, sampleFiles: [] }] },
  });
  expect(plan.runnable).toHaveLength(1);
  expect(plan.runnable[0]?.action).toBe("chrysalis-ingest-emit");
  expect(plan.routes).toHaveLength(1);
  expect(plan.errors).toHaveLength(0);
});

test("hub store: OUTPUT_LANGUAGES covers complete open matrix", async () => {
  const { OUTPUT_LANGUAGES } = await import(HUB_STORE);
  const ids = OUTPUT_LANGUAGES.map((o) => o.id);
  expect(ids).toContain("typescript");
  expect(ids).toContain("hono");
  expect(ids).toContain("sql");
  expect(ids).toContain("json");
  expect(ids).toContain("markdown");
  expect(ids).toContain("cpp");
});

test("hub store: resolveHubRoute accepts sql output as open route", async () => {
  const { resolveHubRoute } = await import(HUB_STORE);
  const route = resolveHubRoute("php", "sql");
  expect(route.ok).toBe(true);
  expect(route.action).toBe("hub-translate");
  expect(route.grade).toBe("open");
});

test("hub store: originFromDetection prefers app language over sql", async () => {
  const { originFromDetection } = await import(HUB_STORE);
  const origin = originFromDetection({
    languages: [
      { language: "sql", fileCount: 100, sampleFiles: [] },
      { language: "php", fileCount: 10, sampleFiles: [] },
    ],
  });
  expect(origin).toBe("php");
});

test("hub store: language readiness report is popularity-ordered", async () => {
  const { buildLanguageReadinessReport } = await import(HUB_STORE);
  const report = buildLanguageReadinessReport();
  expect(report.kind).toBe("chrysalis.translation-hub.language-readiness");
  expect(report.origins[0]?.id).toBe("javascript");
  const php = report.origins.find((o) => o.id === "php");
  expect(php?.ingestStatus).toBe("gold");
  const sqlOut = report.outputs.find((o) => o.id === "sql");
  expect(sqlOut?.emitStatus).toBe("open-scaffold");
});

test("hub connectivity: parseOriginAgentJson", async () => {
  const { parseOriginAgentJson } = await import(
    fileURLToPath(new URL("../../../scripts/chrysalis-hub-connectivity.mjs", import.meta.url)),
  );
  const j = parseOriginAgentJson(
    JSON.stringify({
      languages: [{ language: "php", fileCount: 2, sampleFiles: ["a.php"] }],
      pathCount: 2,
      source: "origin-agent",
    }),
  );
  expect(j.languages[0].language).toBe("php");
});

test("hub runners: hub-translate step for python → typescript", async () => {
  const { hubJobSteps } = await import(
    fileURLToPath(new URL("../../../scripts/chrysalis-hub-runners.mjs", import.meta.url)),
  );
  const steps = hubJobSteps("/repo", "/repo/packages/cli/dist/bin.js", "/tmp/proj", {
    sourceLang: "python",
    targetId: "typescript",
    action: "hub-translate",
  });
  expect(steps).toHaveLength(1);
  expect(steps[0]?.kind).toBe("hub-translate");
});

test("hub store: normalizeProject migrates legacy ssh to sites", async () => {
  const { normalizeProject } = await import(HUB_STORE);
  const p = normalizeProject({
    id: "p1",
    name: "Legacy",
    ssh: { host: "10.0.0.1", user: "deploy", remotePath: "/var/www" },
    originLanguage: "php",
    outputLanguage: "typescript",
  });
  expect(p.sites.length).toBeGreaterThan(0);
  expect(p.sites[0].ssh?.host).toBe("10.0.0.1");
});

test("hub connectivity: buildRemoteScanShell prefers agent", async () => {
  const { buildRemoteScanShell } = await import(
    fileURLToPath(new URL("../../../scripts/chrysalis-hub-connectivity.mjs", import.meta.url)),
  );
  const sh = buildRemoteScanShell("/var/www/app");
  expect(sh).toContain("chrysalis-origin-scan");
  expect(sh).toContain("find ");
});
