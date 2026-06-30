#!/usr/bin/env node
/** WISP production completion operator contract gate (G7906). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWispProductionPocOperatorContractGate } from "./hub-wisp-production-poc-operator-contract-smoke.mjs";
import { WISP_OPERATOR_VERIFY_KIND } from "../wisp-cwl-operator-verify.mjs";
import { prepareWispCwlDeployBundle, verifyWispGceDeployBundle } from "../wisp-cwl-pipeline.mjs";
import { createWispChimeraGateway } from "../wisp-cwl-chimera-gateway.mjs";

export const WISP_PRODUCTION_COMPLETION_OPERATOR_KIND =
  "chrysalis.wisp.production-completion-operator-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispProductionCompletionOperatorDocGate() {
  const programPath = join(scriptRoot, "docs/WISP-PRODUCTION-COMPLETION-PROGRAM.md");
  const manifestPath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");
  if (!existsSync(programPath) || !existsSync(manifestPath)) return { ok: false, skip: "missing-doc-or-manifest" };
  const program = readFileSync(programPath, "utf8");
  const manifest = readFileSync(manifestPath, "utf8");
  const ok =
    program.includes("wisp:operator-verify") &&
    program.includes("wisp:deploy:gce") &&
    manifest.includes("cwl-native-api") &&
    manifest.includes("runtime-cwl-native") &&
    manifest.includes("cwl-native-login");
  return { ok, docOk: ok };
}

export function runWispProductionCompletionOperatorPipelineGate() {
  const pipelinePath = join(scriptRoot, "fixtures/hub-wisp-management/wisp-pipeline.config.json");
  if (!existsSync(pipelinePath)) return { ok: false, skip: "missing-pipeline-config" };
  const pipeline = readFileSync(pipelinePath, "utf8");
  const ok =
    pipeline.includes('"apiMode": "cwl-static-export"') &&
    pipeline.includes("cwlStaticExportDir");
  return { ok, pipelineOk: ok };
}

/** G7907 — GCE deploy bundle ships functional CWL shell (no Svelte sidecar). */
export async function runWispGceCwlOperatorShellGate() {
  const bundle = prepareWispCwlDeployBundle({ skipLift: true });
  const shell = verifyWispGceDeployBundle(bundle);
  if (!shell.ok) return { ok: false, shell, skip: shell.skip ?? "shell-verify-failed" };

  /** @type {Awaited<ReturnType<typeof createWispChimeraGateway>> | null} */
  let gw = null;
  try {
    gw = await createWispChimeraGateway({
      repoRoot: scriptRoot,
      cwlPath: join(shell.bundleDir, "routes.cwl"),
      backendUrl: "http://127.0.0.1:9",
      host: "127.0.0.1",
      port: 0,
    });
    const port = typeof gw.server.address() === "object" ? gw.server.address().port : gw.port;
    const baseUrl = `http://127.0.0.1:${port}`;
    const login = await fetch(`${baseUrl}/login`);
    const loginText = await login.text();
    const loginCss = await fetch(`${baseUrl}/assets/wisp-cwl-login.css`);
    const logo = await fetch(`${baseUrl}/wisptools-logo.svg`);
    const loginOk =
      login.status === 200 &&
      loginText.includes("wisp-cwl-login.css") &&
      loginText.includes("wisp-cwl-client.js") &&
      loginText.includes("login-page") &&
      loginText.includes("wisptools-logo.svg") &&
      loginText.includes("Sign in") &&
      loginText.includes("WISPTools Demo ISP");
    const cssOk = loginCss.status === 200 && (await loginCss.text()).includes("login-page");
    const logoOk = logo.status === 200 && (await logo.text()).includes("<svg");
    return { ok: loginOk === true && cssOk === true && logoOk === true, shell, loginOk, cssOk, logoOk, noSvelteFallback: !gw.svelteFallback };
  } finally {
    if (gw) {
      await new Promise((resolve) => gw.server.close(() => resolve(undefined)));
    }
  }
}

export async function runWispProductionCompletionOperatorGate() {
  const doc = runWispProductionCompletionOperatorDocGate();
  const pipeline = runWispProductionCompletionOperatorPipelineGate();
  const contract = runWispProductionPocOperatorContractGate();
  const shell = await runWispGceCwlOperatorShellGate();
  const scriptOk = WISP_OPERATOR_VERIFY_KIND === "chrysalis.wisp.operator-verify";
  const ok = doc.ok === true && pipeline.ok === true && contract.ok === true && shell.ok === true && scriptOk;
  return {
    kind: WISP_PRODUCTION_COMPLETION_OPERATOR_KIND,
    schemaVersion: 1,
    ok,
    doc,
    pipeline,
    contract,
    shell,
    scriptOk,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispProductionCompletionOperatorGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-production-completion-operator-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
