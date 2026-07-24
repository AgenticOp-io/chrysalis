import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, type PythonHubParseResult, type PythonHubRoute, type PythonReturnNode, type PythonSqlEffect } from "./schema.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const parseScript = join(packageRoot, "python", "parse_routes.py");

let cachedPython: string | undefined;

/** CPython for hub ast (python3 on Linux CI, python on Windows). */
export function resolvePythonBinary(): string {
  if (process.env.CHRYSALIS_HUB_PYTHON) return process.env.CHRYSALIS_HUB_PYTHON;
  if (cachedPython) return cachedPython;
  for (const cmd of ["python3", "python", "py"]) {
    const r = spawnSync(cmd, ["-c", "import ast"], { encoding: "utf8" });
    if (r.status === 0) {
      cachedPython = cmd;
      return cmd;
    }
  }
  cachedPython = "python3";
  return cachedPython;
}

function normalizeParseResult(raw: unknown): PythonHubParseResult {
  if (!raw || typeof raw !== "object") {
    return { schemaVersion: SCHEMA_VERSION, routes: [] };
  }
  const j = raw as { routes?: unknown; error?: string; schemaVersion?: string };
  const routes: PythonHubRoute[] = [];
  if (Array.isArray(j.routes)) {
    for (const r of j.routes) {
      if (!r || typeof r !== "object") continue;
      const row = r as Record<string, unknown>;
      if (typeof row.method !== "string" || typeof row.path !== "string") continue;
      const returnTree = normalizeReturnTree(row.returnTree);
      const sqlEffects = normalizeSqlEffects(row.sqlEffects);
      const statusCode =
        typeof row.statusCode === "number" && Number.isFinite(row.statusCode)
          ? row.statusCode
          : undefined;
      routes.push({
        method: row.method,
        path: row.path,
        line: typeof row.line === "number" ? row.line : 1,
        name: typeof row.name === "string" ? row.name : "",
        ...(typeof row.returns === "string" ? { returns: row.returns } : {}),
        ...(typeof row.returnKind === "string" ? { returnKind: row.returnKind } : {}),
        ...(row.returnValue !== undefined ? { returnValue: row.returnValue } : {}),
        ...(returnTree ? { returnTree } : {}),
        ...(statusCode !== undefined ? { statusCode } : {}),
        ...(sqlEffects ? { sqlEffects } : {}),
      });
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    routes,
    ...(typeof j.error === "string" ? { error: j.error } : {}),
  };
}

function runParse(src: string): PythonHubParseResult {
  const py = resolvePythonBinary();
  const r = spawnSync(py, [parseScript], {
    input: src,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0 || !r.stdout?.trim()) {
    return { schemaVersion: SCHEMA_VERSION, routes: [], error: r.stderr?.slice(0, 200) ?? "parse-failed" };
  }
  try {
    return normalizeParseResult(JSON.parse(r.stdout.trim()));
  } catch {
    return { schemaVersion: SCHEMA_VERSION, routes: [], error: "parse-json" };
  }
}

/** Synchronous parse for hub lift dispatch (spawnSync). */
export function parseSourceSync(src: string, _filename = "<anon.py>"): PythonHubParseResult {
  return runParse(src);
}

export async function parseSource(src: string, filename = "<anon.py>"): Promise<PythonHubParseResult> {
  return parseSourceSync(src, filename);
}

export async function parseFile(path: string): Promise<PythonHubParseResult> {
  const src = await readFile(path, "utf8");
  return parseSourceSync(src, path);
}

export { SCHEMA_VERSION, type PythonHubParseResult, type PythonHubRoute, type PythonReturnNode, type PythonSqlEffect } from "./schema.js";

function normalizeReturnTree(raw: unknown): PythonReturnNode | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const n = raw as Record<string, unknown>;
  if (n.t === "lit") return { t: "lit", v: n.v as string | number | boolean | null };
  if (n.t === "ref" && typeof n.name === "string" && typeof n.source === "string") {
    const source = n.source;
    if (source !== "path" && source !== "query" && source !== "body" && source !== "header" && source !== "cookie") {
      return undefined;
    }
    return {
      t: "ref",
      source,
      name: n.name,
      ...(n.default !== undefined ? { default: n.default } : {}),
    };
  }
  if (n.t === "obj" && Array.isArray(n.entries)) {
    const entries = [];
    for (const e of n.entries) {
      if (!e || typeof e !== "object") return undefined;
      const row = e as Record<string, unknown>;
      if (typeof row.key !== "string") return undefined;
      const value = normalizeReturnTree(row.value);
      if (!value) return undefined;
      entries.push({ key: row.key, value });
    }
    return { t: "obj", entries };
  }
  return undefined;
}

function normalizeSqlEffects(raw: unknown): PythonSqlEffect[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: PythonSqlEffect[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return undefined;
    const s = row as Record<string, unknown>;
    if (typeof s.sql !== "string") return undefined;
    const params = Array.isArray(s.params)
      ? s.params.map((p) => normalizeReturnTree(p)).filter((p): p is PythonReturnNode => p !== undefined)
      : undefined;
    out.push({ sql: s.sql, ...(params?.length ? { params } : {}) });
  }
  return out.length ? out : undefined;
}
