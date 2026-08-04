#!/usr/bin/env node
/**
 * Lift a non-PHP source tree into WebIR (routes + holes per file).
 * Usage: node scripts/hub-ingest/lift-to-webir.mjs <projectDir> --language python
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { EXT_BY_LANG, guessRoutePath, loadWebir } from "./shared.mjs";
import {
  canJavaScriptAstIngest,
  countExpressMiddlewareUses,
  detectHttpRoutesInSource,
} from "./javascript-ast-ingest.mjs";
import { liftExpressMiddlewareFromSource } from "./hub-express-middleware.mjs";
import { liftFlaskSyntheticMiddleware } from "./hub-flask-middleware.mjs";
import { canPythonAstIngest } from "./python-ast-ingest.mjs";
import { trySpecializedHubLift } from "./hub-lift-dispatch.mjs";
import { HUB_SILVER_FILE_LIFT_ORIGIN_IDS } from "./language-catalog.mjs";
import { lowerHubLiteral } from "./hub-lift-webir-route.mjs";
import { toCwlIdent } from "./hub-webir-routes.mjs";

const silverFileLiftOrigins = new Set(HUB_SILVER_FILE_LIFT_ORIGIN_IDS);

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
      ent.name === ".chrysalis" ||
      ent.name === "traces" ||
      ent.name === "oracle"
    ) {
      continue;
    }
    if (ent.isFile() && ent.name === "serve.mjs") {
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
  const webir = await loadWebir();
  const builder = new webir.ModuleBuilder({ sourceApp: `hub-lift:${language}` });
  const wr = webir.webRequest.builders(builder);
  const data = webir.dataDialect.builders(builder);
  const literalCtx = { data, webir };

  const paths = [];
  let heuristicRouteCount = 0;
  let astRouteCount = 0;
  let middlewareUseCount = 0;
  let middlewareLoweredCount = 0;
  /** @type {{ kind: string, file: string, count: number }[]} */
  const middlewareShell = [];
  let fileCount = 0;

  if (language === "svelte") {
    const { liftSvelteKitProjectToWebir } = await import("./sveltekit-route-lift.mjs");
    const lifted = await liftSvelteKitProjectToWebir({ projectDir, webir, builder, wr, language: "svelte" });
    astRouteCount = lifted.astRouteCount ?? 0;
    fileCount = lifted.fileCount ?? 0;
  } else if (language === "nextjs") {
    const { liftNextAppProjectToWebir } = await import("./nextjs-route-lift.mjs");
    const lifted = await liftNextAppProjectToWebir({ projectDir, webir, builder, wr, language: "nextjs" });
    astRouteCount = lifted.astRouteCount ?? 0;
    fileCount = lifted.fileCount ?? 0;
  } else if (language === "nuxt") {
    const { liftNitroProjectToWebir } = await import("./nitro-route-lift.mjs");
    const lifted = await liftNitroProjectToWebir({ projectDir, webir, builder, wr, language: "nuxt" });
    astRouteCount = lifted.astRouteCount ?? 0;
    fileCount = lifted.fileCount ?? 0;
    middlewareUseCount = lifted.middlewareUseCount ?? 0;
    middlewareLoweredCount = lifted.middlewareRootCount ?? 0;
  } else {
    // Revel Go: conf/routes + Controller.Action (G10114 / D6540) — project lift before
    // per-file Go verbs so Params.*.Get cannot false-positive Chi .Get peels.
    let revelHandled = false;
    if (language === "go") {
      const { detectGoRevelProject, liftGoRevelProjectToWebir } = await import("./go-ast-ingest.mjs");
      const revel = await detectGoRevelProject(projectDir);
      if (revel) {
        const lifted = await liftGoRevelProjectToWebir({
          projectDir,
          webir,
          builder,
          wr,
          language: "go",
        });
        if (lifted.usedAst) {
          astRouteCount = lifted.astRouteCount ?? 0;
          fileCount = lifted.fileCount ?? 0;
          revelHandled = true;
        }
      }
    }

    if (!revelHandled) {
    const exts = new Set(EXT_BY_LANG[language] ?? []);
    if (exts.size === 0) throw new Error(`unsupported language: ${language}`);
    await walk(projectDir, exts, paths, 0);
    fileCount = paths.length;

    if (language === "cwl" && paths.length > 1) {
      const entry = paths.find((p) => /(^|[/\\])routes\.cwl$/i.test(p));
      if (entry) {
        paths.splice(0, paths.length, entry);
      }
    }

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
      entryPath: abs,
      language,
      ext,
      projectDir,
    });
    if (specialized) {
      astRouteCount += specialized.astRouteCount;
      const fileMiddlewareCount =
        typeof specialized.middlewareUseCount === "number"
          ? specialized.middlewareUseCount
          : canJavaScriptAstIngest(language, ext)
            ? countExpressMiddlewareUses(source)
            : 0;
      middlewareUseCount += fileMiddlewareCount;
      if (typeof specialized.middlewareRootCount === "number") {
        middlewareLoweredCount += specialized.middlewareRootCount;
      }
      const shellCount = fileMiddlewareCount - (specialized.middlewareRootCount ?? 0);
      if (shellCount > 0) {
        middlewareShell.push({
          kind: "legacy:express-use",
          file,
          count: shellCount,
        });
      }
      if (canPythonAstIngest(language, ext)) {
        const flaskMw = liftFlaskSyntheticMiddleware(source, file, webir, builder, wr);
        middlewareUseCount += flaskMw.middlewareUseCount;
        middlewareLoweredCount += flaskMw.middlewareRootCount;
      }
      continue;
    }

    if (canJavaScriptAstIngest(language, ext)) {
      const mw = liftExpressMiddlewareFromSource(source, file, webir, builder, wr);
      middlewareUseCount += mw.middlewareUseCount;
      middlewareLoweredCount += mw.middlewareRootCount;
      const shellCount = mw.middlewareUseCount - mw.middlewareRootCount;
      if (shellCount > 0) {
        middlewareShell.push({ kind: "legacy:express-use", file, count: shellCount });
      }
    }

    if (canPythonAstIngest(language, ext)) {
      const mw = liftFlaskSyntheticMiddleware(source, file, webir, builder, wr);
      middlewareUseCount += mw.middlewareUseCount;
      middlewareLoweredCount += mw.middlewareRootCount;
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
    const bodyId = silverFileLiftOrigins.has(language)
      ? lowerHubLiteral(literalCtx, true, { file, line: 1 })
      : builder.node({
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
        name: toCwlIdent(file.replace(/[/\\]/g, "_"), "handler"),
        input: { kind: "unknown" },
        output: { kind: "unknown" },
      },
      body: bodyId,
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
    }
  }

  const module = builder.finish();
  const holes = webir.countHoles(module);
  const outDir = join(projectDir, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `hub.${language}.webir.json`);
  await writeFile(outPath, `${webir.moduleToGoldenSnapshot(module)}\n`, "utf8");

  const report = {
    kind: "chrysalis.hub.lift",
    schemaVersion: 2,
    language,
    fileCount,
    astRouteCount,
    heuristicRouteCount,
    routeCount: module.roots.length,
    webirPath: outPath,
    holeCount: holes,
    middlewareUseCount,
    middlewareLoweredCount,
    middlewareShell,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(join(outDir, `hub.${language}.lift.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
