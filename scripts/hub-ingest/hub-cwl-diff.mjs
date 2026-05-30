#!/usr/bin/env node
/**
 * Semantic diff for CWL migration contracts (G141).
 *
 * Compares two CWL modules at the route/handler level so PR review sees
 * added/removed/changed routes and field-level deltas — not opaque line noise.
 *
 * Usage:
 *   node scripts/hub-ingest/hub-cwl-diff.mjs --base base.cwl --head head.cwl
 *     [--json-out .chrysalis/cwl-diff.json] [--markdown-out .chrysalis/cwl-diff.md]
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCwlModule } from "./cwl-parser.mjs";
import { resolveCwlModuleFromPath } from "./cwl-module-graph.mjs";

export const HUB_CWL_DIFF_KIND = "chrysalis.hub.cwl-diff";
export const HUB_CWL_DIFF_SCHEMA_VERSION = 1;

/** @param {string} method @param {string} path */
export function cwlRouteKey(method, path) {
  return `${String(method).toUpperCase()} ${path}`;
}

/** @param {unknown} body */
function bodySnapshot(body) {
  if (!body || typeof body !== "object") return { kind: "unknown" };
  const b = body;
  if (b.kind === "hole") return { kind: "hole", reason: String(b.reason ?? "hole") };
  if (b.kind === "literal") return { kind: "literal", value: b.value };
  if (b.kind === "object" && Array.isArray(b.entries)) {
    return {
      kind: "object",
      fields: b.entries
        .map((e) => ({
          key: e.key,
          value: bodySnapshot(e.value),
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    };
  }
  if (b.kind === "pathParam" || b.kind === "queryParam") {
    const snap = { kind: b.kind, name: b.name };
    if (Object.prototype.hasOwnProperty.call(b, "default")) snap.default = b.default;
    return snap;
  }
  return { kind: String(b.kind ?? "unknown") };
}

/**
 * Normalize a parsed CWL route into a comparable snapshot.
 * @param {object} route
 */
export function cwlRouteSnapshot(route) {
  return {
    handler: route.name,
    status: route.responseStatus ?? 200,
    contentType: route.responseContentType ?? null,
    pathParams: [...(route.handlerPathParams ?? [])].sort(),
    queryParams: [...(route.handlerQueryParams ?? [])].sort(),
    body: bodySnapshot(route.body),
  };
}

/** @param {unknown} a @param {unknown} b */
function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * List field paths that differ between two route snapshots.
 * @param {object} base
 * @param {object} head
 */
export function cwlRouteFieldChanges(base, head) {
  /** @type {Array<{ field: string, before: unknown, after: unknown }>} */
  const changes = [];
  const fields = ["handler", "status", "contentType", "pathParams", "queryParams", "body"];
  for (const field of fields) {
    if (!jsonEqual(base[field], head[field])) {
      changes.push({ field, before: base[field], after: head[field] });
    }
  }
  return changes;
}

/**
 * @param {string} source
 * @param {string} file
 */
export function parseCwlFile(source, file) {
  return parseCwlModule(source, file);
}

/**
 * @param {string} filePath
 */
export function parseCwlPath(filePath) {
  return resolveCwlModuleFromPath(filePath);
}

/**
 * Build a route map keyed by `METHOD path`.
 * @param {ReturnType<typeof parseCwlModule>} parsed
 */
function routeMap(parsed) {
  /** @type {Map<string, { route: object, snapshot: object }>} */
  const map = new Map();
  for (const route of parsed.routes ?? []) {
    const key = cwlRouteKey(route.method, route.path);
    map.set(key, { route, snapshot: cwlRouteSnapshot(route) });
  }
  return map;
}

/**
 * Diff two CWL sources (semantic route diff).
 * @param {string} baseSource
 * @param {string} headSource
 * @param {{ baseFile?: string, headFile?: string }} [opts]
 */
export function diffCwlSources(baseSource, headSource, opts = {}) {
  const baseFile = opts.baseFile ?? "base.cwl";
  const headFile = opts.headFile ?? "head.cwl";
  const baseParsed =
    existsSync(resolve(baseFile)) ? parseCwlPath(resolve(baseFile)) : parseCwlFile(baseSource, baseFile);
  const headParsed =
    existsSync(resolve(headFile)) ? parseCwlPath(resolve(headFile)) : parseCwlFile(headSource, headFile);
  return diffCwlParsed(baseParsed, headParsed, opts);
}

/**
 * @param {ReturnType<typeof parseCwlModule>} baseParsed
 * @param {ReturnType<typeof parseCwlModule>} headParsed
 * @param {{ baseFile?: string, headFile?: string }} [opts]
 */
export function diffCwlParsed(baseParsed, headParsed, opts = {}) {
  const base = routeMap(baseParsed);
  const head = routeMap(headParsed);

  /** @type {Array<object>} */
  const added = [];
  /** @type {Array<object>} */
  const removed = [];
  /** @type {Array<object>} */
  const changed = [];
  let unchanged = 0;

  for (const [key, headEntry] of head) {
    const baseEntry = base.get(key);
    if (!baseEntry) {
      added.push({ route: key, handler: headEntry.snapshot.handler, snapshot: headEntry.snapshot });
      continue;
    }
    const fieldChanges = cwlRouteFieldChanges(baseEntry.snapshot, headEntry.snapshot);
    if (fieldChanges.length === 0) {
      unchanged += 1;
    } else {
      changed.push({ route: key, handler: headEntry.snapshot.handler, changes: fieldChanges });
    }
  }

  for (const [key, baseEntry] of base) {
    if (!head.has(key)) {
      removed.push({ route: key, handler: baseEntry.snapshot.handler, snapshot: baseEntry.snapshot });
    }
  }

  added.sort((a, b) => a.route.localeCompare(b.route));
  removed.sort((a, b) => a.route.localeCompare(b.route));
  changed.sort((a, b) => a.route.localeCompare(b.route));

  return {
    kind: HUB_CWL_DIFF_KIND,
    schemaVersion: HUB_CWL_DIFF_SCHEMA_VERSION,
    base: { file: opts.baseFile ?? "base.cwl", module: baseParsed.moduleName, routeCount: base.size },
    head: { file: opts.headFile ?? "head.cwl", module: headParsed.moduleName, routeCount: head.size },
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged,
      totalBase: base.size,
      totalHead: head.size,
    },
    added,
    removed,
    changed,
  };
}

/**
 * @param {ReturnType<typeof diffCwlSources>} diff
 */
export function renderCwlDiffMarkdown(diff) {
  const lines = [
    "## CWL migration contract diff",
    "",
    `Base: \`${diff.base.file}\` (${diff.base.routeCount} routes) → Head: \`${diff.head.file}\` (${diff.head.routeCount} routes)`,
    "",
    `- **Added:** ${diff.summary.added}`,
    `- **Removed:** ${diff.summary.removed}`,
    `- **Changed:** ${diff.summary.changed}`,
    `- **Unchanged:** ${diff.summary.unchanged}`,
    "",
  ];

  if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
    lines.push("_No route-level changes._");
    return `${lines.join("\n")}\n`;
  }

  lines.push("| Change | Route | Details |", "| --- | --- | --- |");

  for (const row of diff.added) {
    lines.push(`| added | \`${row.route}\` | handler \`${row.handler}\` |`);
  }
  for (const row of diff.removed) {
    lines.push(`| removed | \`${row.route}\` | handler \`${row.handler}\` |`);
  }
  for (const row of diff.changed) {
    const detail = row.changes
      .map((c) => `${c.field}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`)
      .join("; ");
    lines.push(`| changed | \`${row.route}\` | ${detail} |`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

/**
 * Diff two CWL files on disk.
 * @param {string} basePath
 * @param {string} headPath
 */
export function diffCwlFiles(basePath, headPath) {
  const baseSource = readFileSync(basePath, "utf8");
  const headSource = readFileSync(headPath, "utf8");
  return diffCwlSources(baseSource, headSource, { baseFile: basePath, headFile: headPath });
}

/**
 * When a baseline CWL exists, write `.chrysalis/cwl-diff.{json,md}` for PR review.
 * @param {string} root
 * @param {{ baseCwl?: string, headCwl?: string }} [opts]
 */
export async function writeProjectCwlDiffArtifacts(root, opts = {}) {
  const projectRoot = resolve(root);
  const headPath = opts.headCwl ?? join(projectRoot, ".chrysalis", "migration.cwl");
  /** @type {(string | undefined)[]} */
  const candidates = [
    opts.baseCwl,
    join(projectRoot, ".chrysalis", "migration.cwl.baseline"),
    join(projectRoot, "migration.cwl.baseline"),
  ];
  let basePath = null;
  for (const p of candidates) {
    if (p && existsSync(p)) {
      basePath = p;
      break;
    }
  }
  if (!basePath || !existsSync(headPath)) return null;

  const diff = diffCwlFiles(basePath, headPath);
  const markdown = renderCwlDiffMarkdown(diff);
  const jsonPath = join(projectRoot, ".chrysalis", "cwl-diff.json");
  const mdPath = join(projectRoot, ".chrysalis", "cwl-diff.md");
  await mkdir(join(projectRoot, ".chrysalis"), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(diff, null, 2)}\n`, "utf8");
  await writeFile(mdPath, markdown, "utf8");
  return { basePath, headPath, jsonPath, mdPath, summary: diff.summary, diff };
}

function parseArgs(argv) {
  let base = null;
  let head = null;
  let jsonOut = null;
  let markdownOut = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--base" && argv[i + 1]) base = resolve(argv[++i]);
    else if (argv[i] === "--head" && argv[i + 1]) head = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--markdown-out" && argv[i + 1]) markdownOut = resolve(argv[++i]);
  }
  return { base, head, jsonOut, markdownOut };
}

async function main() {
  const { base, head, jsonOut, markdownOut } = parseArgs(process.argv);
  if (!base || !head) {
    console.error(
      "usage: hub-cwl-diff.mjs --base <base.cwl> --head <head.cwl> [--json-out path] [--markdown-out path]",
    );
    process.exit(1);
  }
  const diff = diffCwlFiles(base, head);
  const markdown = renderCwlDiffMarkdown(diff);
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(diff, null, 2)}\n`, "utf8");
  }
  if (markdownOut) {
    await mkdir(dirname(markdownOut), { recursive: true });
    await writeFile(markdownOut, markdown, "utf8");
  }
  console.log(JSON.stringify(diff, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
