#!/usr/bin/env node
/** G9840 entry smoke — lessons docs + CWL-native pipeline + convert orchestration present. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispPipelineConfig, patchOperatorGceDeployPipelineConfig } from "../wisp-cwl-gateway-config.mjs";

export const SVELTE_NATIVE_CONVERT_ENTRY_SMOKE_KIND = "chrysalis.wisp.svelte-native-convert-entry-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runSvelteNativeConvertEntrySmoke() {
  const lessons = join(scriptRoot, "docs/SVELTE-CWL-CONVERSION-LESSONS.md");
  const plan = join(scriptRoot, "docs/MULTI-ORIGIN-LIFT-EXPANSION.md");
  const convert = join(scriptRoot, "scripts/wisp-cwl-svelte-native-convert.mjs");
  const pipeline = loadWispPipelineConfig();
  const patched = patchOperatorGceDeployPipelineConfig(pipeline);
  const lessonsOk = existsSync(lessons) && readFileSync(lessons, "utf8").includes("D6405");
  const planOk = existsSync(plan) && readFileSync(plan, "utf8").includes("G9840");
  const convertOk = existsSync(convert);
  const nativeOk =
    patched.gce?.svelteSidecar === false &&
    patched.gce?.cwlNativePrefixes === "*" &&
    patched.gce?.operatorUi === "cwl-native";
  const ok = lessonsOk && planOk && convertOk && nativeOk;
  return {
    kind: SVELTE_NATIVE_CONVERT_ENTRY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    lessonsOk,
    planOk,
    convertOk,
    nativeOk,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runSvelteNativeConvertEntrySmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-svelte-native-convert-entry-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
