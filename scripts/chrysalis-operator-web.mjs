#!/usr/bin/env node
/**
 * Chrysalis Translation Hub — web UI (landing, SSH project wizard, live console).
 * Default port 19090. Hub data: ~/.chrysalis-hub/
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  INPUT_LANGUAGES,
  OUTPUT_LANGUAGES,
  defaultOriginLanguage,
  defaultOutputLanguage,
  allLanguagesAsInputRows,
  WPTP_CI_REFERENCES,
  createHubProject,
  getProject,
  listProjects,
  planHubTranslation,
  resolveHubRoute,
  scanSshRemote,
  updateProject,
  writeHubReport,
} from "./chrysalis-hub-store.mjs";
import { probeHubConnectivity, probeOriginOverSsh } from "./chrysalis-hub-connectivity.mjs";
import { hubJobSteps, runJobSteps } from "./chrysalis-hub-runners.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.CHRYSALIS_OPERATOR_PORT ?? process.env.CHRYSALIS_STATUS_PORT ?? "19090");
const bind = process.env.CHRYSALIS_OPERATOR_BIND ?? process.env.CHRYSALIS_STATUS_BIND ?? "0.0.0.0";
const repo = process.env.CHRYSALIS_OPERATOR_REPO ?? process.env.CHRYSALIS_STATUS_REPO ?? join(homedir(), "chrysalis-test");
const cliBin = process.env.CHRYSALIS_OPERATOR_CLI ?? join(repo, "packages/cli/dist/bin.js");
const authToken = process.env.CHRYSALIS_OPERATOR_TOKEN ?? "";
const defaultProject = process.env.CHRYSALIS_OPERATOR_DEFAULT_PROJECT ?? "fixtures/tiny-blog";

let indexHtml = "";
let uiJs = "";

const sseClients = new Set();
let currentJob = null;
let progressWatcher = null;
let activeProgressFile =
  process.env.CHRYSALIS_OPERATOR_PROGRESS_FILE ?? join(repo, ".chrysalis", "ingest.progress");

function broadcast(type, payload) {
  const line = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(line);
    } catch {
      sseClients.delete(res);
    }
  }
}

async function readProgressState() {
  try {
    const raw = await readFile(activeProgressFile, "utf8");
    const j = JSON.parse(raw);
    const completed = Array.isArray(j.completedRouteKeys) ? j.completedRouteKeys : [];
    let totalRoutes = completed.length;
    if (j.projectRoot) {
      try {
        const manifest = JSON.parse(await readFile(join(j.projectRoot, "chrysalis.routes.json"), "utf8"));
        if (Array.isArray(manifest.routes)) totalRoutes = manifest.routes.length;
      } catch {
        /* ignore */
      }
    }
    const pct = totalRoutes > 0 ? Math.min(100, Math.round((completed.length / totalRoutes) * 100)) : 0;
    return {
      ok: true,
      path: activeProgressFile,
      raw: j,
      completedRouteKeys: completed,
      totalRoutes,
      completedCount: completed.length,
      percent: pct,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      path: activeProgressFile,
      state: err.includes("ENOENT") ? "idle" : "error",
      error: err,
      completedRouteKeys: [],
      totalRoutes: 0,
      completedCount: 0,
      percent: 0,
    };
  }
}

function resolveProjectDir(input) {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) throw new Error("projectDir is required");
  return isAbsolute(trimmed) ? trimmed : resolve(repo, trimmed);
}

function checkAuth(req) {
  if (!authToken) return true;
  const h = req.headers.authorization ?? "";
  return h === `Bearer ${authToken}` || h === authToken;
}

function stopProgressWatch() {
  if (progressWatcher) {
    progressWatcher.close();
    progressWatcher = null;
  }
}

function startProgressWatch() {
  stopProgressWatch();
  const dir = dirname(activeProgressFile);
  const push = () => void readProgressState().then((p) => broadcast("progress", p));
  push();
  try {
    progressWatcher = watch(dir, { persistent: false }, push);
  } catch {
    const t = setInterval(() => {
      if (!currentJob || currentJob.state !== "running") {
        clearInterval(t);
        return;
      }
      push();
    }, 400);
    progressWatcher = { close: () => clearInterval(t) };
  }
}

function runHubJobSteps(steps, projectDir, hubPlan) {
  if (currentJob?.state === "running") throw new Error("A job is already running");
  const id = `job-${Date.now()}`;
  currentJob = { id, kind: "translate", state: "running", projectDir, startedAt: new Date().toISOString(), plan: hubPlan };
  broadcast("job", { ...currentJob });
  if (steps.some((s) => s.kind === "ingest" || s.kind === "hub-translate")) startProgressWatch();

  runJobSteps(steps, repo, {
    onStepStart(step) {
      broadcast("log", { jobId: id, stream: "stdout", line: `[hub] step ${step.kind}` });
    },
    onLog(stream, line) {
      broadcast("log", { jobId: id, stream, line });
    },
    onDone(code) {
      stopProgressWatch();
      if (currentJob?.id === id) {
        currentJob = { ...currentJob, state: code === 0 ? "succeeded" : "failed", exitCode: code };
        broadcast("job", { ...currentJob });
      }
    },
  });
}

function runCliJob(kind, projectDir, args) {
  if (currentJob?.state === "running") throw new Error("A job is already running");
  const id = `job-${Date.now()}`;
  currentJob = { id, kind, state: "running", projectDir, startedAt: new Date().toISOString() };
  broadcast("job", { ...currentJob });

  const child = spawn(process.execPath, [cliBin, ...args], {
    cwd: repo,
    env: { ...process.env, CHRYSALIS_SKIP_PARSER_VENDOR: process.env.CHRYSALIS_SKIP_PARSER_VENDOR ?? "1", NO_COLOR: "1" },
  });
  if (kind === "ingest") startProgressWatch();

  const emit = (stream, chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) broadcast("log", { jobId: id, stream, line });
    }
  };
  child.stdout.on("data", (c) => emit("stdout", c));
  child.stderr.on("data", (c) => emit("stderr", c));
  child.on("close", (code) => {
    stopProgressWatch();
    if (currentJob?.id === id) {
      currentJob = {
        ...currentJob,
        state: code === 0 ? "succeeded" : "failed",
        endedAt: new Date().toISOString(),
        exitCode: code ?? 1,
      };
      broadcast("job", { ...currentJob });
    }
    void readProgressState().then((p) => broadcast("progress", p));
  });
  child.on("error", (err) => {
    stopProgressWatch();
    if (currentJob?.id === id) {
      currentJob = { ...currentJob, state: "failed", endedAt: new Date().toISOString(), error: err.message };
      broadcast("job", { ...currentJob });
    }
  });
  return currentJob;
}

function runInit(projectDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliBin, "init", projectDir], {
      cwd: repo,
      env: { ...process.env, CHRYSALIS_SKIP_PARSER_VENDOR: "1" },
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`init exit ${code}`))));
    child.on("error", reject);
  });
}

function runStatusJson(projectDir) {
  return new Promise((resolvePromise, reject) => {
    const out = [];
    const err = [];
    const child = spawn(process.execPath, [cliBin, "status", "--project", projectDir, "--json"], {
      cwd: repo,
      env: { ...process.env, CHRYSALIS_SKIP_PARSER_VENDOR: "1" },
    });
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => err.push(c));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(err).toString("utf8") || `exit ${code}`));
        return;
      }
      try {
        resolvePromise(JSON.parse(Buffer.concat(out).toString("utf8")));
      } catch {
        reject(new Error("status returned non-JSON"));
      }
    });
    child.on("error", reject);
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw.trim() ? JSON.parse(raw) : {};
}

function sendJson(res, code, body) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, code, type, body) {
  res.writeHead(code, { "content-type": type });
  res.end(body);
}

async function prepareStatic() {
  indexHtml = await readFile(join(__dir, "chrysalis-operator-index.html"), "utf8");
  uiJs = await readFile(join(__dir, "chrysalis-operator-ui.js"), "utf8");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    sendText(res, 200, "text/html; charset=utf-8", indexHtml);
    return;
  }
  if (req.method === "GET" && url.pathname === "/ui.js") {
    sendText(res, 200, "application/javascript; charset=utf-8", uiJs);
    return;
  }
  if (req.method === "GET" && url.pathname === "/docs/hub-connectivity") {
    try {
      const md = await readFile(join(__dir, "..", "docs", "HUB-CONNECTIVITY.md"), "utf8");
      sendText(res, 200, "text/plain; charset=utf-8", md);
    } catch {
      sendJson(res, 404, { error: "doc-not-found" });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    res.write(": connected\n\n");
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    void readProgressState().then((p) => {
      res.write(`event: progress\ndata: ${JSON.stringify(p)}\n\n`);
      if (currentJob) res.write(`event: job\ndata: ${JSON.stringify(currentJob)}\n\n`);
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, { repo, cliBin, progressFile: activeProgressFile, defaultProject, port });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, { job: currentJob, progress: await readProgressState() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/progress") {
    sendJson(res, 200, await readProgressState());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/projects") {
    sendJson(res, 200, { projects: await listProjects() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/route-preview") {
    const origin = url.searchParams.get("origin") ?? defaultOriginLanguage();
    const output = url.searchParams.get("output") ?? defaultOutputLanguage();
    const route = resolveHubRoute(origin, output);
    sendJson(res, 200, { origin, output, route });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/target-matrix") {
    sendJson(res, 200, {
      inputLanguages: INPUT_LANGUAGES,
      outputLanguages: OUTPUT_LANGUAGES,
      defaultOrigin: defaultOriginLanguage(),
      defaultOutput: defaultOutputLanguage(),
      inputLanguagesWithCounts: allLanguagesAsInputRows(null),
      wptpCi: WPTP_CI_REFERENCES,
    });
    return;
  }

  const hubPlanMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/route-plan$/);
  if (req.method === "GET" && hubPlanMatch) {
    const p = await getProject(decodeURIComponent(hubPlanMatch[1]));
    if (!p) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    const plan = planHubTranslation(p);
    sendJson(res, 200, { projectId: p.id, plan });
    return;
  }

  const hubProjectMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)$/);
  if (req.method === "GET" && hubProjectMatch) {
    const p = await getProject(decodeURIComponent(hubProjectMatch[1]));
    if (!p) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    sendJson(res, 200, p);
    return;
  }

  if (req.method === "POST") {
    if (!checkAuth(req)) {
      sendJson(res, 401, { error: "unauthorized" });
      return;
    }
    try {
      const body = await readBody(req);

      if (url.pathname === "/api/hub/scan-ssh") {
        const detection = await scanSshRemote(body.ssh);
        sendJson(res, 200, { detection });
        return;
      }

      if (url.pathname === "/api/hub/probe-connectivity") {
        const hub = await probeHubConnectivity();
        let origin = null;
        if (body.ssh?.host && body.ssh?.user) {
          origin = await probeOriginOverSsh(body.ssh);
        }
        sendJson(res, 200, { ok: hub.ok && (origin ? origin.ok : true), hub, origin });
        return;
      }

      if (url.pathname === "/api/hub/projects") {
        const project = await createHubProject({
          name: body.name,
          description: body.description,
          ssh: body.ssh,
          pullFromSsh: body.pullFromSsh === true,
          detectLanguages: body.detectLanguages === true,
          originLanguage: body.originLanguage,
          outputLanguage: body.outputLanguage,
        });
        try {
          await runInit(project.localDir);
          await updateProject(project.id, { chrysalisInitialized: true });
          project.chrysalisInitialized = true;
        } catch {
          /* init optional if dir not ready */
        }
        sendJson(res, 201, { project });
        return;
      }

      if (url.pathname === "/api/jobs/ingest") {
        let projectDir = resolveProjectDir(body.projectDir ?? defaultProject);
        let hubPlan = null;
        if (body.hubProjectId) {
          const hp = await getProject(body.hubProjectId);
          if (!hp) {
            sendJson(res, 404, { error: "hub-project-not-found" });
            return;
          }
          hubPlan = planHubTranslation(hp);
          if (hp.localDir) {
            projectDir = hp.localDir;
            activeProgressFile = join(hp.localDir, ".chrysalis", "ingest.progress");
            await writeHubReport(hp.localDir, { projectId: hp.id, ...hubPlan });
          }
          if (hubPlan.runnable.length === 0) {
            sendJson(res, 422, {
              error: "no-runnable-routes",
              message:
                hubPlan.errors[0]?.message ??
                "No runnable route for this origin and output pair.",
              plan: hubPlan,
            });
            return;
          }
          if (hubPlan.errors.length > 0) {
            broadcast("hubPlan", { projectId: hp.id, plan: hubPlan });
          }
          await statProject(projectDir);
          const steps = hubJobSteps(repo, cliBin, projectDir, hubPlan.runnable[0]);
          runHubJobSteps(steps, projectDir, hubPlan);
          sendJson(res, 202, {
            accepted: true,
            job: currentJob,
            progressFile: activeProgressFile,
            plan: hubPlan,
          });
          return;
        }
        activeProgressFile = join(projectDir, ".chrysalis", "ingest.progress");
        await statProject(projectDir);
        runCliJob("ingest", projectDir, ["ingest", projectDir, "--ingest-progress-file", activeProgressFile]);
        sendJson(res, 202, {
          accepted: true,
          job: currentJob,
          progressFile: activeProgressFile,
          plan: hubPlan,
        });
        return;
      }

      if (url.pathname === "/api/jobs/status") {
        const projectDir = resolveProjectDir(body.projectDir ?? defaultProject);
        if (currentJob?.state === "running") throw new Error("A job is already running");
        const id = `job-${Date.now()}`;
        currentJob = { id, kind: "status", state: "running", projectDir, startedAt: new Date().toISOString() };
        broadcast("job", { ...currentJob });
        try {
          const result = await runStatusJson(projectDir);
          broadcast("statusResult", result);
          currentJob = { ...currentJob, state: "succeeded", endedAt: new Date().toISOString(), exitCode: 0 };
          broadcast("job", { ...currentJob });
          sendJson(res, 200, { job: currentJob, result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          currentJob = { ...currentJob, state: "failed", endedAt: new Date().toISOString(), error: msg };
          broadcast("job", { ...currentJob });
          sendJson(res, 500, { error: msg });
        }
        return;
      }
    } catch (e) {
      sendJson(res, 400, { error: e instanceof Error ? e.message : String(e) });
      return;
    }
  }

  sendJson(res, 404, { error: "not-found" });
});

async function statProject(projectDir) {
  await readFile(join(projectDir, "chrysalis.routes.json"), "utf8");
}

await prepareStatic();
server.listen(port, bind, () => {
  console.log(`[chrysalis-operator-web] Translation Hub http://${bind}:${port}/`);
});
