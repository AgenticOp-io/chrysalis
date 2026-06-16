import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");
const worker = resolve(ROOT, "scripts/hub-ingest/hub-verify-http-probe-worker.mjs");
const plainPhp = resolve(ROOT, "fixtures/hub-flagship-plain-php");

function parseStdoutJson(stdout: string) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return JSON.parse(text.slice(start, end + 1)) as {
    ok?: boolean;
    routeCount?: number;
    traceCount?: number;
    corpus?: { traces?: unknown[] };
  };
}

describe("hub-verify-http-probe-worker", () => {
  it("probes plain-php hono in isolated subprocess", () => {
    const r = spawnSync(
      process.execPath,
      ["--import", "tsx", worker, plainPhp, "--origin", "php", "--target", "hono"],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    expect(r.status, r.stderr || r.stdout).toBe(0);
    const parsed = parseStdoutJson(r.stdout ?? "");
    expect(parsed?.ok).toBe(true);
    expect(parsed?.routeCount).toBeGreaterThan(0);
    expect(parsed?.traceCount).toBe(parsed?.routeCount);
    expect(parsed?.corpus?.traces?.length).toBe(parsed?.routeCount);
  });
});
