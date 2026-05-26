import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const matrixRoot = process.env.WPTP_MATRIX_ROOT ?? resolve(ROOT, "..", "wptp-matrix");
const emitNextJsRoot = process.env.WPTP_EMIT_NEXTJS_ROOT ?? resolve(ROOT, "..", "wptp-emit-nextjs");

test("hub gold: WPTP contract-first hono and nextjs (G58)", () => {
  if (!existsSync(matrixRoot)) {
    return;
  }
  for (const suite of ["contract-first-hono", "contract-first-nextjs"] as const) {
    if (suite.endsWith("nextjs") && !existsSync(resolve(emitNextJsRoot, "dist/index.js"))) {
      continue;
    }
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 180_000,
      env: {
        ...process.env,
        WPTP_MATRIX_ROOT: matrixRoot,
        WPTP_EMIT_NEXTJS_ROOT: emitNextJsRoot,
      },
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
}, 360_000);
