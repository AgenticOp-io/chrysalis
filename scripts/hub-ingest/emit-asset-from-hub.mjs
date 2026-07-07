#!/usr/bin/env node
/**
 * Emit asset hub output trees plus chrysalis.hub-route-manifest.json for oracle replay.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { concreteProbePath } from "./hub-gold-probe-routes.mjs";
import { isHubAssetGoldEmitTarget } from "./hub-gold-asset-emit.mjs";
import { loadHubRoutes } from "./hub-load-routes.mjs";
import { manifestProbeResponse } from "./hub-manifest-probe-response.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "json";
  let output = "yaml";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--output" && argv[i + 1]) output = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-asset-from-hub.mjs <projectDir> --origin <lang> --output <lang>");
  return { projectDir, origin, output };
}

/**
 * @param {string} origin
 * @param {string} output
 */
function cosmeticFile(output, origin) {
  switch (output) {
    case "vue":
      return {
        "src/App.vue": `<script setup lang="ts">\n// Chrysalis hub emit: ${origin} -> vue\n</script>\n<template><p>Chrysalis hub ${origin} → vue</p></template>\n`,
      };
    case "html":
      return { "index.html": `<!DOCTYPE html>\n<html><head><title>${origin} → html</title></head>\n<body><p>Chrysalis hub ${origin} → html</p></body></html>\n` };
    case "css":
      return { "styles/main.css": `/* Chrysalis hub emit: ${origin} -> css */\n` };
    case "scss":
      return { "styles/main.scss": `// Chrysalis hub emit: ${origin} -> scss\n` };
    case "sql":
      return { "schema/hub.sql": `-- Chrysalis hub emit: ${origin} -> sql\n` };
    case "json":
      return { "chrysalis-hub.json": "{}\n" };
    case "yaml":
      return { "chrysalis-hub.yaml": `kind: chrysalis.hub.emit\norigin: ${origin}\n` };
    case "markdown":
      return { "README.md": `# Chrysalis hub (${origin} → markdown)\n` };
    case "c":
      return { "src/hub.c": `/* Chrysalis hub emit: ${origin} -> c */\n` };
    case "cpp":
      return { "src/hub.cpp": `// Chrysalis hub emit: ${origin} -> cpp\n` };
    default:
      return { "README.md": `# ${origin} → ${output}\n` };
  }
}

async function main() {
  const { projectDir, origin, output } = parseArgs(process.argv);
  if (!isHubAssetGoldEmitTarget(output)) {
    throw new Error(`unsupported asset output: ${output}`);
  }
  const { routes } = await loadHubRoutes(projectDir, origin);
  let holeCount = 0;
  /** @type {Array<{ method: string, path: string, status: number, body: string, headers: Record<string, string> }>} */
  const manifestRoutes = [];
  for (const r of routes) {
    const probePath = concreteProbePath(r.path);
    const resp = manifestProbeResponse(r.body, r.path);
    if (resp.hole) holeCount += 1;
    manifestRoutes.push({
      method: r.method.toUpperCase(),
      path: probePath,
      status: resp.status,
      body: resp.body,
      headers: { "Content-Type": resp.contentType },
    });
  }
  if (routes.length === 0) holeCount += 1;

  const outDir = join(projectDir, "generated", output);
  await mkdir(outDir, { recursive: true });
  const manifest = {
    kind: "chrysalis.hub.asset-route-manifest",
    schemaVersion: 1,
    origin,
    output,
    routes: manifestRoutes,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(join(outDir, "chrysalis.hub-route-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  for (const [rel, content] of Object.entries(cosmeticFile(output, origin))) {
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content, "utf8");
  }

  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output,
    path: "hub-webir-asset",
    outDir,
    routeCount: routes.length,
    holeCount,
    generatedAt: new Date().toISOString(),
  };
  await mkdir(join(projectDir, ".chrysalis"), { recursive: true });
  await writeFile(join(projectDir, ".chrysalis", `hub.${origin}.emit.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
