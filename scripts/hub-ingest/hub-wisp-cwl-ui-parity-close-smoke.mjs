#!/usr/bin/env node
/** WISP CWL UI parity program close (G8100). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { applyWispPhase31BulkLift } from "../wisp-cwl-apply-phase31-bulk-lift.mjs";
import { applyWispPhase32CompleteDemo } from "../wisp-cwl-apply-phase32-complete-demo.mjs";
import {
  buildWispUiParityManifest,
  probeWispUiAnchorRoutes,
  scanWispRoutesForForbiddenStubs,
} from "../wisp-cwl-ui-parity-verify.mjs";
import { runCwlHtmlTemplateHyphenGuardGate } from "./hub-cwl-html-template-hyphen-smoke.mjs";
import { createWispChimeraGateway } from "../wisp-cwl-chimera-gateway.mjs";
import { prepareWispCwlDeployBundle } from "../wisp-cwl-pipeline.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";
import { pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const WISP_CWL_UI_PARITY_CLOSE_KIND = "chrysalis.wisp.cwl-ui-parity-close-smoke";

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export function runWispCwlUiParityDocGate() {
  const path = join(scriptRoot, "docs/WISP-CWL-UI-PARITY-PROGRAM.md");
  if (!existsSync(path)) return { ok: false, skip: "missing-program-doc" };
  const text = readFileSync(path, "utf8");
  const ok =
    text.includes("G8100") &&
    text.includes("hub:wisp-cwl-ui-parity-close-smoke") &&
    text.includes("Phase 31") &&
    text.includes("wisp:apply-phase31-bulk-lift");
  return { ok, programDocOk: ok };
}

export function runWispCwlUiParityApplyChainGate() {
  const phase31 = applyWispPhase31BulkLift();
  const phase32 = applyWispPhase32CompleteDemo();
  const ok = phase31.ok === true && phase32.ok === true;
  return { ok, phase31, phase32 };
}

export function runWispCwlUiParityStubGate() {
  const scan = scanWispRoutesForForbiddenStubs();
  const manifest = buildWispUiParityManifest();
  const ok = scan.ok === true && manifest.ok === true;
  return { ok, scan, manifest };
}

export async function runWispCwlUiParityAnchorGate() {
  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
  }

  const bundle = prepareWispCwlDeployBundle({ skipLift: true });
  if (!bundle.ok) return { ok: false, skip: bundle.skip ?? "bundle-failed" };

  /** @type {Awaited<ReturnType<typeof createWispChimeraGateway>> | null} */
  let gw = null;
  try {
    gw = await createWispChimeraGateway({
      repoRoot: scriptRoot,
      cwlPath: join(bundle.bundleDir, "routes.cwl"),
      backendUrl: "http://127.0.0.1:9",
      host: "127.0.0.1",
      port: 0,
    });
    const addr = gw.server.address();
    const port = typeof addr === "object" && addr ? addr.port : gw.port;
    const anchors = await probeWispUiAnchorRoutes(`http://127.0.0.1:${port}`);
    return { ok: anchors.ok === true, anchors, bundleDir: bundle.bundleDir };
  } finally {
    if (gw) {
      await new Promise((resolve, reject) => {
        gw.server.close((err) => (err ? reject(err) : resolve(undefined)));
      }).catch(() => undefined);
    }
  }
}

export async function runWispCwlUiParityCloseGate() {
  const doc = runWispCwlUiParityDocGate();
  const hyphen = runCwlHtmlTemplateHyphenGuardGate();
  const apply = runWispCwlUiParityApplyChainGate();
  const stubs = runWispCwlUiParityStubGate();
  const anchors = await runWispCwlUiParityAnchorGate();
  const ok =
    doc.ok === true &&
    hyphen.ok === true &&
    apply.ok === true &&
    stubs.ok === true &&
    anchors.ok === true;
  return {
    kind: WISP_CWL_UI_PARITY_CLOSE_KIND,
    schemaVersion: 1,
    ok,
    doc,
    hyphen,
    apply,
    stubs,
    anchors,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispCwlUiParityCloseSmoke() {
  const progress = createSmokeProgress("wisp-cwl-ui-parity-close");
  const t0 = progress.start("WISP CWL UI parity close (G8100)");
  const gate = await runWispCwlUiParityCloseGate();
  progress.end("WISP CWL UI parity close (G8100)", gate.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: scriptRoot,
    gateName: "G8100",
    ok: gate.ok === true,
  });
  return {
    kind: WISP_CWL_UI_PARITY_CLOSE_KIND,
    schemaVersion: 1,
    ok: gate.ok === true,
    gate,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runWispCwlUiParityCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-cwl-ui-parity-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
