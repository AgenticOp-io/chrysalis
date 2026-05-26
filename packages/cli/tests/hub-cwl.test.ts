import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const LIFT = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const PARSER = resolve(ROOT, "scripts/hub-ingest/cwl-parser.mjs");
const FIXTURE = resolve(ROOT, "fixtures/hub-gold-cwl");

test("cwl parser: routes and literals", async () => {
  const { parseCwlModule } = await import(PARSER);
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(resolve(FIXTURE, "routes.cwl"), "utf8");
  const mod = parseCwlModule(src, "routes.cwl");
  expect(mod.routes.length).toBe(3);
  expect(mod.routes.find((r) => r.path === "/meta")?.body.kind).toBe("object");
});

test("lift-to-webir cwl is hole-free on gold fixture", () => {
  const r = spawnSync(process.execPath, [LIFT, FIXTURE, "--language", "cwl"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(r.status).toBe(0);
  const report = JSON.parse(r.stdout.trim().split("\n").pop() ?? "{}");
  expect(report.holeCount).toBe(0);
  expect(report.astRouteCount).toBe(3);
});

test("hub gold verify includes cwl suite", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "cwl-gold-hono"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
}, 130_000);

test("hub store: cwl to hono is gold", async () => {
  const hub = await import(fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url)));
  const route = hub.resolveHubRoute("cwl", "hono");
  expect(route.grade).toBe("gold");
});

test("hub gold verify: cwl round-trip structural (G34)", () => {
  const r = spawnSync(process.execPath, [GOLD, "--suite", "cwl-gold-roundtrip"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(r.status).toBe(0);
  const text = r.stdout.trim();
  const report = JSON.parse(text.slice(text.indexOf("{")));
  expect(report.ok).toBe(true);
  expect(report.results?.[0]?.roundTrip?.routeCount).toBe(3);
}, 130_000);

test("hub store: javascript to cwl is gold (G34)", async () => {
  const hub = await import(fileURLToPath(new URL("../../../scripts/chrysalis-hub-store.mjs", import.meta.url)));
  expect(hub.resolveHubRoute("javascript", "cwl").grade).toBe("gold");
  expect(hub.resolveHubRoute("typescript", "cwl").grade).toBe("gold");
});
