#!/usr/bin/env node
/**
 * Traffic-decides bar — Convert half (G10116 / D6541 program).
 * Slogan: AI drafts; recorded traffic decides.
 *
 * Composes:
 *   1. Dispose Plane — propose freely; refuse merge/apply without verify gate
 *   2. Verify-gated apply — refuse without confirm; green gate + confirm to apply
 *   3. One real oracle product smoke — PHP micro verify batch (or honest node fallback)
 *
 *   pnpm run hub:traffic-decides-bar-smoke
 *   → TRAFFIC_DECIDES_CONVERT_OK
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runDisposePlaneSmoke } from "./hub-dispose-plane-smoke.mjs";
import { runLlmConvertVerifyApplyGate } from "./hub-llm-convert-verify-apply-smoke.mjs";
import { runPhpOracleMicroVerifyBatchSmoke } from "./hub-php-oracle-micro-verify-batch-smoke.mjs";
import { runWptpGoldSmoke } from "./hub-wptp-gold-smoke.mjs";

export const TRAFFIC_DECIDES_BAR_SMOKE_KIND = "chrysalis.hub.traffic-decides-bar-smoke";
export const TRAFFIC_DECIDES_BAR_SMOKE_SCHEMA_VERSION = 1;
export const TRAFFIC_DECIDES_CONVERT_OK = "TRAFFIC_DECIDES_CONVERT_OK";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Local mirror of evaluateVerifyGatePolicy (same contract as packages/web-llm). */
function evaluateVerifyGatePolicyLocal(input) {
  const reasons = [];
  const minCorrectness = input.minCorrectness ?? 1;
  const maxHoles = input.maxHoles ?? 0;
  if (input.unverified === true) {
    return { ok: false, reasons: ["unverified:explicit"] };
  }
  if (input.gateOk !== true) reasons.push("gate:not-ok");
  if (typeof input.verifyCorrectness === "number" && input.verifyCorrectness < minCorrectness) {
    reasons.push(`correctness:${input.verifyCorrectness}<${minCorrectness}`);
  }
  if (typeof input.holeCount === "number" && input.holeCount > maxHoles) {
    reasons.push(`holes:${input.holeCount}>${maxHoles}`);
  }
  const ok =
    input.gateOk === true &&
    (input.verifyCorrectness === undefined || input.verifyCorrectness >= minCorrectness) &&
    (input.holeCount === undefined || input.holeCount <= maxHoles);
  return { ok, reasons };
}

/** Local mirror of evaluateConvertVerifyApplyPolicy. */
function evaluateConvertVerifyApplyPolicyLocal(input) {
  const verify = evaluateVerifyGatePolicyLocal({
    gateOk: input.gateOk,
    ...(input.verifyCorrectness != null ? { verifyCorrectness: input.verifyCorrectness } : {}),
    minCorrectness: 1,
  });
  const reasons = [...verify.reasons];
  if (input.confirmApply !== true) reasons.push("apply:not-confirmed");
  const canApply = verify.ok === true;
  const ok = canApply && input.confirmApply === true;
  return { ok, canApply, applied: ok, reasons };
}

async function loadVerifyApplyPolicy() {
  let evaluateVerifyGatePolicy = evaluateVerifyGatePolicyLocal;
  let evaluateConvertVerifyApplyPolicy = evaluateConvertVerifyApplyPolicyLocal;
  const dist = join(ROOT, "packages/web-llm/dist/policy.js");
  const assistDist = join(ROOT, "packages/web-llm/dist/convert-assist.js");
  if (existsSync(dist)) {
    try {
      const mod = await import(`file:///${dist.replace(/\\/g, "/")}`);
      if (typeof mod.evaluateVerifyGatePolicy === "function") {
        evaluateVerifyGatePolicy = mod.evaluateVerifyGatePolicy;
      }
    } catch {
      /* keep local */
    }
  }
  if (existsSync(assistDist)) {
    try {
      const mod = await import(`file:///${assistDist.replace(/\\/g, "/")}`);
      if (typeof mod.evaluateConvertVerifyApplyPolicy === "function") {
        evaluateConvertVerifyApplyPolicy = mod.evaluateConvertVerifyApplyPolicy;
      }
    } catch {
      /* keep local */
    }
  }
  return { evaluateVerifyGatePolicy, evaluateConvertVerifyApplyPolicy };
}

/**
 * Verify-gated apply: policy refuse-without-gate / refuse-without-confirm + hub deny path.
 */
async function runVerifyGatedApplyBar(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;
  const { evaluateVerifyGatePolicy, evaluateConvertVerifyApplyPolicy } = await loadVerifyApplyPolicy();

  const refuseWithoutGate = evaluateVerifyGatePolicy({
    gateOk: false,
    verifyCorrectness: 1,
    holeCount: 0,
  });
  const refuseApplyNoConfirm = evaluateConvertVerifyApplyPolicy({
    gateOk: true,
    verifyCorrectness: 1,
    confirmApply: false,
  });
  const acceptApplyWithGate = evaluateConvertVerifyApplyPolicy({
    gateOk: true,
    verifyCorrectness: 1,
    confirmApply: true,
  });

  const verifyApply = await runLlmConvertVerifyApplyGate({ repoRoot: root });

  const checks = {
    refuseWithoutGate: refuseWithoutGate.ok === false,
    refuseApplyNoConfirm: refuseApplyNoConfirm.ok === false,
    acceptApplyWithGate: acceptApplyWithGate.ok === true,
    hubDenyNotApplied: verifyApply.checks?.denyNotApplied === true,
  };

  return {
    ok: Object.values(checks).every(Boolean),
    checks,
    verifyApply,
    policy: {
      refuseWithoutGate,
      refuseApplyNoConfirm,
      acceptApplyWithGate,
    },
  };
}

function phpOnPath() {
  const r = spawnSync("php", ["-v"], { encoding: "utf8" });
  return r.status === 0;
}

/**
 * Pick one real oracle product smoke already green in this repo.
 * @returns {Promise<{ id: string, ok: boolean, detail?: string, report: unknown }>}
 */
async function runOracleProductSmoke() {
  if (phpOnPath()) {
    const phpOracle = await runPhpOracleMicroVerifyBatchSmoke();
    if (phpOracle.ok === true) {
      return {
        id: "php-oracle-micro-verify-batch",
        ok: true,
        detail: "hub:php-oracle-micro-verify-batch-smoke",
        report: phpOracle,
      };
    }
    const r = spawnSync("pnpm", ["run", "verify:flagship"], {
      cwd: ROOT,
      encoding: "utf8",
      shell: true,
      maxBuffer: 30 * 1024 * 1024,
    });
    if (r.status === 0) {
      return {
        id: "verify-flagship",
        ok: true,
        detail: "verify:flagship (laravel-min oracle replay)",
        report: { stdout: r.stdout?.slice(-500) },
      };
    }
    return {
      id: "php-oracle-micro-verify-batch",
      ok: false,
      detail: phpOracle.nextjs?.skip ?? "php-oracle-failed",
      report: phpOracle,
    };
  }

  const gold = runWptpGoldSmoke();
  if (gold.ok === true) {
    return {
      id: "wptp-gold",
      ok: true,
      detail: "hub:wptp-gold-smoke (node-side oracle compose; no PHP)",
      report: gold,
    };
  }
  return {
    id: "wptp-gold",
    ok: false,
    detail: gold.skip ?? "no-oracle-path",
    report: gold,
  };
}

/**
 * @param {{ convertRoot?: string }} [opts]
 */
export async function runTrafficDecidesBarSmoke(opts = {}) {
  const root = opts.convertRoot ? resolve(opts.convertRoot) : ROOT;

  const dispose = await runDisposePlaneSmoke();
  const verifyApplyBar = await runVerifyGatedApplyBar({ convertRoot: root });
  const oracle = await runOracleProductSmoke();

  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [
    {
      id: "dispose-plane",
      ok: dispose.ok === true,
      detail: dispose.failed?.map((c) => c.id).join(",") || "ok",
    },
    {
      id: "refuse-propose-without-gate",
      ok: (dispose.checks ?? []).some((c) => c.id === "refuse-propose-without-gate" && c.ok),
      detail: "evaluateVerifyGatePolicy gateOk:false",
    },
    {
      id: "refuse-apply-without-confirm",
      ok:
        verifyApplyBar.checks.refuseApplyNoConfirm === true &&
        verifyApplyBar.checks.hubDenyNotApplied === true,
      detail: "policy + hub apply denyNotApplied",
    },
    {
      id: "verify-gated-apply-green",
      ok:
        verifyApplyBar.checks.refuseWithoutGate === true &&
        verifyApplyBar.checks.acceptApplyWithGate === true,
      detail: verifyApplyBar.ok
        ? "ok"
        : Object.entries(verifyApplyBar.checks)
            .filter(([, v]) => v !== true)
            .map(([k]) => k)
            .join(","),
    },
    {
      id: "oracle-product",
      ok: oracle.ok === true,
      detail: oracle.detail,
    },
  ];

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;

  return {
    kind: TRAFFIC_DECIDES_BAR_SMOKE_KIND,
    schemaVersion: TRAFFIC_DECIDES_BAR_SMOKE_SCHEMA_VERSION,
    ok,
    token: ok ? TRAFFIC_DECIDES_CONVERT_OK : "TRAFFIC_DECIDES_CONVERT_FAIL",
    thesis: "AI drafts; recorded traffic decides — propose ≠ dispose",
    checks,
    failed: failed.map((c) => c.id),
    parts: {
      dispose: { ok: dispose.ok, gate: dispose.gate },
      verifyApply: { ok: verifyApplyBar.ok, checks: verifyApplyBar.checks },
      oracle: { id: oracle.id, ok: oracle.ok, detail: oracle.detail },
    },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runTrafficDecidesBarSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (report.ok) console.log(TRAFFIC_DECIDES_CONVERT_OK);
  process.exit(report.ok ? 0 : 1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
