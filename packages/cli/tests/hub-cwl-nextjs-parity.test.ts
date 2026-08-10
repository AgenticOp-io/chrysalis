import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { expect, test } from "vitest";
import { resolveWptpRepoRoot } from "../../../scripts/lib/wptp-siblings.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const LIFT = resolve(ROOT, "scripts/hub-ingest/lift-to-webir.mjs");
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const FIXTURE = resolve(ROOT, "fixtures/hub-gold-cwl");
const emitNextJsRoot = resolveWptpRepoRoot(ROOT, "wptp-emit-nextjs");

function countNextjsRouteFiles(appDir: string): number {
  let n = 0;
  function walk(dir: string) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && ent.name === "route.ts") n += 1;
    }
  }
  walk(appDir);
  return n;
}

test("cwl gold: hono, fastify, and nextjs structural verify (G64)", () => {
  if (!existsSync(resolve(emitNextJsRoot, "dist/index.js"))) return;
  for (const suite of ["cwl-gold-hono", "cwl-gold-fastify", "cwl-gold-nextjs"] as const) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
      env: { ...process.env, WPTP_EMIT_NEXTJS_ROOT: emitNextJsRoot },
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
}, 360_000);

test("cwl gold: nextjs handler count matches lifted route count (G64 parity)", () => {
  if (!existsSync(resolve(emitNextJsRoot, "dist/index.js"))) return;
  const lift = spawnSync(process.execPath, [LIFT, FIXTURE, "--language", "cwl"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(lift.status).toBe(0);
  const liftReport = JSON.parse(lift.stdout.trim().split("\n").pop() ?? "{}") as { routeCount?: number };
  const expectedRoutes = liftReport.routeCount ?? 0;
  expect(expectedRoutes).toBeGreaterThan(0);

  const emit = spawnSync(process.execPath, [GOLD, "--suite", "cwl-gold-nextjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, WPTP_EMIT_NEXTJS_ROOT: emitNextJsRoot },
  });
  expect(emit.status).toBe(0);

  const appDir = join(FIXTURE, "generated", "nextjs", "app");
  expect(existsSync(appDir)).toBe(true);
  expect(countNextjsRouteFiles(appDir)).toBe(expectedRoutes);
}, 180_000);

test("cwl gold: round-trip and nextjs coexist on same fixture (G64)", () => {
  const round = spawnSync(process.execPath, [GOLD, "--suite", "cwl-gold-roundtrip"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
  });
  expect(round.status).toBe(0);
  if (!existsSync(resolve(emitNextJsRoot, "dist/index.js"))) return;
  const njs = spawnSync(process.execPath, [GOLD, "--suite", "cwl-gold-nextjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, WPTP_EMIT_NEXTJS_ROOT: emitNextJsRoot },
  });
  expect(njs.status).toBe(0);
}, 240_000);
