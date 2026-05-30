#!/usr/bin/env node
/**
 * Chrysalis Translation Hub — client/server operator (browser UI + REST/SSE API).
 * Multi-site SSH projects, parallel translation, per-site progress. Port 19090. Data: ~/.chrysalis-hub/
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { watch } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HUB_POPULAR_WEB_FOCUS_IDS } from "./hub-ingest/language-catalog.mjs";
import {
  HUB_GOLD_SUITES,
  buildHubGoldSuiteCoverage,
  hubGoldStructuralSuiteIds,
  hubGoldTraceReplaySuiteIds,
} from "./hub-ingest/hub-gold-manifest.mjs";
import {
  buildHubGoldCoverageReport,
  describeHubGoldPairCoverage,
  HUB_GOLD_COVERAGE_KIND,
} from "./hub-ingest/hub-gold-coverage.mjs";
import { buildHubCompletionSections } from "./hub-ingest/hub-completion-sections.mjs";
import { compareHubLanguages } from "./hub-ingest/hub-language-compare.mjs";
import { buildMigrationPlan } from "./hub-ingest/hub-migration-planner.mjs";
import { buildMigrationProgram } from "./hub-ingest/hub-migration-programs.mjs";
import { buildHubCapabilityMatrixReport } from "./hub-ingest/hub-capability-matrix.mjs";
import { buildHubEvidenceReport } from "./hub-ingest/hub-evidence.mjs";
import { buildVerifyPlaybooksReport } from "./hub-ingest/hub-verify-playbooks.mjs";
import { buildLaravelVerifyGapsReport } from "./hub-ingest/hub-laravel-verify-gaps.mjs";
import { runNodeExpressOracleVerify } from "./hub-ingest/hub-node-express-oracle-verify.mjs";
import { buildWebDatabaseCatalogReport } from "./hub-ingest/hub-web-databases.mjs";
import { buildDatabaseDetectionReport } from "./hub-ingest/hub-detect-databases.mjs";
import { buildSiteIntelligenceReport } from "./hub-ingest/hub-site-intelligence.mjs";
import { buildChimeraCutoverRunbook } from "./hub-ingest/hub-chimera-cutover.mjs";
import { buildMigrationAssessment } from "./hub-ingest/hub-migration-assessment.mjs";
import { writePathAdviceArtifacts } from "./hub-ingest/hub-apply-path-advice.mjs";
import { buildHubVerifyTiersReport, HUB_VERIFY_TIERS_KIND } from "./hub-ingest/hub-verify-tiers.mjs";
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
  getProjectForActor,
  hubActorFromRequest,
  listProjectsForActor,
  ownerForNewProject,
  listProjects,
  planHubTranslation,
  planSiteTranslation,
  buildLanguageReadinessReport,
  buildLanguageWorkQueue,
  buildHubTranslationPathMatrix,
  buildHubPathKnowledgeBase,
  queryPathKnowledge,
  buildCrossLanguageSynthesis,
  prepAllProjectSites,
  prepProjectSite,
  removeProjectSite,
  resolveHubRoute,
  scanSshRemote,
  siteProgressPath,
  updateProject,
  updateProjectSite,
  deleteHubProject,
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
import { buildObserveAssist } from "./chrysalis-hub-observe-assist.mjs";
import { readVerifySummary, runProjectVerify, runSiteVerify, defaultTracesDir } from "./chrysalis-hub-verify.mjs";
import { runWptpHubSmoke, runSiteWptpCompose } from "./chrysalis-hub-wptp.mjs";
import {
  readRawBody,
  parseMultipartFiles,
  saveTraceFiles,
  saveZipTraces,
  startResumableUpload,
  appendUploadChunk,
  finishResumableUpload,
  CHUNK_SIZE,
} from "./chrysalis-hub-traces-upload.mjs";
import {
  detectEmittedTarget,
  startSiteRuntime,
  stopSiteRuntime,
  probeRuntimeHealth,
  listRunningRuntimes,
  getRunningRuntime,
} from "./chrysalis-hub-runtime.mjs";
import { createOrg, joinOrg, listOrgs, orgIdsForActorFromStore } from "./chrysalis-hub-org.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.CHRYSALIS_OPERATOR_PORT ?? process.env.CHRYSALIS_STATUS_PORT ?? "19090");
const bind = process.env.CHRYSALIS_OPERATOR_BIND ?? process.env.CHRYSALIS_STATUS_BIND ?? "0.0.0.0";
const repo = process.env.CHRYSALIS_OPERATOR_REPO ?? process.env.CHRYSALIS_STATUS_REPO ?? join(homedir(), "chrysalis-test");
const cliBin = process.env.CHRYSALIS_OPERATOR_CLI ?? join(repo, "packages/cli/dist/bin.js");
const authToken = process.env.CHRYSALIS_OPERATOR_TOKEN ?? "";
const defaultProject = process.env.CHRYSALIS_OPERATOR_DEFAULT_PROJECT ?? "fixtures/tiny-blog";

let indexHtml = "";
let uiJs = "";
let brandAssets = new Map();

const sseClients = new Set();
let currentJob = null;
let currentBatch = null;
let currentSetup = null;
let currentVerify = null;
let progressWatcher = null;
let batchProgressTimer = null;
let activeProgressFile =
  process.env.CHRYSALIS_OPERATOR_PROGRESS_FILE ?? join(repo, ".chrysalis", "ingest.progress");
let runtimeHealthTimer = null;

async function pollRuntimeHealth() {
  for (const rt of listRunningRuntimes()) {
    if (!rt.baseUrl) continue;
    const health = await probeRuntimeHealth(rt.baseUrl);
    broadcast("runtimeHealth", { projectId: rt.projectId, siteId: rt.siteId, health, baseUrl: rt.baseUrl });
    const p = await getProject(rt.projectId);
    const site = p?.sites?.find((s) => s.id === rt.siteId);
    if (site) {
      await updateProject(rt.projectId, {
        sites: p.sites.map((s) =>
          s.id === rt.siteId ? { ...s, runtime: { ...(s.runtime ?? {}), ...rt, health } } : s,
        ),
      });
    }
  }
}

function startRuntimeHealthWatch() {
  if (runtimeHealthTimer) return;
  void pollRuntimeHealth();
  runtimeHealthTimer = setInterval(() => void pollRuntimeHealth(), 8000);
}

function stopRuntimeHealthWatch() {
  if (runtimeHealthTimer) {
    clearInterval(runtimeHealthTimer);
    runtimeHealthTimer = null;
  }
}

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
  return (
    currentBatch?.state === "running" ||
    currentJob?.state === "running" ||
    currentSetup?.state === "running" ||
    currentVerify?.state === "running"
  );
}

async function startProjectVerifyJob(projectId, opts = {}) {
  if (hubBusy()) throw new Error("A verify, setup, batch, or job is already running");
  const verifyId = `verify-${Date.now()}`;
  currentVerify = {
    id: verifyId,
    projectId,
    state: "running",
    startedAt: new Date().toISOString(),
    siteIds: opts.siteIds ?? null,
  };
  broadcast("verify", { ...currentVerify });

  void runProjectVerify(
    projectId,
    {
      repo,
      cliBin,
      siteIds: opts.siteIds ?? null,
      tracesDir: opts.tracesDir ?? null,
      baseUrl: opts.baseUrl,
      threshold: opts.threshold ?? 0.9,
    },
    {
      onLog(siteId, stream, line) {
        broadcast("log", { jobId: verifyId, siteId, stream, line });
      },
      onSiteVerify(siteId, result) {
        broadcast("siteVerify", { verifyId, siteId, ...result });
      },
    },
  )
    .then((summary) => {
      currentVerify = {
        ...currentVerify,
        state: summary.ok ? "succeeded" : "failed",
        endedAt: new Date().toISOString(),
        summary,
      };
      broadcast("verify", { ...currentVerify });
    })
    .catch((e) => {
      currentVerify = {
        ...currentVerify,
        state: "failed",
        endedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : String(e),
      };
      broadcast("verify", { ...currentVerify });
    });

  return currentVerify;
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
  const assetsDir = join(__dir, "hub-brand", "assets");
  const files = await readdir(assetsDir, { withFileTypes: true });
  const nextMap = new Map();
  for (const f of files) {
    if (!f.isFile()) continue;
    const body = await readFile(join(assetsDir, f.name));
    const type = f.name.endsWith(".svg")
      ? "image/svg+xml"
      : f.name.endsWith(".css")
        ? "text/css; charset=utf-8"
        : "application/octet-stream";
    nextMap.set(`/assets/${f.name}`, { body, type });
  }
  brandAssets = nextMap;
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
  if (req.method === "GET" && brandAssets.has(url.pathname)) {
    const asset = brandAssets.get(url.pathname);
    res.writeHead(200, { "content-type": asset.type, "cache-control": "public, max-age=86400" });
    res.end(asset.body);
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
    sendJson(res, 200, {
      repo,
      cliBin,
      progressFile: activeProgressFile,
      defaultProject,
      port,
      authRequired: Boolean(authToken),
      wptpReferences: WPTP_CI_REFERENCES,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, {
      job: currentJob,
      batch: currentBatch,
      setup: currentSetup,
      verify: currentVerify,
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

  if (req.method === "GET" && url.pathname === "/api/hub/orgs") {
    const actor = hubActorFromRequest(req, authToken);
    const orgs = await listOrgs();
    const ids = await orgIdsForActorFromStore(actor);
    sendJson(res, 200, { orgs: orgs.filter((o) => ids.includes(o.id)), actor: actor.role });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/runtime-health") {
    const out = [];
    for (const rt of listRunningRuntimes()) {
      out.push({
        ...rt,
        health: rt.baseUrl ? await probeRuntimeHealth(rt.baseUrl) : { ok: false, error: "no baseUrl" },
      });
    }
    sendJson(res, 200, { runtimes: out });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/projects") {
    const actor = hubActorFromRequest(req, authToken);
    sendJson(res, 200, { projects: await listProjectsForActor(actor), actor: actor.role });
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

  if (req.method === "GET" && url.pathname === "/api/hub/language-work-queue") {
    const scopeRaw = String(url.searchParams.get("scope") ?? "popular-web").toLowerCase();
    const scope = scopeRaw === "all" ? "all" : "popular-web";
    const gradesRaw = url.searchParams.get("grades") ?? "open,silver";
    const grades = gradesRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((g) => g === "gold" || g === "silver" || g === "open");
    const tiersRaw = url.searchParams.get("verifyTiers") ?? "";
    const verifyTiers = tiersRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    sendJson(
      res,
      200,
      buildLanguageWorkQueue({
        scope,
        grades: grades.length ? grades : undefined,
        verifyTiers: verifyTiers.length ? verifyTiers : undefined,
      }),
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/translation-path-matrix") {
    const origin = url.searchParams.get("origin") ?? undefined;
    const output = url.searchParams.get("output") ?? undefined;
    sendJson(res, 200, buildHubTranslationPathMatrix({ origin, output }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/path-knowledge") {
    const origin = url.searchParams.get("origin") ?? undefined;
    const output = url.searchParams.get("output") ?? undefined;
    if (origin && output) {
      sendJson(res, 200, queryPathKnowledge(origin, output));
    } else {
      sendJson(res, 200, buildHubPathKnowledgeBase({ origin, output }));
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/cross-language-synthesis") {
    sendJson(res, 200, buildCrossLanguageSynthesis());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/verify-tiers") {
    const tier = url.searchParams.get("tier") ?? undefined;
    const report = buildHubVerifyTiersReport();
    if (tier) {
      sendJson(res, 200, {
        kind: HUB_VERIFY_TIERS_KIND,
        schemaVersion: 1,
        tier,
        pairs: report.pairs.filter((p) => p.verifyTier === tier),
        tierCounts: report.tierCounts,
      });
      return;
    }
    sendJson(res, 200, report);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/gold-coverage") {
    const origin = url.searchParams.get("origin") ?? undefined;
    const output = url.searchParams.get("output") ?? undefined;
    const report = buildHubGoldCoverageReport();
    if (origin && output) {
      const pair = report.pairs.find((p) => p.origin === origin && p.output === output);
      sendJson(res, 200, {
        kind: HUB_GOLD_COVERAGE_KIND,
        schemaVersion: 1,
        pair: pair ?? describeHubGoldPairCoverage(origin, output),
        summary: report.summary,
      });
      return;
    }
    sendJson(res, 200, report);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/web-databases") {
    const tier = url.searchParams.get("tier") ?? undefined;
    const report = buildWebDatabaseCatalogReport();
    if (tier) {
      sendJson(res, 200, {
        ...report,
        databases: report.databases.filter((d) => d.popularityTier === tier),
      });
      return;
    }
    sendJson(res, 200, report);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/detect-databases") {
    const servicesRaw = url.searchParams.get("services");
    if (!servicesRaw) {
      sendJson(res, 400, { error: "services query param required (JSON object)" });
      return;
    }
    try {
      const services = JSON.parse(servicesRaw);
      sendJson(res, 200, buildDatabaseDetectionReport(services));
    } catch {
      sendJson(res, 400, { error: "invalid services JSON" });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/site-intelligence") {
    const projectDir = url.searchParams.get("projectDir");
    if (!projectDir) {
      sendJson(res, 400, { error: "projectDir query param required" });
      return;
    }
    try {
      const report = await buildSiteIntelligenceReport(resolve(projectDir));
      sendJson(res, 200, report);
    } catch (e) {
      sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/chimera-cutover") {
    const projectDir = url.searchParams.get("projectDir");
    const origin = url.searchParams.get("origin") ?? "php";
    const outputsRaw = url.searchParams.get("outputs") ?? "hono";
    const programId = url.searchParams.get("program") ?? "api-slice";
    const snapshotPath = url.searchParams.get("snapshot") ?? undefined;
    if (!projectDir) {
      sendJson(res, 400, { error: "projectDir query param required" });
      return;
    }
    const outputs = outputsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const report = await buildChimeraCutoverRunbook({
        projectDir: resolve(projectDir),
        origin,
        outputs,
        programId,
        snapshotPath,
      });
      sendJson(res, 200, report);
    } catch (e) {
      sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/migration-assessment") {
    const projectDir = url.searchParams.get("projectDir");
    const origin = url.searchParams.get("origin") ?? undefined;
    const output = url.searchParams.get("output") ?? undefined;
    if (!projectDir) {
      sendJson(res, 400, { error: "projectDir query param required" });
      return;
    }
    try {
      const report = await buildMigrationAssessment({
        projectDir: resolve(projectDir),
        origin,
        output,
      });
      sendJson(res, 200, report);
    } catch (e) {
      sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/apply-path-advice") {
    const projectDir = url.searchParams.get("projectDir");
    const origin = url.searchParams.get("origin");
    const output = url.searchParams.get("output");
    const programId = url.searchParams.get("program") ?? undefined;
    if (!projectDir || !origin || !output) {
      sendJson(res, 400, { error: "projectDir, origin, and output query params required" });
      return;
    }
    try {
      const result = await writePathAdviceArtifacts(resolve(projectDir), { origin, output, programId });
      sendJson(res, 200, result.report);
    } catch (e) {
      sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/laravel-verify-gaps") {
    sendJson(res, 200, buildLaravelVerifyGapsReport());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/node-express-oracle-verify") {
    const report = await runNodeExpressOracleVerify();
    sendJson(res, 200, report);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/capability-matrix") {
    sendJson(res, 200, buildHubCapabilityMatrixReport());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/migration-program") {
    const origin = url.searchParams.get("origin");
    const outputsRaw = url.searchParams.get("outputs");
    const programId = url.searchParams.get("program") ?? "api-slice";
    const dbRaw = url.searchParams.get("databases");
    if (!origin || !outputsRaw) {
      sendJson(res, 400, { error: "origin and outputs required" });
      return;
    }
    const outputs = outputsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const detectedDatabases = dbRaw ? dbRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    sendJson(res, 200, buildMigrationProgram({ origin, outputs, programId, detectedDatabases }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/verify-playbooks") {
    const projectDir = url.searchParams.get("projectDir");
    const summaryPath = projectDir
      ? join(resolve(projectDir), "reports", "verify", "summary.json")
      : null;
    sendJson(res, 200, buildVerifyPlaybooksReport(summaryPath ?? undefined));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/migration-plan") {
    const origin = url.searchParams.get("origin");
    const outputsRaw = url.searchParams.get("outputs");
    const dbRaw = url.searchParams.get("databases");
    const servicesRaw = url.searchParams.get("services");
    if (!origin || !outputsRaw) {
      sendJson(res, 400, { error: "origin and outputs required" });
      return;
    }
    const outputs = outputsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const detectedDatabases = dbRaw ? dbRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
    let originServices;
    if (servicesRaw) {
      try {
        originServices = JSON.parse(servicesRaw);
      } catch {
        sendJson(res, 400, { error: "invalid services JSON" });
        return;
      }
    }
    sendJson(res, 200, buildMigrationPlan({ origin, outputs, detectedDatabases, originServices }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/language-compare") {
    const origin = url.searchParams.get("origin");
    const outputsRaw = url.searchParams.get("outputs") ?? url.searchParams.get("output");
    if (!origin || !outputsRaw) {
      sendJson(res, 400, { error: "origin and outputs query params required" });
      return;
    }
    const outputs = outputsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    sendJson(res, 200, compareHubLanguages(origin, outputs));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/completion-sections") {
    sendJson(res, 200, {
      kind: "chrysalis.hub.completion-sections",
      schemaVersion: 1,
      ...buildHubCompletionSections(),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/gold-suites") {
    const origin = url.searchParams.get("origin") ?? undefined;
    const output = url.searchParams.get("output") ?? undefined;
    if (origin && output) {
      sendJson(res, 200, {
        kind: "chrysalis.hub.gold-suites",
        schemaVersion: 3,
        pair: describeHubGoldPairCoverage(origin, output),
        route: resolveHubRoute(origin, output),
      });
      return;
    }
    sendJson(res, 200, {
      kind: "chrysalis.hub.gold-suites",
      schemaVersion: 1,
      structuralSuiteCount: hubGoldStructuralSuiteIds().length,
      traceReplaySuiteCount: hubGoldTraceReplaySuiteIds().length,
      suites: HUB_GOLD_SUITES.map((s) => ({
        id: s.id,
        origin: s.origin,
        emitTarget: s.emitTarget,
        structural: s.structural,
        traceReplay: s.traceReplay,
        roundTrip: s.roundTrip === true,
      })),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/hub/language-readiness") {
    const report = buildLanguageReadinessReport();
    const scope = String(url.searchParams.get("scope") ?? "").toLowerCase();
    const grade = String(url.searchParams.get("grade") ?? "").toLowerCase();
    const limit = Number(url.searchParams.get("limit") ?? "0");
    let pairs = report.pairs;
    if (scope === "popular-web") {
      const popular = new Set(HUB_POPULAR_WEB_FOCUS_IDS);
      pairs = pairs.filter((row) => popular.has(row.origin) && popular.has(row.output));
    }
    if (grade === "gold" || grade === "silver" || grade === "open") {
      pairs = pairs.filter((row) => row.grade === grade);
    }
    if (Number.isFinite(limit) && limit > 0) {
      pairs = pairs.slice(0, Math.trunc(limit));
    }
    sendJson(res, 200, { ...report, pairs });
    return;
  }

  const hubEvidenceMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/evidence$/);
  if (req.method === "GET" && hubEvidenceMatch) {
    const actor = hubActorFromRequest(req, authToken);
    const p = await getProjectForActor(decodeURIComponent(hubEvidenceMatch[1]), actor);
    if (!p) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    const site = p.sites?.[0];
    if (!site?.localDir) {
      sendJson(res, 422, { error: "no-site-dir", message: "Add a site with pulled code first." });
      return;
    }
    sendJson(res, 200, buildHubEvidenceReport(site.localDir));
    return;
  }

  const hubAssessmentMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/migration-assessment$/);
  if (req.method === "GET" && hubAssessmentMatch) {
    const actor = hubActorFromRequest(req, authToken);
    const p = await getProjectForActor(decodeURIComponent(hubAssessmentMatch[1]), actor);
    if (!p) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    const site = p.sites?.[0];
    if (!site?.localDir) {
      sendJson(res, 422, { error: "no-site-dir", message: "Add a site with pulled code first." });
      return;
    }
    try {
      const report = await buildMigrationAssessment({
        projectDir: site.localDir,
        origin: site.originLanguage ?? p.originLanguage ?? undefined,
        output: p.outputLanguage ?? undefined,
      });
      sendJson(res, 200, report);
    } catch (e) {
      sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  const hubApplyPathMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/apply-path-advice$/);
  if (req.method === "POST" && hubApplyPathMatch) {
    const actor = hubActorFromRequest(req, authToken);
    const p = await getProjectForActor(decodeURIComponent(hubApplyPathMatch[1]), actor);
    if (!p) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    const site = p.sites?.[0];
    if (!site?.localDir) {
      sendJson(res, 422, { error: "no-site-dir", message: "Add a site with pulled code first." });
      return;
    }
    let body = {};
    try {
      const raw = await readRawBody(req);
      body = raw.length > 0 ? JSON.parse(raw.toString("utf8")) : {};
    } catch {
      sendJson(res, 400, { error: "invalid-json" });
      return;
    }
    const origin = body.origin ?? site.originLanguage ?? p.originLanguage ?? defaultOriginLanguage();
    const output = body.output ?? p.outputLanguage ?? defaultOutputLanguage();
    if (!origin || !output) {
      sendJson(res, 400, { error: "origin and output required" });
      return;
    }
    try {
      const result = await writePathAdviceArtifacts(site.localDir, {
        origin,
        output,
        programId: body.programId,
      });
      sendJson(res, 200, { ...result.report, writtenPath: result.jsonPath, projectId: p.id, siteId: site.id });
    } catch (e) {
      sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    return;
  }

  const hubPlanMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/route-plan$/);
  if (req.method === "GET" && hubPlanMatch) {
    const actor = hubActorFromRequest(req, authToken);
    const p = await getProjectForActor(decodeURIComponent(hubPlanMatch[1]), actor);
    if (!p) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    const plan = planHubTranslation(p);
    const sitePlans = (p.sites ?? []).map((site) => ({
      siteId: site.id,
      siteName: site.name,
      origin: site.originLanguage ?? p.originLanguage,
      output: p.outputLanguage,
      plan: planSiteTranslation(p, site),
    }));
    sendJson(res, 200, { projectId: p.id, plan, sitePlans });
    return;
  }

  const hubProjectMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)$/);
  if (hubProjectMatch) {
    const projectId = decodeURIComponent(hubProjectMatch[1]);
    const actor = hubActorFromRequest(req, authToken);

    if (req.method === "GET") {
      const p = await getProjectForActor(projectId, actor);
      if (!p) {
        sendJson(res, 404, { error: "not-found" });
        return;
      }
      const sites = {};
      for (const site of p.sites ?? []) {
        sites[site.id] = {
          defaultTracesDir: defaultTracesDir(site.localDir),
          verifySummary: await readVerifySummary(site.localDir),
        };
      }
      sendJson(res, 200, { ...p, siteMeta: sites });
      return;
    }

    if (req.method === "PATCH" || req.method === "DELETE") {
      if (!checkAuth(req)) {
        sendJson(res, 401, { error: "unauthorized" });
        return;
      }
      const p = await getProjectForActor(projectId, actor);
      if (!p) {
        sendJson(res, 404, { error: "not-found" });
        return;
      }
      try {
        if (req.method === "DELETE") {
          await deleteHubProject(projectId);
          sendJson(res, 200, { ok: true, deleted: projectId });
          return;
        }
        const body = await readBody(req);
        const patch = {};
        if (body.name != null) patch.name = String(body.name);
        if (body.description != null) patch.description = String(body.description);
        if (body.orgId !== undefined) patch.orgId = body.orgId || null;
        if (body.outputLanguage != null) patch.outputLanguage = body.outputLanguage;
        if (body.originLanguage != null) patch.originLanguage = body.originLanguage;
        const updated = await updateProject(projectId, patch);
        sendJson(res, 200, { project: updated });
      } catch (e) {
        sendJson(res, 400, { error: e instanceof Error ? e.message : String(e) });
      }
      return;
    }
  }

  const observeAssistMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/observe-assist$/);
  const runtimeHealthMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/runtime\/health$/);
  if (req.method === "GET" && runtimeHealthMatch) {
    const actor = hubActorFromRequest(req, authToken);
    const p = await getProjectForActor(decodeURIComponent(runtimeHealthMatch[1]), actor);
    const site = p?.sites?.find((s) => s.id === decodeURIComponent(runtimeHealthMatch[2]));
    if (!p || !site) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    const baseUrl = site.runtime?.baseUrl ?? getRunningRuntime(p.id, site.id)?.baseUrl;
    if (!baseUrl) {
      sendJson(res, 200, { ok: false, error: "runtime-not-started" });
      return;
    }
    sendJson(res, 200, await probeRuntimeHealth(baseUrl));
    return;
  }

  if (req.method === "GET" && observeAssistMatch) {
    const actor = hubActorFromRequest(req, authToken);
    const p = await getProjectForActor(decodeURIComponent(observeAssistMatch[1]), actor);
    const site = p?.sites?.find((s) => s.id === decodeURIComponent(observeAssistMatch[2]));
    if (!p || !site) {
      sendJson(res, 404, { error: "not-found" });
      return;
    }
    sendJson(res, 200, buildObserveAssist(site, p, repo));
    return;
  }

  if (req.method === "POST") {
    if (!checkAuth(req)) {
      sendJson(res, 401, { error: "unauthorized" });
      return;
    }
    try {
      const actor = hubActorFromRequest(req, authToken);

      const tracesUploadMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/traces\/upload$/);
      const traceChunkMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/traces\/upload\/([^/]+)\/chunk$/);
      if (traceChunkMatch) {
        const uploadId = decodeURIComponent(traceChunkMatch[3]);
        const raw = await readRawBody(req);
        const chunkIndex = Number(req.headers["x-chunk-index"] ?? "0");
        const meta = await appendUploadChunk(uploadId, chunkIndex, raw);
        sendJson(res, 200, meta);
        return;
      }

      if (tracesUploadMatch) {
        const projectId = decodeURIComponent(tracesUploadMatch[1]);
        const siteId = decodeURIComponent(tracesUploadMatch[2]);
        const p = await getProjectForActor(projectId, actor);
        const site = p?.sites?.find((s) => s.id === siteId);
        if (!p || !site) {
          sendJson(res, 404, { error: "not-found" });
          return;
        }
        const ct = String(req.headers["content-type"] ?? "");
        const raw = await readRawBody(req);
        let result;
        if (ct.includes("multipart/form-data")) {
          const files = parseMultipartFiles(raw, ct).filter((f) => f.field === "traces" || f.field === "file");
          result = await saveTraceFiles(site.localDir, files);
        } else if (ct.includes("application/zip") || ct.includes("application/octet-stream")) {
          result = await saveZipTraces(site.localDir, raw);
        } else {
          sendJson(res, 415, { error: "unsupported-media", message: "Use multipart/form-data (field traces) or application/zip" });
          return;
        }
        sendJson(res, 200, result);
        return;
      }

      const body = await readBody(req);

      if (url.pathname === "/api/hub/orgs") {
        const org = await createOrg({ name: body.name || "Organization", actorId: actor.id ?? "admin" });
        sendJson(res, 201, { org });
        return;
      }

      const joinOrgMatch = url.pathname.match(/^\/api\/hub\/orgs\/([^/]+)\/join$/);
      if (joinOrgMatch) {
        const org = await joinOrg(decodeURIComponent(joinOrgMatch[1]), actor.id ?? "anonymous");
        sendJson(res, 200, { org });
        return;
      }

      const traceStartMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/traces\/upload\/start$/);
      if (traceStartMatch) {
        const projectId = decodeURIComponent(traceStartMatch[1]);
        const siteId = decodeURIComponent(traceStartMatch[2]);
        const p = await getProjectForActor(projectId, actor);
        const site = p?.sites?.find((s) => s.id === siteId);
        if (!p || !site) {
          sendJson(res, 404, { error: "not-found" });
          return;
        }
        const meta = await startResumableUpload({
          projectId,
          siteId,
          filename: body.filename || "traces.ndjson",
          totalBytes: body.totalBytes,
        });
        sendJson(res, 201, { ...meta, chunkSize: CHUNK_SIZE });
        return;
      }

      const traceFinishMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/traces\/upload\/([^/]+)\/finish$/);
      if (traceFinishMatch) {
        const projectId = decodeURIComponent(traceFinishMatch[1]);
        const siteId = decodeURIComponent(traceFinishMatch[2]);
        const uploadId = decodeURIComponent(traceFinishMatch[3]);
        const p = await getProjectForActor(projectId, actor);
        const site = p?.sites?.find((s) => s.id === siteId);
        if (!p || !site) {
          sendJson(res, 404, { error: "not-found" });
          return;
        }
        const result = await finishResumableUpload(uploadId, site.localDir);
        sendJson(res, 200, result);
        return;
      }

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
          owner: ownerForNewProject(actor),
          orgId: body.orgId ?? null,
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
        if (!(await getProjectForActor(projectId, actor))) {
          sendJson(res, 404, { error: "not-found" });
          return;
        }
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

      const siteItemMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)$/);
      if (req.method === "PATCH" && siteItemMatch) {
        const projectId = decodeURIComponent(siteItemMatch[1]);
        const siteId = decodeURIComponent(siteItemMatch[2]);
        const site = await updateProjectSite(projectId, siteId, {
          name: body.name,
          originLanguage: body.originLanguage,
          ssh: body.ssh,
        });
        sendJson(res, 200, { site, project: await getProject(projectId) });
        return;
      }

      if (req.method === "DELETE" && siteItemMatch) {
        const project = await removeProjectSite(decodeURIComponent(siteItemMatch[1]), decodeURIComponent(siteItemMatch[2]));
        sendJson(res, 200, { project });
        return;
      }

      const verifySiteMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/verify$/);
      if (req.method === "POST" && verifySiteMatch) {
        const projectId = decodeURIComponent(verifySiteMatch[1]);
        const siteId = decodeURIComponent(verifySiteMatch[2]);
        if (body.async !== false) {
          const v = await startProjectVerifyJob(projectId, {
            siteIds: [siteId],
            tracesDir: body.tracesDir,
            baseUrl: body.baseUrl,
            threshold: body.threshold,
          });
          sendJson(res, 202, { accepted: true, verify: v });
          return;
        }
        const p = await getProject(projectId);
        const site = p?.sites?.find((s) => s.id === siteId);
        if (!site) {
          sendJson(res, 404, { error: "not-found" });
          return;
        }
        const r = await runSiteVerify({
          repo,
          cliBin,
          projectId,
          siteId,
          tracesDir: body.tracesDir,
          baseUrl: body.baseUrl,
          threshold: body.threshold,
        });
        sendJson(res, 200, r);
        return;
      }

      const verifyAllMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/verify-all-sites$/);
      if (req.method === "POST" && verifyAllMatch) {
        const projectId = decodeURIComponent(verifyAllMatch[1]);
        const v = await startProjectVerifyJob(projectId, {
          siteIds: body.siteIds ?? null,
          tracesDir: body.tracesDir,
          baseUrl: body.baseUrl,
          threshold: body.threshold,
        });
        sendJson(res, 202, { accepted: true, verify: v });
        return;
      }

      const wptpComposeMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/wptp-compose$/);
      if (req.method === "POST" && wptpComposeMatch) {
        const projectId = decodeURIComponent(wptpComposeMatch[1]);
        const siteId = decodeURIComponent(wptpComposeMatch[2]);
        const hp = await getProjectForActor(projectId, actor);
        const site = hp?.sites?.find((s) => s.id === siteId);
        if (!hp || !site) {
          sendJson(res, 404, { error: "not-found" });
          return;
        }
        try {
          const r = await runSiteWptpCompose(repo, site, hp.outputLanguage ?? "nextjs");
          sendJson(res, 200, r);
        } catch (e) {
          sendJson(res, 422, { error: "wptp-compose-failed", message: e instanceof Error ? e.message : String(e) });
        }
        return;
      }

      const runtimeStartMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/runtime\/start$/);
      if (req.method === "POST" && runtimeStartMatch) {
        const projectId = decodeURIComponent(runtimeStartMatch[1]);
        const siteId = decodeURIComponent(runtimeStartMatch[2]);
        const hp = await getProjectForActor(projectId, actor);
        const site = hp?.sites?.find((s) => s.id === siteId);
        if (!hp || !site) {
          sendJson(res, 404, { error: "not-found" });
          return;
        }
        if (hubBusy()) {
          sendJson(res, 409, { error: "job-busy" });
          return;
        }
        const runtime = await startSiteRuntime(projectId, siteId, {
          onLog(siteId, stream, line) {
            broadcast("log", { stream, siteId, line });
          },
          onRuntime(siteId, rt) {
            broadcast("siteRuntime", { projectId, siteId, runtime: rt });
          },
        });
        startRuntimeHealthWatch();
        sendJson(res, 200, { runtime, emitTarget: await detectEmittedTarget(site.localDir) });
        return;
      }

      const runtimeStopMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/sites\/([^/]+)\/runtime\/stop$/);
      if (req.method === "POST" && runtimeStopMatch) {
        const projectId = decodeURIComponent(runtimeStopMatch[1]);
        const siteId = decodeURIComponent(runtimeStopMatch[2]);
        const hp = await getProjectForActor(projectId, actor);
        if (!hp) {
          sendJson(res, 404, { error: "not-found" });
          return;
        }
        await stopSiteRuntime(projectId, siteId);
        sendJson(res, 200, { stopped: true });
        return;
      }

      const wptpSmokeMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/wptp-smoke$/);
      if (req.method === "POST" && wptpSmokeMatch) {
        const hp = await getProjectForActor(decodeURIComponent(wptpSmokeMatch[1]), actor);
        if (!hp) {
          sendJson(res, 404, { error: "hub-project-not-found" });
          return;
        }
        const r = await runWptpHubSmoke(repo, hp.outputLanguage ?? "nextjs");
        sendJson(res, 200, r);
        return;
      }

      const runBatchMatch = url.pathname.match(/^\/api\/hub\/projects\/([^/]+)\/run-batch$/);
      if (req.method === "POST" && runBatchMatch) {
        const hp = await getProjectForActor(decodeURIComponent(runBatchMatch[1]), actor);
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
        const hp = await getProjectForActor(decodeURIComponent(runPipelineMatch[1]), actor);
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
