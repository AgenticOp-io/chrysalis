import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const LIFT = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const FIXTURE = resolve(ROOT, "fixtures/hub-gold-vue-literal");

test("hub lift: vue SFC script uses javascript AST (G67)", () => {
  const r = spawnSync(process.execPath, [LIFT, FIXTURE, "--language", "vue"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}") as {
    holeCount?: number;
    astRouteCount?: number;
    routeCount?: number;
  };
  expect(report.holeCount).toBe(0);
  expect(report.astRouteCount).toBeGreaterThan(0);
  expect(report.routeCount).toBeGreaterThan(0);
});
