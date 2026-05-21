/* Chrysalis Translation Hub — browser UI (served by chrysalis-operator-web.mjs) */
(function () {
  const $ = (id) => document.getElementById(id);
  const views = { home: $("viewHome"), newProject: $("viewNew"), console: $("viewConsole") };

  function show(view) {
    for (const [k, el] of Object.entries(views)) {
      if (el) el.hidden = k !== view;
    }
  }

  function route() {
    const h = (location.hash || "#/").replace(/^#\/?/, "");
    const [page, query] = h.split("?");
    if (page === "new" || page === "newProject") show("newProject");
    else if (page === "console") {
      show("console");
      const id = new URLSearchParams(query || "").get("id");
      if (id) loadConsoleProject(id);
    } else show("home");
  }

  async function api(path, opts) {
    const r = await fetch(path, opts);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.message || r.statusText);
    return j;
  }

  async function loadHome() {
    const data = await api("/api/hub/projects");
    const ul = $("projectList");
    ul.innerHTML = "";
    for (const p of data.projects) {
      const origin = p.originLanguage || "?";
      const output = p.outputLanguage || "?";
      const li = document.createElement("li");
      li.innerHTML = `<strong>${esc(p.name)}</strong> <span class="muted">${esc(p.id)}</span>
        <div class="muted">${esc(origin)} → ${esc(output)}</div>
        <a href="#/console?id=${encodeURIComponent(p.id)}">Open console</a>`;
      ul.appendChild(li);
    }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  let inputLanguages = [];
  let outputLanguages = [];
  let defaultOrigin = "php";
  let defaultOutput = "typescript";
  let lastScan = null;

  function fillSelect(sel, items, selectedId) {
    sel.innerHTML = "";
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.label + (item.fileCount != null && item.fileCount > 0 ? ` (${item.fileCount} files)` : "");
      sel.appendChild(opt);
    }
    if (selectedId) sel.value = selectedId;
  }

  async function refreshRouteStatus() {
    const origin = $("originLanguage")?.value;
    const output = $("outputLanguage")?.value;
    const el = $("routeStatus");
    if (!el || !origin || !output) return;
    try {
      const r = await api(
        `/api/hub/route-preview?origin=${encodeURIComponent(origin)}&output=${encodeURIComponent(output)}`,
      );
      const grade =
        r.route?.grade === "gold"
          ? "Gold"
          : r.route?.grade === "silver"
            ? "Silver"
            : r.route?.grade === "open"
              ? "Open"
              : "Open";
      el.textContent = r.route?.ok
        ? `${grade}: ${r.route.label || origin + " → " + output} — runnable on hub.`
        : `Not runnable: ${r.route?.message || "unknown route"}`;
    } catch {
      el.textContent = `${origin} → ${output}`;
    }
  }

  async function loadHubLanguages() {
    const data = await api("/api/hub/target-matrix");
    inputLanguages = data.inputLanguages || [];
    outputLanguages = data.outputLanguages || [];
    defaultOrigin = data.defaultOrigin || "php";
    defaultOutput = data.defaultOutput || "typescript";
    const counts = Object.fromEntries((data.inputLanguagesWithCounts || []).map((r) => [r.language, r.fileCount]));
    const inputOpts = inputLanguages.map((l) => ({ ...l, fileCount: counts[l.id] ?? 0 }));
    fillSelect($("originLanguage"), inputOpts, defaultOrigin);
    fillSelect($("outputLanguage"), outputLanguages, defaultOutput);
    $("originLanguage")?.addEventListener("change", refreshRouteStatus);
    $("outputLanguage")?.addEventListener("change", refreshRouteStatus);
    await refreshRouteStatus();
  }

  function syncDetectUi() {
    const on = $("enableDetect")?.checked;
    if ($("btnScanSsh")) $("btnScanSsh").disabled = !on;
  }

  $("enableDetect")?.addEventListener("change", syncDetectUi);

  $("btnProbeConnectivity")?.addEventListener("click", async () => {
    $("probeStatus").textContent = "Probing…";
    try {
      const body = {
        ssh: {
          host: $("sshHost").value.trim(),
          user: $("sshUser").value.trim(),
          port: Number($("sshPort").value) || 22,
          remotePath: $("sshPath").value.trim() || "/",
          identityFile: $("sshKey").value.trim() || undefined,
        },
      };
      const r = await api("/api/hub/probe-connectivity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body.ssh.host && body.ssh.user ? { ssh: body.ssh } : {}),
      });
      const lines = [];
      for (const c of r.hub?.checks ?? []) {
        lines.push((c.ok ? "OK" : "FAIL") + " hub:" + c.id + " — " + c.detail);
      }
      for (const c of r.origin?.checks ?? []) {
        lines.push((c.ok ? "OK" : "FAIL") + " origin:" + c.id + " — " + c.detail);
      }
      $("probeStatus").textContent = lines.join(" | ") || (r.ok ? "All checks passed." : "Some checks failed.");
    } catch (e) {
      $("probeStatus").textContent = "Probe error: " + e.message;
    }
  });

  $("btnScanSsh").addEventListener("click", async () => {
    if (!$("enableDetect")?.checked) {
      $("scanStatus").textContent = "Enable autodetect to scan the origin.";
      return;
    }
    $("scanStatus").textContent = "Scanning over SSH…";
    try {
      const body = {
        ssh: {
          host: $("sshHost").value.trim(),
          user: $("sshUser").value.trim(),
          port: Number($("sshPort").value) || 22,
          remotePath: $("sshPath").value.trim(),
          identityFile: $("sshKey").value.trim() || undefined,
        },
      };
      const r = await api("/api/hub/scan-ssh", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      lastScan = r.detection;
      const counts = Object.fromEntries(r.detection.languages.map((l) => [l.language, l.fileCount]));
      const inputOpts = inputLanguages.map((l) => ({ ...l, fileCount: counts[l.id] ?? 0 }));
      fillSelect($("originLanguage"), inputOpts, null);
      const top = [...r.detection.languages].sort((a, b) => b.fileCount - a.fileCount)[0];
      if (top) $("originLanguage").value = top.language;
      $("scanStatus").textContent = `Scanned ${r.detection.pathCount} files. Suggested origin: ${top?.language ?? "php"}.`;
      await refreshRouteStatus();
    } catch (e) {
      $("scanStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnCreateProject").addEventListener("click", async () => {
    $("createStatus").textContent = "Creating…";
    try {
      const body = {
        name: $("projName").value.trim(),
        description: $("projDesc").value.trim(),
        pullFromSsh: $("pullFromSsh").checked,
        detectLanguages: $("enableDetect").checked,
        originLanguage: $("originLanguage").value,
        outputLanguage: $("outputLanguage").value,
        ssh: {
          host: $("sshHost").value.trim(),
          user: $("sshUser").value.trim(),
          port: Number($("sshPort").value) || 22,
          remotePath: $("sshPath").value.trim(),
          identityFile: $("sshKey").value.trim() || undefined,
        },
      };
      const r = await api("/api/hub/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      $("createStatus").textContent = "Created " + r.project.id;
      setTimeout(() => {
        location.hash = `#/console?id=${encodeURIComponent(r.project.id)}`;
        route();
      }, 500);
    } catch (e) {
      $("createStatus").textContent = "Error: " + e.message;
    }
  });

  let consoleProjectId = null;

  async function loadConsoleProject(id) {
    consoleProjectId = id;
    const p = await api(`/api/hub/projects/${encodeURIComponent(id)}`);
    $("consoleTitle").textContent = p.name;
    $("project").value = p.localDir || "";
    const det = $("consoleDetection");
    const origin = p.originLanguage || "?";
    const output = p.outputLanguage || "?";
    det.innerHTML = `<li><strong>${esc(origin)} → ${esc(output)}</strong></li>`;
    if (p.detection) {
      for (const l of p.detection.languages) {
        const li = document.createElement("li");
        li.textContent = `${l.language}: ${l.fileCount} files detected`;
        det.appendChild(li);
      }
    }
    const planEl = $("consoleRoutePlan");
    if (planEl) {
      try {
        const { plan } = await api(`/api/hub/projects/${encodeURIComponent(id)}/route-plan`);
        const run = plan.runnable.map((r) => r.sourceLang + "→" + r.targetId + " (" + r.action + ")").join(", ");
        planEl.textContent = run ? "Runnable: " + run : plan.errors[0]?.message || "No runnable route.";
      } catch {
        planEl.textContent = "";
      }
    }
  }

  function setJob(j) {
    const b = $("jobBadge");
    if (!j || j.state === "idle") {
      b.textContent = "idle";
      b.className = "badge";
      $("btnIngest").disabled = false;
      $("btnStatus").disabled = false;
      return;
    }
    b.textContent = j.kind + " · " + j.state;
    b.className = "badge " + (j.state === "running" ? "run" : j.state === "succeeded" ? "ok" : "fail");
    $("btnIngest").disabled = j.state === "running";
    $("btnStatus").disabled = j.state === "running";
  }

  function applyProgress(p) {
    $("pct").textContent = String(p.percent ?? 0);
    $("bar").style.width = (p.percent ?? 0) + "%";
    $("routeSummary").textContent =
      (p.completedCount ?? 0) + " / " + (p.totalRoutes ?? 0) + " routes · " + (p.raw?.sourceApp ?? p.state ?? "—");
    const ul = $("routeList");
    ul.innerHTML = "";
    for (const k of [...(p.completedRouteKeys ?? [])].sort()) {
      const li = document.createElement("li");
      li.className = "done";
      li.textContent = k;
      ul.appendChild(li);
    }
  }

  function logLine(t) {
    const el = $("log");
    el.textContent += t + "\n";
    el.scrollTop = el.scrollHeight;
  }

  const es = new EventSource("/api/events");
  es.addEventListener("job", (e) => setJob(JSON.parse(e.data)));
  es.addEventListener("progress", (e) => applyProgress(JSON.parse(e.data)));
  es.addEventListener("log", (e) => {
    const d = JSON.parse(e.data);
    logLine("[" + d.stream + "] " + d.line);
  });
  es.addEventListener("statusResult", (e) => {
    $("statusJson").textContent = JSON.stringify(JSON.parse(e.data), null, 2);
  });

  async function post(path, body) {
    return api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  $("btnIngest").addEventListener("click", async () => {
    $("log").textContent = "";
    try {
      const r = await post("/api/jobs/ingest", { projectDir: $("project").value, hubProjectId: consoleProjectId });
      if (r.plan?.errors?.length) {
        for (const e of r.plan.errors) logLine("[hub] " + e.sourceLang + ": " + e.message);
      }
    } catch (e) {
      logLine("ERROR: " + e.message);
    }
  });
  $("btnStatus").addEventListener("click", async () => {
    $("log").textContent = "";
    try {
      await post("/api/jobs/status", { projectDir: $("project").value });
    } catch (e) {
      logLine("ERROR: " + e.message);
    }
  });
  $("btnRefresh").addEventListener("click", () => api("/api/progress").then(applyProgress));

  $("navHome").addEventListener("click", (e) => {
    e.preventDefault();
    location.hash = "#/";
    route();
    loadHome();
  });
  $("navNew").addEventListener("click", (e) => {
    e.preventDefault();
    location.hash = "#/new";
    route();
  });

  window.addEventListener("hashchange", route);
  syncDetectUi();
  loadHubLanguages().then(() => {
    route();
    loadHome().catch(() => {});
    api("/api/state").then((s) => {
      if (s.job) setJob(s.job);
      if (s.progress) applyProgress(s.progress);
    });
  });
})();
