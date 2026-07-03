#!/usr/bin/env node
/** Phase 41b.3 — Python → CWL / hono / fastify oracle product pairs (G8723). */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { runGoldVerifySuite } from "./hub-gold-verify.mjs";
import { runTraceReplaySuite } from "./hub-gold-trace-replay.mjs";

export const PYTHON_ORACLE_PRODUCT_SMOKE_KIND = "chrysalis.python-oracle-product-smoke";
export const PYTHON_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const ORACLE_PRODUCT_SUITES = [
  {
    id: "python-literal-cwl",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "cwl",
    structural: true,
    traceReplay: false,
    roundTrip: true,
  },
  {
    id: "python-literal-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-literal"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
  {
    id: "python-middleware-hono",
    fixture: join(scriptRoot, "fixtures/hub-gold-python-middleware"),
    origin: "python",
    emitTarget: "hono",
    structural: true,
    traceReplay: true,
  },
];

/** G8723 — structural gold + trace replay on python → cwl/hono product pairs. */
export async function runPythonOracleProductB3Gate() {
  const py = spawnSync("python", ["-c", "import ast"], { encoding: "utf8" });
  const py3 = spawnSync("python3", ["-c", "import ast"], { encoding: "utf8" });
  if (py.status !== 0 && py3.status !== 0) {
    return { ok: false, skip: "python-not-on-path" };
  }

  /** @type {Record<string, { verifyOk: boolean, replayOk: boolean }>} */
  const suites = {};
  let allOk = true;

  for (const suite of ORACLE_PRODUCT_SUITES) {
    const verify = await runGoldVerifySuite(suite);
    let replayOk = true;
    if (suite.traceReplay) {
      try {
        const replay = await runTraceReplaySuite(suite);
        replayOk = replay.ok === true;
      } catch {
        replayOk = false;
      }
    }
    const verifyOk = verify.ok === true;
    suites[suite.id] = { verifyOk, replayOk };
    if (!verifyOk || !replayOk) allOk = false;
  }

  return {
    ok: allOk,
    suites,
    suiteIds: ORACLE_PRODUCT_SUITES.map((s) => s.id),
  };
}

export async function runPythonOracleProductSmoke() {
  const progress = createSmokeProgress("python-oracle-product");
  const t0 = progress.start("Python oracle product (G8723)");
  const gate = await runPythonOracleProductB3Gate();
  progress.end("Python oracle product (G8723)", gate.ok === true, t0);
  return {
    kind: PYTHON_ORACLE_PRODUCT_SMOKE_KIND,
    schemaVersion: PYTHON_ORACLE_PRODUCT_SMOKE_SCHEMA_VERSION,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runPythonOracleProductSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-python-oracle-product-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
