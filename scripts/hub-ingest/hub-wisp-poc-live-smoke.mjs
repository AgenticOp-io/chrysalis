#!/usr/bin/env node
/** WISP GCE live POC gate (G8320) — strict anchor HTTP probes against deployed demo. */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_POC_LIVE_KIND = "chrysalis.wisp.poc-live-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

export async function runWispPocLiveGate() {
  const mod = await loadWebLlm();
  const live = await mod.probeWispGceLiveAnchors(scriptRoot, { strict: true });
  const ok = live.ok === true && live.probes.length >= 5 && live.probes.every((p) => p.ok);
  return {
    kind: WISP_POC_LIVE_KIND,
    schemaVersion: 1,
    ok,
    live,
    generatedAt: new Date().toISOString(),
  };
}

export async function runWispPocLiveSmoke() {
  const progress = createSmokeProgress("wisp-poc-live");
  const t0 = progress.start("WISP GCE live POC (G8320)");
  const gate = await runWispPocLiveGate();
  progress.end("WISP GCE live POC (G8320)", gate.ok === true, t0);
  const mod = await loadWebLlm();
  mod.logWebLlmSmokeGate({
    repoRoot: scriptRoot,
    gateName: "G8320",
    ok: gate.ok === true,
    detail: { baseUrl: gate.live?.baseUrl ?? null, passCount: gate.live?.probes.filter((p) => p.ok).length ?? 0 },
  });
  return gate;
}

async function main() {
  process.env.CHRYSALIS_WISP_POC_LIVE = "1";
  const r = await runWispPocLiveSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-poc-live-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
