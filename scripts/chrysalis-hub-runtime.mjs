/**
 * Start/stop emitted Hono/Fastify/Next.js apps on the hub for portal verify.
 */
import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { updateProject, getProject } from "./chrysalis-hub-store.mjs";

const running = new Map();

async function exists(p) {
  try {
    await access(p, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function detectEmittedTarget(siteLocalDir) {
  for (const target of ["hono", "fastify", "nextjs"]) {
    const dir = join(siteLocalDir, "generated", target);
    if (await exists(join(dir, "package.json"))) return target;
  }
  return null;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

function runCmd(cwd, cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, shell: false });
    const out = [];
    const err = [];
    child.stdout?.on("data", (c) => out.push(c));
    child.stderr?.on("data", (c) => err.push(c));
    child.on("close", (code) =>
      resolve({ code: code ?? 1, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") }),
    );
    child.on("error", reject);
  });
}

async function ensureDeps(emitDir) {
  if (await exists(join(emitDir, "node_modules"))) return;
  await runCmd(emitDir, "npm", ["install"], {});
}

export async function startSiteRuntime(projectId, siteId, { hooks } = {}) {
  const project = await getProject(projectId);
  const site = project?.sites?.find((s) => s.id === siteId);
  if (!site) throw new Error("site not found");

  const key = `${projectId}:${siteId}`;
  await stopSiteRuntime(projectId, siteId);

  const target = await detectEmittedTarget(site.localDir);
  if (!target) throw new Error("no generated/hono|fastify|nextjs — run translation first");

  const emitDir = join(site.localDir, "generated", target);
  const port = await freePort();
  hooks?.onLog?.(siteId, "stdout", `[runtime] installing deps if needed in generated/${target}`);
  await ensureDeps(emitDir);

  const env = { PORT: String(port), NODE_ENV: "production" };
  let cmd;
  let args;
  if (target === "nextjs") {
    cmd = "npm";
    args = ["run", "start"];
    if (!(await exists(join(emitDir, ".next")))) {
      hooks?.onLog?.(siteId, "stdout", "[runtime] next build…");
      const b = await runCmd(emitDir, "npm", ["run", "build"], env);
      if (b.code !== 0) throw new Error(b.stderr || "next build failed");
    }
  } else {
    cmd = "npm";
    args = ["run", "start"];
    if (!(await exists(join(emitDir, "node_modules", "@hono")))) {
      await runCmd(emitDir, "npm", ["install"], env);
    }
  }

  hooks?.onLog?.(siteId, "stdout", `[runtime] starting ${target} on :${port}`);
  const child = spawn(cmd, args, { cwd: emitDir, env: { ...process.env, ...env }, shell: false });
  const out = [];
  const err = [];
  child.stdout?.on("data", (c) => {
    out.push(c);
    hooks?.onLog?.(siteId, "stdout", c.toString().trimEnd());
  });
  child.stderr?.on("data", (c) => {
    err.push(c);
    hooks?.onLog?.(siteId, "stderr", c.toString().trimEnd());
  });

  await new Promise((r) => setTimeout(r, 1500));
  const baseUrl = `http://127.0.0.1:${port}`;
  const runtime = {
    target,
    port,
    baseUrl,
    pid: child.pid,
    state: "running",
    startedAt: new Date().toISOString(),
  };
  running.set(key, { child, runtime });

  await patchRuntime(projectId, siteId, runtime);
  hooks?.onRuntime?.(siteId, runtime);
  return runtime;
}

export async function stopSiteRuntime(projectId, siteId) {
  const key = `${projectId}:${siteId}`;
  const entry = running.get(key);
  if (entry?.child && !entry.child.killed) {
    entry.child.kill("SIGTERM");
  }
  running.delete(key);
  await patchRuntime(projectId, siteId, { state: "stopped", stoppedAt: new Date().toISOString() });
}

async function patchRuntime(projectId, siteId, runtime) {
  const project = await getProject(projectId);
  if (!project) return;
  await updateProject(projectId, {
    sites: project.sites.map((s) => (s.id === siteId ? { ...s, runtime: { ...(s.runtime ?? {}), ...runtime } } : s)),
  });
}

export function getRunningRuntime(projectId, siteId) {
  return running.get(`${projectId}:${siteId}`)?.runtime ?? null;
}

export function listRunningRuntimes() {
  return [...running.entries()].map(([key, entry]) => {
    const [projectId, siteId] = key.split(":");
    return { projectId, siteId, ...entry.runtime };
  });
}

/** HTTP health probe for emitted app (portal runtime card). */
export async function probeRuntimeHealth(baseUrl, timeoutMs = 5000) {
  const url = baseUrl.replace(/\/$/, "") + "/";
  const started = Date.now();
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const r = await fetch(url, { method: "GET", signal: ac.signal });
    clearTimeout(t);
    return {
      ok: r.ok,
      status: r.status,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
      checkedAt: new Date().toISOString(),
    };
  }
}
