#!/usr/bin/env node
/** Unified WISP + web-LLM POC close gate (G8310). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWispCwlUiParityCloseSmoke } from "./hub-wisp-cwl-ui-parity-close-smoke.mjs";
import { runOpenWebLlmCloseSmoke } from "./hub-open-web-llm-close-smoke.mjs";
import { runOpenWebLlmPocSmoke } from "./hub-open-web-llm-poc-smoke.mjs";
import { runIntelligenceShorthandCloseSmoke } from "./hub-intelligence-shorthand-close-smoke.mjs";
import { runWispPocLiveSmoke } from "./hub-wisp-poc-live-smoke.mjs";
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

export async function runWispWebLlmPocCloseGate(opts = {}) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const wisp = await runWispCwlUiParityCloseSmoke();
  const webLlm = await runOpenWebLlmCloseSmoke();
  const poc = await runOpenWebLlmPocSmoke();
  const intelligence = await runIntelligenceShorthandCloseSmoke({ repoRoot, skipPort: true });
  const liveRequested =
    opts.live === true ||
    process.env.CHRYSALIS_WISP_POC_LIVE === "1" ||
    process.env.CHRYSALIS_G8310_LIVE === "1";
  const live = liveRequested
    ? await runWispPocLiveSmoke()
    : { ok: true, skip: "live-not-requested", kind: "chrysalis.wisp.poc-live-smoke" };
  const ok =
    wisp.ok === true &&
    webLlm.ok === true &&
    poc.ok === true &&
    intelligence.ok === true &&
    live.ok === true;
  return {
    kind: WISP_WEB_LLM_POC_CLOSE_KIND,
    schemaVersion: 2,
    ok,
    wisp: { ok: wisp.ok, kind: wisp.kind },
    webLlm: { ok: webLlm.ok, kind: webLlm.kind },
    poc: { ok: poc.ok, kind: poc.kind, passCount: poc.report?.passCount ?? 0 },
    intelligence: { ok: intelligence.ok === true, count: intelligence.exported?.count ?? null },
    live: { ok: live.ok === true, skip: live.skip ?? null, passCount: live.live?.probes?.filter((p) => p.ok).length ?? null },
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
    detail: { wisp: r.wisp.ok, webLlm: r.webLlm.ok, poc: r.poc.ok, intelligence: r.intelligence.ok, live: r.live.ok },
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
