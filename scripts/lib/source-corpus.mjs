#!/usr/bin/env node
/**
 * Origin source corpus (DESIGN D6444): ingest all project files into a
 * code database, then derive a piece-by-piece convert queue.
 *
 * Generic engine lib — not WISP-named. POC roots are passed by callers.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const SOURCE_CORPUS_KIND = "chrysalis.source-corpus";
export const SOURCE_CORPUS_SCHEMA_VERSION = 1;
export const CONVERT_QUEUE_KIND = "chrysalis.convert-queue";
export const CONVERT_QUEUE_SCHEMA_VERSION = 1;

const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  ".svelte-kit",
  "build",
  "dist",
  "coverage",
  ".turbo",
  ".vite",
  "generated",
  "__pycache__",
  ".chrysalis",
]);

const TEXT_EXT = new Set([
  ".ts",
  ".js",
  ".mjs",
  ".cjs",
  ".svelte",
  ".vue",
  ".tsx",
  ".jsx",
  ".css",
  ".scss",
  ".sass",
  ".html",
  ".json",
  ".md",
  ".cwl",
  ".php",
  ".py",
  ".go",
  ".java",
  ".rb",
  ".cs",
  ".yml",
  ".yaml",
  ".toml",
  ".env",
  ".svg",
]);

/**
 * @param {string} dir
 * @param {string[]} [acc]
 * @param {number} [depth]
 */
export function walkSourceFiles(dir, acc = [], depth = 0) {
  if (depth > 24 || !existsSync(dir)) return acc;
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of names) {
    if (SKIP_DIR.has(name)) continue;
    if (name.startsWith(".") && name !== ".env" && !name.startsWith(".env.")) continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkSourceFiles(p, acc, depth + 1);
    else acc.push(p);
  }
  return acc;
}

/** @param {string} absPath @param {string} root */
export function classifySourceFile(absPath, root) {
  const rel = relative(root, absPath).replace(/\\/g, "/");
  const base = basename(absPath);
  const ext = extname(absPath).toLowerCase();
  if (/\/\+page\.svelte$/.test(rel) || /\/page\.(tsx|jsx|vue)$/.test(rel)) return "page";
  if (/\/\+layout\.svelte$/.test(rel) || /\/layout\.(tsx|jsx)$/.test(rel)) return "layout";
  if (/\/\+page\.server\.(ts|js)$/.test(rel)) return "page-server";
  if (/\/\+server\.(ts|js)$/.test(rel) || /\/\+layout\.server\.(ts|js)$/.test(rel)) {
    return "server-route";
  }
  if (/\/components\//.test(rel) && (ext === ".svelte" || ext === ".tsx" || ext === ".vue")) {
    return "component";
  }
  if (basename(root) === "backend-services" && (ext === ".js" || ext === ".ts")) {
    return "api-handler";
  }
  if (/\/routes\//.test(rel) && (ext === ".js" || ext === ".ts") && !rel.includes("src/routes")) {
    return "api-handler";
  }
  if (ext === ".css" || ext === ".scss") return "style";
  if (base === "package.json" || base.endsWith(".config.js") || base.endsWith(".config.ts")) {
    return "config";
  }
  if (/\/lib\//.test(rel) || /\/services\//.test(rel) || /\/stores\//.test(rel)) return "lib";
  if (TEXT_EXT.has(ext)) return "source";
  return "asset";
}

/** @param {string} text */
export function extractImportPaths(text) {
  const out = [];
  const re =
    /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const p = m[1] || m[2] || m[3];
    if (p) out.push(p);
  }
  return [...new Set(out)].slice(0, 80);
}

/** @param {string} text @param {string} ext */
export function extractSymbols(text, ext) {
  const symbols = [];
  if (ext === ".svelte") {
    for (const m of text.matchAll(/export\s+let\s+([A-Za-z_$][\w$]*)/g)) symbols.push(m[1]);
    for (const m of text.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) symbols.push(m[1]);
  } else {
    for (const m of text.matchAll(
      /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|export\s+(?:const|let|class|type|interface)\s+([A-Za-z_$][\w$]*)/g,
    )) {
      symbols.push(m[1] || m[2]);
    }
    for (const m of text.matchAll(
      /module\.exports\.([A-Za-z_$][\w$]*)|exports\.([A-Za-z_$][\w$]*)\s*=/g,
    )) {
      symbols.push(m[1] || m[2]);
    }
  }
  return [...new Set(symbols.filter(Boolean))].slice(0, 60);
}

/** @param {string} rel */
export function inferHttpPath(rel) {
  const page = /src\/routes\/(.+)\/\+page\.svelte$/.exec(rel);
  if (page) {
    let p = "/" + page[1].replace(/\/\([^)]+\)/g, "").replace(/\[([^\]]+)\]/g, ":$1");
    if (p.endsWith("/index")) p = p.slice(0, -6) || "/";
    return p.replace(/\/+/g, "/") || "/";
  }
  if (/src\/routes\/\+page\.svelte$/.test(rel)) return "/";
  const api = /(?:^|\/)routes\/(.+)\.(js|ts)$/.exec(rel);
  if (api) {
    return "/api/" + api[1].replace(/\\/g, "/").replace(/\/index$/, "");
  }
  return null;
}

/**
 * @param {object} opts
 * @param {string[]} opts.roots
 * @param {string} [opts.label]
 */
export function buildSourceCorpus(opts) {
  const roots = (opts.roots ?? []).map((r) => resolve(r)).filter((r) => existsSync(r));
  /** @type {object[]} */
  const files = [];
  /** @type {Record<string, number>} */
  const byKind = {};
  /** @type {Record<string, number>} */
  const byExt = {};

  for (const root of roots) {
    const rootName = basename(root);
    for (const abs of walkSourceFiles(root)) {
      const rel = relative(root, abs).replace(/\\/g, "/");
      const ext = extname(abs).toLowerCase() || "(none)";
      const kind = classifySourceFile(abs, root);
      byKind[kind] = (byKind[kind] ?? 0) + 1;
      byExt[ext] = (byExt[ext] ?? 0) + 1;
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      const isText = TEXT_EXT.has(ext) && st.size < 2_000_000;
      let sha = "";
      let imports = [];
      let symbols = [];
      if (isText) {
        try {
          const text = readFileSync(abs, "utf8");
          sha = createHash("sha256").update(text).digest("hex").slice(0, 16);
          imports = extractImportPaths(text);
          symbols = extractSymbols(text, ext);
        } catch {
          sha = "";
        }
      } else {
        try {
          sha = createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
        } catch {
          sha = "";
        }
      }
      files.push({
        root: rootName,
        rootPath: root.replace(/\\/g, "/"),
        path: rel,
        ext,
        kind,
        bytes: st.size,
        mtimeMs: Math.round(st.mtimeMs),
        sha256: sha,
        imports,
        symbols,
        httpPath: inferHttpPath(rel),
      });
    }
  }

  const pieces = deriveConvertPieces(files);
  return {
    kind: SOURCE_CORPUS_KIND,
    schemaVersion: SOURCE_CORPUS_SCHEMA_VERSION,
    label: opts.label ?? "origin",
    roots: roots.map((r) => r.replace(/\\/g, "/")),
    generatedAt: new Date().toISOString(),
    stats: {
      fileCount: files.length,
      textFiles: files.filter((f) => f.sha256 && TEXT_EXT.has(f.ext)).length,
      byKind,
      byExt,
      pieceCount: pieces.length,
    },
    files,
    pieces,
  };
}

/** @param {object[]} files */
export function deriveConvertPieces(files) {
  /** @type {Map<string, any>} */
  const map = new Map();
  const touch = (id, init) => {
    if (!map.has(id)) map.set(id, { id, paths: [], httpPaths: new Set(), ...init });
    return map.get(id);
  };

  for (const f of files) {
    const key = `${f.root}:${f.path}`;
    if (f.kind === "page" && f.httpPath) {
      const p = touch(`ui:${f.httpPath}`, {
        kind: "ui-route",
        title: `UI ${f.httpPath}`,
        priority: priorityForHttp(f.httpPath),
        status: "pending",
      });
      p.paths.push(key);
      p.httpPaths.add(f.httpPath);
      continue;
    }
    if (f.root === "Module_Manager") {
      const mod = f.path.match(/src\/routes\/modules\/([^/]+)\//)?.[1];
      if (mod && f.kind !== "page") {
        const p = touch(`module-support:${mod}`, {
          kind: "module-support",
          title: `Module support ${mod}`,
          // After the matching UI route (same base priority + 1).
          priority: priorityForHttp(`/modules/${mod}`) + 1,
          status: "pending",
          dependsOn: [`ui:/modules/${mod}`],
        });
        p.paths.push(key);
        continue;
      }
    }
    if (f.kind === "api-handler" || f.root === "backend-services") {
      if (f.ext !== ".js" && f.ext !== ".ts" && f.ext !== ".mjs") continue;
      const cluster = apiCluster(f.path, f.httpPath);
      const p = touch(`api:${cluster}`, {
        kind: "api-cluster",
        title: `API ${cluster}`,
        priority: priorityForApi(cluster),
        status: "pending",
      });
      p.paths.push(key);
      if (f.httpPath) p.httpPaths.add(f.httpPath);
      continue;
    }
    if (f.kind === "lib" && f.root === "Module_Manager" && /src\/lib\//.test(f.path)) {
      const bucket = libBucket(f.path);
      const p = touch(`shared-lib:${bucket}`, {
        kind: "shared-lib",
        title: `Shared lib ${bucket}`,
        priority: 20,
        status: "pending",
      });
      p.paths.push(key);
      continue;
    }
    if (f.root === "Module_Manager" && f.kind === "layout") {
      const p = touch("ui-layouts", {
        kind: "ui-layout",
        title: "SvelteKit layouts",
        priority: 18,
        status: "pending",
      });
      p.paths.push(key);
      continue;
    }
    if (f.root === "Module_Manager" && f.kind === "style") {
      const p = touch("ui-styles", {
        kind: "ui-style",
        title: "Origin stylesheets",
        priority: 19,
        status: "pending",
      });
      p.paths.push(key);
      continue;
    }
    if (f.root === "Module_Manager" && f.kind === "component") {
      const p = touch("ui-components:shared", {
        kind: "ui-component",
        title: "Shared / non-module components",
        priority: 21,
        status: "pending",
      });
      p.paths.push(key);
      continue;
    }
    if (f.root === "Module_Manager" && (f.kind === "source" || f.kind === "config") && /\.(ts|js|svelte)$/.test(f.ext)) {
      const p = touch("ui-source:other", {
        kind: "ui-source",
        title: "Other Module_Manager source",
        priority: 90,
        status: "pending",
      });
      p.paths.push(key);
      continue;
    }
    // Residual docs / assets / scripts — indexed honestly (D6444), not left invisible.
    if (f.kind === "asset" || f.kind === "source" || f.ext === ".md" || f.ext === ".sh" || f.ext === ".ps1") {
      const bucket =
        f.ext === ".md"
          ? "docs"
          : f.ext === ".sh" || f.ext === ".ps1"
            ? "scripts"
            : f.kind === "asset"
              ? "assets"
              : "residual-source";
      const p = touch(`corpus-residual:${bucket}`, {
        kind: "corpus-residual",
        title: `Corpus residual ${bucket}`,
        priority: 95,
        status: "pending",
      });
      p.paths.push(key);
    }
  }

  return [...map.values()]
    .map((p) => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      priority: p.priority,
      status: p.status,
      dependsOn: p.dependsOn ?? [],
      pathCount: p.paths.length,
      paths: p.paths.slice(0, 200),
      httpPaths: [...p.httpPaths].sort(),
    }))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}

function priorityForHttp(httpPath) {
  if (httpPath === "/login" || httpPath === "/dashboard") return 10;
  if (httpPath.startsWith("/modules/coverage-map")) return 15;
  if (httpPath.startsWith("/modules/plan") || httpPath.startsWith("/modules/deploy")) return 16;
  if (httpPath.startsWith("/modules/")) return 40;
  if (httpPath.startsWith("/admin/")) return 50;
  return 60;
}

function priorityForApi(cluster) {
  if (cluster === "auth" || cluster === "tenants" || cluster === "users") return 12;
  if (cluster === "network" || cluster === "coverage") return 14;
  if (cluster === "sites" || cluster === "inventory" || cluster === "hardware") return 30;
  return 75;
}

function apiCluster(path, httpPath) {
  if (httpPath) {
    const parts = httpPath.replace(/^\/api\//, "").split("/");
    return parts[0] || "root";
  }
  const m = /routes\/([^/]+)/.exec(path.replace(/\\/g, "/"));
  return m?.[1] ?? "misc";
}

function libBucket(path) {
  const p = path.replace(/\\/g, "/");
  if (/auth|firebase|session/i.test(p)) return "auth";
  if (/tenant/i.test(p)) return "tenant";
  if (/map|arcgis|coverage/i.test(p)) return "maps";
  if (/api|fetch|client/i.test(p)) return "api-client";
  return "other";
}

/** @param {object} corpus @param {object} [opts] */
export function buildConvertQueue(corpus, opts = {}) {
  const pieces = corpus.pieces ?? [];
  const done = new Set(opts.completedIds ?? []);
  const queue = pieces
    .filter((p) => !done.has(p.id))
    .map((p, i) => ({
      order: i + 1,
      id: p.id,
      kind: p.kind,
      title: p.title,
      priority: p.priority,
      status: p.status,
      dependsOn: p.dependsOn,
      pathCount: p.pathCount,
      httpPaths: p.httpPaths,
      nextAction: nextActionForPiece(p),
    }));
  return {
    kind: CONVERT_QUEUE_KIND,
    schemaVersion: CONVERT_QUEUE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    corpusLabel: corpus.label,
    totalPieces: pieces.length,
    pending: queue.length,
    next: queue.slice(0, 12),
    queue,
  };
}

function nextActionForPiece(piece) {
  if (piece.kind === "api-cluster") {
    return `Verify/bind native CWL handlers for ${piece.httpPaths.slice(0, 5).join(", ") || piece.id} against oracle goldens; no invented APIs.`;
  }
  if (piece.kind === "ui-route") {
    return `Lift markup+CSS for ${piece.httpPaths[0] ?? piece.id}; keep origin classes; wire island or hole.`;
  }
  if (piece.kind === "module-support") {
    return `Convert support files for ${piece.id.replace("module-support:", "")} with the UI piece.`;
  }
  if (piece.kind === "shared-lib") {
    return `Map shared lib ${piece.id} to runtime/client contracts — translate, do not rewrite.`;
  }
  if (piece.kind === "ui-layout" || piece.kind === "ui-style") {
    return `Sync origin ${piece.kind} into CWL UI assets (D6443) — no overlay redefine.`;
  }
  if (piece.kind === "ui-component") {
    return `Index shared components; inline when referenced by UI routes (D6442).`;
  }
  if (piece.kind === "ui-source") {
    return `Classify remaining Module_Manager sources — island-bind or hole.`;
  }
  if (piece.kind === "corpus-residual") {
    return `Index-only residual (${piece.id}) — docs/assets/ops scripts, not UI/API convert targets.`;
  }
  return "Classify and convert with holes over invention (D6442–D6444).";
}

/**
 * @param {object} corpus
 * @param {{ jsonPath: string, sqlitePath: string, queuePath?: string }} opts
 */
export function writeSourceCorpusArtifacts(corpus, opts) {
  mkdirSync(dirname(opts.jsonPath), { recursive: true });
  const queue = buildConvertQueue(corpus);
  const summary = {
    kind: corpus.kind,
    schemaVersion: corpus.schemaVersion,
    label: corpus.label,
    roots: corpus.roots,
    generatedAt: corpus.generatedAt,
    stats: corpus.stats,
    pieces: corpus.pieces,
    sqlitePath: opts.sqlitePath.replace(/\\/g, "/"),
    note: "Full per-file rows are in the SQLite database. JSON carries pieces + stats for planning.",
  };
  writeFileSync(opts.jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  if (opts.queuePath) {
    writeFileSync(opts.queuePath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  }

  mkdirSync(dirname(opts.sqlitePath), { recursive: true });
  if (existsSync(opts.sqlitePath)) unlinkSync(opts.sqlitePath);

  const db = new DatabaseSync(opts.sqlitePath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE files (
      id INTEGER PRIMARY KEY,
      root TEXT NOT NULL,
      path TEXT NOT NULL,
      ext TEXT NOT NULL,
      kind TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      mtime_ms INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      http_path TEXT,
      imports_json TEXT NOT NULL,
      symbols_json TEXT NOT NULL,
      UNIQUE(root, path)
    );
    CREATE TABLE pieces (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      priority INTEGER NOT NULL,
      status TEXT NOT NULL,
      depends_on_json TEXT NOT NULL,
      path_count INTEGER NOT NULL,
      paths_json TEXT NOT NULL,
      http_paths_json TEXT NOT NULL,
      next_action TEXT NOT NULL
    );
    CREATE INDEX idx_files_kind ON files(kind);
    CREATE INDEX idx_files_http ON files(http_path);
    CREATE INDEX idx_pieces_priority ON pieces(priority);
  `);

  const insertMeta = db.prepare("INSERT INTO meta(key, value) VALUES (?, ?)");
  insertMeta.run("kind", corpus.kind);
  insertMeta.run("schemaVersion", String(corpus.schemaVersion));
  insertMeta.run("label", String(corpus.label ?? ""));
  insertMeta.run("generatedAt", corpus.generatedAt);
  insertMeta.run("roots", JSON.stringify(corpus.roots));

  db.exec("BEGIN");
  const insertFile = db.prepare(`
    INSERT INTO files(root, path, ext, kind, bytes, mtime_ms, sha256, http_path, imports_json, symbols_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const f of corpus.files) {
    insertFile.run(
      f.root,
      f.path,
      f.ext,
      f.kind,
      f.bytes,
      f.mtimeMs,
      f.sha256,
      f.httpPath,
      JSON.stringify(f.imports ?? []),
      JSON.stringify(f.symbols ?? []),
    );
  }
  const insertPiece = db.prepare(`
    INSERT INTO pieces(id, kind, title, priority, status, depends_on_json, path_count, paths_json, http_paths_json, next_action)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of queue.queue) {
    insertPiece.run(
      p.id,
      p.kind,
      p.title,
      p.priority,
      p.status,
      JSON.stringify(p.dependsOn ?? []),
      p.pathCount,
      JSON.stringify((corpus.pieces.find((x) => x.id === p.id)?.paths) ?? []),
      JSON.stringify(p.httpPaths ?? []),
      p.nextAction,
    );
  }
  db.exec("COMMIT");
  db.close();
  return { summary, queue, sqlitePath: opts.sqlitePath, jsonPath: opts.jsonPath };
}

/**
 * Update piece statuses in SQLite + rewrite convert-queue JSON (D6444).
 * @param {string} sqlitePath
 * @param {Array<{ id: string, status: string, note?: string }>} updates
 * @param {{ queuePath?: string }} [opts]
 */
export function updatePieceStatuses(sqlitePath, updates, opts = {}) {
  if (!existsSync(sqlitePath)) {
    return { ok: false, skip: "missing-sqlite" };
  }
  const db = new DatabaseSync(sqlitePath);
  const upd = db.prepare("UPDATE pieces SET status = ? WHERE id = ?");
  db.exec("BEGIN");
  let changed = 0;
  for (const u of updates) {
    const r = upd.run(String(u.status), String(u.id));
    changed += r.changes ?? 0;
  }
  db.exec("COMMIT");

  const rows = db
    .prepare(
      "SELECT id, kind, title, priority, status, depends_on_json, path_count, paths_json, http_paths_json, next_action FROM pieces ORDER BY priority ASC, id ASC",
    )
    .all();
  db.close();

  const queue = rows.map((r, i) => ({
    order: i + 1,
    id: r.id,
    kind: r.kind,
    title: r.title,
    priority: r.priority,
    status: r.status,
    dependsOn: JSON.parse(r.depends_on_json || "[]"),
    pathCount: r.path_count,
    paths: JSON.parse(r.paths_json || "[]"),
    httpPaths: JSON.parse(r.http_paths_json || "[]"),
    nextAction: r.next_action,
  }));
  const pending = queue.filter((p) => p.status === "pending" || p.status === "converting").length;
  const byStatus = {};
  for (const p of queue) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  const out = {
    kind: CONVERT_QUEUE_KIND,
    schemaVersion: CONVERT_QUEUE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    totalPieces: queue.length,
    pending,
    byStatus,
    next: queue.filter((p) => p.status === "pending").slice(0, 12),
    queue,
  };
  if (opts.queuePath) {
    mkdirSync(dirname(opts.queuePath), { recursive: true });
    writeFileSync(opts.queuePath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  }
  return { ok: true, changed, byStatus, pending, totalPieces: queue.length };
}
