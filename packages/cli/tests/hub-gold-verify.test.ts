import { copyFile, mkdir, readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const GOLD_VERIFY = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const GOLD_FIXTURE = resolve(ROOT, "fixtures/hub-gold-js-literal");
const LIFT = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const EMIT_PY = resolve(ROOT, "scripts/hub-ingest/emit-python-from-hub.mjs");
const EMIT_JAVA = resolve(ROOT, "scripts/hub-ingest/emit-java-from-hub.mjs");
const EMIT_GO = resolve(ROOT, "scripts/hub-ingest/emit-go-from-hub.mjs");
const HUB_TRANSLATE = resolve(ROOT, "scripts/hub-ingest/hub-translate.mjs");
const HUB_COMPLETION = resolve(ROOT, "scripts/hub-ingest/hub-completion.mjs");

test("hub gold verify: literal javascript lift is hole-free and emits hono (G26)", () => {
  const r = spawnSync(process.execPath, [GOLD_VERIFY], { cwd: ROOT, encoding: "utf8", timeout: 120_000 });
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout);
  expect(report.kind).toBe("chrysalis.hub.gold-verify");
  expect(report.ok).toBe(true);
  expect(report.suiteCount).toBeGreaterThanOrEqual(14);
  const js = report.results?.find((r: { id?: string }) => r.id === "js-literal-hono");
  expect(js?.footprint?.totalHoleCount).toBe(0);
}, 180_000);

test("hub store: javascript to hono is gold (G26)", async () => {
  const hub = await import(fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url)));
  const route = hub.resolveHubRoute("javascript", "hono");
  expect(route.ok).toBe(true);
  expect(route.grade).toBe("gold");
  expect(route.action).toBe("hub-translate");
});

test("emit-python-from-hub writes Flask routes for lifted python", async () => {
  const py = process.env.CHRYSALIS_HUB_PYTHON ?? "python3";
  const check = spawnSync(py, ["-c", "import ast"], { encoding: "utf8" });
  if (check.status !== 0) return;

  const fixture = resolve(ROOT, "fixtures/hub-python-routes");
  const lift = spawnSync(process.execPath, [LIFT, fixture, "--language", "python"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(lift.status).toBe(0);

  const emit = spawnSync(process.execPath, [EMIT_PY, fixture, "--origin", "python"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(emit.status).toBe(0);
  const mainPy = await readFile(join(fixture, "generated/python/main.py"), "utf8");
  expect(mainPy).toContain("@app.route");
  expect(mainPy).toContain("/health");
  expect(mainPy).toContain("return True");
});

test("listHubWebRoutes finds literal bodies in hub-gold webir", async () => {
  const { listHubWebRoutes } = await import(
    resolve(ROOT, "scripts/hub-ingest/hub-webir-routes.mjs")
  );
  const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
  spawnSync(process.execPath, [LIFT, GOLD_FIXTURE, "--language", "javascript"], { cwd: ROOT });
  const raw = JSON.parse(
    await readFile(join(GOLD_FIXTURE, ".chrysalis/hub.javascript.webir.json"), "utf8"),
  );
  const routes = listHubWebRoutes(webir.moduleFromGoldenSnapshot(raw));
  expect(routes.length).toBeGreaterThanOrEqual(2);
  expect(routes.every((r) => r.body.kind === "literal")).toBe(true);
});

test("hub gold fixture lifts with zero holes", () => {
  const r = spawnSync(process.execPath, [LIFT, GOLD_FIXTURE, "--language", "javascript"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
  expect(report.holeCount).toBe(0);
  expect(report.astRouteCount).toBeGreaterThanOrEqual(2);
});

test("emit-java-from-hub and emit-go-from-hub write route stubs (G27)", async () => {
  for (const [lang, emitScript, fixture, file] of [
    ["java", EMIT_JAVA, "fixtures/hub-java-routes", "HealthController.java"],
    ["go", EMIT_GO, "fixtures/hub-go-routes", "main.go"],
  ] as const) {
    const lift = spawnSync(process.execPath, [LIFT, resolve(ROOT, fixture), "--language", lang], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(lift.status).toBe(0);
    const emit = spawnSync(process.execPath, [emitScript, resolve(ROOT, fixture), "--origin", lang], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(emit.status).toBe(0);
    const report = JSON.parse(emit.stdout.trim().split("\n").pop() ?? "{}");
    expect(report.routeCount).toBeGreaterThanOrEqual(2);
    if (lang === "java") {
      const src = await readFile(join(ROOT, fixture, "generated/java/src/main/java/hub/HubRoutes.java"), "utf8");
      expect(src).toContain("@GetMapping");
      expect(src).toContain("/health");
    } else {
      const src = await readFile(join(ROOT, fixture, "generated/go/main.go"), "utf8");
      expect(src).toContain("gin.Default");
      expect(src).toContain("/health");
    }
  }
});

test("hub-translate javascript to hono end-to-end", async () => {
  const dir = await mkdtemp(join(tmpdir(), "chrysalis-hub-translate-"));
  await mkdir(join(dir, "src"), { recursive: true });
  await copyFile(join(GOLD_FIXTURE, "src/app.js"), join(dir, "src/app.js"));
  const r = spawnSync(
    process.execPath,
    [HUB_TRANSLATE, dir, "--origin", "javascript", "--output", "hono"],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, CHRYSALIS_HUB_PREFER_WPTP: "0" } },
  );
  expect(r.status).toBe(0);
  const out = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
  expect(out.ok).toBe(true);
  const server = await readFile(join(dir, "generated/hono/src/server.ts"), "utf8");
  expect(server).toContain('app.get("/health"');
}, 60_000);

test("javascript AST lowers res.json object literal (G28)", async () => {
  const { liftJavaScriptFileToWebir } = await import(
    resolve(ROOT, "scripts/hub-ingest/javascript-ast-ingest.mjs")
  );
  const source = await readFile(resolve(ROOT, "fixtures/hub-js-routes/src/app.js"), "utf8");
  const webir = await import(resolve(ROOT, "packages/webir/dist/index.js"));
  const builder = new webir.ModuleBuilder({ sourceApp: "test" });
  const wr = webir.webRequest.builders(builder);
  const r = liftJavaScriptFileToWebir({
    webir,
    builder,
    wr,
    source,
    file: "app.js",
    language: "javascript",
  });
  expect(r.usedAst).toBe(true);
  expect(r.astRouteCount).toBeGreaterThanOrEqual(2);
  const mod = builder.finish();
  expect(webir.countHoles(mod)).toBeLessThan(4);
  const { listHubWebRoutes } = await import(resolve(ROOT, "scripts/hub-ingest/hub-webir-routes.mjs"));
  const routes = listHubWebRoutes(mod);
  const health = routes.find((x) => x.path === "/health");
  expect(health?.body.kind).toBe("literal");
  expect(health?.body.value).toEqual({ ok: true });
});

test("emit ruby csharp rust from hub webir (G28)", async () => {
  const fixture = resolve(ROOT, "fixtures/hub-pattern-lift/ruby");
  const lift = spawnSync(process.execPath, [LIFT, fixture, "--language", "ruby"], { cwd: ROOT, encoding: "utf8" });
  expect(lift.status).toBe(0);
  for (const script of [
    "emit-ruby-from-hub.mjs",
    "emit-csharp-from-hub.mjs",
    "emit-rust-from-hub.mjs",
  ]) {
    const lang = script.replace("emit-", "").replace("-from-hub.mjs", "");
    const dir =
      lang === "ruby"
        ? resolve(ROOT, "fixtures/hub-pattern-lift/ruby")
        : lang === "csharp"
          ? resolve(ROOT, "fixtures/hub-pattern-lift/csharp")
          : resolve(ROOT, "fixtures/hub-pattern-lift/rust");
    spawnSync(process.execPath, [LIFT, dir, "--language", lang], { cwd: ROOT });
    const emit = spawnSync(process.execPath, [resolve(ROOT, "scripts/hub-ingest", script), dir, "--origin", lang], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(emit.status).toBe(0);
  }
});

test(
  "hub gold trace replay in-process oracle (G28)",
  () => {
    const r = spawnSync(process.execPath, ["--import", "tsx", resolve(ROOT, "scripts/hub-ingest/hub-gold-trace-replay.mjs")], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const report = JSON.parse(text.slice(text.indexOf("{")));
    expect(report.kind).toBe("chrysalis.hub.trace-replay");
    expect(report.ok).toBe(true);
    expect(report.correctness).toBeGreaterThanOrEqual(1);
  },
  130_000,
);

test(
  "hub completion report passes (G27/G28)",
  () => {
    const r = spawnSync(process.execPath, [HUB_COMPLETION], { cwd: ROOT, encoding: "utf8", timeout: 240_000 });
    expect(r.status).toBe(0);
    const text = r.stdout.trim();
    const report = JSON.parse(text.slice(text.indexOf("{")));
    expect(report.kind).toBe("chrysalis.hub.completion");
    expect(report.ok).toBe(true);
    expect(report.traceReplay?.ok).toBe(true);
  },
  250_000,
);
