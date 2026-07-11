#!/usr/bin/env node
/** Site convert smoke — package UI lift on fixtures (G9420, D6366). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadIngest() {
  try {
    return await import("@chrysalis/ingest");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/ingest/dist/index.js")).href);
  }
}

export async function runSiteConvertSmoke() {
  const designPath = join(scriptRoot, "DESIGN.md");
  const programPath = join(scriptRoot, "docs/WHOLE-SITE-CWL-CONVERSION.md");
  const designText = readFileSync(designPath, "utf8");
  const programText = readFileSync(programPath, "utf8");

  const checks = [
    designText.includes("D6366"),
    programText.includes("G9400"),
    /proof (is|was) last/i.test(programText) || /Proof (is|was) last/i.test(designText),
  ];
  if (!checks.every(Boolean)) {
    return { ok: false, skip: "missing-program-docs", checks };
  }

  const ingest = await loadIngest();
  const fixture = join(scriptRoot, "fixtures/ui-markup-svelte");
  if (!existsSync(fixture)) {
    return { ok: false, skip: "missing-fixture", fixture };
  }

  const convert = ingest.convertSiteProjectUi({
    projectDir: fixture,
    liftOnly: true,
    writeReport: false,
  });

  const markupOk =
    convert.uiMarkup.ok === true &&
    ("bundles" in convert.uiMarkup ? convert.uiMarkup.bundles.length > 0 : false);

  return {
    ok: convert.ok === true && markupOk,
    kind: "chrysalis.hub.site-convert-smoke",
    schemaVersion: 1,
    fixture,
    convert: {
      uiAssets: summarize(convert.uiAssets),
      uiMarkup: summarize(convert.uiMarkup),
    },
  };
}

function summarize(lift) {
  if (!lift.ok) return { ok: false };
  if ("skip" in lift) return { ok: true, skip: lift.skip };
  return {
    ok: true,
    framework: lift.framework,
    bundles: lift.bundles?.length ?? 0,
  };
}

function main() {
  runSiteConvertSmoke().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exit(1);
  });
}

if (process.argv[1]?.includes("hub-site-convert-smoke")) main();
