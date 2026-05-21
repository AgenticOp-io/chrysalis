/**
 * Translation hub project registry + SSH scan helpers (operator server).
 * @see docs/MASTER-PROGRAM.md bounded universality
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { buildRemoteScanShell, parseOriginAgentJson } from "./chrysalis-hub-connectivity.mjs";
import {
  hubOriginLanguages,
  hubOutputLanguages,
  isHubWebOrigin,
  isHubWebOutput,
  LANGUAGE_LABELS,
} from "./hub-ingest/language-catalog.mjs";

/** Hub mission: every origin×output pair is runnable (oracle gold remains PHP→TS only). */
export const HUB_MISSION_OPEN = true;

export const HUB_KIND = "chrysalis.translation-hub.projects";
export const HUB_SCHEMA_VERSION = 0;

const hubRoot = process.env.CHRYSALIS_HUB_ROOT ?? join(homedir(), ".chrysalis-hub");
const registryPath = join(hubRoot, "projects.json");
const workspacesRoot = join(hubRoot, "workspaces");

/** Extension → language id */
export const EXT_TO_LANGUAGE = {
  ".php": "php",
  ".phtml": "php",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".vue": "vue",
  ".py": "python",
  ".java": "java",
  ".kt": "kotlin",
  ".go": "go",
  ".rb": "ruby",
  ".cs": "csharp",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "c",
  ".rs": "rust",
  ".swift": "swift",
  ".scala": "scala",
  ".sql": "sql",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".md": "markdown",
  ".markdown": "markdown",
};

/** In-repo WPTP compose / CI scripts the hub documents (not auto-run in hub v1). */
export const WPTP_CI_REFERENCES = {
  exportWebirBundle: {
    script: "scripts/export-webir-bundle.mjs",
    matrixPath: "webir-neutral-ir",
    grade: "silver",
    label: "Chrysalis WebIR bundle export",
  },
  wptpD3Silver: {
    script: "scripts/wptp-d3-silver-harness.mjs",
    matrixPath: "openapi-ir-hono-chrysalis",
    grade: "silver",
    label: "OpenAPI/HAR to Hono (Chrysalis emit bridge)",
  },
  wptpSilverNextjs: {
    script: "scripts/wptp-silver-nextjs-harness.mjs",
    matrixPath: "openapi-ir-nextjs-chrysalis",
    grade: "silver",
    label: "OpenAPI/HAR to Next.js (Chrysalis WebIR bridge)",
  },
  emitWebirBundleHono: {
    script: "scripts/emit-webir-bundle-hono.mjs",
    matrixPath: "openapi-ir-hono-chrysalis",
    grade: "silver",
    label: "WebIR bundle to Hono emit",
  },
};

/** Hub input (origin) languages — manual dropdown + optional autodetect hints. */
export const INPUT_LANGUAGES = hubOriginLanguages();

/** Single output menu — all web / framework targets. */
export const OUTPUT_LANGUAGES = hubOutputLanguages();

function hubRouteLabel(sourceLang, outputLang) {
  const src = LANGUAGE_LABELS[sourceLang] ?? sourceLang;
  const out = OUTPUT_LANGUAGES.find((o) => o.id === outputLang);
  return `${src} → ${out?.label ?? outputLang}`;
}

function specForPair(sourceLang, outputLang) {
  const label = hubRouteLabel(sourceLang, outputLang);
  const emitTarget =
    outputLang === "hono" || outputLang === "fastify" || outputLang === "nextjs"
      ? outputLang
      : outputLang === "typescript"
        ? "hono"
        : null;

  if (sourceLang === "php") {
    if (outputLang === "typescript") {
      return {
        status: "ready",
        action: "chrysalis-ingest-emit",
        emitTarget: "hono",
        grade: "gold",
        label: "PHP → TypeScript (Chrysalis ingest + emit)",
      };
    }
    if (outputLang === "hono" || outputLang === "fastify") {
      return { status: "ready", action: "chrysalis-ingest-emit", emitTarget: outputLang, grade: "gold", label };
    }
    if (outputLang === "nextjs") {
      return { status: "ready", action: "chrysalis-ingest-emit", emitTarget: "nextjs", grade: "silver", label };
    }
    return { status: "ready", action: "hub-translate", emitTarget: null, grade: "open", label };
  }

  return {
    status: "ready",
    action: "hub-translate",
    emitTarget,
    grade: emitTarget ? "silver" : "open",
    label,
  };
}

function buildHubRoutes() {
  const routes = {};
  for (const src of INPUT_LANGUAGES) {
    for (const out of OUTPUT_LANGUAGES) {
      if (src.id === out.id) continue;
      routes[`${src.id}:${out.id}`] = specForPair(src.id, out.id);
    }
  }
  return routes;
}

export const HUB_ROUTES = buildHubRoutes();

/** @deprecated Derived for legacy callers. */
export const TARGET_MATRIX = Object.fromEntries(
  INPUT_LANGUAGES.map((l) => [
    l.id,
    OUTPUT_LANGUAGES.map((o) => {
      const r = HUB_ROUTES[`${l.id}:${o.id}`];
      return {
        id: o.id,
        label: o.label,
        supported: Boolean(r?.status === "ready"),
        grade: r?.grade ?? "open",
      };
    }),
  ]),
);

export const HUB_REPORT_KIND = "chrysalis.translation-hub.report";
export const HUB_REPORT_SCHEMA_VERSION = 0;

/** Unique language ids referenced by {@link EXT_TO_LANGUAGE}. */
export function extMapLanguageIds() {
  return [...new Set(Object.values(EXT_TO_LANGUAGE))].sort();
}

/** Language ids with explicit hub matrix rows. */
export function matrixLanguageIds() {
  return INPUT_LANGUAGES.map((l) => l.id).sort();
}

export function defaultOriginLanguage() {
  return "php";
}

export function defaultOutputLanguage() {
  return "typescript";
}

/** Pick origin from autodetect (highest file count) or manual default. */
export function originFromDetection(detection) {
  if (!detection?.languages?.length) return defaultOriginLanguage();
  const sorted = [...detection.languages].sort((a, b) => b.fileCount - a.fileCount);
  const web = sorted.find((row) => isHubWebOrigin(row.language));
  return web?.language ?? defaultOriginLanguage();
}

/** Hub web origin ids missing from {@link TARGET_MATRIX}. */
export function matrixCoverageGaps() {
  return matrixLanguageIds().filter((lang) => !TARGET_MATRIX[lang]);
}

export function assertMatrixCoversOriginLanguages() {
  const gaps = matrixCoverageGaps();
  if (gaps.length > 0) {
    throw new Error(`TARGET_MATRIX missing origin languages: ${gaps.join(", ")}`);
  }
}

export function getTargetOptions(languageId) {
  return TARGET_MATRIX[languageId] ?? [];
}

/** Translation targets only (excludes legacy "unchanged" if present in stored projects). */
export function translationTargetOptions(languageId) {
  return getTargetOptions(languageId).filter((o) => o.id !== "unchanged");
}

/** @deprecated Use originLanguage + outputLanguage on project. */
export function defaultTargetIdForLanguage(_languageId) {
  return defaultOutputLanguage();
}

/** @deprecated Use originLanguage + outputLanguage on project. */
export function defaultTargetsMap() {
  const o = defaultOutputLanguage();
  const out = {};
  for (const lang of matrixLanguageIds()) out[lang] = o;
  return out;
}

/** All hub input languages; merge optional detection file counts. */
export function allLanguagesAsInputRows(detection) {
  const byLang = new Map();
  for (const lang of matrixLanguageIds()) {
    byLang.set(lang, { language: lang, fileCount: 0, sampleFiles: [] });
  }
  if (detection?.languages) {
    for (const row of detection.languages) {
      const cur = byLang.get(row.language);
      if (cur) {
        byLang.set(row.language, { ...cur, ...row });
      } else {
        byLang.set(row.language, row);
      }
    }
  }
  return [...byLang.values()].sort(
    (a, b) => b.fileCount - a.fileCount || a.language.localeCompare(b.language),
  );
}

/**
 * Resolve origin → output for hub job routing.
 * @returns {{ ok: boolean, status: string, action: string, grade?: string, label?: string, emitTarget?: string, code?: string, message?: string, hole?: string }}
 */
export function resolveHubRoute(sourceLang, outputLang) {
  if (outputLang === "unchanged" || outputLang === "typescript-chrysalis") {
    outputLang = "typescript";
  }
  if (!isHubWebOrigin(sourceLang)) {
    return {
      ok: false,
      status: "unsupported",
      code: "unknown-source-language",
      message: `Unknown origin language "${sourceLang}".`,
      hole: `hub:unknown-source:${sourceLang}`,
    };
  }
  if (!isHubWebOutput(outputLang)) {
    return {
      ok: false,
      status: "unsupported",
      code: "unknown-output-language",
      message: `Unknown output language "${outputLang}".`,
      hole: `hub:unknown-output:${outputLang}`,
    };
  }
  if (sourceLang === outputLang) {
    return {
      ok: false,
      status: "unsupported",
      code: "same-language",
      message: "Origin and output must differ.",
      hole: `hub:same-language:${sourceLang}`,
    };
  }
  const spec = HUB_ROUTES[`${sourceLang}:${outputLang}`];
  if (!spec) {
    return {
      ok: false,
      status: "unsupported",
      code: "no-route",
      message: `No route ${sourceLang} → ${outputLang}.`,
      hole: `hub:no-route:${sourceLang}:${outputLang}`,
    };
  }
  return {
    ok: spec.status === "ready",
    status: spec.status,
    action: spec.action,
    grade: spec.grade,
    label: spec.label,
    emitTarget: spec.emitTarget ?? null,
    message: spec.label,
  };
}

/**
 * Plan translation for one origin → one output (project settings).
 */
export function planHubTranslation(project) {
  const sourceLang = project.originLanguage ?? originFromDetection(project.detection);
  const targetId = project.outputLanguage ?? defaultOutputLanguage();
  const route = resolveHubRoute(sourceLang, targetId);
  const routes = [{ sourceLang, targetId, route }];
  const holes = [];
  const errors = [];
  const skipped = [];
  const runnable = [];

  if (route.ok) {
    runnable.push({
      sourceLang,
      targetId,
      action: route.action,
      emitTarget: route.emitTarget ?? undefined,
      grade: route.grade,
      route,
    });
  } else if (route.hole) {
    holes.push({ name: route.hole, sourceLang, targetId, message: route.message });
    errors.push({ sourceLang, targetId, code: route.code, message: route.message });
  }

  return { routes, holes, errors, skipped, runnable, originLanguage: sourceLang, outputLanguage: targetId };
}

export async function writeHubReport(localDir, payload) {
  await mkdir(join(localDir, ".chrysalis"), { recursive: true });
  const report = {
    kind: HUB_REPORT_KIND,
    schemaVersion: HUB_REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ...payload,
  };
  const path = join(localDir, ".chrysalis", "hub.report.json");
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rename(tmp, path);
  return path;
}

export function workspaceDir(projectId) {
  return join(workspacesRoot, projectId);
}

export async function ensureHubDirs() {
  await mkdir(workspacesRoot, { recursive: true });
}

export async function loadRegistry() {
  await ensureHubDirs();
  try {
    const raw = await readFile(registryPath, "utf8");
    const j = JSON.parse(raw);
    if (j.kind !== HUB_KIND || j.schemaVersion !== HUB_SCHEMA_VERSION) {
      return emptyRegistry();
    }
    return j;
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") return emptyRegistry();
    throw e;
  }
}

function emptyRegistry() {
  return { kind: HUB_KIND, schemaVersion: HUB_SCHEMA_VERSION, projects: [] };
}

export async function saveRegistry(reg) {
  await ensureHubDirs();
  const tmp = `${registryPath}.tmp`;
  await writeFile(tmp, `${JSON.stringify(reg, null, 2)}\n`, "utf8");
  await rename(tmp, registryPath);
}

export function slugId(name) {
  const base = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "project"}-${Date.now().toString(36)}`;
}

export function detectLanguagesFromFileList(paths) {
  const byLang = new Map();
  for (const p of paths) {
    const ext = extname(p).toLowerCase();
    const lang = EXT_TO_LANGUAGE[ext];
    if (!lang) continue;
    const cur = byLang.get(lang) ?? { language: lang, fileCount: 0, sampleFiles: [] };
    cur.fileCount += 1;
    if (cur.sampleFiles.length < 8) cur.sampleFiles.push(p);
    byLang.set(lang, cur);
  }
  return [...byLang.values()].sort((a, b) => b.fileCount - a.fileCount);
}

function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, shell: false });
    const out = [];
    const err = [];
    child.stdout?.on("data", (c) => out.push(c));
    child.stderr?.on("data", (c) => err.push(c));
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      });
    });
    child.on("error", reject);
  });
}

export async function scanSshRemote(ssh) {
  const host = `${ssh.user}@${ssh.host}`;
  const port = ssh.port ? String(ssh.port) : "22";
  const remotePath = ssh.remotePath || ".";
  const remoteShell = buildRemoteScanShell(remotePath);
  const sshArgs = ["-p", port, "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new"];
  if (ssh.identityFile) sshArgs.push("-i", ssh.identityFile);
  sshArgs.push(host, remoteShell);
  const r = await runProcess("ssh", sshArgs);
  if (r.code !== 0) {
    throw new Error(r.stderr.trim() || `ssh scan failed (exit ${r.code})`);
  }
  const out = r.stdout.trim();
  if (out.startsWith("{")) {
    const agent = parseOriginAgentJson(out);
    return {
      scannedAt: agent.scannedAt ?? new Date().toISOString(),
      source: agent.source ?? "origin-agent",
      pathCount: agent.pathCount ?? 0,
      languages: agent.languages,
      truncated: Boolean(agent.truncated),
      services: agent.services ?? {},
      agentVersion: agent.agentVersion ?? null,
    };
  }
  const paths = out.split(/\r?\n/).filter(Boolean);
  return {
    scannedAt: new Date().toISOString(),
    source: "ssh-find",
    pathCount: paths.length,
    languages: detectLanguagesFromFileList(paths),
    truncated: paths.length >= 8000,
    services: {},
    agentVersion: null,
  };
}

export async function scanLocalDirectory(dir) {
  const paths = [];
  async function walk(d, depth) {
    if (depth > 12) return;
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "vendor") continue;
      const p = join(d, ent.name);
      if (ent.isDirectory()) await walk(p, depth + 1);
      else if (ent.isFile()) {
        paths.push(p);
        if (paths.length >= 8000) return;
      }
    }
  }
  await walk(dir, 0);
  return {
    scannedAt: new Date().toISOString(),
    source: "local",
    pathCount: paths.length,
    languages: detectLanguagesFromFileList(paths),
    truncated: paths.length >= 8000,
  };
}

export async function pullFromSsh(ssh, localDir) {
  await mkdir(localDir, { recursive: true });
  const host = `${ssh.user}@${ssh.host}`;
  const port = ssh.port ? String(ssh.port) : "22";
  const remote = ssh.remotePath.endsWith("/") ? ssh.remotePath : `${ssh.remotePath}/`;
  const scpArgs = ["-P", port, "-r", "-o", "BatchMode=yes", "-o", "ConnectTimeout=30", "-o", "StrictHostKeyChecking=accept-new"];
  if (ssh.identityFile) scpArgs.push("-i", ssh.identityFile);
  scpArgs.push(`${host}:${remote}`, localDir);
  const r = await runProcess("scp", scpArgs);
  if (r.code !== 0) {
    throw new Error(r.stderr.trim() || `scp failed (exit ${r.code})`);
  }
  return { pulledAt: new Date().toISOString(), localDir };
}

export async function createHubProject(opts) {
  const reg = await loadRegistry();
  const id = slugId(opts.name);
  const ws = workspaceDir(id);
  await mkdir(ws, { recursive: true });

  const project = {
    id,
    name: opts.name,
    description: opts.description ?? "",
    createdAt: new Date().toISOString(),
    ssh: opts.ssh ?? null,
    localDir: opts.pullFromSsh ? ws : opts.localDir ?? ws,
    detection: null,
    originLanguage: opts.originLanguage ?? defaultOriginLanguage(),
    outputLanguage: opts.outputLanguage ?? defaultOutputLanguage(),
    targets: {
      [opts.originLanguage ?? defaultOriginLanguage()]: opts.outputLanguage ?? defaultOutputLanguage(),
    },
    chrysalisInitialized: false,
  };

  if (opts.ssh && opts.pullFromSsh) {
    await pullFromSsh(opts.ssh, ws);
    project.localDir = ws;
    if (opts.detectLanguages) {
      project.detection = await scanLocalDirectory(ws);
    }
  } else if (opts.detectLanguages && opts.ssh) {
    project.detection = await scanSshRemote(opts.ssh);
  } else if (opts.detectLanguages && opts.localDir) {
    const st = await stat(opts.localDir);
    if (!st.isDirectory()) throw new Error("localDir is not a directory");
    project.localDir = opts.localDir;
    project.detection = await scanLocalDirectory(opts.localDir);
  }

  if (opts.detectLanguages && !opts.originLanguage && project.detection) {
    project.originLanguage = originFromDetection(project.detection);
  }
  project.targets = { [project.originLanguage]: project.outputLanguage };

  reg.projects.push(project);
  await saveRegistry(reg);
  return project;
}

export async function updateProject(id, patch) {
  const reg = await loadRegistry();
  const idx = reg.projects.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("project not found");
  reg.projects[idx] = { ...reg.projects[idx], ...patch, updatedAt: new Date().toISOString() };
  await saveRegistry(reg);
  return reg.projects[idx];
}

export async function getProject(id) {
  const reg = await loadRegistry();
  return reg.projects.find((p) => p.id === id) ?? null;
}

export async function listProjects() {
  const reg = await loadRegistry();
  return reg.projects;
}

export function hubRootPath() {
  return hubRoot;
}
