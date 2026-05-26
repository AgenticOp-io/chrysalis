#!/usr/bin/env node
/**
 * WPTP contract-first gold smoke: any origin with OpenAPI → hono compose when wptp-matrix sibling exists.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/hub-contract-first");
const composeScript = join(scriptRoot, "scripts/hub-ingest/wptp-compose-site.mjs");
const matrixRoot = process.env.WPTP_MATRIX_ROOT ?? join(scriptRoot, "..", "wptp-matrix");

function main() {
  if (!existsSync(composeScript)) {
    console.log(JSON.stringify({ kind: "chrysalis.hub.wptp-gold-smoke", ok: false, skip: "no-compose-script" }));
    process.exit(0);
  }
  if (!existsSync(matrixRoot)) {
    console.log(
      JSON.stringify({
        kind: "chrysalis.hub.wptp-gold-smoke",
        ok: false,
        skip: "no-wptp-matrix",
        matrixRoot,
      }),
    );
    process.exit(0);
  }

  const r = spawnSync(
    process.execPath,
    [composeScript, fixture, "--output", "hono", "--origin", "python"],
    {
      cwd: scriptRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CHRYSALIS_ROOT: scriptRoot,
        WPTP_MATRIX_ROOT: matrixRoot,
        WPTP_EMIT_NEXTJS_ROOT: process.env.WPTP_EMIT_NEXTJS_ROOT ?? join(scriptRoot, "..", "wptp-emit-nextjs"),
      },
    },
  );
  const ok = r.status === 0;
  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.wptp-gold-smoke",
        schemaVersion: 0,
        ok,
        matrixRoot,
        stdout: r.stdout?.slice(-2000) ?? "",
        stderr: r.stderr?.slice(-2000) ?? "",
      },
      null,
      2,
    ),
  );
  process.exit(ok ? 0 : 1);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
