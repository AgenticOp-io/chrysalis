import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const TRACE = resolve(ROOT, "scripts/hub-ingest/hub-gold-trace-replay.mjs");
const emitNextJsRoot = process.env.WPTP_EMIT_NEXTJS_ROOT ?? resolve(ROOT, "..", "wptp-emit-nextjs");
const nextjsEnv = { ...process.env, WPTP_EMIT_NEXTJS_ROOT: emitNextJsRoot };

const CROSS_FRAMEWORK_SUITES = [
  "ruby-literal-hono",
  "ruby-literal-fastify",
  "java-literal-hono",
  "java-literal-fastify",
  "go-literal-hono",
  "go-literal-fastify",
  "csharp-literal-hono",
  "csharp-literal-fastify",
  "rust-literal-hono",
  "rust-literal-fastify",
] as const;

const CROSS_FRAMEWORK_CWL_SUITES = [
  "ruby-literal-cwl",
  "java-literal-cwl",
  "go-literal-cwl",
  "csharp-literal-cwl",
  "rust-literal-cwl",
] as const;

const CROSS_FRAMEWORK_NEXTJS_SUITES = [
  "ruby-literal-nextjs",
  "java-literal-nextjs",
  "go-literal-nextjs",
  "csharp-literal-nextjs",
  "rust-literal-nextjs",
] as const;

const KSS_FRAMEWORK_NEXTJS_SUITES = [
  "kotlin-literal-nextjs",
  "scala-literal-nextjs",
  "swift-literal-nextjs",
] as const;

const KSS_FRAMEWORK_SUITES = [
  "kotlin-literal-hono",
  "kotlin-literal-fastify",
  "kotlin-literal-cwl",
  "scala-literal-hono",
  "scala-literal-fastify",
  "scala-literal-cwl",
  "swift-literal-hono",
  "swift-literal-fastify",
  "swift-literal-cwl",
] as const;

test("hub gold: pattern-lift origins emit to hono and fastify (G49–G50)", () => {
  for (const suite of CROSS_FRAMEWORK_SUITES) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
}, 300_000);

test("hub gold: pattern-lift origins emit to CWL (G53)", () => {
  for (const suite of CROSS_FRAMEWORK_CWL_SUITES) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
}, 300_000);

test("hub gold: kotlin/scala/swift emit to hono/fastify/cwl (G54)", () => {
  for (const suite of KSS_FRAMEWORK_SUITES) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
}, 300_000);

test("hub gold: pattern-lift origins emit to nextjs (G63)", () => {
  for (const suite of [...CROSS_FRAMEWORK_NEXTJS_SUITES, ...KSS_FRAMEWORK_NEXTJS_SUITES]) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
      env: nextjsEnv,
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
}, 360_000);

test("hub gold trace replay: go and csharp hono (G49–G50)", () => {
  for (const suite of ["go-literal-hono", "csharp-literal-hono"] as const) {
    const r = spawnSync(process.execPath, [TRACE, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
    const text = r.stdout.trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const j = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : "{}") as {
      ok?: boolean;
      correctness?: number;
    };
    expect(j.ok).toBe(true);
    expect(j.correctness).toBe(1);
  }
}, 180_000);
