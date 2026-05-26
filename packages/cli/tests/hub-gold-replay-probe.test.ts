import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const TRACE = resolve(ROOT, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

test("hub gold replay probe: middleware hono POST echo replays (G43)", () => {
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", TRACE, "--suite", "js-middleware-hono"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  expect(r.status, r.stderr || r.stdout).toBe(0);
  const text = r.stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const report = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : "{}");
  expect(report.ok).toBe(true);
  expect(report.correctness).toBe(1);
  const detail = report.results?.[0];
  expect(detail?.traceCount).toBe(2);
  expect(detail?.report?.endpoints?.some((e: { route: string }) => e.route === "POST /echo")).toBe(
    true,
  );
});

test("hubGoldReplayFetchInit sends JSON body for POST when express.json lowered", async () => {
  const { hubGoldReplayFetchInit } = await import(
    fileURLToPath(new URL("../../../scripts/hub-ingest/hub-gold-replay-probe.mjs", import.meta.url))
  );
  const presets = new Set(["express.json"]);
  const init = hubGoldReplayFetchInit("POST", presets);
  expect(init.headers?.["content-type"]).toContain("application/json");
  expect(init.body).toContain("probe");
});
