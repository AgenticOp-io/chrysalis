import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const TRACE = resolve(ROOT, "scripts/hub-ingest/hub-gold-trace-replay.mjs");
const emitNextJsRoot = process.env.WPTP_EMIT_NEXTJS_ROOT ?? resolve(ROOT, "..", "wptp-emit-nextjs");
const nextjsEnv = { ...process.env, WPTP_EMIT_NEXTJS_ROOT: emitNextJsRoot };

const EXTENDED_SUITES = [
  "css-literal-hono",
  "scss-literal-fastify",
  "markdown-literal-nextjs",
  "yaml-literal-hono",
  "c-literal-fastify",
  "cpp-literal-nextjs",
] as const;

test("hub gold: extended asset origins structural + trace (G69)", () => {
  for (const suite of EXTENDED_SUITES) {
    const env = suite.endsWith("-nextjs") ? nextjsEnv : process.env;
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], { cwd: ROOT, encoding: "utf8", env });
    expect(r.status, `${suite} structural: ${r.stderr}`).toBe(0);
    const tr = spawnSync(
      process.execPath,
      ["--import", "tsx", TRACE, "--suite", suite],
      { cwd: ROOT, encoding: "utf8", env },
    );
    expect(tr.status, `${suite} trace: ${tr.stderr}`).toBe(0);
  }
}, 120_000);
