#!/usr/bin/env node
/**
 * Chrysalis Translation Hub — client/server operator (browser UI + REST/SSE API).
 * Multi-site SSH projects, parallel translation, per-site progress. Port 19090. Data: ~/.chrysalis-hub/
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
  addProjectSite,
  createHubProject,
  getProject,
  listProjects,
  planHubTranslation,
  planSiteTranslation,
  prepAllProjectSites,
  prepProjectSite,
  removeProjectSite,
  resolveHubRoute,
  scanSshRemote,
  siteProgressPath,
  updateProject,
  writeHubReport,
} from "./chrysalis-hub-store.mjs";
import { probeHubConnectivity, probeOriginOverSsh } from "./chrysalis-hub-connectivity.mjs";
import { hubJobSteps, runJobSteps } from "./chrysalis-hub-runners.mjs";
import {
  defaultBatchConcurrency,
  readSiteProgress,
  runProjectBatch,
  runSiteTranslation,
} from "./chrysalis-hub-batch.mjs";
import { runProjectSetup } from "./chrysalis-hub-setup.mjs";

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
let currentBatch = null;
let currentSetup = null;
let progressWatcher = null;
let batchProgressTimer = null;
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

async function readBatchProgressState(project) {
  const sites = {};
  let sumPct = 0;
  let n = 0;
  for (const site of project.sites ?? []) {
    const p = await readSiteProgress(site.localDir);
    sites[site.id] = { siteId: site.id, name: site.name, jobState: site.jobState, ...p };
    sumPct += p.pct ?? 0;
    n += 1;
  }
  return {
    ok: true,
    projectId: project.id,
    sites,
    overallPercent: n > 0 ? Math.round(sumPct / n) : 0,
    running: currentBatch?.state === "running",
    batch: currentBatch,
  };
}

function stopBatchProgressWatch() {
  if (batchProgressTimer) {
    clearInterval(batchProgressTimer);
    batchProgressTimer = null;
  }
}

function startBatchProgressWatch(project) {
  stopBatchProgressWatch();
  const push = () => void readBatchProgressState(project).then((b) => broadcast("batchProgress", b));
  push();
  batchProgressTimer = setInterval(() => {
    if (currentBatch?.state !== "running") {
      stopBatchProgressWatch();
      return;
    }
    push();
  }, 500);
}

function stopProgressWatch() {
  stopBatchProgressWatch();
  if (progressWatcher) {
    progressWatcher.close();
    progressWatcher = null;
  }
}

function hubBusy() {
  return currentBatch?.state === "running" || currentJob?.state === "running" || currentSetup?.state === "running";
}

async function startProjectSetup(
  projectId,
  { siteIds = null, prep = true, pull = true, detect = false } = {},
) {
  if (hubBusy()) throw new Error("A setup, batch, or job is already running");
  const setupId = `setup-${Date.now()}`;
  currentSetup = {
    id: setupId,
    projectId,
    state: "running",
    startedAt: new Date().toISOString(),
    siteIds: siteIds ?? null,
  };
  broadcast("setup", { ...currentSetup });

  void runProjectSetup(
    projectId,
    { siteIds, prep, pull, detect },
    {
      onSetupStart(ids) {
        broadcast("log", { stream: "stdout", line: `[setup] starting ${ids.length} site(s)` });
      },
      onLog(siteId, stream, line) {
        broadcast("log", { jobId: setupId, siteId, stream, line });
      },
      onSiteState(siteId, state, extra) {
        broadcast("siteSetup", { setupId, siteId, state, ...extra });
      },
      onSetupDone(summary) {
        currentSetup = {
          ...currentSetup,
          state: summary.ok ? "succeeded" : "failed",
          endedAt: new Date().toISOString(),
          summary,
        };
        broadcast("setup", { ...currentSetup });
      },
    },
  ).catch((e) => {
    currentSetup = {
      ...currentSetup,
      state: "failed",
      endedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
    broadcast("setup", { ...currentSetup });
  });

  return currentSetup;
}

async function startProjectBatch(
  project,
  { siteIds = null, concurrency = defaultBatchConcurrency(), prepSites = false, setupFirst = false } = {},
) {
  if (hubBusy()) {
    throw new Error("A setup, batch, or job is already running");
  }
  if (setupFirst) {
    await new Promise((resolve, reject) => {
      const setupId = `setup-${Date.now()}`;
      currentSetup = { id: setupId, projectId: project.id, state: "running", startedAt: new Date().toISOString() };
      broadcast("setup", { ...currentSetup });
      void runProjectSetup(
        project.id,
        { siteIds, prep: true, pull: true, detect: false },
        {
          onLog(siteId, stream, line) {
            broadcast("log", { jobId: setupId, siteId, stream, line });
          },
          onSiteState() {},
          onSetupDone(summary) {
            currentSetup = { ...currentSetup, state: summary.ok ? "succeeded" : "failed", endedAt: new Date().toISOString(), summary };
            broadcast("setup", { ...currentSetup });
            if (!summary.ok) reject(new Error("site setup failed"));
            else resolve();
          },
        },
      ).catch(reject);
    });
    const fresh = await getProject(project.id);
    if (fresh) project = fresh;
  } else if (prepSites) {
    broadcast("log", { stream: "stdout", line: "[batch] preparing SSH origins (scan agent + capture kit)…" });
    await prepAllProjectSites(project.id, siteIds);
    const fresh = await getProject(project.id);
    if (fresh) project = fresh;
  }
  const batchId = `batch-${Date.now()}`;
  currentBatch = {
    id: batchId,
    projectId: project.id,
    state: "running",
    startedAt: new Date().toISOString(),
    concurrency,
    siteIds: siteIds ?? project.sites.map((s) => s.id),
  };
  broadcast("batch", { ...currentBatch });
  startBatchProgressWatch(project);

  void runProjectBatch({
    repo,
    cliBin,
    project,
    siteIds,
    concurrency,
    hooks: {
      onBatchStart(id, ids) {
        broadcast("log", { jobId: id, stream: "stdout", line: `[batch] starting ${ids.length} site(s), concurrency ${concurrency}` });
      },
      onSiteState(siteId, state, extra) {
        broadcast("siteJob", { batchId, siteId, state, ...extra });
      },
      onLog(siteId, stream, line) {
        broadcast("log", { jobId: batchId, siteId, stream, line });
      },
      onBatchDone(id, summary) {
        stopBatchProgressWatch();
        currentBatch = { ...currentBatch, state: summary.ok ? "succeeded" : "failed", endedAt: new Date().toISOString(), summary };
        broadcast("batch", { ...currentBatch });
        void readBatchProgressState(project).then((b) => broadcast("batchProgress", b));
      },
    },
  }).catch((e) => {
    stopBatchProgressWatch();
    currentBatch = {
      ...currentBatch,
      state: "failed",
      endedAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
    broadcast("batch", { ...currentBatch });
  });
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
    env: { ...process.env, NO_COLOR: "1" },
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
      env: { ...process.env },
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
      env: { ...process.env },
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

async function loadStatic() {
  if (process.env.CHRYSALIS_HUB_RELOAD_STATIC === "1" || process.env.NODE_ENV !== "production") {
    await prepareStatic();
  } else if (!indexHtml) {
    await prepareStatic();
  }
}

const noCache = { "cache-control": "no-cache, no-store, must-revalidate", pragma: "no-cache" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    await loadStatic();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", ...noCache });
    res.end(indexHtml);
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/ui.js")) {
    await loadStatic();
    res.writeHead(200, { "content-type": "application/javascript; charset=utf-8", ...noCache });
    res.end(uiJs);
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
  if (req.method === "GET" && url.pathname === "/docs/hub-install") {
    try {
      const md = await readFile(join(__dir, "..", "docs", "HUB-DEMO-INSTALL.md"), "utf8");
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
    sendJson(res, 200, {
      job: currentJob,
      batch: currentBatch,
      setup: currentSetup,
      progress: await readProgressState(),
    });
    return;
  }

  const batchProgressMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/batch-progress$/);
  if (req.method === "GET" && batchProgressMatch) {
    const p = await getProject(decodeURIComponent(batchProgressMatch[1]));
    if (!p) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    sendJson(res, 200, await readBatchProgressState(p));
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
        const backgroundSetup = body.backgroundSetup !== false;
        const project = await createHubProject({
          name: body.name,
          description: body.description,
          ssh: body.ssh,
          sites: body.sites,
          pullFromSsh: body.pullFromSsh === true,
          detectLanguages: body.detectLanguages === true,
          originLanguage: body.originLanguage,
          outputLanguage: body.outputLanguage,
          prepOrigin: body.prepOrigin !== false,
          backgroundSetup,
        });
        let full = (await getProject(project.id)) ?? project;
        let setupStarted = false;
        if (backgroundSetup && body.runSetup !== false && (full.sites?.length ?? 0) > 0) {
          await startProjectSetup(full.id, {
            prep: body.prepOrigin !== false,
            pull: body.pullFromSsh !== false,
            detect: body.detectLanguages === true,
          });
          setupStarted = true;
        }
        try {
          await runInit(full.localDir);
          await updateProject(full.id, { chrysalisInitialized: true });
          full = (await getProject(full.id)) ?? full;
          full.chrysalisInitialized = true;
        } catch {
          /* init optional if dir not ready */
        }
        sendJson(res, 201, { project: full, setupStarted });
        return;
      }

      const addSiteMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites$/);
      if (req.method === "POST" && addSiteMatch) {
        const projectId = decodeURIComponent(addSiteMatch[1]);
        const backgroundSetup = body.backgroundSetup !== false;
        const site = await addProjectSite(projectId, {
          name: body.name,
          ssh: body.ssh,
          originLanguage: body.originLanguage,
          pullFromSsh: body.pullFromSsh === true,
          detectLanguages: body.detectLanguages === true,
          prepOrigin: body.prepOrigin !== false,
          backgroundSetup,
        });
        let setupStarted = false;
        if (backgroundSetup && body.runSetup !== false && site.ssh) {
          await startProjectSetup(projectId, {
            siteIds: [site.id],
            prep: body.prepOrigin !== false,
            pull: body.pullFromSsh === true,
            detect: body.detectLanguages === true,
          });
          setupStarted = true;
        }
        sendJson(res, 201, { site, setupStarted, project: await getProject(projectId) });
        return;
      }

      const setupAllMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/setup-all-sites$/);
      if (req.method === "POST" && setupAllMatch) {
        const projectId = decodeURIComponent(setupAllMatch[1]);
        const setup = await startProjectSetup(projectId, {
          siteIds: body.siteIds ?? null,
          prep: body.prep !== false,
          pull: body.pull !== false,
          detect: body.detect === true,
        });
        sendJson(res, 202, { accepted: true, setup });
        return;
      }

      const prepSiteMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/prep$/);
      if (req.method === "POST" && prepSiteMatch) {
        const projectId = decodeURIComponent(prepSiteMatch[1]);
        const siteId = decodeURIComponent(prepSiteMatch[2]);
        if (body.async !== false) {
          const setup = await startProjectSetup(projectId, { siteIds: [siteId], prep: true, pull: false, detect: false });
          sendJson(res, 202, { accepted: true, setup });
          return;
        }
        const r = await prepProjectSite(projectId, siteId);
        sendJson(res, 200, r);
        return;
      }

      const prepAllMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/prep-all-sites$/);
      if (req.method === "POST" && prepAllMatch) {
        const projectId = decodeURIComponent(prepAllMatch[1]);
        if (body.async !== false) {
          const setup = await startProjectSetup(projectId, {
            siteIds: body.siteIds ?? null,
            prep: true,
            pull: false,
            detect: false,
          });
          sendJson(res, 202, { accepted: true, setup });
          return;
        }
        const r = await prepAllProjectSites(projectId, body.siteIds ?? null);
        sendJson(res, 200, r);
        return;
      }

      const delSiteMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)$/);
      if (req.method === "DELETE" && delSiteMatch) {
        const project = await removeProjectSite(decodeURIComponent(delSiteMatch[1]), decodeURIComponent(delSiteMatch[2]));
        sendJson(res, 200, { project });
        return;
      }

      const runBatchMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/run-batch$/);
      if (req.method === "POST" && runBatchMatch) {
        const hp = await getProject(decodeURIComponent(runBatchMatch[1]));
        if (!hp) {
          sendJson(res, 404, { error: "hub-project-not-found" });
          return;
        }
        if (!hp.sites?.length) {
          sendJson(res, 422, { error: "no-sites", message: "Add at least one origin site to the project." });
          return;
        }
        const concurrency = Number(body.concurrency) || defaultBatchConcurrency();
        try {
          await startProjectBatch(hp, {
            siteIds: body.siteIds ?? null,
            concurrency,
            prepSites: body.prepSites === true,
            setupFirst: body.setupFirst === true,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          sendJson(res, 409, { error: "job-busy", message: msg });
          return;
        }
        sendJson(res, 202, { accepted: true, batch: currentBatch });
        return;
      }

      const runPipelineMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/run-pipeline$/);
      if (req.method === "POST" && runPipelineMatch) {
        const hp = await getProject(decodeURIComponent(runPipelineMatch[1]));
        if (!hp) {
          sendJson(res, 404, { error: "hub-project-not-found" });
          return;
        }
        if (!hp.sites?.length) {
          sendJson(res, 422, { error: "no-sites", message: "Add at least one origin site." });
          return;
        }
        const concurrency = Number(body.concurrency) || defaultBatchConcurrency();
        try {
          await startProjectBatch(hp, {
            siteIds: body.siteIds ?? null,
            concurrency,
            setupFirst: true,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          sendJson(res, 409, { error: "job-busy", message: msg });
          return;
        }
        sendJson(res, 202, { accepted: true, batch: currentBatch, pipeline: true });
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
          const runAll = body.runBatch === true || (!body.siteId && (hp.sites?.length ?? 0) > 1);
          if (runAll) {
            const concurrency = Number(body.concurrency) || defaultBatchConcurrency();
            await startProjectBatch(hp, {
              siteIds: body.siteIds ?? null,
              concurrency,
              prepSites: body.prepSites === true,
            });
            sendJson(res, 202, { accepted: true, batch: currentBatch, mode: "multi-site" });
            return;
          }
          const site = body.siteId ? hp.sites.find((s) => s.id === body.siteId) : hp.sites[0];
          if (!site) {
            sendJson(res, 422, { error: "no-site", message: "Site not found on project." });
            return;
          }
          hubPlan = planSiteTranslation(hp, site);
          projectDir = site.localDir;
          activeProgressFile = siteProgressPath(site.localDir);
          await writeHubReport(site.localDir, { projectId: hp.id, siteId: site.id, ...hubPlan });
          if (hubPlan.runnable.length === 0) {
            sendJson(res, 422, {
              error: "no-runnable-routes",
              message: hubPlan.errors[0]?.message ?? "No runnable route for this site.",
              plan: hubPlan,
            });
            return;
          }
          if (hubBusy()) {
            sendJson(res, 409, { error: "job-busy" });
            return;
          }
          const jobId = `job-${Date.now()}`;
          currentJob = {
            id: jobId,
            kind: "translate-site",
            state: "running",
            projectDir,
            siteId: site.id,
            projectId: hp.id,
            startedAt: new Date().toISOString(),
            plan: hubPlan,
          };
          broadcast("job", { ...currentJob });
          startProgressWatch();
          void runSiteTranslation({
            repo,
            cliBin,
            project: hp,
            site,
            hooks: {
              onLog(sid, stream, line) {
                broadcast("log", { jobId, siteId: sid, stream, line });
              },
            },
          })
            .then(() => {
              stopProgressWatch();
              currentJob = { ...currentJob, state: "succeeded", endedAt: new Date().toISOString(), exitCode: 0 };
              broadcast("job", { ...currentJob });
            })
            .catch((e) => {
              stopProgressWatch();
              currentJob = {
                ...currentJob,
                state: "failed",
                endedAt: new Date().toISOString(),
                error: e instanceof Error ? e.message : String(e),
              };
              broadcast("job", { ...currentJob });
            });
          sendJson(res, 202, {
            accepted: true,
            job: currentJob,
            progressFile: activeProgressFile,
            plan: hubPlan,
            siteId: site.id,
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
