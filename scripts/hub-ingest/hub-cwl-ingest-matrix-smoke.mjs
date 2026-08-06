#!/usr/bin/env node
/**
 * Convert **consumes** CWL ingest matrix — does not own thin lift golds.
 * Spawns chrysalis-cwl `smoke:cwl-ingest-matrix` when sibling CWL exists.
 * Honest skip when pillar absent.
 *
 * Gate: hub:cwl-ingest-matrix-smoke → CWL_INGEST_MATRIX_OK | CWL_INGEST_MATRIX_SKIP
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function resolveCwlRoot() {
  if (process.env.CHRYSALIS_CWL_ROOT) return resolve(process.env.CHRYSALIS_CWL_ROOT);
  return resolve(ROOT, "../chrysalis-cwl");
}

export async function runCwlIngestMatrixSmoke(opts = {}) {
  const requireMatrix =
    opts.requireMatrix === true ||
    process.env.CHRYSALIS_CWL_INGEST_MATRIX_REQUIRE === "1";
  const cwlRoot = resolveCwlRoot();
  const script = join(cwlRoot, "scripts/smoke-cwl-ingest-matrix.mjs");

  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];
  const present = existsSync(script);
  checks.push({
    id: "cwl-ingest-matrix-script",
    ok: present || !requireMatrix,
    detail: present ? script.replace(/\\/g, "/") : "missing — SKIP",
  });

  let skipped = false;
  let token = "CWL_INGEST_MATRIX_FAIL";
  let matrixOk = false;

  if (!present) {
    skipped = true;
    token = "CWL_INGEST_MATRIX_SKIP";
    matrixOk = !requireMatrix;
  } else {
    const r = spawnSync(process.execPath, [script], {
      cwd: cwlRoot,
      encoding: "utf8",
      env: { ...process.env, CHRYSALIS_CWL_ROOT: cwlRoot },
      timeout: 180_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    matrixOk = r.status === 0 && /CWL_INGEST_MATRIX_OK/.test(r.stdout || "");
    checks.push({
      id: "cwl-smoke-cwl-ingest-matrix",
      ok: matrixOk,
      detail: matrixOk
        ? "CWL_INGEST_MATRIX_OK (01+02+24-dna-bridge; owned by chrysalis-cwl)"
        : (r.stderr || r.stdout || "").slice(-500),
    });
    token = matrixOk ? "CWL_INGEST_MATRIX_OK" : "CWL_INGEST_MATRIX_FAIL";
  }

  const ok = skipped ? !requireMatrix : matrixOk && checks.every((c) => c.ok);
  const report = {
    kind: "chrysalis.hub.cwl-ingest-matrix-smoke",
    schemaVersion: 1,
    ok,
    skipped,
    token,
    owner: "chrysalis-cwl (Convert consumes only)",
    checks,
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(ROOT, "reports/pilot-kit");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "cwl-ingest-matrix-smoke.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

async function main() {
  const requireMatrix = process.argv.includes("--require");
  const r = await runCwlIngestMatrixSmoke({ requireMatrix });
  console.log(JSON.stringify(r, null, 2));
  console.log(r.token);
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-ingest-matrix-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
