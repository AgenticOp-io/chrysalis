import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const TRACE = resolve(ROOT, "scripts/hub-ingest/hub-gold-trace-replay.mjs");

const NEXTJS_SUITES = [
  "js-literal-nextjs",
  "ts-literal-nextjs",
  "js-structured-nextjs",
  "ts-structured-nextjs",
] as const;

function parseLastJson(stdout: string) {
  const text = stdout.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : "{}") as {
    ok?: boolean;
    correctness?: number;
  };
}

test("hub gold: JS/TS literal and structured Next.js structural (G56–G57)", () => {
  for (const suite of NEXTJS_SUITES) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
      env: {
        ...process.env,
        WPTP_EMIT_NEXTJS_ROOT:
          process.env.WPTP_EMIT_NEXTJS_ROOT ?? resolve(ROOT, "..", "wptp-emit-nextjs"),
      },
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
}, 300_000);

test("hub gold trace replay: Next.js literal and structured (G57)", () => {
  for (const suite of NEXTJS_SUITES) {
    const r = spawnSync(process.execPath, [TRACE, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
      env: {
        ...process.env,
        WPTP_EMIT_NEXTJS_ROOT:
          process.env.WPTP_EMIT_NEXTJS_ROOT ?? resolve(ROOT, "..", "wptp-emit-nextjs"),
      },
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
    const j = parseLastJson(r.stdout);
    expect(j.ok).toBe(true);
    expect(j.correctness).toBe(1);
  }
}, 300_000);
