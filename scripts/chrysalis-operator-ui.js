/* Chrysalis Translation Hub — browser UI (served by chrysalis-operator-web.mjs) */
(function () {
  const $ = (id) => document.getElementById(id);
  const views = { home: $("viewHome"), newProject: $("viewNew"), guide: $("viewGuide"), console: $("viewConsole") };

  function show(view) {
    for (const [k, el] of Object.entries(views)) {
      if (el) el.hidden = k !== view;
    }
  }

  function route() {
    const h = (location.hash || "#/").replace(/^#\/?/, "");
    const [page, query] = h.split("?");
    if (page === "new" || page === "newProject") {
      show("newProject");
      loadOrgs($("newOrgId")).catch(() => {});
    }
    else if (page === "guide" || page === "install") {
      show("guide");
      loadInstallGuide();
    } else if (page === "console") {
      show("console");
      const id = new URLSearchParams(query || "").get("id");
      if (id) loadConsoleProject(id);
    } else show("home");
  }

  let hubAuthToken = sessionStorage.getItem("chrysalis_hub_token") || "";

  function buildHeaders(opts) {
    const h = { ...(opts.headers || {}) };
    if (hubAuthToken) h.Authorization = `Bearer ${hubAuthToken}`;
    return h;
  }

  async function apiUpload(path, formData) {
    const r = await fetch(path, { method: "POST", headers: buildHeaders({}), body: formData });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) {
      $("authGate").hidden = false;
      throw new Error("Unauthorized — enter hub token.");
    }
    if (!r.ok) throw new Error(j.message || j.error || r.statusText);
    return j;
  }

  async function api(path, opts = {}) {
    let body = opts.body;
    const headers = buildHeaders(opts);
    if (body != null && typeof body === "object" && !(body instanceof FormData)) {
      body = JSON.stringify(body);
      if (!headers["content-type"] && !headers["Content-Type"]) {
        headers["content-type"] = "application/json";
      }
    }
    const r = await fetch(path, {
      ...opts,
      headers,
      body,
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) {
      $("authGate").hidden = false;
      throw new Error("Unauthorized — enter hub token.");
    }
    if (!r.ok) throw new Error(j.message || j.error || r.statusText);
    return j;
  }

  $("btnSaveToken")?.addEventListener("click", () => {
    hubAuthToken = $("hubToken").value.trim();
    sessionStorage.setItem("chrysalis_hub_token", hubAuthToken);
    $("authGate").hidden = true;
    loadHome().catch(() => {});
  });

  async function loadOrgs(selectEl) {
    try {
      const data = await api("/api/hub/orgs");
      if (selectEl) {
        const cur = selectEl.value;
        selectEl.innerHTML = '<option value="">Personal (no org)</option>';
        for (const o of data.orgs || []) {
          const opt = document.createElement("option");
          opt.value = o.id;
          opt.textContent = o.name;
          selectEl.appendChild(opt);
        }
        if (cur) selectEl.value = cur;
      }
      const ul = $("orgList");
      if (ul) {
        ul.innerHTML = "";
        for (const o of data.orgs || []) {
          const li = document.createElement("li");
          li.innerHTML = `<strong>${esc(o.name)}</strong> <span class="muted">${esc(o.id)}</span>`;
          ul.appendChild(li);
        }
        if (!data.orgs?.length) ul.innerHTML = "<li>No orgs yet — create one below.</li>";
      }
      return data.orgs || [];
    } catch (e) {
      if ($("orgStatus")) $("orgStatus").textContent = e.message;
      return [];
    }
  }

  async function loadHome() {
    await loadOrgs(null);
    const data = await api("/api/hub/projects");
    const ul = $("projectList");
    ul.innerHTML = "";
    for (const p of data.projects) {
      const origin = p.originLanguage || "?";
      const output = p.outputLanguage || "?";
      const li = document.createElement("li");
      const siteN = p.sites?.length ?? 0;
      const org = p.orgId ? ` · org ${esc(p.orgId)}` : "";
      li.innerHTML = `<strong>${esc(p.name)}</strong> <span class="muted">${esc(p.id)}</span>
        <div class="muted">${esc(origin)} → ${esc(output)} · ${siteN} site(s)${org}</div>
        <a href="#/console?id=${encodeURIComponent(p.id)}"><strong>Open console</strong> (add sites, run batch)</a>`;
      ul.appendChild(li);
    }
  }

  $("btnCreateOrg")?.addEventListener("click", async () => {
    const name = $("newOrgName")?.value?.trim();
    if (!name) {
      $("orgStatus").textContent = "Enter a team name.";
      return;
    }
    try {
      await api("/api/hub/orgs", { method: "POST", body: { name } });
      $("orgStatus").textContent = `Created org ${name}.`;
      $("newOrgName").value = "";
      await loadOrgs($("newOrgId"));
      await loadHome();
    } catch (e) {
      $("orgStatus").textContent = "Error: " + e.message;
    }
  });

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  let installGuideLoaded = false;
  async function loadInstallGuide() {
    const el = $("installGuideBody");
    if (!el || installGuideLoaded) return;
    try {
      const r = await fetch("/docs/hub-install");
      const md = await r.text();
      el.innerHTML = renderInstallMarkdown(md);
      installGuideLoaded = true;
    } catch (e) {
      el.innerHTML = `<p class="muted">Could not load guide: ${esc(e.message)}. Try <a href="/docs/hub-install">plain text</a>.</p>`;
    }
  }

  function renderInstallMarkdown(md) {
    const lines = md.split(/\r?\n/);
    const out = [];
    let inTable = false;
    let tableRows = [];
    let inCode = false;
    let codeBuf = [];

    const flushTable = () => {
      if (!tableRows.length) return;
      const rows = tableRows.map((r) => r.split("|").slice(1, -1).map((c) => c.trim()));
      const header = rows[0];
      const body = rows.slice(2);
      out.push("<table><thead><tr>" + header.map((c) => `<th>${inlineMd(c)}</th>`).join("") + "</tr></thead><tbody>");
      for (const row of body) {
        out.push("<tr>" + row.map((c) => `<td>${inlineMd(c)}</td>`).join("") + "</tr>");
      }
      out.push("</tbody></table>");
      tableRows = [];
      inTable = false;
    };

    const inlineMd = (s) => {
      let t = esc(s);
      t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return t;
    };

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (inCode) {
          out.push("<pre><code>" + esc(codeBuf.join("\n")) + "</code></pre>");
          codeBuf = [];
          inCode = false;
        } else inCode = true;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        continue;
      }
      if (line.startsWith("|")) {
        inTable = true;
        tableRows.push(line);
        continue;
      }
      if (inTable) flushTable();
      if (line.startsWith("# ")) out.push("<h2>" + inlineMd(line.slice(2)) + "</h2>");
      else if (line.startsWith("## ")) out.push("<h2>" + inlineMd(line.slice(3)) + "</h2>");
      else if (line.startsWith("### ")) out.push("<h3>" + inlineMd(line.slice(4)) + "</h3>");
      else if (/^\d+\.\s/.test(line)) out.push("<li>" + inlineMd(line.replace(/^\d+\.\s/, "")) + "</li>");
      else if (line.startsWith("- ")) out.push("<li>" + inlineMd(line.slice(2)) + "</li>");
      else if (line.trim() === "") out.push("");
      else out.push("<p>" + inlineMd(line) + "</p>");
    }
    if (inTable) flushTable();
    if (inCode && codeBuf.length) out.push("<pre><code>" + esc(codeBuf.join("\n")) + "</code></pre>");
    return out.join("\n");
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

  const pendingSites = [];

  function readSiteFormFromNewPage() {
    const host = $("sshHost").value.trim();
    const user = $("sshUser").value.trim();
    const path = $("sshPath").value.trim();
    if (!host || !user || !path) return null;
    return {
      name: `Site ${pendingSites.length + 1} (${host})`,
      originLanguage: $("originLanguage").value,
      prepOrigin: $("prepOrigin")?.checked !== false,
      pullFromSsh: $("pullFromSsh").checked,
      detectLanguages: $("enableDetect").checked,
      ssh: {
        host,
        user,
        port: Number($("sshPort").value) || 22,
        remotePath: path,
        identityFile: $("sshKey").value.trim() || undefined,
      },
    };
  }

  function renderPendingSites() {
    const ul = $("pendingSitesList");
    if (!ul) return;
    ul.innerHTML = "";
    for (let i = 0; i < pendingSites.length; i++) {
      const s = pendingSites[i];
      const li = document.createElement("li");
      li.className = "site-card";
      li.innerHTML = `<strong>${esc(s.name)}</strong> <span class="muted">${esc(s.ssh.user)}@${esc(s.ssh.host)}:${esc(s.ssh.remotePath)}</span>
        <button type="button" class="secondary" data-i="${i}" style="margin-top:0.35rem">Remove</button>`;
      li.querySelector("button").addEventListener("click", () => {
        pendingSites.splice(i, 1);
        renderPendingSites();
      });
      ul.appendChild(li);
    }
    if ($("pendingSiteCount")) {
      $("pendingSiteCount").textContent =
        pendingSites.length === 0 ? "0 sites queued" : `${pendingSites.length} site(s) queued`;
    }
  }

  $("btnAddPendingSite")?.addEventListener("click", () => {
    const s = readSiteFormFromNewPage();
    if (!s) {
      $("createStatus").textContent = "Enter host, user, and remote path first.";
      return;
    }
    pendingSites.push(s);
    renderPendingSites();
    $("createStatus").textContent = `Added ${s.name}. Add more sites or create the project.`;
  });

  async function createProjectFromPortal(runPipelineAfter) {
    $("createStatus").textContent = "Creating…";
    if (pendingSites.length === 0) {
      const one = readSiteFormFromNewPage();
      if (one) pendingSites.push(one);
    }
    if (pendingSites.length === 0) {
      $("createStatus").textContent = "Add at least one site (host, user, path) using Add to project.";
      return;
    }
    const body = {
      name: $("projName").value.trim(),
      description: $("projDesc").value.trim(),
      orgId: $("newOrgId")?.value?.trim() || null,
      originLanguage: $("originLanguage").value,
      outputLanguage: $("outputLanguage").value,
      sites: pendingSites,
      prepOrigin: $("prepOrigin")?.checked !== false,
      pullFromSsh: $("pullFromSsh")?.checked !== false,
      detectLanguages: $("enableDetect")?.checked === true,
      backgroundSetup: true,
      runSetup: !runPipelineAfter,
    };
    const r = await api("/api/hub/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    pendingSites.length = 0;
    renderPendingSites();
    const id = r.project.id;
    $("createStatus").textContent = `Created ${id} (${r.project.sites?.length ?? 0} sites). ${
      r.setupStarted ? "SSH setup running on hub — open Console for live log." : ""
    }`;
    location.hash = `#/console?id=${encodeURIComponent(id)}`;
    route();
    if (runPipelineAfter) {
      try {
        await post(`/api/hub/projects/${encodeURIComponent(id)}/run-pipeline`, {});
        if ($("siteActionStatus")) $("siteActionStatus").textContent = "Full pipeline started (setup + translate).";
      } catch (e) {
        $("createStatus").textContent += " Pipeline error: " + e.message;
      }
    }
  }

  $("btnCreateProject").addEventListener("click", () => {
    createProjectFromPortal(false).catch((e) => {
      $("createStatus").textContent = "Error: " + e.message;
    });
  });

  $("btnCreateAndRun")?.addEventListener("click", () => {
    createProjectFromPortal(true).catch((e) => {
      $("createStatus").textContent = "Error: " + e.message;
    });
  });

  let consoleProjectId = null;

  let selectedSiteId = null;

  function renderSitesList(p) {
    const el = $("sitesList");
    if (!el) return;
    el.innerHTML = "";
    const output = p.outputLanguage || "?";
    for (const site of p.sites || []) {
      const row = document.createElement("div");
      row.className = "site-card";
      const pct = site._progressPct ?? 0;
      const done = site._progressDone ?? 0;
      const total = site._progressTotal ?? 0;
      const prep = site.originPrep;
      const prepLabel = prep?.ok
        ? prep.scanAgentInstalled
          ? "origin ready"
          : "prep ok (no agent)"
        : prep?.error
          ? "prep failed"
          : site.ssh
            ? "not prepared"
            : "local";
      const vState = site.verifyState || "—";
      const vPct =
        site.verifyCorrectness != null ? `${Math.round(site.verifyCorrectness * 100)}%` : site.verifyState === "passed" ? "ok" : "";
      const rt = site.runtime?.baseUrl ? ` · app ${site.runtime.baseUrl}` : "";
      const h = site.runtime?.health;
      const healthBadge = h
        ? h.ok
          ? `<span class="badge ok">health ${h.latencyMs ?? "?"}ms</span>`
          : `<span class="badge fail">health fail</span>`
        : site.runtime?.state === "running"
          ? `<span class="badge run">probing…</span>`
          : "";
      row.innerHTML = `
        <div class="row" style="justify-content:space-between">
          <strong>${esc(site.name)}</strong>
          <span class="badge ${site.jobState === "succeeded" || site.verifyState === "passed" ? "ok" : site.jobState === "failed" || site.verifyState === "failed" ? "fail" : ""}">${esc(site.jobState || "idle")}</span>
        </div>
        <div class="muted">${esc(site.originLanguage || p.originLanguage)} → ${esc(output)} · ${esc(site.ssh?.host || "local")} · ${esc(prepLabel)} · verify: ${esc(vState)} ${esc(vPct)}${esc(rt)} ${healthBadge}</div>
        <div class="bar-wrap" style="margin-top:0.4rem"><div class="bar" style="width:${pct}%"></div></div>
        <div class="muted">${done} / ${total} routes (${pct}%)</div>
        <div class="row" style="margin-top:0.35rem">
          <button type="button" class="secondary site-select-one" data-site-id="${esc(site.id)}">Select</button>
          <button type="button" class="secondary site-prep-one" data-site-id="${esc(site.id)}">Prepare</button>
          <button type="button" class="secondary site-setup-one" data-site-id="${esc(site.id)}">Setup</button>
          <button type="button" class="secondary site-resync-one" data-site-id="${esc(site.id)}">Re-pull</button>
          <button type="button" class="secondary site-run-one" data-site-id="${esc(site.id)}">Translate</button>
          <button type="button" class="secondary site-verify-one" data-site-id="${esc(site.id)}">Verify</button>
          <button type="button" class="secondary site-remove-one" data-site-id="${esc(site.id)}">Remove</button>
        </div>
      `;
      el.appendChild(row);
    }
    el.querySelectorAll(".site-run-one").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedSiteId = btn.getAttribute("data-site-id");
        runSingleSite();
      });
    });
    el.querySelectorAll(".site-prep-one").forEach((btn) => {
      btn.addEventListener("click", () => prepOneSite(btn.getAttribute("data-site-id")));
    });
    el.querySelectorAll(".site-setup-one").forEach((btn) => {
      btn.addEventListener("click", () => setupOneSite(btn.getAttribute("data-site-id")));
    });
    el.querySelectorAll(".site-resync-one").forEach((btn) => {
      btn.addEventListener("click", () => resyncOneSite(btn.getAttribute("data-site-id")));
    });
    el.querySelectorAll(".site-select-one").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedSiteId = btn.getAttribute("data-site-id");
        $("siteActionStatus").textContent = `Selected site: ${selectedSiteId}`;
      });
    });
    el.querySelectorAll(".site-verify-one").forEach((btn) => {
      btn.addEventListener("click", () => verifyOneSite(btn.getAttribute("data-site-id")));
    });
    el.querySelectorAll(".site-remove-one").forEach((btn) => {
      btn.addEventListener("click", () => removeOneSite(btn.getAttribute("data-site-id")));
    });
    if ($("siteOrigin") && inputLanguages.length) {
      fillSelect($("siteOrigin"), inputLanguages, p.originLanguage);
    }
    if ($("consoleSubtitle")) {
      $("consoleSubtitle").textContent =
        `Output: ${output} · ${p.sites?.length ?? 0} site(s) — run in parallel from this hub server.`;
    }
  }

  async function loadConsoleProject(id) {
    consoleProjectId = id;
    const p = await api(`/api/hub/projects/${encodeURIComponent(id)}`);
    $("consoleTitle").textContent = p.name;
    selectedSiteId = p.sites?.[0]?.id ?? null;
    renderSitesList(p);
    try {
      const bp = await api(`/api/hub/projects/${encodeURIComponent(id)}/batch-progress`);
      applyBatchProgress(bp);
    } catch {
      /* ignore */
    }
  }

  function applyBatchProgress(bp) {
    if (!bp?.sites) return;
    $("pct").textContent = String(bp.overallPercent ?? 0);
    $("bar").style.width = (bp.overallPercent ?? 0) + "%";
    let done = 0;
    let total = 0;
    const ul = $("routeList");
    ul.innerHTML = "";
    for (const [id, s] of Object.entries(bp.sites)) {
      done += s.completed ?? 0;
      total += s.totalRoutes ?? 0;
      const li = document.createElement("li");
      li.className = (s.pct ?? 0) >= 100 ? "done" : "";
      li.textContent = `${s.name || id}: ${s.completed ?? 0}/${s.totalRoutes ?? 0} (${s.pct ?? 0}%)`;
      ul.appendChild(li);
    }
    $("routeSummary").textContent = `${done} / ${total} routes across ${Object.keys(bp.sites).length} site(s)`;
    if ($("batchOverall")) {
      $("batchOverall").textContent = bp.running
        ? "Batch: running…"
        : bp.batch?.state
          ? `Batch: ${bp.batch.state}`
          : "Batch: idle";
    }
    api(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}`)
      .then((p) => {
        for (const site of p.sites || []) {
          const st = bp.sites[site.id];
          if (st) {
            site._progressPct = st.pct ?? 0;
            site._progressDone = st.completed ?? 0;
            site._progressTotal = st.totalRoutes ?? 0;
          }
        }
        renderSitesList(p);
      })
      .catch(() => {});
  }

  async function runSingleSite() {
    $("log").textContent = "";
    try {
      await post("/api/jobs/ingest", {
        hubProjectId: consoleProjectId,
        siteId: selectedSiteId,
      });
    } catch (e) {
      logLine("ERROR: " + e.message);
    }
  }

  let hubSetupState = "idle";
  let hubBatchState = "idle";
  let hubVerifyState = "idle";

  function setPortalBusy(busy, label) {
    const b = $("jobBadge");
    if (busy) {
      b.textContent = label || "working…";
      b.className = "badge run";
    } else {
      b.textContent =
        hubBatchState === "running"
          ? "batch · running"
          : hubSetupState === "running"
            ? "setup · running"
            : hubVerifyState === "running"
              ? "verify · running"
              : "idle";
      b.className = "badge";
    }
    const ids = [
      "btnIngest",
      "btnRunBatch",
      "btnRunPipeline",
      "btnSetupAllSites",
      "btnPrepAllSites",
      "btnAddSite",
      "btnProbeConsole",
      "btnVerifyAll",
      "btnVerifySelected",
      "btnWptpSmoke",
      "btnLoadObserve",
      "btnScanConsole",
    ];
    for (const id of ids) {
      if ($(id)) $(id).disabled = busy;
    }
  }

  function setJob(j) {
    if (!j || j.state === "idle") {
      if (hubSetupState !== "running" && hubBatchState !== "running") setPortalBusy(false);
      return;
    }
    setPortalBusy(j.state === "running", (j.kind || "job") + " · " + j.state);
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
  es.addEventListener("batchProgress", (e) => applyBatchProgress(JSON.parse(e.data)));
  es.addEventListener("batch", (e) => {
    const b = JSON.parse(e.data);
    hubBatchState = b.state || "idle";
    if ($("batchOverall")) $("batchOverall").textContent = "Batch: " + (b.state || "idle");
    if (b.state !== "running") setPortalBusy(hubSetupState === "running", "setup · running");
    if (b.state !== "running" && consoleProjectId) loadConsoleProject(consoleProjectId);
  });
  es.addEventListener("setup", (e) => {
    const s = JSON.parse(e.data);
    hubSetupState = s.state || "idle";
    if ($("batchOverall")) $("batchOverall").textContent = "Setup: " + (s.state || "idle");
    setPortalBusy(s.state === "running", "setup · running");
    if (s.state !== "running" && consoleProjectId) loadConsoleProject(consoleProjectId);
  });
  es.addEventListener("siteSetup", () => {
    if (consoleProjectId) loadConsoleProject(consoleProjectId);
  });
  es.addEventListener("verify", (e) => {
    const v = JSON.parse(e.data);
    hubVerifyState = v.state || "idle";
    if ($("verifyStatus")) $("verifyStatus").textContent = "Verify: " + (v.state || "idle");
    setPortalBusy(v.state === "running", "verify · running");
    if (v.state !== "running" && consoleProjectId) loadConsoleProject(consoleProjectId);
  });
  es.addEventListener("siteVerify", () => {
    if (consoleProjectId) loadConsoleProject(consoleProjectId);
  });
  es.addEventListener("siteRuntime", (e) => {
    const d = JSON.parse(e.data);
    if (d.runtime?.baseUrl && $("verifyBaseUrl")) $("verifyBaseUrl").value = d.runtime.baseUrl;
    if (consoleProjectId) loadConsoleProject(consoleProjectId);
  });
  es.addEventListener("runtimeHealth", () => {
    if (consoleProjectId) loadConsoleProject(consoleProjectId);
  });

  const CHUNK_SIZE = 2 * 1024 * 1024;

  async function uploadTraceFile(projectId, siteId, file) {
    const base = `/api/hub/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/traces`;
    if (file.size > CHUNK_SIZE || file.name.endsWith(".zip")) {
      const start = await post(`${base}/upload/start`, { filename: file.name, totalBytes: file.size });
      const chunkSize = start.chunkSize || CHUNK_SIZE;
      let offset = 0;
      let idx = 0;
      while (offset < file.size) {
        const slice = file.slice(offset, Math.min(offset + chunkSize, file.size));
        const headers = buildHeaders({
          "content-type": "application/octet-stream",
          "x-chunk-index": String(idx),
        });
        const r = await fetch(`${base}/upload/${encodeURIComponent(start.uploadId)}/chunk`, {
          method: "POST",
          headers,
          body: slice,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.message || j.error || r.statusText);
        offset += slice.size;
        idx += 1;
        if ($("verifyStatus")) $("verifyStatus").textContent = `Uploading ${file.name}: ${Math.round((100 * offset) / file.size)}%`;
      }
      return post(`${base}/upload/${encodeURIComponent(start.uploadId)}/finish`, {});
    }
    const fd = new FormData();
    fd.append("traces", file);
    return apiUpload(`${base}/upload`, fd);
  }

  async function post(path, body) {
    return api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  $("btnIngest")?.addEventListener("click", () => runSingleSite());

  function verifyBody(siteId) {
    return {
      baseUrl: $("verifyBaseUrl")?.value?.trim(),
      threshold: Number($("verifyThreshold")?.value) || 0.9,
      tracesDir: $("verifyTracesDir")?.value?.trim() || undefined,
      async: true,
      siteIds: siteId ? [siteId] : undefined,
    };
  }

  async function verifyOneSite(siteId) {
    $("verifyStatus").textContent = "Starting verify…";
    await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(siteId)}/verify`, verifyBody(siteId));
    $("verifyStatus").textContent = "Verify started — see job log.";
  }

  async function removeOneSite(siteId) {
    if (!confirm("Remove this site from the project?")) return;
    await api(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(siteId)}`, {
      method: "DELETE",
    });
    await loadConsoleProject(consoleProjectId);
    $("siteActionStatus").textContent = "Site removed.";
  }

  async function resyncOneSite(siteId) {
    await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/setup-all-sites`, {
      siteIds: [siteId],
      prep: false,
      pull: true,
    });
    $("siteActionStatus").textContent = "Re-pull started.";
  }

  async function saveSiteEdits() {
    if (!selectedSiteId) return;
    await api(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(selectedSiteId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: $("siteName").value.trim(),
        originLanguage: $("siteOrigin").value,
        ssh: {
          host: $("siteHost").value.trim(),
          user: $("siteUser").value.trim(),
          port: Number($("sitePort")?.value) || 22,
          remotePath: $("sitePath").value.trim(),
          identityFile: $("siteKey")?.value?.trim() || undefined,
        },
      }),
    });
    $("siteActionStatus").textContent = "Site SSH settings saved.";
    await loadConsoleProject(consoleProjectId);
  }

  async function prepOneSite(siteId) {
    $("siteActionStatus").textContent = "Preparing site…";
    await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(siteId)}/prep`, {});
    $("siteActionStatus").textContent = "Origin prep started — see job log.";
  }

  async function setupOneSite(siteId) {
    $("siteActionStatus").textContent = "Setting up site…";
    await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/setup-all-sites`, {
      siteIds: [siteId],
      prep: $("sitePrepOrigin")?.checked !== false,
      pull: $("sitePullFromSsh")?.checked !== false,
    });
    $("siteActionStatus").textContent = "Site setup started — see job log.";
  }

  $("btnRunPipeline")?.addEventListener("click", async () => {
    $("log").textContent = "";
    $("siteActionStatus").textContent = "Starting full pipeline (setup + translate)…";
    try {
      await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/run-pipeline`, {});
      $("siteActionStatus").textContent = "Pipeline started.";
    } catch (e) {
      $("siteActionStatus").textContent = "Error: " + e.message;
      logLine("ERROR: " + e.message);
    }
  });

  $("btnRunBatch")?.addEventListener("click", async () => {
    $("log").textContent = "";
    $("siteActionStatus").textContent = "Starting translation batch…";
    try {
      await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/run-batch`, {});
      $("siteActionStatus").textContent = "Batch started.";
    } catch (e) {
      $("siteActionStatus").textContent = "Error: " + e.message;
      logLine("ERROR: " + e.message);
    }
  });

  $("btnSetupAllSites")?.addEventListener("click", async () => {
    $("siteActionStatus").textContent = "Setting up all sites on hub…";
    try {
      await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/setup-all-sites`, {
        prep: $("sitePrepOrigin")?.checked !== false,
        pull: $("sitePullFromSsh")?.checked !== false,
      });
      $("siteActionStatus").textContent = "Setup started — see job log.";
    } catch (e) {
      $("siteActionStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnPrepAllSites")?.addEventListener("click", async () => {
    $("siteActionStatus").textContent = "Preparing all origins…";
    try {
      await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/prep-all-sites`, {});
      $("siteActionStatus").textContent = "Origin prep started — see job log.";
    } catch (e) {
      $("siteActionStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnProbeConsole")?.addEventListener("click", async () => {
    $("consoleProbeStatus").textContent = "Probing…";
    try {
      const ssh = {
        host: $("siteHost").value.trim(),
        user: $("siteUser").value.trim(),
        port: Number($("sitePort")?.value) || 22,
        remotePath: $("sitePath").value.trim() || "/",
        identityFile: $("siteKey")?.value?.trim() || undefined,
      };
      const r = await api("/api/hub/probe-connectivity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ssh.host && ssh.user ? { ssh } : {}),
      });
      const lines = [];
      for (const c of r.hub?.checks ?? []) lines.push((c.ok ? "OK" : "FAIL") + " hub:" + c.id);
      for (const c of r.origin?.checks ?? []) lines.push((c.ok ? "OK" : "FAIL") + " origin:" + c.id);
      $("consoleProbeStatus").textContent = lines.join(" · ") || (r.ok ? "All checks passed." : "Some checks failed.");
    } catch (e) {
      $("consoleProbeStatus").textContent = "Probe error: " + e.message;
    }
  });

  $("btnSaveSiteEdits")?.addEventListener("click", () => saveSiteEdits().catch((e) => ($("siteActionStatus").textContent = "Error: " + e.message)));

  $("btnVerifyAll")?.addEventListener("click", async () => {
    try {
      await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/verify-all-sites`, verifyBody());
      $("verifyStatus").textContent = "Verify all started.";
    } catch (e) {
      $("verifyStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnVerifySelected")?.addEventListener("click", async () => {
    if (!selectedSiteId) {
      $("verifyStatus").textContent = "Select a site first.";
      return;
    }
    try {
      await verifyOneSite(selectedSiteId);
    } catch (e) {
      $("verifyStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnUploadTraces")?.addEventListener("click", async () => {
    if (!selectedSiteId) {
      $("verifyStatus").textContent = "Select a site first.";
      return;
    }
    const input = $("traceFileInput");
    if (!input?.files?.length) {
      $("verifyStatus").textContent = "Choose trace files or a .zip first.";
      return;
    }
    try {
      let saved = 0;
      let tracesDir = "";
      for (const f of input.files) {
        const r = await uploadTraceFile(consoleProjectId, selectedSiteId, f);
        saved += typeof r.saved === "number" ? r.saved : 1;
        tracesDir = r.tracesDir || tracesDir;
      }
      $("verifyStatus").textContent = `Uploaded ${saved} file(s) to ${tracesDir}`;
    } catch (e) {
      $("verifyStatus").textContent = "Upload error: " + e.message;
    }
  });

  $("btnStartRuntime")?.addEventListener("click", async () => {
    if (!selectedSiteId) {
      $("verifyStatus").textContent = "Select a site first.";
      return;
    }
    try {
      const r = await post(
        `/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(selectedSiteId)}/runtime/start`,
        {},
      );
      if ($("verifyBaseUrl")) $("verifyBaseUrl").value = r.runtime?.baseUrl ?? "";
      $("verifyStatus").textContent = `Emitted app running at ${r.runtime?.baseUrl}`;
      await loadConsoleProject(consoleProjectId);
    } catch (e) {
      $("verifyStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnStopRuntime")?.addEventListener("click", async () => {
    if (!selectedSiteId) return;
    try {
      await post(
        `/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(selectedSiteId)}/runtime/stop`,
        {},
      );
      $("verifyStatus").textContent = "Emitted app stopped.";
    } catch (e) {
      $("verifyStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnWptpCompose")?.addEventListener("click", async () => {
    if (!selectedSiteId) {
      $("verifyStatus").textContent = "Select a site first.";
      return;
    }
    try {
      const r = await post(
        `/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(selectedSiteId)}/wptp-compose`,
        {},
      );
      $("verifyStatus").textContent = "WPTP compose OK: " + (r.path || "done");
      logLine(JSON.stringify(r));
      await loadConsoleProject(consoleProjectId);
    } catch (e) {
      $("verifyStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnWptpSmoke")?.addEventListener("click", async () => {
    try {
      const r = await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/wptp-smoke`, {});
      $("verifyStatus").textContent = r.ok ? "WPTP smoke passed." : r.skipped ? "WPTP skipped: " + (r.reason || "") : "WPTP smoke failed.";
      logLine(JSON.stringify(r, null, 2));
    } catch (e) {
      $("verifyStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnLoadObserve")?.addEventListener("click", async () => {
    if (!selectedSiteId) {
      $("observeGuide").textContent = "Select a site first.";
      return;
    }
    try {
      const g = await api(
        `/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(selectedSiteId)}/observe-assist`,
      );
      $("observeGuide").textContent = JSON.stringify(g, null, 2);
    } catch (e) {
      $("observeGuide").textContent = "Error: " + e.message;
    }
  });

  $("btnScanConsole")?.addEventListener("click", async () => {
    $("consoleProbeStatus").textContent = "Scanning origin…";
    try {
      const r = await post("/api/hub/scan-ssh", {
        ssh: {
          host: $("siteHost").value.trim(),
          user: $("siteUser").value.trim(),
          port: Number($("sitePort")?.value) || 22,
          remotePath: $("sitePath").value.trim(),
          identityFile: $("siteKey")?.value?.trim() || undefined,
        },
      });
      $("consoleProbeStatus").textContent = `Scanned ${r.detection.pathCount} files on origin.`;
    } catch (e) {
      $("consoleProbeStatus").textContent = "Scan error: " + e.message;
    }
  });

  $("btnAddSite")?.addEventListener("click", async () => {
    $("siteActionStatus").textContent = "Adding site…";
    try {
      const r = await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites`, {
        name: $("siteName").value.trim() || "Site",
        originLanguage: $("siteOrigin").value,
        prepOrigin: $("sitePrepOrigin")?.checked !== false,
        pullFromSsh: $("sitePullFromSsh")?.checked !== false,
        detectLanguages: false,
        backgroundSetup: true,
        runSetup: true,
        ssh: {
          host: $("siteHost").value.trim(),
          user: $("siteUser").value.trim(),
          port: Number($("sitePort")?.value) || 22,
          remotePath: $("sitePath").value.trim(),
          identityFile: $("siteKey")?.value?.trim() || undefined,
        },
      });
      $("siteActionStatus").textContent = r.setupStarted
        ? "Site added — SSH setup running (see log)."
        : "Site added.";
      await loadConsoleProject(consoleProjectId);
    } catch (e) {
      $("siteActionStatus").textContent = "Error: " + e.message;
    }
  });

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
    loadOrgs($("newOrgId")).catch(() => {});
  });
  $("navGuide")?.addEventListener("click", (e) => {
    e.preventDefault();
    location.hash = "#/guide";
    route();
  });

  window.addEventListener("hashchange", route);
  syncDetectUi();
  loadHubLanguages().then(() => {
    route();
    api("/api/config")
      .then((c) => {
        if (c.authRequired && !hubAuthToken) $("authGate").hidden = false;
      })
      .catch(() => {});
    loadHome().catch(() => {});
    api("/api/state").then((s) => {
      if (s.job) setJob(s.job);
      if (s.setup) {
        hubSetupState = s.setup.state || "idle";
        if (s.setup.state === "running") setPortalBusy(true, "setup · running");
      }
      if (s.batch) hubBatchState = s.batch.state || "idle";
      if (s.verify) hubVerifyState = s.verify.state || "idle";
      if (s.progress) applyProgress(s.progress);
    });
  });
})();
