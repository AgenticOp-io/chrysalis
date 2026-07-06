#!/usr/bin/env node
/** Emit deployable runtime-cwl project from hub WebIR + CWL projection. */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emit } from "../../packages/emit-runtime-cwl/dist/index.js";
import { loadHubRoutes } from "./hub-load-routes.mjs";
import { writeHubEmitReport } from "./hub-native-emit-shared.mjs";
import { listCwlRoutes, renderCwlRoutes } from "./hub-webir-routes.mjs";

const scriptRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "php";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) {
    throw new Error("usage: emit-runtime-cwl-from-hub.mjs <projectDir> --origin <lang>");
  }
  return { projectDir, origin };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { mod } = await loadHubRoutes(projectDir, origin);
  const routes = listCwlRoutes(mod);
  const { text, holeCount } = renderCwlRoutes(routes, {
    header: `# Chrysalis Web Language — runtime-cwl emit from ${origin}`,
    moduleName: "hub",
  });
  const outDir = join(projectDir, "generated", "runtime-cwl");
  await mkdir(outDir, { recursive: true });
  const res = await emit({
    module: mod,
    outDir,
    cwlSource: text,
    holeCount,
    provenanceRoot: projectDir,
  });
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "runtime-cwl",
    path: "hub-webir-runtime-cwl",
    outDir,
    routeCount: res.routeCount,
    holeCount: res.holeCount,
    fileCount: res.files.length,
    generatedAt: new Date().toISOString(),
  };
  await writeHubEmitReport(projectDir, origin, report);
  await writeFile(join(outDir, "chrysalis.hub.emit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
