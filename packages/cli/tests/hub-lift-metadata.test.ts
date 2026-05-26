import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const LIFT = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");

test("lift-to-webir: middleware fixture reports middlewareUseCount", () => {
  const r = spawnSync(
    process.execPath,
    [LIFT, resolve(ROOT, "fixtures/hub-gold-js-middleware"), "--language", "javascript"],
    { cwd: ROOT, encoding: "utf8" },
  );
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
  expect(report.middlewareUseCount).toBeGreaterThanOrEqual(1);
  expect(report.holeCount).toBe(0);
});

test("resolveHubPython returns a working interpreter", async () => {
  const { resolveHubPython } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/shared.mjs", import.meta.url))
  );
  const { parsePythonRoutes } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/python-ast-ingest.mjs", import.meta.url))
  );
  const py = resolveHubPython();
  const check = spawnSync(py, ["-c", "import ast"], { encoding: "utf8" });
  expect(check.status).toBe(0);
  const { routes } = parsePythonRoutes(
    '@app.get("/x")\ndef x():\n    return 1\n',
  );
  expect(routes.length).toBe(1);
});

test("countExpressMiddlewareUses detects app.use", async () => {
  const { countExpressMiddlewareUses } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/javascript-ast-ingest.mjs", import.meta.url))
  );
  const n = countExpressMiddlewareUses('const app = require("express")();\napp.use(require("express").json());\n');
  expect(n).toBe(1);
});
