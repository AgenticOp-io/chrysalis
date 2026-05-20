/**
 * Translation hub project registry + SSH scan helpers (operator server).
 * @see docs/MASTER-PROGRAM.md bounded universality
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";

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

const WPTP_PLANNED = "Planned — WPTP sibling repos (theorem6/wptp-matrix); not Chrysalis gold on main.";

function unchangedOption(label) {
  return { id: "unchanged", label, supported: true, grade: "unchanged" };
}

function plannedOption(id, label, extra = {}) {
  return { id, label, supported: false, grade: "planned", ...extra };
}

/** Languages Chrysalis can verify today vs roadmap (honest grades; see DESIGN D312/D313). */
export const TARGET_MATRIX = {
  php: [
    {
      id: "typescript-chrysalis",
      label: "TypeScript (Chrysalis ingest + oracle verify)",
      supported: true,
      grade: "gold",
    },
    unchangedOption("Keep PHP (no translation)"),
    plannedOption("wptp-webir-export", "Export WebIR bundle (WPTP silver CI path)", {
      wptpCi: WPTP_CI_REFERENCES.exportWebirBundle,
    }),
  ],
  javascript: [
    unchangedOption("Keep JavaScript"),
    plannedOption("typescript", "TypeScript (emit-only — no JS ingest in hub v1)"),
    plannedOption("wptp-openapi-hono", "Hono via OpenAPI/HAR (WPTP CI path)", {
      grade: "silver",
      wptpCi: WPTP_CI_REFERENCES.wptpD3Silver,
    }),
    plannedOption("wptp-openapi-nextjs", "Next.js via OpenAPI/HAR (WPTP CI path)", {
      grade: "silver",
      wptpCi: WPTP_CI_REFERENCES.wptpSilverNextjs,
    }),
  ],
  typescript: [
    unchangedOption("Keep TypeScript"),
    plannedOption("typescript-chrysalis", "Re-ingest via Chrysalis (PHP routes only — not TS source ingest)"),
    plannedOption("wptp-webir-export", "Export WebIR bundle (WPTP silver CI path)", {
      wptpCi: WPTP_CI_REFERENCES.exportWebirBundle,
    }),
  ],
  vue: [
    unchangedOption("Keep Vue SFC"),
    plannedOption("typescript", "TypeScript / Vue SFC (partial — not in hub v1)"),
  ],
  python: [
    unchangedOption("Keep Python"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  java: [
    unchangedOption("Keep Java"),
    plannedOption("typescript-wptp", `TypeScript / Kotlin JVM (${WPTP_PLANNED})`),
  ],
  kotlin: [
    unchangedOption("Keep Kotlin"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  go: [
    unchangedOption("Keep Go"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  ruby: [
    unchangedOption("Keep Ruby"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  csharp: [
    unchangedOption("Keep C#"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  cpp: [
    unchangedOption("Keep C++"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  c: [
    unchangedOption("Keep C"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  rust: [
    unchangedOption("Keep Rust"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  swift: [
    unchangedOption("Keep Swift"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  scala: [
    unchangedOption("Keep Scala"),
    plannedOption("typescript-wptp", `TypeScript (${WPTP_PLANNED})`),
  ],
  sql: [
    unchangedOption("Keep SQL (schema/data only)"),
    plannedOption("typescript-wptp", `Typed data layer (${WPTP_PLANNED})`),
  ],
  html: [
    unchangedOption("Keep HTML"),
    plannedOption("typescript-wptp", `Component framework (${WPTP_PLANNED})`),
  ],
  css: [
    unchangedOption("Keep CSS"),
    plannedOption("typescript-wptp", `CSS-in-TS / design tokens (${WPTP_PLANNED})`),
  ],
  scss: [
    unchangedOption("Keep SCSS"),
    plannedOption("typescript-wptp", `CSS-in-TS / design tokens (${WPTP_PLANNED})`),
  ],
};

export const HUB_REPORT_KIND = "chrysalis.translation-hub.report";
export const HUB_REPORT_SCHEMA_VERSION = 0;

/** Unique language ids referenced by {@link EXT_TO_LANGUAGE}. */
export function extMapLanguageIds() {
  return [...new Set(Object.values(EXT_TO_LANGUAGE))].sort();
}

/** Language ids with explicit hub matrix rows. */
export function matrixLanguageIds() {
  return Object.keys(TARGET_MATRIX).sort();
}

/** Languages in {@link EXT_TO_LANGUAGE} missing from {@link TARGET_MATRIX}. */
export function matrixCoverageGaps() {
  return extMapLanguageIds().filter((lang) => !TARGET_MATRIX[lang]);
}

export function assertMatrixCoversExtLanguages() {
  const gaps = matrixCoverageGaps();
  if (gaps.length > 0) {
    throw new Error(`TARGET_MATRIX missing languages: ${gaps.join(", ")}`);
  }
}

export function getTargetOptions(languageId) {
  return TARGET_MATRIX[languageId] ?? [];
}

/**
 * Resolve a single source→target pair for hub job routing (v1).
 * @returns {{ ok: boolean, kind: string, code?: string, message?: string, hole?: string, wptpCi?: object, target?: object }}
 */
export function resolveHubRoute(sourceLang, targetId) {
  const options = TARGET_MATRIX[sourceLang];
  if (!options) {
    return {
      ok: false,
      kind: "unsupported",
      code: "unknown-source-language",
      message: `No hub matrix entry for language "${sourceLang}".`,
      hole: `hub:unknown-source:${sourceLang}`,
    };
  }
  const target = options.find((o) => o.id === targetId);
  if (!target) {
    return {
      ok: false,
      kind: "unsupported",
      code: "unknown-target",
      message: `Target "${targetId}" is not defined for ${sourceLang}.`,
      hole: `hub:unknown-target:${sourceLang}:${targetId}`,
    };
  }
  if (target.id === "unchanged") {
    return { ok: true, kind: "unchanged", supported: true, target };
  }
  if (target.wptpCi && !target.supported) {
    return {
      ok: false,
      kind: "wptp-ci",
      code: "wptp-ci-only",
      message: `${target.label} — run in Chrysalis repo CI (${target.wptpCi.script}); not automated from Translation Hub v1.`,
      hole: `hub:wptp-ci:${sourceLang}:${targetId}`,
      wptpCi: target.wptpCi,
      target,
    };
  }
  if (!target.supported) {
    return {
      ok: false,
      kind: "unsupported",
      code: "target-planned",
      message: `${target.label} — not available in Translation Hub v1.`,
      hole: `hub:planned:${sourceLang}:${targetId}`,
      target,
    };
  }
  if (sourceLang === "php" && targetId === "typescript-chrysalis") {
    return { ok: true, kind: "chrysalis-ingest", supported: true, target };
  }
  return {
    ok: false,
    kind: "unsupported",
    code: "no-hub-runner",
    message: `${target.label} is listed as supported but has no Translation Hub runner on main.`,
    hole: `hub:no-runner:${sourceLang}:${targetId}`,
    target,
  };
}

/**
 * Plan translation work for a hub project from `project.targets` and detection.
 */
export function planHubTranslation(project) {
  const targets = project.targets ?? {};
  const detected = project.detection?.languages?.map((l) => l.language) ?? [];
  const langs = [...new Set([...detected, ...Object.keys(targets)])];

  const routes = [];
  const holes = [];
  const errors = [];
  const skipped = [];
  const runnable = [];

  for (const sourceLang of langs) {
    const targetId = targets[sourceLang];
    if (!targetId) continue;
    const route = resolveHubRoute(sourceLang, targetId);
    routes.push({ sourceLang, targetId, route });
    if (route.kind === "unchanged") {
      skipped.push({ sourceLang, targetId });
      continue;
    }
    if (route.ok && route.kind === "chrysalis-ingest") {
      runnable.push({ sourceLang, targetId, action: "chrysalis-ingest" });
      continue;
    }
    if (route.hole) {
      holes.push({
        name: route.hole,
        sourceLang,
        targetId,
        message: route.message,
        wptpCi: route.wptpCi ?? null,
      });
    }
    errors.push({
      sourceLang,
      targetId,
      code: route.code,
      message: route.message,
      wptpCi: route.wptpCi ?? null,
    });
  }

  return { routes, holes, errors, skipped, runnable };
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
  const remotePath = ssh.remotePath.replace(/'/g, "'\\''");
  const findCmd = `find '${remotePath}' -type f 2>/dev/null | head -n 8000`;
  const sshArgs = ["-p", port, "-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "-o", "StrictHostKeyChecking=accept-new"];
  if (ssh.identityFile) sshArgs.push("-i", ssh.identityFile);
  sshArgs.push(host, findCmd);
  const r = await runProcess("ssh", sshArgs);
  if (r.code !== 0) {
    throw new Error(r.stderr.trim() || `ssh scan failed (exit ${r.code})`);
  }
  const paths = r.stdout.split(/\r?\n/).filter(Boolean);
  return {
    scannedAt: new Date().toISOString(),
    source: "ssh",
    pathCount: paths.length,
    languages: detectLanguagesFromFileList(paths),
    truncated: paths.length >= 8000,
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
    targets: opts.targets ?? {},
    chrysalisInitialized: false,
  };

  if (opts.ssh && opts.pullFromSsh) {
    await pullFromSsh(opts.ssh, ws);
    project.detection = await scanLocalDirectory(ws);
    project.localDir = ws;
  } else if (opts.ssh) {
    project.detection = await scanSshRemote(opts.ssh);
  } else if (opts.localDir) {
    const st = await stat(opts.localDir);
    if (!st.isDirectory()) throw new Error("localDir is not a directory");
    project.localDir = opts.localDir;
    project.detection = await scanLocalDirectory(opts.localDir);
  }

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
