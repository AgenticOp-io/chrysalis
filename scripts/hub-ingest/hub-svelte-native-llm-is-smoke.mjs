#!/usr/bin/env node
/**
 * G9860 — LLM/IS wired into Svelte native convert (propose + export; verify disposes).
 * Does not require a live LLM — exercises IS routing + closed LLM regression + shorthand export.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveHubConvertIsRouting } from "./hub-llm-convert-is-routing.mjs";
import { runLlmConvertFullClosedRegressionGate } from "./hub-llm-convert-full-closed-regression-smoke.mjs";

export const SVELTE_NATIVE_LLM_IS_SMOKE_KIND = "chrysalis.wisp.svelte-native-llm-is-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function runSvelteNativeLlmIsSmoke() {
  // Prefer neutral lib path (Wave A extract); fall back to temporary wisp shim.
  const convertLib = join(scriptRoot, "scripts/lib/cwl-svelte-native-convert.mjs");
  const convertShim = join(scriptRoot, "scripts/wisp-cwl-svelte-native-convert.mjs");
  const convertScript = existsSync(convertLib) ? convertLib : convertShim;
  const lessons = join(scriptRoot, "docs/SVELTE-CWL-CONVERSION-LESSONS.md");
  const lessonsOk =
    existsSync(lessons) && readFileSync(lessons, "utf8").includes("LLM / Intelligence Shorthand");

  const isRouting = await resolveHubConvertIsRouting({
    repoRoot: scriptRoot,
    origin: "svelte",
    output: "cwl",
    domainId: "wisp-module-manager-svelte-cwl",
    nudge: "g9860-llm-is-smoke",
  });
  const routingOk = typeof isRouting.domainId === "string";

  const llm = await runLlmConvertFullClosedRegressionGate({ repoRoot: scriptRoot });
  const llmOk = llm.ok === true;

  const exportR = spawnSync(process.execPath, [join(scriptRoot, "scripts/web-llm-export-shorthand.mjs")], {
    cwd: scriptRoot,
    encoding: "utf8",
    shell: false,
  });
  let shorthandCount = 0;
  try {
    const j = JSON.parse(exportR.stdout.slice(exportR.stdout.indexOf("{")));
    shorthandCount = Number(j.count ?? j.summary?.count ?? 0);
  } catch {
    shorthandCount = 0;
  }
  const exportOk = exportR.status === 0 && shorthandCount > 0;

  const convertWiresIs =
    existsSync(convertScript) &&
    readFileSync(convertScript, "utf8").includes("resolveHubConvertIsRouting");

  const ok = lessonsOk && routingOk && llmOk && exportOk && convertWiresIs;
  return {
    kind: SVELTE_NATIVE_LLM_IS_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    lessonsOk,
    routingOk,
    llmOk,
    exportOk,
    convertWiresIs,
    convertScript: convertScript.replace(/\\/g, "/").includes("scripts/")
      ? convertScript.slice(scriptRoot.length + 1).replace(/\\/g, "/")
      : convertScript,
    isRouting: {
      domainId: isRouting.domainId,
      skipLlm: isRouting.skipLlm === true,
      tier: isRouting.tier ?? null,
    },
    shorthandCount,
    note: "Models propose; WebIR/oracle/verify dispose — never sidecar as product",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runSvelteNativeLlmIsSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-svelte-native-llm-is-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
