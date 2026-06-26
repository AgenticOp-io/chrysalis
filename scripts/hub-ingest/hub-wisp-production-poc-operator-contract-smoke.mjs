#!/usr/bin/env node
/** Phase 28a operator HTTP contract gate (G7801). */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateDemoProbe } from "../wisp-cwl-demo-manifest-verify.mjs";
import { isWispApiProxyHeaderOk, isWispNativeCutoverMode } from "../wisp-cwl-post-g7790.mjs";

export const WISP_PRODUCTION_POC_OPERATOR_CONTRACT_KIND = "chrysalis.wisp.production-poc-operator-contract-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionPocOperatorContractGate() {
  const manifestPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");
  if (!existsSync(manifestPath)) return { ok: false, skip: "missing-demo-manifest" };
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const probes = manifest.healthProbes ?? [];
  const loginProbe = probes.find((p) => p.path === "/login");
  const apiProbe = probes.find((p) => p.path === "/api/tenants");
  const contractOk =
    loginProbe?.expect === "cwl-native-login" &&
    apiProbe?.expect === "cwl-native-api" &&
    manifest.backend?.policy?.includes("native-cwl-handlers");
  const evalOk =
    evaluateDemoProbe("cwl-native-api", { status: 200, headers: { get: () => "application/json" } }, "{}", "cwl-native-api") &&
    evaluateDemoProbe(
      "cwl-native-login",
      { status: 200, headers: { get: (k) => (k === "content-type" ? "text/html" : "") } },
      "login form",
      "cwl",
    );
  const nativeMode = isWispNativeCutoverMode();
  const ok = contractOk === true && evalOk === true && nativeMode === true;
  return {
    kind: WISP_PRODUCTION_POC_OPERATOR_CONTRACT_KIND,
    schemaVersion: 1,
    ok,
    contractOk,
    evalOk,
    nativeMode,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispProductionPocOperatorContractGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-poc-operator-contract-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
