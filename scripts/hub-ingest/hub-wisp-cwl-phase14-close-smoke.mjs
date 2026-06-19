#!/usr/bin/env node
/** Phase 14 program close smoke (G6590) — HSS operator deploy readiness composite. */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispCwlPhase14OperatorCloseGate } from "./hub-wisp-cwl-phase14-operator-close-smoke.mjs";
import { runWispCwlPhase14HssProxyGate } from "./hub-wisp-cwl-phase14-hss-proxy-smoke.mjs";
import { runWispCwlPhase14DemoManifestGate } from "./hub-wisp-cwl-phase14-demo-manifest-smoke.mjs";
import { runWispCwlPhase14RemoteDemoGate } from "./hub-wisp-cwl-phase14-remote-demo-smoke.mjs";
import { runWispCwlDualDeployConfigSmokeGate } from "./hub-wisp-cwl-dual-deploy-config-smoke.mjs";
import { runWispCwlPhase13CloseGate } from "./hub-wisp-cwl-phase13-close-smoke.mjs";

export const WISP_CWL_PHASE14_CLOSE_SMOKE_KIND = "chrysalis.wisp-cwl-phase14-close-smoke";
export const WISP_CWL_PHASE14_CLOSE_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** G6591 — program doc records Phase 14 operator readiness. */
export function runWispPhase14CloseDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-FULLSTACK-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-wisp-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G6590") &&
    text.includes("G6530") &&
    text.includes("G6540") &&
    text.includes("G6600") &&
    text.includes("Phase 14") &&
    text.includes("ACS / TR-069 as CWL language goals");
  return { ok, phase14CloseDocOk: ok };
}

/** G6590 — Phase 14 operator program close composite. */
export async function runWispCwlPhase14CloseGate(opts = {}) {
  const doc = runWispPhase14CloseDocGate();
  const operator = await runWispCwlPhase14OperatorCloseGate({
    apply: opts.apply !== false,
    skipPipeline: opts.skipPipeline === true,
  });
  const hssProxy = await runWispCwlPhase14HssProxyGate({ skipLive: true });
  const demoManifest = runWispCwlPhase14DemoManifestGate({ skipRefresh: true });
  const remoteDemo = await runWispCwlPhase14RemoteDemoGate({
    skipLive: opts.requireRemoteDemo !== true,
  });
  const dualDeploy = await runWispCwlDualDeployConfigSmokeGate();
  const phase13 = await runWispCwlPhase13CloseGate({ apply: false });
  const ok =
    doc.ok === true &&
    operator.ok === true &&
    hssProxy.ok === true &&
    demoManifest.ok === true &&
    remoteDemo.ok === true &&
    dualDeploy.ok === true &&
    phase13.ok === true;
  return {
    kind: WISP_CWL_PHASE14_CLOSE_SMOKE_KIND,
    schemaVersion: WISP_CWL_PHASE14_CLOSE_SMOKE_SCHEMA_VERSION,
    ok,
    doc,
    operator,
    hssProxy,
    demoManifest,
    remoteDemo,
    dualDeploy,
    phase13,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlPhase14CloseGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-phase14-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
