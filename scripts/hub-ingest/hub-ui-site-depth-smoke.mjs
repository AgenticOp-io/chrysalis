#!/usr/bin/env node
/**
 * UI site depth — Vue/Next/Angular fixtures expose dashboard routes with overlay shells.
 * Gate: hub:ui-site-depth-smoke
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(ROOT, "packages/ingest/dist/index.js")).href);
  }
}

export async function runUiSiteDepthSmoke() {
  const ingest = await loadIngest();
  const cases = [
    {
      id: "vue",
      dir: "fixtures/ui-markup-vue",
      expectRoute: "/dashboard",
      shellKey: "showFilters",
    },
    {
      id: "next",
      dir: "fixtures/ui-markup-next",
      expectRoute: "/dashboard",
      shellKey: "showFilters",
    },
    {
      id: "angular",
      dir: "fixtures/ui-markup-angular",
      expectRoute: "/dashboard",
      shellKey: "showFilters",
    },
  ];

  const results = [];
  let ok = true;
  for (const c of cases) {
    const projectDir = join(ROOT, c.dir);
    if (!existsSync(projectDir)) {
      results.push({ id: c.id, ok: false, skip: "missing-fixture" });
      ok = false;
      continue;
    }
    const convert = ingest.convertSiteProjectUi({
      projectDir,
      liftOnly: true,
      writeReport: false,
      markupMode: "structural-shell",
    });
    const bundles =
      convert.uiMarkup && "bundles" in convert.uiMarkup ? convert.uiMarkup.bundles : [];
    const dash = bundles.find((b) => b.routeId === c.expectRoute);
    const html = dash?.html ?? "";
    const routeOk = Boolean(dash);
    const shellOk = html.includes(`data-cwl-shell-key="${c.shellKey}"`);
    const pairOk = convert.ok === true && routeOk && shellOk;
    if (!pairOk) ok = false;
    results.push({
      id: c.id,
      ok: pairOk,
      routeOk,
      shellOk,
      routeCount: bundles.length,
      liftMode: dash?.liftMode ?? null,
    });
  }

  return {
    kind: "chrysalis.hub.ui-site-depth-smoke",
    schemaVersion: 1,
    ok,
    results,
    note: "UI site depth: dashboard routes stamp overlay shell keys (showFilters)",
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = await runUiSiteDepthSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-ui-site-depth-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
