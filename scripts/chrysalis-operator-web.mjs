#!/usr/bin/env node
/**
 * Chrysalis operator web UI — live ingest progress (SSE) + CLI (ingest, status).
 * Port 19090 by default; does not bind :80 or :8765 (shared VM safe).
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

const port = Number(process.env.CHRYSALIS_OPERATOR_PORT ?? process.env.CHRYSALIS_STATUS_PORT ?? "19090");
const bind = process.env.CHRYSALIS_OPERATOR_BIND ?? process.env.CHRYSALIS_STATUS_BIND ?? "0.0.0.0";
const repo = process.env.CHRYSALIS_OPERATOR_REPO ?? process.env.CHRYSALIS_STATUS_REPO ?? join(homedir(), "chrysalis-test");
const cliBin = process.env.CHRYSALIS_OPERATOR_CLI ?? join(repo, "packages/cli/dist/bin.js");
const progressFile =
  process.env.CHRYSALIS_OPERATOR_PROGRESS_FILE ??
  join(repo, ".chrysalis", "ingest.progress");
const authToken = process.env.CHRYSALIS_OPERATOR_TOKEN ?? "";
const defaultProject = process.env.CHRYSALIS_OPERATOR_DEFAULT_PROJECT ?? "fixtures/tiny-blog";

const sseClients = new Set();
let currentJob = null;
let progressWatcher = null;

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
    const raw = await readFile(progressFile, "utf8");
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
      path: progressFile,
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
      path: progressFile,
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
  const dir = dirname(progressFile);
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

function runStatusJson(projectDir) {
  return new Promise((resolvePromise, reject) => {
    const out = [];
    const err = [];
    const child = spawn(process.execPath, [cliBin, "status", "--project", projectDir, "--json"], {
      cwd: repo,
      env: { ...process.env, CHRYSALIS_SKIP_PARSER_VENDOR: process.env.CHRYSALIS_SKIP_PARSER_VENDOR ?? "1" },
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

const UI_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Chrysalis operator</title>
<style>
:root{--bg:#0f1419;--panel:#1a2332;--text:#e7ecf3;--muted:#8b9cb3;--accent:#3d8bfd;--ok:#3dd68c;--err:#f31260}
body{font-family:system-ui,sans-serif;background:var(--bg);color:var(--text);margin:0;padding:1rem 1.25rem 2rem}
h1{font-size:1.35rem;margin:0 0 .25rem}.sub{color:var(--muted);font-size:.9rem;margin-bottom:1.25rem}
.grid{display:grid;gap:1rem;max-width:56rem}
@media(min-width:900px){.grid{grid-template-columns:1fr 1fr}.span2{grid-column:1/-1}}
.card{background:var(--panel);border-radius:10px;padding:1rem;border:1px solid #2a3548}
label{display:block;font-size:.8rem;color:var(--muted);margin-bottom:.35rem}
input{width:100%;padding:.55rem;border-radius:6px;border:1px solid #3a4a63;background:#0d1218;color:var(--text)}
.row{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem;align-items:center}
button{cursor:pointer;border:none;border-radius:6px;padding:.5rem .9rem;font-weight:500}
button.primary{background:var(--accent);color:#fff}button.secondary{background:#2a3548;color:var(--text)}
button:disabled{opacity:.45;cursor:not-allowed}
.bar-wrap{height:10px;background:#0d1218;border-radius:5px;overflow:hidden;margin:.75rem 0}
.bar{height:100%;background:linear-gradient(90deg,var(--accent),#6eb6ff);width:0%;transition:width .35s ease}
.pct{font-size:1.5rem;font-weight:600}#routeList{font-size:.85rem;color:var(--muted);max-height:8rem;overflow-y:auto;padding-left:1.2rem}
#routeList li.done{color:var(--ok)}#log{font-family:ui-monospace,monospace;font-size:.78rem;background:#0d1218;border-radius:6px;padding:.65rem;height:14rem;overflow-y:auto;white-space:pre-wrap;margin:0}
.badge{padding:.15rem .45rem;border-radius:4px;font-size:.75rem;background:#2a3548}
.badge.run{background:#1e3a5f;color:#9ec5ff}.badge.ok{background:#1a3d2e;color:var(--ok)}.badge.fail{background:#3d1a24;color:var(--err)}
pre.json{font-size:.75rem;max-height:12rem;overflow:auto;margin:0}
</style>
</head>
<body>
<h1>Chrysalis operator</h1>
<p class="sub">Live ingest progress and CLI control</p>
<div class="grid">
<div class="card span2">
<label for="project">PHP project directory</label>
<input id="project" type="text" placeholder="fixtures/tiny-blog"/>
<div class="row">
<button class="primary" id="btnIngest">Run ingest</button>
<button class="secondary" id="btnStatus">Run status</button>
<button class="secondary" id="btnRefresh">Refresh</button>
<span id="jobBadge" class="badge">idle</span>
</div>
</div>
<div class="card span2">
<label>Ingest progress</label>
<div class="pct"><span id="pct">0</span>%</div>
<div class="bar-wrap"><div class="bar" id="bar"></div></div>
<p id="routeSummary" style="color:var(--muted);font-size:.85rem">0 / 0 routes</p>
<ul id="routeList"></ul>
</div>
<div class="card"><label>Job log</label><pre id="log"></pre></div>
<div class="card"><label>Status JSON</label><pre class="json" id="statusJson">—</pre>
</div>
<script>
const $=id=>document.getElementById(id);
const pi=$("project");
const v=localStorage.getItem("chrysalis.projectDir");
if(v)pi.value=v;
fetch("/api/config").then(r=>r.json()).then(c=>{if(!pi.value&&c.defaultProject)pi.value=c.defaultProject}).catch(()=>{});
function setJob(j){
const b=$("jobBadge");
if(!j||j.state==="idle"){b.textContent="idle";b.className="badge";$("btnIngest").disabled=false;$("btnStatus").disabled=false;return;}
b.textContent=j.kind+" · "+j.state;
b.className="badge "+(j.state==="running"?"run":j.state==="succeeded"?"ok":"fail");
$("btnIngest").disabled=j.state==="running";$("btnStatus").disabled=j.state==="running";
}
function applyProgress(p){
$("pct").textContent=String(p.percent??0);
$("bar").style.width=(p.percent??0)+"%";
$("routeSummary").textContent=(p.completedCount??0)+" / "+(p.totalRoutes??0)+" routes · "+(p.raw?.sourceApp??p.state??"—");
const ul=$("routeList");ul.innerHTML="";
for(const k of [...(p.completedRouteKeys??[])].sort()){const li=document.createElement("li");li.className="done";li.textContent=k;ul.appendChild(li);}
}
function logLine(t){const el=$("log");el.textContent+=t+"\\n";el.scrollTop=el.scrollHeight;}
const es=new EventSource("/api/events");
es.addEventListener("job",e=>setJob(JSON.parse(e.data)));
es.addEventListener("progress",e=>applyProgress(JSON.parse(e.data)));
es.addEventListener("log",e=>{const d=JSON.parse(e.data);logLine("["+d.stream+"] "+d.line);});
es.addEventListener("statusResult",e=>{$("statusJson").textContent=JSON.stringify(JSON.parse(e.data),null,2);});
async function post(path,body){
const r=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
const j=await r.json();if(!r.ok)throw new Error(j.error||r.statusText);return j;
}
$("btnIngest").onclick=async()=>{localStorage.setItem("chrysalis.projectDir",pi.value);$("log").textContent="";try{await post("/api/jobs/ingest",{projectDir:pi.value});}catch(e){logLine("ERROR: "+e.message);}};
$("btnStatus").onclick=async()=>{localStorage.setItem("chrysalis.projectDir",pi.value);$("log").textContent="";try{await post("/api/jobs/status",{projectDir:pi.value});}catch(e){logLine("ERROR: "+e.message);}};
$("btnRefresh").onclick=()=>fetch("/api/progress").then(r=>r.json()).then(applyProgress);
fetch("/api/state").then(r=>r.json()).then(s=>{if(s.job)setJob(s.job);if(s.progress)applyProgress(s.progress);});
</script>
</body>
</html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(UI_PAGE);
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
    sendJson(res, 200, { repo, cliBin, progressFile, defaultProject, port });
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

  if (req.method === "POST") {
    if (!checkAuth(req)) {
      sendJson(res, 401, { error: "unauthorized" });
      return;
    }
    try {
      const body = await readBody(req);
      if (url.pathname === "/api/jobs/ingest") {
        const projectDir = resolveProjectDir(body.projectDir ?? defaultProject);
        await statProject(projectDir);
        runCliJob("ingest", projectDir, [
          "ingest",
          projectDir,
          "--ingest-progress-file",
          progressFile,
        ]);
        sendJson(res, 202, { accepted: true, job: currentJob });
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
          broadcast("log", { jobId: id, stream: "stderr", line: msg });
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

server.listen(port, bind, () => {
  console.log(`[chrysalis-operator-web] http://${bind}:${port}/ repo=${repo}`);
});
