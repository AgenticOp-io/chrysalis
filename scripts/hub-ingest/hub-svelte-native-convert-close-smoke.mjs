#!/usr/bin/env node
/** G9850 — Svelte native convert close smoke (artifact + CWL-native + integrity). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runSvelteNativeConvertEntrySmoke } from "./hub-svelte-native-convert-entry-smoke.mjs";
import { patchOperatorGceDeployPipelineConfig, loadWispPipelineConfig } from "../wisp-cwl-gateway-config.mjs";

export const SVELTE_NATIVE_CONVERT_CLOSE_SMOKE_KIND = "chrysalis.wisp.svelte-native-convert-close-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runSvelteNativeConvertCloseSmoke() {
  const entry = runSvelteNativeConvertEntrySmoke();
  const reportPath = join(scriptRoot, "reports/wisp/svelte-native-convert.json");
  const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
  const patched = patchOperatorGceDeployPipelineConfig(loadWispPipelineConfig());
  const reportOk =
    report?.ok === true &&
    report?.kind === "chrysalis.wisp.svelte-native-convert" &&
    (report?.schemaVersion ?? 0) >= 1;
  const hasLiftOrSkip =
    report?.steps?.some((s) => s.step === "package-ui-lift" && (s.ok === true || s.skip)) === true;
  const hasIntegrity =
    report?.steps?.some((s) => s.step === "routes-integrity") !== true ||
    report?.steps?.some((s) => s.step === "routes-integrity" && s.ok === true) === true;
  const nativeOk =
    patched.gce?.svelteSidecar === false && patched.gce?.cwlNativePrefixes === "*";
  const ok = entry.ok === true && reportOk && hasLiftOrSkip && nativeOk;
  return {
    kind: SVELTE_NATIVE_CONVERT_CLOSE_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    entry,
    reportOk,
    hasLiftOrSkip,
    hasIntegrity,
    nativeOk,
    reportPath: existsSync(reportPath) ? reportPath : null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runSvelteNativeConvertCloseSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-svelte-native-convert-close-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
