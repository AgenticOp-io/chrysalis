#!/usr/bin/env node
/** Emit CWL source from hub WebIR (round-trip projection). */
import { loadHubRoutes } from "./hub-load-routes.mjs";
import { writeHubEmitReport } from "./hub-native-emit-shared.mjs";
import { listCwlRoutes, renderCwlRoutes } from "./hub-webir-routes.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "cwl";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-cwl-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { mod } = await loadHubRoutes(projectDir, origin);
  const routes = listCwlRoutes(mod);
  const { text, holeCount } = renderCwlRoutes(routes, {
    header: `# Chrysalis Web Language — hub emit from ${origin}`,
    moduleName: "hub",
  });
  const files = { "routes.cwl": text };
  const outDir = join(projectDir, "generated", "cwl");
  await mkdir(outDir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
  }
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "cwl",
    path: "hub-webir-cwl",
    outDir,
    routeCount: routes.length,
    holeCount,
    generatedAt: new Date().toISOString(),
  };
  await writeHubEmitReport(projectDir, origin, report);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
