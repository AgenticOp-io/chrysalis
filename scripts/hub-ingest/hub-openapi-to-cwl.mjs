#!/usr/bin/env node
/**
 * OpenAPI 3.x -> CWL migration contract (Stage-B "Sink"; STRATEGIC-PLAN Phase 3).
 *
 * The reverse of `hub-cwl-openapi-export.mjs`: it brings an *external* OpenAPI
 * contract INTO CWL/WebIR so a migration can start from a published API spec
 * rather than only from lifted source. The route SURFACE (method, path, path +
 * query params with defaults, success status, response content-type) is imported
 * faithfully; a concrete `return` body is emitted only when the contract supplies
 * a flat response **example** — otherwise the body is an honest hole
 * (`openapi:no-response-body`), never an invented value (DESIGN non-negotiable #6).
 *
 * The CWL is rendered through the shared `renderCwlRoutes` so the importer carries
 * the same status/param/default/content-type/object-body fidelity as the export and
 * round-trips back through `cwl-ingest` (`--language cwl`).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCwlRoutes } from "./hub-webir-routes.mjs";
import { attachContractResponseBody, isFlatRenderable, sanitizeHandlerName } from "./hub-contract-cwl-shared.mjs";

export const HUB_OPENAPI_CWL_KIND = "chrysalis.hub.openapi-to-cwl";
export const HUB_OPENAPI_CWL_SCHEMA_VERSION = 1;

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

/** Convert an OpenAPI path (`/items/{id}`) to a CWL/WebIR path (`/items/:id`). */
export function openApiPathToCwl(p) {
  const withSlash = String(p).startsWith("/") ? String(p) : `/${p}`;
  return withSlash.replace(/\{([^}]+)\}/g, ":$1");
}

/** Pick the success response: lowest 2xx, else `default`, else 200/none. */
function pickSuccessResponse(responses) {
  if (!responses || typeof responses !== "object") return { status: 200, response: null };
  const twoxx = Object.keys(responses)
    .filter((c) => /^2\d\d$/.test(c))
    .sort();
  if (twoxx.length > 0) return { status: Number(twoxx[0]), response: responses[twoxx[0]] };
  if (responses.default) return { status: 200, response: responses.default };
  return { status: 200, response: null };
}

/** Extract a concrete example value from a media-type object, if any. */
function exampleFromMedia(media) {
  if (!media || typeof media !== "object") return undefined;
  if (media.example !== undefined) return media.example;
  if (media.schema && typeof media.schema === "object" && media.schema.example !== undefined) {
    return media.schema.example;
  }
  if (media.examples && typeof media.examples === "object") {
    const first = Object.values(media.examples)[0];
    if (first && typeof first === "object" && "value" in first) return first.value;
  }
  return undefined;
}

/**
 * Convert one OpenAPI operation into a `renderCwlRoutes` route object.
 * @param {string} method @param {string} openapiPath @param {object} op
 * @param {Array<object>} sharedParams — path-level `parameters`
 */
export function operationToCwlRoute(method, openapiPath, op, sharedParams = []) {
  const cwlPath = openApiPathToCwl(openapiPath);
  const handlerName = sanitizeHandlerName(op?.operationId, method, cwlPath);
  const params = [];
  const seen = new Set();
  const allParams = [
    ...(Array.isArray(sharedParams) ? sharedParams : []),
    ...(Array.isArray(op?.parameters) ? op.parameters : []),
  ];
  for (const prm of allParams) {
    if (!prm || typeof prm !== "object") continue;
    const name = String(prm.name ?? "");
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) continue;
    const key = `${prm.in}:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (prm.in === "path" && cwlPath.includes(`:${name}`)) {
      params.push({ name, source: "path" });
    } else if (prm.in === "query") {
      const entry = { name, source: "query" };
      const def = prm.schema && typeof prm.schema === "object" ? prm.schema.default : undefined;
      if (def !== undefined && (def === null || ["string", "number", "boolean"].includes(typeof def))) {
        entry.default = def;
      }
      params.push(entry);
    }
  }

  const { status, response } = pickSuccessResponse(op?.responses);
  /** @type {{ method: string, path: string, handlerName: string, status: number, params: object[], contentType?: string, value?: object, holeReason?: string }} */
  const route = { method: method.toUpperCase(), path: cwlPath, handlerName, status, params };

  const content = response && typeof response === "object" ? response.content : null;
  if (content && typeof content === "object" && Object.keys(content).length > 0) {
    const contentType = Object.keys(content)[0];
    const example = exampleFromMedia(content[contentType]);
    return attachContractResponseBody(
      route,
      status,
      contentType,
      example,
      "openapi:no-response-body",
      "openapi:nested-response-body",
    );
  }
  return attachContractResponseBody(route, status, undefined, "", "openapi:no-response-body", "openapi:nested-response-body");
}

/**
 * Convert an OpenAPI 3.x document into CWL route objects.
 * @param {object} doc
 * @returns {Array<object>}
 */
export function openApiDocToCwlRoutes(doc) {
  const routes = [];
  const paths = doc && typeof doc === "object" ? doc.paths : null;
  if (!paths || typeof paths !== "object") return routes;
  for (const openapiPath of Object.keys(paths)) {
    const item = paths[openapiPath];
    if (!item || typeof item !== "object") continue;
    const sharedParams = Array.isArray(item.parameters) ? item.parameters : [];
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (!op || typeof op !== "object") continue;
      routes.push(operationToCwlRoute(method, openapiPath, op, sharedParams));
    }
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

/**
 * Render an OpenAPI document to CWL source text.
 * @param {object} doc
 * @param {{ moduleName?: string, title?: string }} [opts]
 */
export function renderOpenApiCwl(doc, opts = {}) {
  const routes = openApiDocToCwlRoutes(doc);
  const title = opts.title ?? (doc?.info?.title ? String(doc.info.title) : "openapi");
  const moduleName = (opts.moduleName ?? "imported").replace(/[^a-zA-Z0-9_]+/g, "_") || "imported";
  const rendered = renderCwlRoutes(routes, {
    header: `# Chrysalis migration contract \u2014 imported from OpenAPI (${title})`,
    moduleName,
    surfaceOnHole: true,
  });
  return { ...rendered, routes };
}

/**
 * Import an OpenAPI JSON file to a `routes.cwl`.
 * @param {string} openapiPath
 * @param {{ out?: string, moduleName?: string }} [opts]
 */
export async function importOpenApiFileToCwl(openapiPath, opts = {}) {
  const abs = resolve(openapiPath);
  if (!existsSync(abs)) return { kind: HUB_OPENAPI_CWL_KIND, schemaVersion: HUB_OPENAPI_CWL_SCHEMA_VERSION, ok: false, reason: "no-openapi", openapiPath: abs };
  let doc;
  try {
    doc = JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    return { kind: HUB_OPENAPI_CWL_KIND, schemaVersion: HUB_OPENAPI_CWL_SCHEMA_VERSION, ok: false, reason: "invalid-json", openapiPath: abs, error: String(e?.message ?? e) };
  }
  const { text, holeCount, routeCount, routes } = renderOpenApiCwl(doc, { moduleName: opts.moduleName });
  const outPath = opts.out ? resolve(opts.out) : join(dirname(abs), "routes.cwl");
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, text, "utf8");
  return {
    kind: HUB_OPENAPI_CWL_KIND,
    schemaVersion: HUB_OPENAPI_CWL_SCHEMA_VERSION,
    ok: true,
    openapiPath: abs,
    cwlPath: outPath,
    routeCount,
    holeCount,
    holeFree: routeCount - holeCount,
    pathCount: doc?.paths && typeof doc.paths === "object" ? Object.keys(doc.paths).length : 0,
    withStatus: routes.filter((r) => typeof r.status === "number" && r.status !== 200).length,
    withParams: routes.filter((r) => Array.isArray(r.params) && r.params.length > 0).length,
  };
}

function parseArgs(argv) {
  let openapi = null;
  let out = null;
  let jsonOut = null;
  let moduleName;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--openapi" && argv[i + 1]) openapi = resolve(argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) out = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--module" && argv[i + 1]) moduleName = argv[++i];
  }
  return { openapi, out, jsonOut, moduleName };
}

async function main() {
  const { openapi, out, jsonOut, moduleName } = parseArgs(process.argv);
  if (!openapi) {
    console.error("usage: hub-openapi-to-cwl.mjs --openapi <doc.json> [--out routes.cwl] [--module name] [--json-out path]");
    process.exit(1);
  }
  const report = await importOpenApiFileToCwl(openapi, { out, moduleName });
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
