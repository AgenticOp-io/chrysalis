#!/usr/bin/env node
/** Unified WISP + web-LLM POC close gate (G8310). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWispCwlUiParityCloseSmoke } from "./hub-wisp-cwl-ui-parity-close-smoke.mjs";
import { runOpenWebLlmCloseSmoke } from "./hub-open-web-llm-close-smoke.mjs";
import { runOpenWebLlmPocSmoke } from "./hub-open-web-llm-poc-smoke.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_WEB_LLM_POC_CLOSE_KIND = "chrysalis.wisp-web-llm.poc-close-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runWispWebLlmPocCloseGate() {
  const wisp = await runWispCwlUiParityCloseSmoke();
  const webLlm = await runOpenWebLlmCloseSmoke();
  const poc = await runOpenWebLlmPocSmoke();
  const ok = wisp.ok === true && webLlm.ok === true && poc.ok === true;
  return {
    kind: WISP_WEB_LLM_POC_CLOSE_KIND,
    schemaVersion: 1,
    ok,
    wisp: { ok: wisp.ok, kind: wisp.kind },
    webLlm: { ok: webLlm.ok, kind: webLlm.kind },
    poc: { ok: poc.ok, kind: poc.kind, passCount: poc.report?.passCount ?? 0 },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const progress = createSmokeProgress("wisp-web-llm-poc-close");
  const t0 = progress.start("WISP + web-LLM POC close (G8310)");
  const r = await runWispWebLlmPocCloseGate();
  progress.end("WISP + web-LLM POC close (G8310)", r.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: scriptRoot,
    gateName: "G8310",
    ok: r.ok === true,
    detail: { wisp: r.wisp.ok, webLlm: r.webLlm.ok, poc: r.poc.ok },
  });
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-web-llm-poc-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
