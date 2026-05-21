#!/usr/bin/env node
/**
 * Ingest a PHP tree and write WebIR golden JSON (for bundle / Next.js emit).
 * Usage: node scripts/hub-ingest/export-project-webir.mjs <phpProjectDir> --out <file.json>
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const projectDir = argv[2];
  let out = null;
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  if (!projectDir || !out) {
    throw new Error("usage: export-project-webir.mjs <phpProjectDir> --out <webir.json>");
  }
  return { projectDir: resolve(projectDir), out: resolve(out) };
}

async function main() {
  const { projectDir, out } = parseArgs(process.argv);
  const ingestPkg = pathToFileURL(join(process.cwd(), "packages/ingest/dist/index.js")).href;
  const webirPkg = pathToFileURL(join(process.cwd(), "packages/webir/dist/index.js")).href;
  const { ingestDirectory } = await import(ingestPkg);
  const { moduleToGoldenSnapshot } = await import(webirPkg);

  const mod = await ingestDirectory(projectDir, {
    ingestProgressFile: join(projectDir, ".chrysalis", "ingest.progress"),
  });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, moduleToGoldenSnapshot(mod, { relativizeProjectRoot: projectDir }), "utf8");
  console.log(JSON.stringify({ ok: true, out, routes: mod.roots.length, nodes: mod.nodes.size }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
