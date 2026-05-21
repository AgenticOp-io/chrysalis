#!/usr/bin/env node
/**
 * Emit Hono/Fastify from hub-lift WebIR snapshot.
 * Usage: node scripts/hub-ingest/emit-from-hub.mjs <projectDir> --origin python --target hono
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hubWebirPath, loadEmitter, loadWebir, resolveEmitBackend } from "./shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "javascript";
  let target = "hono";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if ((argv[i] === "--target" || argv[i] === "--output") && argv[i + 1]) target = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-from-hub.mjs <projectDir> --origin <lang> --target hono|fastify");
  return { projectDir, origin, target };
}

async function main() {
  const { projectDir, origin, target } = parseArgs(process.argv);
  const backend = resolveEmitBackend(target);
  if (!backend || backend === "nextjs") {
    throw new Error("emit-from-hub: use emit-webir-bundle-nextjs.mjs for nextjs");
  }

  const webirPath = hubWebirPath(projectDir, origin);
  const raw = JSON.parse(await readFile(webirPath, "utf8"));
  const { moduleFromGoldenSnapshot } = await loadWebir();
  const mod = moduleFromGoldenSnapshot(raw);

  const outDir = join(projectDir, "generated", backend);
  await mkdir(outDir, { recursive: true });

  const loaded = await loadEmitter(backend);
  const result = await loaded.emit({ module: mod, outDir, provenanceRoot: projectDir });

  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 0,
    origin,
    target: backend,
    outDir,
    handlerCount: result.handlerCount,
    files: result.files.length,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(join(projectDir, ".chrysalis", `hub.${origin}.emit.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
