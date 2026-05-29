#!/usr/bin/env node
/**
 * Project WebIR / migration CWL routes → OpenAPI 3.0 contract (G109 migration bundle).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWebir } from "./shared.mjs";
import { listHubWebRoutes } from "./hub-webir-routes.mjs";
import { resolveProjectWebirPath } from "./hub-project-cwl-export.mjs";

export const HUB_CWL_OPENAPI_KIND = "chrysalis.hub.cwl-openapi-export";
export const HUB_CWL_OPENAPI_SCHEMA_VERSION = 1;

/**
 * @param {ReturnType<typeof listHubWebRoutes>} routes
 * @param {{ title?: string, version?: string }} [meta]
 */
export function webirRoutesToOpenApi3(routes, meta = {}) {
  const paths = {};
  for (const r of routes) {
    const pathKey = r.path.startsWith("/") ? r.path : `/${r.path}`;
    if (!paths[pathKey]) paths[pathKey] = {};
    const method = r.method.toLowerCase();
    /** @type {Record<string, unknown>} */
    const op = {
      operationId: r.handlerName,
      responses: {
        "200": {
          description: "Handler response (projected from WebIR)",
        },
      },
      "x-chrysalis": {
        handler: r.handlerName,
        bodyKind: r.body.kind,
        ...(r.body.kind === "hole" ? { hole: r.body.reason } : {}),
      },
    };
    if (r.body.kind === "literal" && r.body.value !== undefined) {
      op.responses["200"].content = {
        "application/json": {
          example: r.body.value,
        },
      };
    }
    paths[pathKey][method] = op;
  }
  return {
    openapi: "3.0.3",
    info: {
      title: meta.title ?? "Chrysalis migration contract",
      version: meta.version ?? "0.0.0",
      description: "Projected from Chrysalis WebIR (hub-cwl-openapi-export).",
    },
    paths,
  };
}

/**
 * @param {string} projectDir
 * @param {{ origin?: string, outBasename?: string }} [opts]
 */
export async function exportProjectOpenApi(projectDir, opts = {}) {
  const origin = opts.origin ?? "php";
  const webirPath = await resolveProjectWebirPath(projectDir, origin);
  if (!webirPath) {
    return { ok: false, reason: "no-webir", origin };
  }
  const webir = await loadWebir();
  const raw = JSON.parse(readFileSync(webirPath, "utf8"));
  const mod = webir.moduleFromGoldenSnapshot(raw);
  const routes = listHubWebRoutes(mod);
  const doc = webirRoutesToOpenApi3(routes, {
    title: opts.title ?? `migration-${origin}`,
    version: "1.0.0",
  });
  const outDir = join(resolve(projectDir), ".chrysalis");
  const outName = opts.outBasename ?? "migration.openapi.json";
  const openapiPath = join(outDir, outName);
  await mkdir(outDir, { recursive: true });
  await writeFile(openapiPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  const holeRoutes = routes.filter((r) => r.body.kind === "hole").length;
  return {
    kind: HUB_CWL_OPENAPI_KIND,
    schemaVersion: HUB_CWL_OPENAPI_SCHEMA_VERSION,
    ok: true,
    origin,
    webirPath,
    openapiPath,
    routeCount: routes.length,
    holeRoutes,
    pathCount: Object.keys(doc.paths).length,
  };
}

function parseArgs(argv) {
  let projectDir = null;
  let jsonOut = null;
  let origin = "php";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  return { projectDir, jsonOut, origin };
}

async function main() {
  const { projectDir, jsonOut, origin } = parseArgs(process.argv);
  if (!projectDir) {
    console.error("usage: hub-cwl-openapi-export.mjs --project <dir> [--origin php] [--json-out path]");
    process.exit(1);
  }
  const report = await exportProjectOpenApi(projectDir, { origin });
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
