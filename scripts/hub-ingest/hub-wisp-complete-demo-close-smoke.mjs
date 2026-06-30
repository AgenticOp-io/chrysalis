#!/usr/bin/env node
/** WISP complete demo close gate (G8330) — all UI routes must have demo surfaces. */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { applyWispPhase32CompleteDemo } from "../wisp-cwl-apply-phase32-complete-demo.mjs";
import {
  probeAllWispModuleDemoRoutes,
  scanWispRoutesForForbiddenStubs,
} from "../wisp-cwl-ui-parity-verify.mjs";
import { createWispChimeraGateway } from "../wisp-cwl-chimera-gateway.mjs";
import { prepareWispCwlDeployBundle } from "../wisp-cwl-pipeline.mjs";
import { createSmokeProgress } from "./hub-smoke-progress.mjs";

export const WISP_COMPLETE_DEMO_CLOSE_KIND = "chrysalis.wisp.complete-demo-close-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runWispCompleteDemoLocalGate() {
  const apply = applyWispPhase32CompleteDemo();
  const stubScan = scanWispRoutesForForbiddenStubs();
  const runtimeDist = join(scriptRoot, "packages/runtime-cwl/dist/index.js");
  if (!existsSync(runtimeDist)) {
    spawnSync("pnpm", ["--filter", "@chrysalis/runtime-cwl", "build"], {
      cwd: scriptRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
  }
  const bundle = prepareWispCwlDeployBundle({ skipLift: true });
  if (!bundle.ok) return { ok: false, skip: bundle.skip ?? "bundle-failed", apply, stubScan };

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
    const probes = await probeAllWispModuleDemoRoutes(`http://127.0.0.1:${port}`);
    const ok = apply.ok === true && stubScan.ok === true && probes.ok === true;
    return { ok, apply, stubScan, probes, bundleDir: bundle.bundleDir };
  } finally {
    if (gw) {
      await new Promise((resolve, reject) => {
        gw.server.close((err) => (err ? reject(err) : resolve(undefined)));
      }).catch(() => undefined);
    }
  }
}

async function main() {
  const progress = createSmokeProgress("wisp-complete-demo-close");
  const t0 = progress.start("WISP complete demo close (G8330)");
  const gate = await runWispCompleteDemoLocalGate();
  progress.end("WISP complete demo close (G8330)", gate.ok === true, t0);
  console.log(JSON.stringify({ kind: WISP_COMPLETE_DEMO_CLOSE_KIND, schemaVersion: 1, ...gate, generatedAt: new Date().toISOString() }, null, 2));
  if (!gate.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-complete-demo-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
