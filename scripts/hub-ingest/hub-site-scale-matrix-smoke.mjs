#!/usr/bin/env node
/** Site-scale verify matrix smoke (G9440, D6366). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(scriptRoot, "fixtures/site-scale-matrix");

async function loadVerify() {
  try {
    return await import("@chrysalis/verify");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/verify/dist/index.js")).href);
  }
}

export async function runSiteScaleMatrixSmoke() {
  const designText = readFileSync(join(scriptRoot, "DESIGN.md"), "utf8");
  const programText = readFileSync(join(scriptRoot, "docs/WHOLE-SITE-CWL-CONVERSION.md"), "utf8");
  if (!designText.includes("D6366") || !programText.includes("G9440")) {
    return { ok: false, skip: "missing-program-docs" };
  }
  if (!existsSync(fixture)) {
    return { ok: false, skip: "missing-fixture", fixture };
  }

  const verify = await loadVerify();
  const report = verify.verifySiteScaleMatrix({ projectDir: fixture });
  const layers = Object.fromEntries(report.layers.map((l) => [l.layer, { ok: l.ok, skip: l.skip }]));

  return {
    ok: report.ok === true && report.layersChecked === 4 && report.layersFailed === 0,
    kind: "chrysalis.hub.site-scale-matrix-smoke",
    schemaVersion: 1,
    fixture,
    report: {
      ok: report.ok,
      layersChecked: report.layersChecked,
      layersFailed: report.layersFailed,
      layersSkipped: report.layersSkipped,
      layers,
    },
  };
}

function main() {
  runSiteScaleMatrixSmoke().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exit(1);
  });
}

if (process.argv[1]?.includes("hub-site-scale-matrix-smoke")) main();
