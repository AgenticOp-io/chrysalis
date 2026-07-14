#!/usr/bin/env node
/**
 * G9870 — first non-Svelte origin on shared convert-site APIs (Vue structural/static lift).
 * Uses fixtures/ui-markup-vue — same convertSiteProjectUi as Svelte/WISP.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VUE_STRUCTURAL_SHELL_SMOKE_KIND = "chrysalis.hub.vue-structural-shell-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  }
}

export async function runVueStructuralShellSmoke() {
  const fixture = join(scriptRoot, "fixtures/ui-markup-vue");
  const plan = join(scriptRoot, "docs/MULTI-ORIGIN-LIFT-EXPANSION.md");
  if (!existsSync(fixture)) {
    return { kind: VUE_STRUCTURAL_SHELL_SMOKE_KIND, schemaVersion: 1, ok: false, skip: "missing-vue-fixture" };
  }
  if (!existsSync(plan)) {
    return { kind: VUE_STRUCTURAL_SHELL_SMOKE_KIND, schemaVersion: 1, ok: false, skip: "missing-expansion-plan" };
  }

  const ingest = await loadIngest();
  const convert = ingest.convertSiteProjectUi({
    projectDir: fixture,
    liftOnly: true,
    writeReport: false,
    markupMode: "structural-shell",
  });

  const markup = convert.uiMarkup;
  const framework =
    markup && "framework" in markup ? markup.framework : null;
  const bundleCount =
    markup && "bundles" in markup && Array.isArray(markup.bundles) ? markup.bundles.length : 0;
  const frameworkOk = framework === "vite-vue" || framework === "vue" || bundleCount > 0;
  const ok = convert.ok === true && markup?.ok === true && frameworkOk && bundleCount > 0;

  return {
    kind: VUE_STRUCTURAL_SHELL_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    fixture,
    framework,
    bundleCount,
    sharedApi: "convertSiteProjectUi",
    note: "Vue uses the same convert-site API as Svelte — no sidecar / no WISP-only fork",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runVueStructuralShellSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-vue-structural-shell-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
