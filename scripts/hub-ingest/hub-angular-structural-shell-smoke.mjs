#!/usr/bin/env node
/**
 * G9891 — Angular origin on shared convertSiteProjectUi (after Vue G9870).
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ANGULAR_STRUCTURAL_SHELL_SMOKE_KIND = "chrysalis.hub.angular-structural-shell-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  }
}

export async function runAngularStructuralShellSmoke() {
  const fixture = join(scriptRoot, "fixtures/ui-markup-angular");
  if (!existsSync(fixture)) {
    return { kind: ANGULAR_STRUCTURAL_SHELL_SMOKE_KIND, schemaVersion: 1, ok: false, skip: "missing-angular-fixture" };
  }

  const ingest = await loadIngest();
  const convert = ingest.convertSiteProjectUi({
    projectDir: fixture,
    liftOnly: true,
    writeReport: false,
    markupMode: "structural-shell",
  });

  const markup = convert.uiMarkup;
  const framework = markup && "framework" in markup ? markup.framework : null;
  const bundleCount =
    markup && "bundles" in markup && Array.isArray(markup.bundles) ? markup.bundles.length : 0;
  const ok = convert.ok === true && markup?.ok === true && framework === "angular" && bundleCount > 0;

  return {
    kind: ANGULAR_STRUCTURAL_SHELL_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    fixture,
    framework,
    bundleCount,
    sharedApi: "convertSiteProjectUi",
    note: "Angular uses the same convert-site API as Svelte/Vue — no sidecar",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runAngularStructuralShellSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-angular-structural-shell-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
