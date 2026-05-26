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
  expect(report.footprint.totalHoleCount).toBe(0);
}, 130_000);

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

test(
  "hub completion report passes (G27)",
  () => {
    const r = spawnSync(process.execPath, [HUB_COMPLETION], { cwd: ROOT, encoding: "utf8", timeout: 180_000 });
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.kind).toBe("chrysalis.hub.completion");
    expect(report.ok).toBe(true);
  },
  200_000,
);
