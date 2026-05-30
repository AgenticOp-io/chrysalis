import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DISCOVER = resolve(ROOT, "scripts/hub-ingest/discover-contract-artifacts.mjs");
const LIFT_HEURISTIC = resolve(ROOT, "scripts/hub-ingest/lift-routes-heuristic.mjs");
const LIFT = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const CONTRACT_FIXTURE = resolve(ROOT, "fixtures/hub-contract-first");
const JS_ROUTES_FIXTURE = resolve(ROOT, "fixtures/hub-js-routes");

test("discoverContractArtifacts finds nested openapi.json", async () => {
  const { discoverContractArtifacts } = await import(DISCOVER);
  const found = await discoverContractArtifacts(CONTRACT_FIXTURE);
  expect(found.openapi).toMatch(/openapi\.json$/);
  expect(found.openapis.length).toBeGreaterThan(0);
});

test("detectHttpRoutesInSource finds express routes", async () => {
  const { detectHttpRoutesInSource } = await import(LIFT_HEURISTIC);
  const src = `app.get('/a', () => {});\napp.post("/b", () => {});`;
  const routes = detectHttpRoutesInSource(src, "src/app.js");
  expect(routes.map((r) => `${r.method} ${r.path}`).sort()).toEqual(["GET /a", "POST /b"]);
});

test("lift-to-webir javascript uses AST route ingest (G21)", async () => {
  const dir = await mkdtemp(join(tmpdir(), "chrysalis-hub-lift-"));
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src", "app.js"), await readFile(join(JS_ROUTES_FIXTURE, "src/app.js"), "utf8"));
  const r = spawnSync(process.execPath, [LIFT, dir, "--language", "javascript"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
  expect(report.schemaVersion).toBe(2);
  expect(report.astRouteCount).toBeGreaterThanOrEqual(2);
  expect(report.heuristicRouteCount).toBe(0);
  expect(report.routeCount).toBeGreaterThanOrEqual(2);
  expect(report.holeCount).toBeGreaterThanOrEqual(0);
});

test("javascript AST lowers literal return handler body", async () => {
  const { parseJavaScriptSource, liftJavaScriptFileToWebir } = await import(
    resolve(ROOT, "scripts/hub-ingest/javascript-ast-ingest.mjs")
  );
  const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
  const source = `const app = {};\napp.get('/ping', () => 42);\n`;
  const ast = parseJavaScriptSource(source, "ping.js");
  expect(ast.type).toBe("Program");
  const builder = new webir.ModuleBuilder({ sourceApp: "test" });
  const wr = webir.webRequest.builders(builder);
  const r = liftJavaScriptFileToWebir({
    webir,
    builder,
    wr,
    source,
    file: "ping.js",
    language: "javascript",
  });
  expect(r.usedAst).toBe(true);
  expect(r.astRouteCount).toBe(1);
  const mod = builder.finish();
  expect(webir.countHoles(mod)).toBe(0);
});

test("python AST finds Flask routes and lowers literal return", async () => {
  const py = process.env.CHRYSALIS_HUB_PYTHON ?? "python3";
  const check = spawnSync(py, ["-c", "import ast, json; print('ok')"], { encoding: "utf8" });
  if (check.status !== 0) {
    return;
  }
  const { parsePythonRoutes, liftPythonFileToWebir } = await import(
    resolve(ROOT, "scripts/hub-ingest/python-ast-ingest.mjs")
  );
  const source = await readFile(resolve(ROOT, "fixtures/hub-python-routes/app.py"), "utf8");
  const parsed = parsePythonRoutes(source);
  expect(parsed.routes.length).toBeGreaterThanOrEqual(2);
  const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
  const builder = new webir.ModuleBuilder({ sourceApp: "test-py" });
  const wr = webir.webRequest.builders(builder);
  const r = liftPythonFileToWebir({
    webir,
    builder,
    wr,
    source,
    file: "app.py",
    language: "python",
  });
  expect(r.usedAst).toBe(true);
  expect(r.astRouteCount).toBeGreaterThanOrEqual(2);
});

test("lift-to-webir python uses AST when python3 available", async () => {
  const py = process.env.CHRYSALIS_HUB_PYTHON ?? "python3";
  const check = spawnSync(py, ["-c", "import ast"], { encoding: "utf8" });
  if (check.status !== 0) return;

  const dir = await mkdtemp(join(tmpdir(), "chrysalis-hub-py-"));
  await writeFile(join(dir, "app.py"), await readFile(resolve(ROOT, "fixtures/hub-python-routes/app.py"), "utf8"));
  const r = spawnSync(process.execPath, [LIFT, dir, "--language", "python"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
  expect(report.astRouteCount).toBeGreaterThanOrEqual(2);
});

test("java AST finds Spring mappings", async () => {
  const { parseJavaRoutes, liftJavaFileToWebir } = await import(
    resolve(ROOT, "scripts/hub-ingest/java-ast-ingest.mjs")
  );
  const source = await readFile(resolve(ROOT, "fixtures/hub-java-routes/HealthController.java"), "utf8");
  const routes = parseJavaRoutes(source, "HealthController.java");
  expect(routes.length).toBeGreaterThanOrEqual(2);
  const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
  const builder = new webir.ModuleBuilder({ sourceApp: "test-java" });
  const wr = webir.webRequest.builders(builder);
  const r = liftJavaFileToWebir({
    webir,
    builder,
    wr,
    source,
    file: "HealthController.java",
    language: "java",
  });
  expect(r.usedAst).toBe(true);
  const mod = builder.finish();
  expect(mod.roots.length).toBeGreaterThanOrEqual(2);
});

test("go AST finds gin routes", async () => {
  const { parseGoRoutes, liftGoFileToWebir } = await import(
    resolve(ROOT, "scripts/hub-ingest/go-ast-ingest.mjs")
  );
  const source = await readFile(resolve(ROOT, "fixtures/hub-go-routes/main.go"), "utf8");
  const routes = parseGoRoutes(source, "main.go");
  expect(routes.map((r) => `${r.method} ${r.path}`).sort()).toEqual(["GET /health", "POST /items"]);
  const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
  const builder = new webir.ModuleBuilder({ sourceApp: "test-go" });
  const wr = webir.webRequest.builders(builder);
  liftGoFileToWebir({ webir, builder, wr, source, file: "main.go", language: "go" });
  expect(builder.finish().roots.length).toBe(2);
});

test("lift-to-webir java and go", async () => {
  for (const [lang, fixture, file] of [
    ["java", "fixtures/hub-java-routes", "HealthController.java"],
    ["go", "fixtures/hub-go-routes", "main.go"],
  ] as const) {
    const dir = await mkdtemp(join(tmpdir(), `chrysalis-hub-${lang}-`));
    await writeFile(join(dir, file), await readFile(resolve(ROOT, fixture, file), "utf8"));
    const r = spawnSync(process.execPath, [LIFT, dir, "--language", lang], { cwd: ROOT, encoding: "utf8" });
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
    expect(report.astRouteCount).toBeGreaterThanOrEqual(2);
  }
});

test("hub store: outputSupportsContractSilver", async () => {
  const hub = await import(fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url)));
  expect(hub.outputSupportsContractSilver("hono")).toBe(true);
  expect(hub.outputSupportsContractSilver("nextjs")).toBe(true);
  expect(hub.outputSupportsContractSilver("java")).toBe(false);
});

test("pattern route parsers find ruby and rust routes (G25)", async () => {
  const { parseRubyRoutes, parseRustRoutes } = await import(
    resolve(ROOT, "scripts/hub-ingest/pattern-route-parsers.mjs")
  );
  const ruby = await readFile(resolve(ROOT, "fixtures/hub-pattern-lift/ruby/config.ru"), "utf8");
  expect(parseRubyRoutes(ruby).map((r) => `${r.method} ${r.path}`).sort()).toEqual([
    "GET /health",
    "POST /items",
  ]);
  const rust = await readFile(resolve(ROOT, "fixtures/hub-pattern-lift/rust/main.rs"), "utf8");
  expect(parseRustRoutes(rust).map((r) => `${r.method} ${r.path}`).sort()).toEqual([
    "GET /health",
    "POST /items",
  ]);
});

test(
  "hub matrix smoke passes for all hub-pattern-lift fixtures (G25)",
  async () => {
    const smoke = resolve(ROOT, "scripts/hub-ingest/hub-matrix-smoke.mjs");
    const r = spawnSync(process.execPath, [smoke], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.kind).toBe("chrysalis.hub.matrix-smoke");
    expect(report.failed).toBe(0);
    expect(report.passed).toBeGreaterThanOrEqual(20);
  },
  130_000,
);
