#!/usr/bin/env node
/**
 * Lift a non-PHP source tree into WebIR (routes + holes per file).
 * Usage: node scripts/hub-ingest/lift-to-webir.mjs <projectDir> --language python
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { EXT_BY_LANG, guessRoutePath, loadWebir } from "./shared.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let language = "javascript";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--language" && argv[i + 1]) language = argv[++i];
  }
  if (!projectDir) throw new Error("usage: lift-to-webir.mjs <projectDir> --language <id>");
  return { projectDir, language };
}

async function walk(dir, exts, paths, depth) {
  if (depth > 14 || paths.length >= 8000) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "vendor") continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) await walk(p, exts, paths, depth + 1);
    else if (ent.isFile() && exts.has(extname(ent.name).toLowerCase())) {
      paths.push(p);
      if (paths.length >= 8000) return;
    }
  }
}

async function main() {
  const { projectDir, language } = parseArgs(process.argv);
  const exts = new Set(EXT_BY_LANG[language] ?? []);
  if (exts.size === 0) throw new Error(`unsupported language: ${language}`);

  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: `hub-lift:${language}` });
  const wr = webir.webRequest.builders(builder);

  const paths = [];
  await walk(projectDir, exts, paths, 0);

  for (const rel of paths) {
    const file = rel.startsWith(projectDir) ? rel.slice(projectDir.length).replace(/^[/\\]/, "") : rel;
    const origin = { file, line: 1, column: 1 };
    const holeId = builder.node({
      dialect: "legacy",
      op: "hole",
      type: { kind: "unknown" },
      effects: [],
      operands: [],
      attrs: { reason: `hub-lift:${language}`, file },
      origin,
      provenance: [webir.provenance("hub-ingest", `lift-to-webir:${language}`)],
    });
    const handlerId = wr.handler({
      attrs: {
        name: file.replace(/[/\\]/g, "_"),
        input: { kind: "unknown" },
        output: { kind: "unknown" },
      },
      body: holeId,
      effects: [],
      origin,
      provenance: [webir.provenance("hub-ingest", `route-handler:${language}`)],
    });
    const routeId = wr.route({
      attrs: {
        method: "GET",
        path: guessRoutePath(file),
        pathParams: [],
      },
      handler: handlerId,
      origin,
      provenance: [webir.provenance("hub-ingest", `route:${language}`)],
    });
    builder.addRoot(routeId);
  }

  const module = builder.finish();
  const outDir = join(projectDir, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `hub.${language}.webir.json`);
  await writeFile(outPath, `${webir.moduleToGoldenSnapshot(module)}\n`, "utf8");

  const report = {
    kind: "chrysalis.hub.lift",
    schemaVersion: 0,
    language,
    fileCount: paths.length,
    routeCount: module.roots.length,
    webirPath: outPath,
    holeCount: paths.length,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(join(outDir, `hub.${language}.lift.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
