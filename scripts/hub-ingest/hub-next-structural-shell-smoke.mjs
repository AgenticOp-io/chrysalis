#!/usr/bin/env node
/**
 * G9901 — Next.js App Router origin on shared convertSiteProjectUi (after Angular G9891).
 *
 * Run: pnpm run hub:next-structural-shell-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const NEXT_STRUCTURAL_SHELL_SMOKE_KIND = "chrysalis.hub.next-structural-shell-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  }
}

export async function runNextStructuralShellSmoke() {
  const fixture = join(scriptRoot, "fixtures/ui-markup-next");
  if (!existsSync(fixture)) {
    return { kind: NEXT_STRUCTURAL_SHELL_SMOKE_KIND, schemaVersion: 1, ok: false, skip: "missing-next-fixture" };
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
  const routes =
    markup && "bundles" in markup && Array.isArray(markup.bundles)
      ? markup.bundles.map((b) => b.routeId).sort()
      : [];
  const ok =
    convert.ok === true &&
    markup?.ok === true &&
    framework === "next-app" &&
    bundleCount >= 2 &&
    routes.includes("/login") &&
    routes.includes("/portal/login");

  return {
    kind: NEXT_STRUCTURAL_SHELL_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    fixture,
    framework,
    bundleCount,
    routes,
    sharedApi: "convertSiteProjectUi",
    note: "Next.js App Router uses the same convert-site API as Svelte/Vue/Angular — no sidecar",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runNextStructuralShellSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-next-structural-shell-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
