#!/usr/bin/env node
/**
 * Dispose Plane entry smoke (G10116 / D6541).
 * Propose freely; merge/apply only with verify dispose. Packages existing web-llm policies.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DISPOSE_PLANE_SMOKE_KIND = "chrysalis.hub.dispose-plane-smoke";
export const DISPOSE_PLANE_SMOKE_SCHEMA_VERSION = 2;

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

export async function runDisposePlaneSmoke() {
  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

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

  const proposeGreenNoGate = evaluateVerifyGatePolicy({
    gateOk: false,
    unverified: false,
    verifyCorrectness: 1,
    holeCount: 0,
  });
  checks.push({
    id: "refuse-propose-without-gate",
    ok: proposeGreenNoGate.ok === false,
    detail: (proposeGreenNoGate.reasons || []).join(","),
  });

  const unverified = evaluateVerifyGatePolicy({
    gateOk: true,
    unverified: true,
    verifyCorrectness: 1,
    holeCount: 0,
  });
  checks.push({
    id: "refuse-unverified-claim",
    ok:
      unverified.ok === false &&
      (unverified.reasons || []).some((r) => String(r).includes("unverified")),
  });

  const holesTooMany = evaluateVerifyGatePolicy({
    gateOk: true,
    holeCount: 3,
    maxHoles: 0,
  });
  checks.push({
    id: "refuse-holes-above-budget",
    ok: holesTooMany.ok === false,
  });

  const disposePass = evaluateVerifyGatePolicy({
    gateOk: true,
    verifyCorrectness: 1,
    holeCount: 0,
  });
  checks.push({
    id: "accept-dispose-certificate",
    ok: disposePass.ok === true,
  });

  const applyNoConfirm = evaluateConvertVerifyApplyPolicy({
    gateOk: true,
    verifyCorrectness: 1,
    confirmApply: false,
  });
  checks.push({
    id: "refuse-apply-without-confirm",
    ok: applyNoConfirm.ok === false,
  });

  const applyOk = evaluateConvertVerifyApplyPolicy({
    gateOk: true,
    verifyCorrectness: 1,
    confirmApply: true,
  });
  checks.push({
    id: "accept-apply-with-dispose",
    ok: applyOk.ok === true,
  });

  const {
    buildDisposeCertificate,
    assertDisposeCertificate,
    evaluateDisposeApplyPolicy,
  } = await import("../lib/dispose-certificate.mjs");

  const badCert = buildDisposeCertificate({
    gateOk: false,
    evaluateVerifyGatePolicy,
  });
  checks.push({
    id: "certificate-refuses-bad-gate",
    ok: badCert.ok === false && assertDisposeCertificate(badCert).ok === false,
  });

  const goodCert = buildDisposeCertificate({
    gateOk: true,
    verifyCorrectness: 1,
    holeCount: 0,
    evaluateVerifyGatePolicy,
  });
  checks.push({
    id: "certificate-issues-on-dispose",
    ok: goodCert.ok === true && assertDisposeCertificate(goodCert).ok === true,
  });

  const applyNoCertConfirm = evaluateDisposeApplyPolicy({
    certificate: goodCert,
    confirmApply: false,
  });
  checks.push({
    id: "certificate-apply-needs-confirm",
    ok: applyNoCertConfirm.ok === false,
  });

  const applyWithCert = evaluateDisposeApplyPolicy({
    certificate: goodCert,
    confirmApply: true,
  });
  checks.push({
    id: "certificate-apply-with-confirm",
    ok: applyWithCert.ok === true,
  });

  const docPath = join(ROOT, "docs/AGENT-ERA-SUBSTRATE.md");
  checks.push({
    id: "docs-dispose-plane",
    ok:
      existsSync(docPath) &&
      readFileSync(docPath, "utf8").includes("Dispose Plane") &&
      readFileSync(docPath, "utf8").includes("dispose certificate") &&
      readFileSync(docPath, "utf8").includes("hub-convert.dispose-certificate"),
  });

  const applyScript = join(ROOT, "scripts/hub-ingest/hub-llm-convert-verify-apply.mjs");
  checks.push({
    id: "convert-apply-wires-certificate",
    ok:
      existsSync(applyScript) &&
      readFileSync(applyScript, "utf8").includes("buildDisposeCertificate") &&
      readFileSync(applyScript, "utf8").includes("hub-convert.dispose-certificate.json"),
  });

  const ok = checks.every((c) => c.ok);
  return {
    kind: DISPOSE_PLANE_SMOKE_KIND,
    schemaVersion: 2,
    ok,
    gate: "G10116",
    decision: "D6541",
    thesis: "LLM proposes; oracle + verify dispose — merge only with dispose certificate",
    checks,
    failed: checks.filter((c) => !c.ok),
    usedWebLlmDist: existsSync(dist),
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runDisposePlaneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && /hub-dispose-plane-smoke\.mjs$/.test(process.argv[1].replace(/\\/g, "/"))) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
