/* Chrysalis Translation Hub — browser UI (served by chrysalis-operator-web.mjs) */
(function () {
  const $ = (id) => document.getElementById(id);
  const views = {
    home: $("viewHome"),
    newProject: $("viewNew"),
    guide: $("viewGuide"),
    paths: $("viewPaths"),
    console: $("viewConsole"),
  };

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
      loadGuideDoc("/docs/hub-install");
    } else if (page === "paths" || page === "path-explorer") {
      show("paths");
      initPathExplorer().catch(() => {});
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
        <div class="row" style="margin-top:0.35rem">
          <a href="#/console?id=${encodeURIComponent(p.id)}"><strong>Open console</strong></a>
          <button type="button" class="secondary home-delete-project" data-project-id="${esc(p.id)}">Delete</button>
        </div>`;
      ul.appendChild(li);
    }
    ul.querySelectorAll(".home-delete-project").forEach((btn) => {
      btn.addEventListener("click", () => deleteProjectFromHome(btn.getAttribute("data-project-id")));
    });
  }

  async function loadLanguageReadiness() {
    const summary = $("languageReadinessSummary");
    const rowsEl = $("languageReadinessRows");
    if (!summary || !rowsEl) return;
    summary.textContent = "Loading language readiness…";
    try {
      const scope = $("readinessScope")?.value || "popular-web";
      const grade = $("readinessGrade")?.value || "all";
      const params = new URLSearchParams();
      if (scope !== "all") params.set("scope", scope);
      if (grade !== "all") params.set("grade", grade);
      const data = await api(`/api/hub/language-readiness?${params.toString()}`);
      const rows = data.pairs || [];
      summary.textContent = `${rows.length} conversion pairs loaded (${scope.replace("-", " ")}, ${grade} filter).`;
      rowsEl.innerHTML = "";
      for (const row of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${esc(row.origin)}</td><td>${esc(row.output)}</td><td>${esc(row.grade)}</td><td>${esc(
          row.action,
        )}</td><td>${esc(row.next || "")}</td>`;
        rowsEl.appendChild(tr);
      }
      if (!rows.length) {
        rowsEl.innerHTML = '<tr><td colspan="5" class="muted">No pairs match this filter.</td></tr>';
      }
    } catch (e) {
      summary.textContent = "Readiness error: " + e.message;
      rowsEl.innerHTML = '<tr><td colspan="5" class="muted">Unable to load readiness.</td></tr>';
    }
  }

  $("btnLoadLanguageReadiness")?.addEventListener("click", () => {
    loadLanguageReadiness().catch(() => {});
  });

  let pathCatalogLoaded = false;

  function pathExplorerQuery() {
    const h = location.hash || "#/";
    const q = h.includes("?") ? h.slice(h.indexOf("?") + 1) : "";
    return new URLSearchParams(q);
  }

  function syncPathExplorerHash() {
    const origin = $("pathOrigin")?.value;
    const output = $("pathOutput")?.value;
    if (!origin || !output) return;
    const next = `#/paths?${new URLSearchParams({ origin, output }).toString()}`;
    if (location.hash !== next) history.replaceState(null, "", next);
  }

  function renderPathGoldPairs(goldPairs) {
    const ul = $("pathGoldPairs");
    if (!ul) return;
    ul.innerHTML = "";
    for (const p of goldPairs || []) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#/paths?${new URLSearchParams({ origin: p.origin, output: p.output }).toString()}`;
      a.textContent = `${p.origin} → ${p.output}`;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if ($("pathOrigin")) $("pathOrigin").value = p.origin;
        if ($("pathOutput")) $("pathOutput").value = p.output;
        syncPathExplorerHash();
        loadPathPair().catch(() => {});
      });
      li.appendChild(a);
      ul.appendChild(li);
    }
    if (!goldPairs?.length) ul.innerHTML = "<li class=\"muted\">No gold pairs in synthesis.</li>";
  }

  async function initPathExplorer() {
    const matrix = await api("/api/hub/target-matrix");
    const originSel = $("pathOrigin");
    const outputSel = $("pathOutput");
    if (!originSel || !outputSel) return;
    if (!pathCatalogLoaded) {
      originSel.innerHTML = "";
      outputSel.innerHTML = "";
      for (const lang of matrix.inputLanguages || []) {
        const opt = document.createElement("option");
        opt.value = lang.id;
        opt.textContent = lang.label || lang.id;
        originSel.appendChild(opt);
      }
      for (const lang of matrix.outputLanguages || []) {
        const opt = document.createElement("option");
        opt.value = lang.id;
        opt.textContent = lang.label || lang.id;
        outputSel.appendChild(opt);
      }
      if (matrix.defaultOrigin) originSel.value = matrix.defaultOrigin;
      if (matrix.defaultOutput) outputSel.value = matrix.defaultOutput;
      pathCatalogLoaded = true;
    }
    const q = pathExplorerQuery();
    if (q.get("origin")) originSel.value = q.get("origin");
    if (q.get("output")) outputSel.value = q.get("output");
    await loadPathSynthesis();
    if (q.get("origin") && q.get("output")) await loadPathPair();
  }

  async function loadPathSynthesis() {
    const summary = $("pathSynthesisSummary");
    const jsonEl = $("pathSynthesisJson");
    if (summary) summary.textContent = "Loading…";
    try {
      const [data, tiers] = await Promise.all([
        api("/api/hub/cross-language-synthesis"),
        api("/api/hub/verify-tiers").catch(() => null),
      ]);
      const g = data.gradeSummary || {};
      const tc = tiers?.tierCounts;
      const tierLine = tc
        ? ` · oracle ${tc.oracle ?? 0} · structural ${tc.structural ?? 0} · scaffold ${(tc["scaffold-framework"] ?? 0) + (tc["scaffold-native"] ?? 0) + (tc["scaffold-asset"] ?? 0)}`
        : "";
      if (summary) {
        summary.textContent = `${data.universe?.pairCount ?? 0} pairs · gold ${g.gold ?? 0}${tierLine} · ${data.goldPairs?.length ?? 0} gold pairs listed`;
      }
      renderPathGoldPairs(data.goldPairs);
      if (jsonEl) jsonEl.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      if (summary) summary.textContent = "Error: " + e.message;
      renderPathGoldPairs(null);
      if (jsonEl) jsonEl.textContent = "—";
    }
  }

  function renderPathLists(pair) {
    const sim = $("pathSimilarities");
    const diff = $("pathDifferences");
    const bp = $("pathPractices");
    if (sim) {
      sim.innerHTML = "";
      for (const s of pair?.similarities || []) {
        const li = document.createElement("li");
        li.textContent = `${s.kind}: ${s.text}`;
        sim.appendChild(li);
      }
    }
    if (diff) {
      diff.innerHTML = "";
      for (const d of pair?.differences || []) {
        const li = document.createElement("li");
        li.textContent = `${d.kind}: ${d.text}`;
        diff.appendChild(li);
      }
    }
    if (bp) {
      bp.innerHTML = "";
      for (const p of pair?.bestPractices || []) {
        const li = document.createElement("li");
        li.textContent = `${p.id}: ${p.title}`;
        bp.appendChild(li);
      }
    }
  }

  function renderPathGoldCoverage(coverage, route, completionHints) {
    const el = $("pathGoldCoverage");
    if (!el) return;
    if (coverage?.coverageGap) {
      el.textContent =
        "Coverage gap: verify tier requires hub structural suites or Chrysalis ingest CI but none are registered.";
      return;
    }
    if (coverage?.chrysalisCiGold) {
      const lane = completionHints?.phpOracleLane
        ? ` · ${completionHints.phpOracleLane.fixture} (${completionHints.phpOracleLane.completionField} in hub-completion)`
        : "";
      el.textContent = `CI: Chrysalis ingest + emit (PHP oracle path); hub structural suites not required.${lane}`;
      return;
    }
    const tier = route?.verifyTier ? ` · verifyTier ${route.verifyTier}` : "";
    if (!coverage?.suiteCount) {
      el.textContent = "CI gold suites: none for this emit target (matrix grade may still be gold via another lane).";
      return;
    }
    const trace = coverage.traceReplaySuiteIds?.length
      ? ` · trace replay: ${coverage.traceReplaySuiteIds.join(", ")}`
      : "";
    const roundTrip = coverage.roundTripSuiteIds?.length
      ? ` · round-trip: ${coverage.roundTripSuiteIds.join(", ")}`
      : "";
    const extended =
      completionHints?.assetExtendedNextjsGold?.suiteIds?.includes(
        `${coverage.origin}-literal-${coverage.emitTarget ?? ""}`,
      ) === true
        ? " · extended asset CI section"
        : "";
    const pros =
      coverage.pros?.length > 0
        ? ` · pros: ${coverage.pros.slice(0, 2).map((p) => p.id).join(", ")}`
        : "";
    const cons =
      coverage.cons?.length > 0
        ? ` · cons: ${coverage.cons.slice(0, 2).map((c) => c.id).join(", ")}`
        : "";
    const risk = coverage.riskLevel ? ` · risk ${coverage.riskLevel}` : "";
    el.textContent = `CI gold suites (${coverage.suiteCount}): ${coverage.suiteIds.join(", ")}${trace}${roundTrip}${tier}${extended}${risk}${pros}${cons}`;
  }

  async function applyPathPairToProject() {
    const origin = $("pathOrigin")?.value;
    const output = $("pathOutput")?.value;
    const summary = $("pathApplySummary");
    if (!consoleProjectId) {
      if (summary) summary.textContent = "Open Console and load a project first.";
      return;
    }
    if (!origin || !output) {
      if (summary) summary.textContent = "Select origin and output.";
      return;
    }
    if (summary) summary.textContent = "Applying path advice…";
    try {
      const report = await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/apply-path-advice`, {
        origin,
        output,
      });
      if (summary) {
        summary.textContent = `Applied ${origin} → ${output} · program ${report.migrationProgram?.id ?? "?"} · written ${report.writtenPath ?? report.artifactPath ?? "?"}`;
      }
    } catch (e) {
      if (summary) summary.textContent = "Apply error: " + e.message;
    }
  }

  async function loadMigrationPlan() {
    const origin = $("pathOrigin")?.value;
    const output = $("pathOutput")?.value;
    const summary = $("pathMigrationSummary");
    const stepsEl = $("pathMigrationSteps");
    if (!origin || !output) return;
    const databases = ($("pathMigrationDatabases")?.value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const params = new URLSearchParams({
      origin,
      outputs: output,
    });
    if (databases.length) params.set("databases", databases.join(","));
    if (lastScan?.services && Object.keys(lastScan.services).length > 0) {
      params.set("services", JSON.stringify(lastScan.services));
    }
    if (summary) summary.textContent = "Loading migration plan…";
    if (stepsEl) stepsEl.innerHTML = "";
    try {
      const plan = await api(`/api/hub/migration-plan?${params.toString()}`);
      if (summary) {
        const db =
          plan.databases?.detected?.length > 0
            ? plan.databases.detected.map((d) => d.id).join(", ")
            : "none detected";
        summary.textContent = `Recommended ${plan.recommendedOutput ?? "?"} · pair risk ${plan.pairSummary?.riskLevel ?? "?"} · databases: ${db}`;
      }
      if (stepsEl && Array.isArray(plan.steps)) {
        stepsEl.innerHTML = plan.steps.map((s) => `<li>${s}</li>`).join("");
      }
    } catch (e) {
      if (summary) summary.textContent = "Migration plan error: " + e.message;
    }
  }

  async function detectDatabasesFromLastScan() {
    const summary = $("pathMigrationSummary");
    const input = $("pathMigrationDatabases");
    if (!lastScan?.services || Object.keys(lastScan.services).length === 0) {
      if (summary) summary.textContent = "No scan services available — run SSH scan on a site first.";
      return;
    }
    try {
      const data = await api(
        `/api/hub/detect-databases?services=${encodeURIComponent(JSON.stringify(lastScan.services))}`,
      );
      const ids = (data.detectedIds ?? []).join(",");
      if (input && ids) input.value = ids;
      if (summary) summary.textContent = `Detected from scan: ${ids || "none"}`;
    } catch (e) {
      if (summary) summary.textContent = "Detect databases error: " + e.message;
    }
  }

  async function loadWebDatabasesTier1() {
    const summary = $("pathMigrationSummary");
    try {
      const data = await api("/api/hub/web-databases?tier=tier1");
      const ids = (data.databases ?? []).map((d) => d.id).join(",");
      const input = $("pathMigrationDatabases");
      if (input && ids) input.value = ids;
      if (summary) summary.textContent = `Tier-1 catalog (${data.databases?.length ?? 0}): ${ids}`;
    } catch (e) {
      if (summary) summary.textContent = "Web databases error: " + e.message;
    }
  }

  async function loadLanguageCompare() {
    const origin = $("pathOrigin")?.value;
    const output = $("pathOutput")?.value;
    const el = $("pathCompareSummary");
    if (!origin || !output || !el) return;
    const peers = ["hono", "fastify", "nextjs", "typescript", "java", "go", "python"].filter(
      (o) => o !== origin && o !== output,
    );
    const outputs = [output, ...peers.slice(0, 4)];
    try {
      const data = await api(
        `/api/hub/language-compare?origin=${encodeURIComponent(origin)}&outputs=${encodeURIComponent(outputs.join(","))}`,
      );
      const lines = data.candidates
        .slice(0, 5)
        .map((c) => `${c.output}: risk ${c.riskLevel}, idiom ${c.idiomLoss}`)
        .join(" · ");
      el.textContent = `Compare (${origin}): recommended ${data.recommended ?? "?"} — ${lines}`;
    } catch (e) {
      el.textContent = "Compare error: " + e.message;
    }
  }

  async function loadPathPair() {
    const origin = $("pathOrigin")?.value;
    const output = $("pathOutput")?.value;
    const summary = $("pathPairSummary");
    const jsonEl = $("pathPairJson");
    if (!origin || !output) return;
    if (summary) summary.textContent = "Loading…";
    if ($("pathGoldCoverage")) $("pathGoldCoverage").textContent = "";
    try {
      const [data, gold, goldCov, completionHints] = await Promise.all([
        api(
          `/api/hub/path-knowledge?origin=${encodeURIComponent(origin)}&output=${encodeURIComponent(output)}`,
        ),
        api(
          `/api/hub/gold-suites?origin=${encodeURIComponent(origin)}&output=${encodeURIComponent(output)}`,
        ),
        api(
          `/api/hub/gold-coverage?origin=${encodeURIComponent(origin)}&output=${encodeURIComponent(output)}`,
        ).catch(() => null),
        api("/api/hub/completion-sections").catch(() => null),
      ]);
      const path = data.path || {};
      const grade = data.pair?.grade ?? path.grade ?? "?";
      const routeGrade = gold.route?.grade ?? grade;
      if (summary) {
        const verifyTier = gold.route?.verifyTier ?? "?";
        summary.textContent = `${origin} → ${output}: grade ${routeGrade} · verifyTier ${verifyTier} · ingest ${path.ingest?.lane ?? "?"} · emit ${path.emit?.lane ?? "?"} · verify ${(path.verify?.lanes || []).join(", ") || "none"}`;
      }
      const coverage = {
        ...data.pair,
        origin,
        output,
        emitTarget: goldCov?.pair?.emitTarget,
        suiteIds: goldCov?.pair?.suiteIds ?? [],
        suiteCount: goldCov?.pair?.suiteCount ?? 0,
        traceReplaySuiteIds: goldCov?.pair?.traceReplaySuiteIds ?? [],
        coverageGap: goldCov?.pair?.coverageGap,
        chrysalisCiGold: goldCov?.pair?.chrysalisCiGold,
      };
      renderPathGoldCoverage(coverage, gold.route, completionHints);
      loadLanguageCompare().catch(() => {});
      loadMigrationPlan().catch(() => {});
      renderPathLists({
        similarities: data.pair?.similarities,
        differences: data.pair?.differences,
        bestPractices: data.bestPractices,
      });
      syncPathExplorerHash();
      if (jsonEl) {
        jsonEl.textContent = JSON.stringify({ pathKnowledge: data, goldSuites: gold }, null, 2);
      }
    } catch (e) {
      if (summary) summary.textContent = "Error: " + e.message;
      renderPathGoldCoverage(null);
      renderPathLists(null);
      if (jsonEl) jsonEl.textContent = "—";
    }
  }

  $("pathOrigin")?.addEventListener("change", () => {
    syncPathExplorerHash();
  });
  $("pathOutput")?.addEventListener("change", () => {
    syncPathExplorerHash();
  });

  async function loadPathMatrixFiltered() {
    const origin = $("pathOrigin")?.value;
    const output = $("pathOutput")?.value;
    const jsonEl = $("pathPairJson");
    const summary = $("pathPairSummary");
    if (summary) summary.textContent = "Loading matrix…";
    try {
      const params = new URLSearchParams();
      if (origin) params.set("origin", origin);
      if (output) params.set("output", output);
      const data = await api(`/api/hub/translation-path-matrix?${params.toString()}`);
      if (summary) summary.textContent = `Matrix: ${data.pairCount ?? data.pairs?.length ?? 0} pair(s)`;
      if (jsonEl) jsonEl.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      if (summary) summary.textContent = "Error: " + e.message;
    }
  }

  $("btnLoadSynthesis")?.addEventListener("click", () => {
    loadPathSynthesis().catch(() => {});
  });
  $("btnLoadPathPair")?.addEventListener("click", () => {
    loadPathPair().catch(() => {});
  });
  $("btnLoadPathMatrix")?.addEventListener("click", () => {
    loadPathMatrixFiltered().catch(() => {});
  });
  $("btnLoadMigrationPlan")?.addEventListener("click", () => {
    loadMigrationPlan().catch(() => {});
  });
  $("btnApplyPathToProject")?.addEventListener("click", () => {
    applyPathPairToProject().catch(() => {});
  });
  $("btnDetectDatabasesFromScan")?.addEventListener("click", () => {
    detectDatabasesFromLastScan().catch(() => {});
  });
  $("btnLoadWebDatabases")?.addEventListener("click", () => {
    loadWebDatabasesTier1().catch(() => {});
  });

  async function exportLanguageWorkQueue() {
    const el = $("workQueueExportStatus");
    const scope = $("readinessScope")?.value || "popular-web";
    const gradeFilter = $("readinessGrade")?.value || "all";
    let gradesParam = "open,silver";
    if (gradeFilter === "gold" || gradeFilter === "silver" || gradeFilter === "open") {
      gradesParam = gradeFilter;
    }
    const params = new URLSearchParams();
    if (scope !== "all") params.set("scope", scope);
    params.set("grades", gradesParam);
    if (el) el.textContent = "Preparing work queue…";
    try {
      const r = await fetch(`/api/hub/language-work-queue?${params.toString()}`);
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error((j && j.error) || r.statusText);
      const blob = new Blob([JSON.stringify(j, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "chrysalis.language-work-queue.json";
      a.click();
      URL.revokeObjectURL(a.href);
      if (el) el.textContent = `Saved ${j.count ?? 0} item(s); grades=${gradesParam}, scope=${scope}.`;
    } catch (e) {
      if (el) el.textContent = "Export failed: " + e.message;
    }
  }

  $("btnExportWorkQueue")?.addEventListener("click", () => {
    exportLanguageWorkQueue().catch(() => {});
  });

  async function deleteProjectFromHome(id) {
    if (!confirm(`Delete project ${id}? Workspace files remain on disk.`)) return;
    await api(`/api/hub/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadHome();
  }

  $("btnJoinOrg")?.addEventListener("click", async () => {
    const orgId = $("joinOrgId")?.value?.trim();
    if (!orgId) {
      $("orgStatus").textContent = "Enter an org id to join.";
      return;
    }
    try {
      await api(`/api/hub/orgs/${encodeURIComponent(orgId)}/join`, { method: "POST", body: {} });
      $("orgStatus").textContent = `Joined org ${orgId}.`;
      await loadOrgs($("newOrgId"));
      await loadHome();
    } catch (e) {
      $("orgStatus").textContent = "Error: " + e.message;
    }
  });

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

  const guideCache = new Map();
  async function loadGuideDoc(path) {
    const el = $("guideBody");
    if (!el) return;
    if (guideCache.has(path)) {
      el.innerHTML = guideCache.get(path);
      return;
    }
    el.innerHTML = "<p class=\"muted\">Loading…</p>";
    try {
      const r = await fetch(path);
      const md = await r.text();
      const html = renderInstallMarkdown(md);
      guideCache.set(path, html);
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = `<p class="muted">Could not load guide: ${esc(e.message)}.</p>`;
    }
  }

  $("btnGuideInstall")?.addEventListener("click", () => loadGuideDoc("/docs/hub-install"));
  $("btnGuideConnectivity")?.addEventListener("click", () => loadGuideDoc("/docs/hub-connectivity"));

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
    if ($("consoleProjOutput")) fillSelect($("consoleProjOutput"), outputLanguages, defaultOutput);
    if ($("originHint")) $("originHint").textContent = `${inputLanguages.length} origin languages in catalog.`;
    if ($("outputHint")) $("outputHint").textContent = `${outputLanguages.length} output targets.`;
    $("originLanguage")?.addEventListener("change", refreshRouteStatus);
    $("outputLanguage")?.addEventListener("change", refreshRouteStatus);
    await refreshRouteStatus();
  }

  function batchJobBody(extra = {}) {
    const n = Number($("batchConcurrency")?.value);
    return {
      ...(Number.isFinite(n) && n > 0 ? { concurrency: n } : {}),
      prepSites: $("batchPrepSites")?.checked === true,
      ...extra,
    };
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
      if (r.detection?.services && Object.keys(r.detection.services).length > 0) {
        detectDatabasesFromLastScan().catch(() => {});
      }
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
        await post(`/api/hub/projects/${encodeURIComponent(id)}/run-pipeline`, batchJobBody());
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

  async function createLocalProject(runPipelineAfter) {
    $("createStatus").textContent = "Creating local workspace…";
    const name = $("projName").value.trim() || "Local project";
    const body = {
      name,
      description: $("projDesc").value.trim(),
      orgId: $("newOrgId")?.value?.trim() || null,
      originLanguage: $("originLanguage").value,
      outputLanguage: $("outputLanguage").value,
      sites: [],
      prepOrigin: false,
      pullFromSsh: false,
      detectLanguages: false,
      backgroundSetup: false,
      runSetup: false,
    };
    const r = await api("/api/hub/projects", { method: "POST", body });
    const id = r.project.id;
    $("createStatus").textContent = `Created ${id} with hub workspace (copy PHP tree into site folder in Console).`;
    location.hash = `#/console?id=${encodeURIComponent(id)}`;
    route();
    if (runPipelineAfter) {
      await post(`/api/hub/projects/${encodeURIComponent(id)}/run-pipeline`, batchJobBody());
    }
  }

  $("btnCreateLocalProject")?.addEventListener("click", () => {
    createLocalProject(false).catch((e) => {
      $("createStatus").textContent = "Error: " + e.message;
    });
  });

  async function createCwlFullstackProject() {
    $("createStatus").textContent = "Creating CWL full-stack workspace…";
    const body = {
      name: $("projName").value.trim() || "CWL full-stack app",
      description: $("projDesc").value.trim(),
      orgId: $("newOrgId")?.value?.trim() || null,
      originLanguage: "cwl",
      outputLanguage: "cwl",
      sites: [],
      prepOrigin: false,
      pullFromSsh: false,
      detectLanguages: false,
      backgroundSetup: false,
      runSetup: false,
      cwlBootstrap: true,
    };
    const r = await api("/api/hub/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const id = r.project.id;
    $("createStatus").textContent = `Created CWL project ${id} with flagship .chrysalis/migration.cwl + hole budget. Open Console to preview or translate.`;
    location.hash = `#/console?id=${encodeURIComponent(id)}`;
    route();
  }

  $("btnCreateCwlFullstack")?.addEventListener("click", () => {
    createCwlFullstackProject().catch((e) => {
      $("createStatus").textContent = "Error: " + e.message;
    });
  });

  let consoleProjectId = null;
  let consoleProject = null;

  let selectedSiteId = null;

  function bindSiteToForm(site, meta) {
    if (!site) return;
    if ($("siteName")) $("siteName").value = site.name || "";
    if ($("siteOrigin")) $("siteOrigin").value = site.originLanguage || $("siteOrigin").value;
    if ($("siteHost")) $("siteHost").value = site.ssh?.host || "";
    if ($("siteUser")) $("siteUser").value = site.ssh?.user || "";
    if ($("sitePort")) $("sitePort").value = String(site.ssh?.port ?? 22);
    if ($("sitePath")) $("sitePath").value = site.ssh?.remotePath || site.localDir || "";
    if ($("siteKey")) $("siteKey").value = site.ssh?.identityFile || "";
    if ($("verifyBaseUrl") && site.runtime?.baseUrl) $("verifyBaseUrl").value = site.runtime.baseUrl;
    if ($("verifyTracesDir") && meta?.defaultTracesDir) {
      $("verifyTracesDir").placeholder = meta.defaultTracesDir;
      if (!$("verifyTracesDir").value) $("verifyTracesDir").value = "";
    }
    const vs = meta?.verifySummary;
    if (vs && $("verifyStatus")) {
      const pct = vs.correctness != null ? `${Math.round(vs.correctness * 100)}%` : vs.state || "—";
      $("verifyStatus").textContent = `Last verify: ${pct} (${vs.passedRoutes ?? "?"}/${vs.totalRoutes ?? "?"} routes)`;
    }
  }

  function renderObserveAssist(assist) {
    const el = $("observeGuide");
    if (!el) return;
    const steps = (assist.stagingSteps || [])
      .map((s, i) => `<li>${esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</li>`)
      .join("");
    const cmds = Object.entries(assist.commands || {})
      .map(([k, v]) => `<li><strong>${esc(k)}</strong><pre style="margin:0.25rem 0">${esc(v)}</pre></li>`)
      .join("");
    el.innerHTML = `<p class="muted">${esc(assist.note || "")}</p>
      <p><strong>Hub traces:</strong> <code>${esc(assist.hubTracesDir)}</code></p>
      <ol>${steps}</ol>
      <h4 style="margin:0.5rem 0 0.25rem">Commands</h4><ul style="padding-left:1.2rem">${cmds}</ul>`;
  }

  async function loadConsoleMigrationPlan() {
    const summary = $("consoleMigrationSummary");
    const stepsEl = $("consoleMigrationSteps");
    if (!consoleProject) {
      if (summary) summary.textContent = "No project loaded.";
      return;
    }
    const origin = consoleProject.originLanguage || "php";
    const output = consoleProject.outputLanguage || "typescript";
    const detected = new Set();
    for (const site of consoleProject.sites || []) {
      const services = site.detection?.services;
      if (!services) continue;
      try {
        const data = await api(
          `/api/hub/detect-databases?services=${encodeURIComponent(JSON.stringify(services))}`,
        );
        for (const id of data.detectedIds ?? []) detected.add(id);
      } catch {
        /* ignore per-site detect errors */
      }
    }
    const params = new URLSearchParams({ origin, outputs: output });
    if (detected.size) params.set("databases", [...detected].join(","));
    const mergedServices = {};
    for (const site of consoleProject.sites || []) {
      Object.assign(mergedServices, site.detection?.services ?? {});
    }
    if (Object.keys(mergedServices).length) {
      params.set("services", JSON.stringify(mergedServices));
    }
    if (summary) summary.textContent = "Loading migration plan…";
    if (stepsEl) stepsEl.innerHTML = "";
    try {
      const plan = await api(`/api/hub/migration-plan?${params.toString()}`);
      if (summary) {
        const db =
          plan.databases?.detected?.length > 0
            ? plan.databases.detected.map((d) => d.id).join(", ")
            : "none detected";
        summary.textContent = `${origin} → ${output}: recommended ${plan.recommendedOutput ?? "?"} · risk ${plan.pairSummary?.riskLevel ?? "?"} · databases: ${db}`;
      }
      if (stepsEl && Array.isArray(plan.steps)) {
        stepsEl.innerHTML = plan.steps.map((s) => `<li>${s}</li>`).join("");
      }
    } catch (e) {
      if (summary) summary.textContent = "Migration plan error: " + e.message;
    }
  }

  async function loadRoutePlan(projectId) {
    const sum = $("routePlanSummary");
    const ul = $("routePlanList");
    if (!sum || !ul) return;
    try {
      const r = await api(`/api/hub/projects/${encodeURIComponent(projectId)}/route-plan`);
      const rows = r.sitePlans || [];
      const runnable = rows.filter((x) => (x.plan?.runnable?.length ?? 0) > 0).length;
      const blocked = rows.length - runnable;
      sum.textContent = `${rows.length} site(s): ${runnable} runnable on hub, ${blocked} with holes/scaffold path.`;
      ul.innerHTML = "";
      for (const row of rows) {
        const li = document.createElement("li");
        const run = row.plan?.runnable?.[0];
        const hole = row.plan?.holes?.[0];
        li.textContent = hole
          ? `${row.siteName}: ${row.origin} → ${row.output} — hole: ${hole.name}`
          : `${row.siteName}: ${row.origin} → ${row.output} — ${run?.grade || run?.action || "ok"}`;
        ul.appendChild(li);
      }
      if (!rows.length && r.plan) {
        const li = document.createElement("li");
        li.textContent = `${r.plan.originLanguage} → ${r.plan.outputLanguage}: ${r.plan.runnable?.length ? "runnable" : r.plan.holes?.[0]?.name || "unknown"}`;
        ul.appendChild(li);
        sum.textContent = `Project route: ${r.plan.runnable?.length ? "runnable" : "holes — may use WPTP/scaffold"}.`;
      }
    } catch (e) {
      sum.textContent = "Route plan: " + e.message;
      ul.innerHTML = "";
    }
  }

  function selectedSiteLocalDir() {
    const site = consoleProject?.sites?.find((s) => s.id === selectedSiteId);
    return site?.localDir || consoleProject?.localDir || null;
  }

  function renderSitesList(p) {
    const el = $("sitesList");
    if (!el) return;
    el.innerHTML = "";
    const output = p.outputLanguage || "?";
    for (const site of p.sites || []) {
      const meta = p.siteMeta?.[site.id];
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
        site.verifyCorrectness != null
          ? `${Math.round(site.verifyCorrectness * 100)}%`
          : meta?.verifySummary?.correctness != null
            ? `${Math.round(meta.verifySummary.correctness * 100)}%`
            : site.verifyState === "passed"
              ? "ok"
              : "";
      const tracesHint = meta?.defaultTracesDir ? ` · traces ready` : "";
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
        <div class="muted">${esc(site.originLanguage || p.originLanguage)} → ${esc(output)} · ${esc(site.ssh?.host || "local")} · ${esc(prepLabel)} · verify: ${esc(vState)} ${esc(vPct)}${esc(tracesHint)}${esc(rt)} ${healthBadge}</div>
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
        const site = (p.sites || []).find((s) => s.id === selectedSiteId);
        bindSiteToForm(site, p.siteMeta?.[selectedSiteId]);
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
    consoleProject = p;
    $("consoleTitle").textContent = p.name;
    if ($("consoleProjName")) $("consoleProjName").value = p.name || "";
    if ($("consoleProjOutput")) $("consoleProjOutput").value = p.outputLanguage || defaultOutput;
    selectedSiteId = p.sites?.[0]?.id ?? null;
    renderSitesList(p);
    const first = p.sites?.find((s) => s.id === selectedSiteId);
    bindSiteToForm(first, p.siteMeta?.[selectedSiteId]);
    void loadRoutePlan(id);
    void loadConsoleMigrationPlan();
    void loadConsoleEvidence();
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
    const isEl = $("isRoutingSummary");
    if (isEl) {
      if (j?.isRouting) {
        const tier = j.isRouting.tier ?? "—";
        const skip = j.isRouting.skipLlm === true ? "yes" : "no";
        let text = `IS routing: ${tier} · skipLlm ${skip} · domain ${j.isRouting.domainId ?? "—"}`;
        const hp = j.holeProposals;
        if (hp?.proposalCount > 0) {
          text += ` · holes ${hp.proposalCount}`;
          if (hp.applied === true) text += " · applied";
          else if (hp.llmEnriched === true) text += hp.llmUsed ? " · LLM enriched" : " · stub enriched";
        }
        isEl.textContent = text;
      } else if (!j || j.state === "idle") {
        isEl.textContent = "IS routing: idle";
      }
    }
    if (!j || j.state === "idle") {
      if (hubSetupState !== "running" && hubBatchState !== "running") setPortalBusy(false);
      return;
    }
    const isNote = j.isRouting
      ? ` · IS ${j.isRouting.tier ?? "?"}${j.isRouting.skipLlm ? " skipLlm" : ""}`
      : "";
    setPortalBusy(j.state === "running", (j.kind || "job") + " · " + j.state + isNote);
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

  $("btnLoadConsoleMigrationPlan")?.addEventListener("click", () => {
    loadConsoleMigrationPlan().catch(() => {});
  });

  async function loadConsoleEvidence() {
    const summary = $("consoleEvidenceSummary");
    const blockersEl = $("consoleEvidenceBlockers");
    const jsonEl = $("consoleEvidenceJson");
    if (!consoleProjectId) {
      if (summary) summary.textContent = "No project loaded.";
      return;
    }
    if (summary) summary.textContent = "Loading evidence…";
    if (blockersEl) blockersEl.innerHTML = "";
    try {
      const ev = await api(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/evidence`);
      const pct =
        ev.verify?.correctness != null ? `${Math.round(ev.verify.correctness * 100)}%` : "n/a";
      const holes = ev.holes?.count ?? "?";
      const gate = ev.verifyGate?.pass ? "PASS" : ev.verify?.available ? "FAIL" : "pending";
      let trendNote = "";
      const dc = ev.trend?.deltaCorrectness;
      if (dc != null && Number.isFinite(dc)) {
        const sign = dc >= 0 ? "+" : "";
        trendNote = ` · trend ${sign}${Math.round(dc * 100)}% correctness`;
      } else if ((ev.trend?.points ?? 0) === 0) {
        trendNote = " · trend (no history; run pipeline with verify gate)";
      }
      if (summary) {
        const program = ev.pipelineGate?.programId ?? ev.migrationPlan?.programId;
        const tier = ev.pipelineGate?.readinessTier ?? ev.migrationPlan?.readinessTier;
        const planNote =
          program || tier
            ? ` · ${tier ?? "?"} / ${program ?? "?"}`
            : "";
        const next = ev.migrationPlan?.nextSteps?.[0];
        summary.textContent = `Verify ${pct} · holes ${holes} · gate ${gate} · pipeline ${ev.pipelineGate?.pass ? "PASS" : "pending"} · delivery ${(ev.deliveryScore ?? 0).toFixed(2)}${trendNote}${planNote}${next ? ` · next: ${next.slice(0, 72)}${next.length > 72 ? "…" : ""}` : ""}`;
      }
      if (blockersEl && Array.isArray(ev.blockers)) {
        blockersEl.innerHTML =
          ev.blockers.length === 0
            ? "<li>No blockers</li>"
            : ev.blockers.map((b) => `<li>${esc(b.kind)}: ${esc(b.detail)}</li>`).join("");
      }
      if (jsonEl) {
        jsonEl.hidden = false;
        jsonEl.textContent = JSON.stringify(ev, null, 2);
      }
    } catch (e) {
      if (summary) summary.textContent = "Evidence error: " + e.message;
    }
  }

  async function loadConsoleAssessment() {
    const summary = $("consoleAssessmentSummary");
    if (!consoleProjectId) {
      if (summary) summary.textContent = "No project loaded.";
      return;
    }
    if (summary) summary.textContent = "Running assessment…";
    try {
      const report = await api(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/migration-assessment`);
      if (summary) {
        summary.textContent = `Readiness ${report.readinessTier} · ${report.origin} → ${report.output} · program ${report.program?.id ?? "?"} · routes ${report.siteIntelligence?.routeEstimate?.count ?? "?"}`;
      }
    } catch (e) {
      if (summary) summary.textContent = "Assessment error: " + e.message;
    }
  }

  async function loadConsoleDeliveryDashboard() {
    const gapsEl = $("consoleVerifyGapsSummary");
    const chimeraEl = $("consoleChimeraSummary");
    const artifactsEl = $("consoleArtifactList");
    const licenseEl = $("consoleLicenseSummary");
    if (!consoleProjectId) {
      if (gapsEl) gapsEl.textContent = "No project loaded.";
      return;
    }
    if (gapsEl) gapsEl.textContent = "Loading delivery dashboard…";
    if (chimeraEl) chimeraEl.textContent = "";
    if (artifactsEl) artifactsEl.innerHTML = "";
    try {
      const dash = await api(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/delivery-dashboard`);
      await loadConsoleEvidence();
      if (licenseEl && dash.license) {
        const lic = dash.license;
        licenseEl.textContent = lic.requireLicense
          ? `License ${lic.gatePass ? "OK" : "FAIL"} · tier ${lic.tier ?? "?"}${lic.configuredMinTier ? ` (min ${lic.configuredMinTier})` : ""}`
          : "License gate off (OSS mode)";
      }
      if ($("consoleAssessmentSummary") && dash.assessment) {
        $("consoleAssessmentSummary").textContent = `Readiness ${dash.assessment.readinessTier} · program ${dash.assessment.programId ?? "?"}`;
      }
      if (gapsEl) {
        const next = dash.verifyGaps?.ingestNext;
        gapsEl.textContent = next
          ? `Top verify gap: ${next.divergenceKind} (${next.failedTraceRows} row(s)) — ${next.playbook?.title ?? "see backlog"}`
          : dash.verifyGaps?.available
            ? "Verify gaps: no backlog items"
            : "Verify gaps: no verify report yet";
      }
      if (chimeraEl && dash.chimera) {
        chimeraEl.textContent = `Chimera phase ${dash.chimera.currentPhase ?? "?"} · prep gates ${dash.chimera.prepGatesPass ? "PASS" : "pending"}`;
      }
      if (artifactsEl && Array.isArray(dash.artifacts)) {
        artifactsEl.innerHTML = dash.artifacts
          .map((a) => `<li>${a.exists ? "✓" : "○"} ${esc(a.name)}</li>`)
          .join("");
      }
      const cwlEl = $("consoleCwlPreviewSummary");
      if (cwlEl) {
        if (dash.cwlPreview?.ok) {
          const budget = dash.fullstackHoleBudget;
          const budgetText = budget
            ? ` · hole budget ${budget.check?.ok ? "PASS" : "FAIL"} (${budget.liveHoleCount ?? "?"} / max ${budget.budget?.maxHoles ?? "?"})`
            : "";
          cwlEl.textContent = `CWL preview: ${dash.cwlPreview.routeCount ?? 0} routes${dash.cwlPreview.holeCount ? ` (${dash.cwlPreview.holeCount} holes)` : ""}${budgetText}${dash.cwlPreview.imports?.length ? ` · ${dash.cwlPreview.imports.length} import(s)` : ""}`;
        } else if (dash.cwlPreview === null) {
          cwlEl.textContent = "CWL preview: no migration.cwl";
        } else {
          cwlEl.textContent = "CWL preview: unavailable";
        }
      }
      const laravelEl = $("consoleLaravelGapsSummary");
      if (laravelEl && dash.laravelGlobalGaps) {
        const next = dash.laravelGlobalGaps.ingestNext;
        laravelEl.textContent = next
          ? `Laravel global gap: ${next.divergenceKind} — ${next.playbook?.title ?? "see backlog"}`
          : `Laravel global gaps: ${dash.laravelGlobalGaps.backlogCount ?? 0} item(s)`;
      } else if (laravelEl) {
        laravelEl.textContent = "";
      }
      const laravelActionEl = $("consoleLaravelActionSummary");
      if (laravelActionEl && dash.laravelGlobalAction?.ingestRemediation) {
        const rem = dash.laravelGlobalAction.ingestRemediation;
        laravelActionEl.textContent = `Laravel ingest action: ${rem.divergenceKind} → ${rem.suggestedCommand ?? rem.owner ?? "packages/ingest"}`;
      } else if (laravelActionEl) {
        laravelActionEl.textContent = "";
      }
    } catch (e) {
      if (gapsEl) gapsEl.textContent = "Delivery dashboard error: " + e.message;
    }
  }

  $("btnLoadConsoleEvidence")?.addEventListener("click", () => {
    loadConsoleEvidence().catch(() => {});
  });
  $("btnLoadConsoleAssessment")?.addEventListener("click", () => {
    loadConsoleAssessment().catch(() => {});
  });
  $("btnLoadConsoleDelivery")?.addEventListener("click", () => {
    loadConsoleDeliveryDashboard().catch(() => {});
  });

  async function runConsoleCwlPreview() {
    const summary = $("consoleCwlPreviewSummary");
    const probeEl = $("consoleCwlPreviewProbe");
    const dir = selectedSiteLocalDir();
    if (!dir) {
      if (summary) summary.textContent = "CWL preview: no project directory";
      return;
    }
    if (summary) summary.textContent = "Running CWL runtime preview…";
    if (probeEl) {
      probeEl.style.display = "none";
      probeEl.textContent = "";
    }
    try {
      const report = await post("/api/hub/cwl-preview", { projectDir: dir, probe: true });
      if (summary) {
        const probe = report.probe;
        const diag = report.diagnose;
        const diagLine = diag
          ? ` · lint ${diag.diagnostics?.filter((d) => d.severity === "warn").length ?? 0} warn`
          : "";
        const probeLine =
          probe && typeof probe.status === "number"
            ? ` · probe ${probe.route ?? "GET"} → ${probe.status}`
            : probe?.skipped
              ? ` · probe skipped (${probe.skipped})`
              : probe?.error
                ? ` · probe error`
                : "";
        summary.textContent = `CWL preview: ${report.routeCount ?? 0} route(s)${report.holeCount ? ` (${report.holeCount} holes)` : ""}${probeLine}${diagLine}`;
      }
      if (probeEl && report.probe) {
        probeEl.style.display = "block";
        probeEl.textContent = JSON.stringify(report.probe, null, 2);
      }
    } catch (e) {
      if (summary) summary.textContent = "CWL preview error: " + e.message;
    }
  }

  $("btnRunCwlPreview")?.addEventListener("click", () => {
    runConsoleCwlPreview().catch(() => {});
  });

  $("btnRunPipeline")?.addEventListener("click", async () => {
    $("log").textContent = "";
    $("siteActionStatus").textContent = "Starting full pipeline (setup + translate)…";
    try {
      await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/run-pipeline`, batchJobBody());
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
      await post(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}/run-batch`, batchJobBody());
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
      renderObserveAssist(g);
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

  $("btnSaveProject")?.addEventListener("click", async () => {
    if (!consoleProjectId) return;
    try {
      const r = await api(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}`, {
        method: "PATCH",
        body: {
          name: $("consoleProjName")?.value?.trim(),
          outputLanguage: $("consoleProjOutput")?.value,
        },
      });
      $("projectSettingsStatus").textContent = "Project saved.";
      await loadConsoleProject(consoleProjectId);
      $("consoleTitle").textContent = r.project?.name || $("consoleProjName")?.value;
    } catch (e) {
      $("projectSettingsStatus").textContent = "Error: " + e.message;
    }
  });

  $("btnDeleteProject")?.addEventListener("click", async () => {
    if (!consoleProjectId) return;
    if (!confirm(`Delete project ${consoleProjectId}?`)) return;
    await api(`/api/hub/projects/${encodeURIComponent(consoleProjectId)}`, { method: "DELETE" });
    location.hash = "#/";
    route();
    loadHome();
  });

  $("btnRunStatus")?.addEventListener("click", async () => {
    const dir = selectedSiteLocalDir();
    if (!dir) {
      $("statusJson").textContent = "Select a site with a workspace first.";
      return;
    }
    $("statusJson").textContent = "Running chrysalis status…";
    try {
      await post("/api/jobs/status", { projectDir: dir });
    } catch (e) {
      $("statusJson").textContent = "Error: " + e.message;
    }
  });

  $("btnRefreshHealth")?.addEventListener("click", async () => {
    if (!selectedSiteId || !consoleProjectId) {
      $("observeGuide").textContent = "Select a site first.";
      return;
    }
    try {
      const h = await api(
        `/api/hub/projects/${encodeURIComponent(consoleProjectId)}/sites/${encodeURIComponent(selectedSiteId)}/runtime/health`,
      );
      $("verifyStatus").textContent = h.ok
        ? `Health OK (${h.status}, ${h.latencyMs}ms)`
        : `Health fail: ${h.error || h.status}`;
      await loadConsoleProject(consoleProjectId);
    } catch (e) {
      $("verifyStatus").textContent = "Health: " + e.message;
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
