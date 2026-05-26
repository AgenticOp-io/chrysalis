#!/usr/bin/env node
/**
 * Lift a non-PHP source tree into WebIR (routes + holes per file).
 * Usage: node scripts/hub-ingest/lift-to-webir.mjs <projectDir> --language python
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { EXT_BY_LANG, guessRoutePath, loadWebir } from "./shared.mjs";
import { canJavaScriptAstIngest, detectHttpRoutesInSource } from "./javascript-ast-ingest.mjs";
import { trySpecializedHubLift } from "./hub-lift-dispatch.mjs";

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
    if (
      ent.name === "node_modules" ||
      ent.name === ".git" ||
      ent.name === "vendor" ||
      ent.name === "generated" ||
      ent.name === ".chrysalis"
    ) {
      continue;
    }
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

  let heuristicRouteCount = 0;
  let astRouteCount = 0;

  for (const abs of paths) {
    const file = abs.startsWith(projectDir) ? abs.slice(projectDir.length).replace(/^[/\\]/, "") : abs;
    const source = await readFile(abs, "utf8").catch(() => "");
    const ext = extname(file).toLowerCase();

    const specialized = trySpecializedHubLift({
      webir,
      builder,
      wr,
      source,
      file,
      language,
      ext,
    });
    if (specialized) {
      astRouteCount += specialized.astRouteCount;
      continue;
    }

    const routes = canJavaScriptAstIngest(language, ext)
      ? detectHttpRoutesInSource(source, file)
      : [];

    if (routes.length > 0) {
      for (const r of routes) {
        heuristicRouteCount += 1;
        const origin = { file: r.file, line: 1, column: 1 };
        const holeId = builder.node({
          dialect: "legacy",
          op: "hole",
          type: { kind: "unknown" },
          effects: [],
          operands: [],
          attrs: { reason: `hub-lift:${language}:handler-body`, method: r.method, path: r.path },
          origin,
          provenance: [webir.provenance("hub-ingest", `lift-heuristic:${language}`)],
        });
        const handlerId = wr.handler({
          attrs: {
            name: `${r.method}_${r.path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
            input: { kind: "unknown" },
            output: { kind: "unknown" },
          },
          body: holeId,
          effects: [],
          origin,
          provenance: [webir.provenance("hub-ingest", `route-handler:${language}`)],
        });
        const routeId = wr.route({
          attrs: { method: r.method, path: r.path, pathParams: [] },
          handler: handlerId,
          origin,
          provenance: [webir.provenance("hub-ingest", `route:${language}`)],
        });
        builder.addRoot(routeId);
      }
      continue;
    }

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
  const holes = webir.countHoles(module);
  const outDir = join(projectDir, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `hub.${language}.webir.json`);
  await writeFile(outPath, `${webir.moduleToGoldenSnapshot(module)}\n`, "utf8");

  const report = {
    kind: "chrysalis.hub.lift",
    schemaVersion: 1,
    language,
    fileCount: paths.length,
    astRouteCount,
    heuristicRouteCount,
    routeCount: module.roots.length,
    webirPath: outPath,
    holeCount: holes,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(join(outDir, `hub.${language}.lift.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
