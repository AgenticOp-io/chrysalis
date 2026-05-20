/* Chrysalis Translation Hub — browser UI (served by chrysalis-operator-web.mjs) */
(function () {
  const $ = (id) => document.getElementById(id);
  const views = { home: $("viewHome"), newProject: $("viewNew"), console: $("viewConsole") };

  function show(view) {
    for (const [k, el] of Object.entries(views)) {
      if (el) el.hidden = k !== view;
    }
    location.hash = view === "home" ? "#/" : `#/${view}`;
  }

  function route() {
    const h = (location.hash || "#/").replace(/^#\/?/, "");
    const [page, query] = h.split("?");
    if (page === "new") show("newProject");
    else if (page === "console") {
      show("console");
      const id = new URLSearchParams(query || "").get("id");
      if (id) loadConsoleProject(id);
    } else show("home");
  }

  async function api(path, opts) {
    const r = await fetch(path, opts);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || r.statusText);
    return j;
  }

  async function loadHome() {
    const data = await api("/api/hub/projects");
    const ul = $("projectList");
    ul.innerHTML = "";
    for (const p of data.projects) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${esc(p.name)}</strong> <span class="muted">${esc(p.id)}</span>
        <div class="muted">${p.detection ? p.detection.languages.map((l) => l.language).join(", ") : "not scanned"}</div>
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

  let targetMatrix = {};
  let lastScan = null;

  async function loadTargetMatrix() {
    const data = await api("/api/hub/target-matrix");
    targetMatrix = data.matrix;
  }

  function renderTargetPickers(languages) {
    const box = $("targetPickers");
    box.innerHTML = "";
    for (const row of languages) {
      const lang = row.language;
      const opts = targetMatrix[lang] || [{ id: "unchanged", label: "No translator yet", supported: false }];
      const div = document.createElement("div");
      div.className = "target-row";
      div.innerHTML = `<label><strong>${esc(lang)}</strong> (${row.fileCount} files)</label>`;
      const sel = document.createElement("select");
      sel.dataset.lang = lang;
      for (const o of opts) {
        const opt = document.createElement("option");
        opt.value = o.id;
        opt.textContent = o.label + (o.supported ? "" : " — planned");
        sel.appendChild(opt);
      }
      if (lang === "php") sel.value = "typescript-chrysalis";
      div.appendChild(sel);
      box.appendChild(div);
    }
  }

  $("btnScanSsh").addEventListener("click", async () => {
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
      renderTargetPickers(r.detection.languages);
      $("scanStatus").textContent = `Found ${r.detection.pathCount} files, ${r.detection.languages.length} language(s).`;
    } catch (e) {
      $("scanStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnCreateProject").addEventListener("click", async () => {
    $("createStatus").textContent = "Creating…";
    try {
      const targets = {};
      document.querySelectorAll("#targetPickers select").forEach((sel) => {
        targets[sel.dataset.lang] = sel.value;
      });
      const body = {
        name: $("projName").value.trim(),
        description: $("projDesc").value.trim(),
        pullFromSsh: $("pullFromSsh").checked,
        ssh: {
          host: $("sshHost").value.trim(),
          user: $("sshUser").value.trim(),
          port: Number($("sshPort").value) || 22,
          remotePath: $("sshPath").value.trim(),
          identityFile: $("sshKey").value.trim() || undefined,
        },
        targets,
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
    if (p.detection) {
      det.innerHTML = p.detection.languages
        .map((l) => `<li>${esc(l.language)}: ${l.fileCount} files → ${esc((p.targets && p.targets[l.language]) || "?")}</li>`)
        .join("");
    } else det.innerHTML = "<li>Not scanned</li>";
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
      await post("/api/jobs/ingest", { projectDir: $("project").value, hubProjectId: consoleProjectId });
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
    show("home");
    loadHome();
  });
  $("navNew").addEventListener("click", (e) => {
    e.preventDefault();
    show("newProject");
  });

  window.addEventListener("hashchange", route);
  loadTargetMatrix().then(() => {
    route();
    loadHome().catch(() => {});
    api("/api/state").then((s) => {
      if (s.job) setJob(s.job);
      if (s.progress) applyProgress(s.progress);
    });
  });
})();
