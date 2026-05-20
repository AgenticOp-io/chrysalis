#!/usr/bin/env node
/**
 * Read-only operator status HTTP server for shared GCE dev VMs.
 * Does not touch nginx, port 80, or other projects (e.g. fragility on :8765).
 *
 * Env:
 *   CHRYSALIS_STATUS_PORT (default 19090)
 *   CHRYSALIS_STATUS_BIND (default 0.0.0.0)
 *   CHRYSALIS_STATUS_PROGRESS_FILE — path to chrysalis.ingest.progress JSON
 *   CHRYSALIS_STATUS_REPO — chrysalis checkout (default ~/chrysalis-test)
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.CHRYSALIS_STATUS_PORT ?? "19090");
const bind = process.env.CHRYSALIS_STATUS_BIND ?? "0.0.0.0";
const repo = process.env.CHRYSALIS_STATUS_REPO ?? join(homedir(), "chrysalis-test");
const progressFile =
  process.env.CHRYSALIS_STATUS_PROGRESS_FILE ??
  join(repo, ".chrysalis", "ingest.progress");

async function readProgress() {
  try {
    const raw = await readFile(progressFile, "utf8");
    const parsed = JSON.parse(raw);
    const completed = Array.isArray(parsed.completedRouteKeys)
      ? parsed.completedRouteKeys.length
      : 0;
    return { ok: true, path: progressFile, raw: parsed, completedRouteCount: completed };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    const idle = err.includes("ENOENT");
    return {
      ok: false,
      path: progressFile,
      error: err,
      state: idle ? "idle" : "error",
    };
  }
}

function htmlPage(payload) {
  const p = payload.chrysalis.progress;
  const progressBlock =
    p.ok && p.raw
      ? `<p><strong>${p.completedRouteCount ?? 0}</strong> route(s) completed · <code>${escapeHtml(String(p.raw.sourceApp ?? ""))}</code></p>
         <pre>${escapeHtml(JSON.stringify(p.raw, null, 2))}</pre>`
      : `<p class="muted">State: <strong>${escapeHtml(String(p.state ?? "idle"))}</strong> — no progress file at <code>${escapeHtml(p.path)}</code>.</p>
         <p>On the VM, run ingest with a progress path, for example:</p>
         <pre>cd ~/chrysalis-test
node packages/cli/dist/bin.js ingest &lt;php-project-dir&gt; \\
  --ingest-progress-file .chrysalis/ingest.progress</pre>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="5" />
  <title>Chrysalis VM status</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; max-width: 52rem; }
    h1 { font-size: 1.25rem; }
    .muted { color: #555; }
    pre { background: #f4f4f4; padding: 1rem; overflow: auto; font-size: 0.85rem; }
    code { background: #eee; padding: 0.1em 0.35em; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Chrysalis operator status</h1>
  <p class="muted">Port ${port} · repo <code>${escapeHtml(payload.chrysalis.repo)}</code> · auto-refresh 5s</p>
  <p><strong>Shared VM:</strong> other projects (e.g. fragility on <code>127.0.0.1:8765</code>, nginx :80) are not modified by this service.</p>
  <h2>Ingest progress</h2>
  ${progressBlock}
  <h2>JSON API</h2>
  <ul>
    <li><a href="/api/status">/api/status</a></li>
    <li><a href="/api/chrysalis/progress">/api/chrysalis/progress</a></li>
  </ul>
</body>
</html>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendJson(res, code, body) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const payload = {
    service: "chrysalis-vm-status",
    port,
    chrysalis: {
      repo,
      progress: await readProgress(),
    },
    sharedVm: {
      note: "Chrysalis uses ~/chrysalis-test only; do not configure this server on ports 80, 8765, or other project paths.",
      fragilityLocalStatusPort: 8765,
    },
  };

  if (url.pathname === "/api/status") {
    sendJson(res, 200, payload);
    return;
  }
  if (url.pathname === "/api/chrysalis/progress") {
    const p = payload.chrysalis.progress;
    if (p.ok && p.raw) {
      sendJson(res, 200, p.raw);
      return;
    }
    sendJson(res, 200, {
      state: p.state ?? "idle",
      path: p.path,
      hint: "Run chrysalis ingest <php-project-dir> --ingest-progress-file .chrysalis/ingest.progress",
      detail: p.error,
    });
    return;
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(htmlPage(payload));
    return;
  }
  sendJson(res, 404, { error: "not-found" });
});

server.listen(port, bind, () => {
  console.log(`[chrysalis-status] listening http://${bind}:${port}/ (progress: ${progressFile})`);
});
