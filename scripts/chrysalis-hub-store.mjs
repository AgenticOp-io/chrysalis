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

/** Languages Chrysalis can verify today vs roadmap */
export const TARGET_MATRIX = {
  php: [
    { id: "typescript-chrysalis", label: "TypeScript (Chrysalis + oracle verify)", supported: true },
    { id: "unchanged", label: "Keep PHP (no translation)", supported: true },
  ],
  javascript: [
    { id: "typescript", label: "TypeScript (emit only; verify per harness)", supported: true },
    { id: "unchanged", label: "Keep JavaScript", supported: true },
  ],
  typescript: [{ id: "unchanged", label: "Keep TypeScript", supported: true }],
  vue: [{ id: "typescript", label: "TypeScript / Vue SFC (partial)", supported: false }],
  python: [{ id: "unchanged", label: "Planned (WPTP hub)", supported: false }],
  java: [{ id: "unchanged", label: "Planned (WPTP hub)", supported: false }],
};

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
