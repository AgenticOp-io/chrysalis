/**
 * WISP plan/deploy module shell — converted SharedMap parent bridge
 * (Module_Manager SharedMap.svelte + plan/+page.svelte + deploy/+page.svelte).
 * G9949 / G9950 / G9951 / D6433 / D6435.
 */
(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mapIframe() {
    return (
      qs("#plan-map-iframe") ||
      qs("#deploy-map-iframe") ||
      qs("iframe.plan-map-iframe") ||
      qs('iframe[src*="coverage-map"]')
    );
  }

  function postToMap(type, payload, source) {
    var iframe = mapIframe();
    if (!iframe || !iframe.contentWindow) return false;
    iframe.contentWindow.postMessage(
      {
        source: source || "shared-map",
        type: type,
        payload: payload || {},
        detail: payload || {},
      },
      "*",
    );
    return true;
  }

  /** Parent sources SharedMap + legacy shells accept. */
  function postToMapBoth(type, payload) {
    postToMap(type, payload, "shared-map");
    postToMap(type, payload, "wisp-plan-shell");
    if (
      type === "enable-rectangle-drawing" ||
      type === "disable-rectangle-drawing" ||
      type === "layer-filters-changed" ||
      type === "marketing-draw"
    ) {
      postToMap(type, payload, "plan-page");
    }
  }

  var mapState = {
    mode: qs('[data-wisp-page="deploy"]') ? "deploy" : "plan",
    activePlan: null,
    activePlanId: null,
    projects: [],
    stagedFeatures: [],
    productionHardware: [],
    visibleProjects: [],
    projectOverlays: [],
    layerFilters: {
      showTowers: true,
      showSectors: true,
      showMarketing: true,
      showCPE: true,
      showEquipment: true,
      showBackhaul: false,
      showNetworkAssets: true,
      showPlanFeatures: true,
      bandFilters: [
        { band: "LTE", enabled: true },
        { band: "CBRS", enabled: true },
        { band: "FWA", enabled: true },
        { band: "5G", enabled: true },
        { band: "WiFi", enabled: true },
      ],
    },
    lastExtent: null,
    filterMode: "all",
    lastMarketingRect: null,
  };

  /** Origin MapCapabilities.ts — deploy is interactive (tasks/progress), not read-only. */
  function capabilitiesForMode(mode) {
    if (mode === "deploy") {
      return {
        mode: "deploy",
        canAddTemporary: false,
        canEditTemporary: false,
        canDeleteTemporary: false,
        canApprove: false,
        canAssignTasks: true,
        canMarkProgress: true,
        readOnly: false,
      };
    }
    if (mode === "monitor") {
      return {
        mode: "monitor",
        canAddTemporary: false,
        canEditTemporary: false,
        canDeleteTemporary: false,
        canApprove: false,
        canAssignTasks: false,
        canMarkProgress: false,
        readOnly: true,
      };
    }
    return {
      mode: "plan",
      canAddTemporary: true,
      canEditTemporary: true,
      canDeleteTemporary: true,
      canApprove: true,
      canAssignTasks: false,
      canMarkProgress: false,
      readOnly: false,
    };
  }

  function apiFetch(path, opts) {
    opts = opts || {};
    if (window.WispCwlApi && typeof window.WispCwlApi.fetch === "function") {
      return window.WispCwlApi.fetch(path, opts);
    }
    var headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
    return fetch(path, Object.assign({ credentials: "same-origin" }, opts, { headers: headers }));
  }

  function openModal(title, bodyHtml) {
    var existing = qs(".wisp-wizard-overlay[data-wisp-shell-modal]");
    if (existing) existing.parentNode.removeChild(existing);
    var overlay = document.createElement("div");
    overlay.className = "wisp-wizard-overlay";
    overlay.setAttribute("data-wisp-shell-modal", "1");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="wisp-wizard-modal"><header><h2>' +
      escapeHtml(title) +
      '</h2><button type="button" class="wisp-wizard-close" aria-label="Close">×</button></header>' +
      '<div class="wisp-wizard-desc wisp-shell-modal-body">' +
      (bodyHtml || "") +
      "</div>" +
      '<footer><button type="button" class="wisp-demo-btn wisp-wizard-cancel">Close</button></footer></div>';
    document.body.appendChild(overlay);
    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay || ev.target.closest(".wisp-wizard-close, .wisp-wizard-cancel")) {
        close();
      }
    });
    return { overlay: overlay, close: close };
  }

  function toastSummary(html) {
    var summary = qs("#plan-active-summary");
    if (!summary) return;
    summary.hidden = false;
    summary.innerHTML = html;
  }

  function activePlanSummary(plan) {
    if (!plan) return null;
    return {
      id: plan.id || plan._id || null,
      name: plan.name || plan.title || null,
      status: plan.status || null,
      lat: plan.lat != null ? plan.lat : plan.location && plan.location.lat,
      lng:
        plan.lng != null
          ? plan.lng
          : plan.lon != null
            ? plan.lon
            : plan.location && plan.location.lng,
      marketing: plan.marketing || null,
    };
  }

  function postStateToIframe() {
    var plan = mapState.activePlan;
    var marketing = plan && plan.marketing;
    var activePlanMarketing =
      marketing && plan.showOnMap !== false
        ? {
            targetRadiusMiles: marketing.targetRadiusMiles || null,
            lastResultCount: marketing.lastResultCount || null,
            lastBoundingBox: marketing.lastBoundingBox || null,
            lastCenter: marketing.lastCenter || null,
            addresses: Array.isArray(marketing.addresses) ? marketing.addresses : [],
          }
        : null;
    // Mirror origin SharedMap.svelte state-update payload so the coverage-map
    // island can render staged plan features + production hardware and honor
    // mode capabilities (deploy is NOT read-only in origin MapCapabilities).
    postToMapBoth("state-update", {
      mode: mapState.mode,
      state: {
        mode: mapState.mode,
        activePlanId: mapState.activePlanId,
        activePlan: activePlanSummary(plan),
        activePlanMarketing: activePlanMarketing,
        stagedSummary: mapState.stagedSummary || { total: 0, byType: {}, byStatus: {} },
        stagedFeatures: Array.isArray(mapState.stagedFeatures) ? mapState.stagedFeatures : [],
        productionHardware: Array.isArray(mapState.productionHardware)
          ? mapState.productionHardware
          : [],
        visibleProjects: Array.isArray(mapState.visibleProjects) ? mapState.visibleProjects : [],
        projectOverlays: Array.isArray(mapState.projectOverlays) ? mapState.projectOverlays : [],
        layerFilters: mapState.layerFilters,
        lastUpdated: mapState.lastUpdated || Date.now(),
        capabilities: capabilitiesForMode(mapState.mode),
      },
    });
  }

  function summarizeStaged(features) {
    var byType = {};
    var byStatus = {};
    (features || []).forEach(function (f) {
      if (!f) return;
      var t = String(f.type || f.kind || "feature");
      var s = String(f.status || "unknown");
      byType[t] = (byType[t] || 0) + 1;
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    return { total: (features || []).length, byType: byType, byStatus: byStatus };
  }

  /** Load plan features + production hardware like origin MapLayerManager.loadPlan. */
  function loadPlanMapLayers(plan) {
    var planId = planIdOf(plan);
    var hardwareP = apiFetch("/api/network/equipment")
      .then(function (r) {
        return r.ok ? r.json() : [];
      })
      .then(function (data) {
        var rows = Array.isArray(data)
          ? data
          : Array.isArray(data && data.equipment)
            ? data.equipment
            : Array.isArray(data && data.items)
              ? data.items
              : [];
        mapState.productionHardware = rows;
        return rows;
      })
      .catch(function () {
        mapState.productionHardware = mapState.productionHardware || [];
        return mapState.productionHardware;
      });
    var featuresP = planId
      ? apiFetch("/api/plans/" + encodeURIComponent(planId) + "/features")
          .then(function (r) {
            return r.ok ? r.json() : [];
          })
          .then(function (data) {
            var rows = Array.isArray(data)
              ? data
              : Array.isArray(data && data.features)
                ? data.features
                : Array.isArray(data && data.items)
                  ? data.items
                  : [];
            mapState.stagedFeatures = rows;
            mapState.stagedSummary = summarizeStaged(rows);
            return rows;
          })
          .catch(function () {
            mapState.stagedFeatures = mapState.stagedFeatures || [];
            mapState.stagedSummary = summarizeStaged(mapState.stagedFeatures);
            return mapState.stagedFeatures;
          })
      : Promise.resolve([]);
    return Promise.all([hardwareP, featuresP]).then(function () {
      mapState.lastUpdated = Date.now();
      postStateToIframe();
    });
  }

  function setActivePlan(plan, opts) {
    opts = opts || {};
    mapState.activePlan = plan || null;
    mapState.activePlanId = plan ? plan.id || plan._id || null : null;
    postStateToIframe();
    loadPlanMapLayers(plan);
    postToMapBoth("select-plan", {
      planId: mapState.activePlanId,
      lat: plan && (plan.lat != null ? plan.lat : plan.location && plan.location.lat),
      lon:
        plan &&
        (plan.lng != null
          ? plan.lng
          : plan.lon != null
            ? plan.lon
            : plan.location && plan.location.lng),
    });
    if (opts.center && plan) {
      var lat = plan.lat != null ? Number(plan.lat) : plan.location && Number(plan.location.lat);
      var lon =
        plan.lng != null
          ? Number(plan.lng)
          : plan.lon != null
            ? Number(plan.lon)
            : plan.location && Number(plan.location.lng || plan.location.lon);
      if (isFinite(lat) && isFinite(lon)) {
        postToMapBoth("center-map-on-location", { lat: lat, lon: lon, zoom: 12 });
      }
    }
    var summary = qs("#plan-active-summary");
    if (summary && plan) {
      summary.hidden = false;
      var mcount =
        plan.marketing && Array.isArray(plan.marketing.addresses)
          ? plan.marketing.addresses.length
          : 0;
      summary.innerHTML =
        "<h3>Active Plan</h3><p>" +
        escapeHtml(plan.name || plan.title || "Plan") +
        "</p><p>Status: " +
        escapeHtml(plan.status || "draft") +
        "</p>" +
        (mcount ? '<p class="summary-line">' + mcount + " marketing leads</p>" : "") +
        "<p>Map updated for selected project.</p>";
    }
  }

  function planIdOf(p) {
    return p ? String(p.id || p._id || "") : "";
  }

  function normalizeStatus(s) {
    return String(s || "draft").toLowerCase();
  }

  function isPlanProject(p) {
    if (!p || typeof p !== "object") return false;
    var kind = String(p.kind || p.type || "").toLowerCase();
    // Billing catalog rows are not SharedMap plan projects.
    if (kind === "service-plan") return false;
    if (kind === "plan-project" || kind === "project") return true;
    var hasGeo =
      p.lat != null ||
      p.lng != null ||
      p.lon != null ||
      (p.location && (p.location.lat != null || p.location.lng != null));
    var st = normalizeStatus(p.status);
    var mapLifecycle =
      ["draft", "approved", "deployed", "ready", "authorized", "active", "rejected", "cancelled"].indexOf(st) >= 0;
    if (mapLifecycle) return true;
    if (hasGeo) return true;
    // Priced rows without geometry are service catalog, not map projects.
    if (p.price != null) return false;
    return false;
  }

  function extractPlansPayload(data) {
    if (!data) return [];
    if (Array.isArray(data.projects) && data.projects.length) return data.projects.slice();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.plans)) return data.plans;
    if (Array.isArray(data.items)) return data.items;
    return [];
  }

  function projectsFromApi(data) {
    if (data && Array.isArray(data.projects) && data.projects.length) {
      return data.projects.slice();
    }
    var all = extractPlansPayload(data);
    var projects = [];
    var i;
    for (i = 0; i < all.length; i++) {
      if (isPlanProject(all[i])) projects.push(all[i]);
    }
    return projects;
  }

  function matchesFilterMode(plan) {
    var mode = mapState.filterMode || "all";
    if (!mode || mode === "all") return true;
    var st = normalizeStatus(plan && plan.status);
    if (mode.indexOf("+") >= 0) {
      var parts = mode.split("+");
      return parts.indexOf(st) >= 0;
    }
    return st === mode;
  }

  function filterProjectsForView(list) {
    var out = [];
    var i;
    for (i = 0; i < list.length; i++) {
      if (matchesFilterMode(list[i])) out.push(list[i]);
    }
    return out;
  }

  function projectHardwareCount(p) {
    var scope = (p && p.scope) || {};
    var n = 0;
    ["towers", "sectors", "cpeDevices", "equipment"].forEach(function (k) {
      if (Array.isArray(scope[k])) n += scope[k].length;
    });
    return n;
  }

  /** Mirror of the origin plan +page.svelte project list rows (same classes, same
   *  status-conditional buttons) so the modal looks and acts like the original. */
  function renderProjectRow(p) {
    var name = escapeHtml(p.name || p.title || "Untitled plan");
    var status = normalizeStatus(p.status);
    var statusCls = escapeHtml(status);
    var id = escapeHtml(planIdOf(p));
    var created = "";
    if (p.createdAt) {
      var dt = new Date(p.createdAt);
      if (!isNaN(dt.getTime())) created = dt.toLocaleDateString();
    }
    var actions = "";
    actions +=
      '<button class="action-btn marketing-btn" type="button" data-plan-action="download-csv" title="Download all addresses from this project as CSV">📥 Download CSV</button>';
    if (status === "draft") {
      actions +=
        '<button class="action-btn start-btn" type="button" data-plan-action="start" title="Start Project - Begin working on this project">▶️ Start</button>';
    }
    if (status === "ready") {
      actions +=
        '<button class="action-btn approve-btn" type="button" data-plan-action="approve" title="Approve Project - Mark as ready for deployment">✅ Approve</button>' +
        '<button class="action-btn reject-btn" type="button" data-plan-action="reject" title="Reject Project - Send back for revision">❌ Reject</button>';
    }
    if (status !== "authorized") {
      actions +=
        '<button class="action-btn delete-btn" type="button" data-plan-action="delete" title="Delete Project">🗑️ Delete</button>';
    }
    if (status === "active") {
      actions +=
        '<button class="action-btn finish-btn" type="button" data-plan-action="finish" title="Finish Project - Mark as ready for deployment">✅ Finish</button>' +
        '<button class="action-btn pause-btn" type="button" data-plan-action="pause" title="Pause Project - Save progress and pause work">⏸️ Pause</button>' +
        '<button class="action-btn cancel-btn" type="button" data-plan-action="cancel" title="Cancel Project - Cancel this project">❌ Cancel</button>' +
        '<span class="active-indicator" title="This project is currently active - all map changes will be saved to this project">🔄 Active</span>';
    }
    var visible = p.showOnMap !== false;
    actions +=
      '<button class="action-btn ' +
      (visible ? "visibility-active" : "visibility-inactive") +
      (status === "authorized" ? " disabled" : "") +
      '" type="button" data-plan-action="toggle-visibility" title="' +
      (status === "authorized"
        ? "Authorized projects are always visible in production"
        : visible
          ? "Hide on map"
          : "Show on map") +
      '"' +
      (status === "authorized" ? " disabled" : "") +
      ">" +
      (visible ? "👁️ Visible" : "👁️‍🗨️ Hidden") +
      "</button>";
    if (["ready", "approved", "rejected", "cancelled"].indexOf(status) >= 0) {
      actions +=
        '<button class="action-btn reopen-btn" type="button" data-plan-action="reopen" title="Reopen this project for additional planning work">♻️ Reopen</button>';
    }
    if (status === "approved") {
      actions +=
        '<button class="action-btn authorize-btn" type="button" data-plan-action="authorize" title="Authorize Project - Promote this project to production">🚀 Authorize</button>' +
        '<span class="approved-indicator" title="This project has been approved and is ready for deployment">✅ Approved</span>';
    }
    if (status === "authorized") {
      actions +=
        '<span class="authorized-indicator" title="This project has been authorized and merged into production">🚀 Authorized</span>';
    }
    if (status === "rejected") {
      actions +=
        '<span class="rejected-indicator" title="This project was rejected and needs revision">❌ Rejected</span>';
    }
    if (status === "cancelled") {
      actions += '<span class="cancelled-indicator" title="This project was cancelled">🚫 Cancelled</span>';
    }
    return (
      '<div class="project-item" data-plan-id="' +
      id +
      '">' +
      '<button type="button" class="project-content" data-plan-action="select">' +
      '<div class="project-header"><h3>' +
      name +
      '</h3><span class="status-badge ' +
      statusCls +
      '">' +
      escapeHtml(p.status || "draft") +
      "</span></div>" +
      '<p class="project-description">' +
      escapeHtml(p.description || "") +
      "</p>" +
      '<div class="project-meta">' +
      (created ? "<span>Created: " + escapeHtml(created) + "</span>" : "") +
      "<span>Hardware: " +
      projectHardwareCount(p) +
      " items</span></div>" +
      "</button>" +
      '<div class="project-actions">' +
      actions +
      "</div></div>"
    );
  }

  function renderProjects(listEl) {
    if (!listEl) return;
    var projects = filterProjectsForView(mapState.projects || []);
    if (!projects.length) {
      listEl.innerHTML =
        '<div class="empty-state"><div class="empty-icon">📁</div><h3>No Projects Yet</h3>' +
        "<p>Create your first deployment project to get started.</p>" +
        '<button class="btn-primary" type="button" data-plan-action="create">Create Project</button></div>';
      return;
    }
    listEl.innerHTML = projects.map(renderProjectRow).join("");
  }

  /** Every list currently showing projects (side drawer and/or the lifted origin modal). */
  function projectListEls() {
    var els = [];
    var drawer = qs("#plan-projects-list");
    if (drawer) els.push(drawer);
    var modalList = planProjectModalList();
    if (modalList) els.push(modalList);
    return els;
  }

  function rerenderProjectLists() {
    projectListEls().forEach(renderProjects);
  }

  function findPlanById(id) {
    var i;
    for (i = 0; i < mapState.projects.length; i++) {
      if (planIdOf(mapState.projects[i]) === String(id)) return mapState.projects[i];
    }
    return null;
  }

  function loadProjects(listEl) {
    if (!listEl) return Promise.resolve([]);
    listEl.innerHTML = '<p class="plan-panel-loading">Loading projects…</p>';
    function applyData(data) {
      var projects = projectsFromApi(data);
      // Keep demo-local creations (ids prefixed "local-") that the API cannot persist.
      var i;
      for (i = 0; i < (mapState.projects || []).length; i++) {
        var keep = mapState.projects[i];
        if (/^local-/.test(planIdOf(keep))) projects.push(keep);
      }
      mapState.projects = projects;
      renderProjects(listEl);
      rerenderProjectLists();
      if (!mapState.activePlan && projects.length) {
        setActivePlan(projects[0], { center: false });
      }
      return projects;
    }
    return apiFetch("/api/plans")
      .then(function (r) {
        if (r && r.ok) return r.json();
        throw new Error("plans " + (r && r.status));
      })
      .then(applyData)
      .catch(function () {
        return fetch("/assets/wisp-api-goldens/GET-api-plans.golden.json", {
          credentials: "same-origin",
        })
          .then(function (r) {
            return r.ok ? r.json() : [];
          })
          .then(applyData)
          .catch(function () {
            listEl.innerHTML =
              '<p class="plan-panel-empty">Could not load projects. Sign in and try again.</p>';
            return [];
          });
      });
  }

  function updatePlanOnServer(plan) {
    if (!plan) return Promise.resolve(false);
    var body = JSON.stringify(plan);
    return apiFetch("/api/plans", { method: "PUT", body: body })
      .then(function (r) {
        if (r && r.ok) return true;
        return apiFetch("/api/plans", { method: "POST", body: body }).then(function (r2) {
          return !!(r2 && r2.ok);
        });
      })
      .catch(function () {
        return false;
      });
  }

  function patchPlanStatus(id, status) {
    var plan = findPlanById(id);
    if (plan) {
      plan.status = status;
      if (mapState.activePlan && planIdOf(mapState.activePlan) === String(id)) {
        mapState.activePlan.status = status;
        setActivePlan(mapState.activePlan, { center: false });
      }
    }
    var listEl = qs("#plan-projects-list");
    rerenderProjectLists();
    var bodyObj = plan
      ? Object.assign({}, plan, { id: id, _id: id, status: status })
      : { id: id, status: status };
    var body = JSON.stringify(bodyObj);
    // Prefer real approval routes when approving/authorizing (plans-approval.js).
    var approvalPath =
      status === "approved"
        ? "/api/plans/" + encodeURIComponent(id) + "/approve"
        : status === "authorized" || status === "ready"
          ? "/api/plans/" + encodeURIComponent(id) + "/authorize"
          : status === "rejected"
            ? "/api/plans/" + encodeURIComponent(id) + "/reject"
            : null;
    var start =
      approvalPath
        ? apiFetch(approvalPath, { method: "POST", body: body }).then(function (r) {
            if (r && r.ok) return true;
            return null;
          })
        : Promise.resolve(null);
    return start
      .then(function (ok) {
        if (ok) return true;
        return apiFetch("/api/plans/" + encodeURIComponent(id), { method: "PUT", body: body }).then(function (r) {
          if (r && r.ok) return true;
          return apiFetch("/api/plans", { method: "PUT", body: body }).then(function (r2) {
            if (r2 && r2.ok) return true;
            return apiFetch("/api/plans", { method: "PATCH", body: JSON.stringify({ id: id, status: status }) }).then(
              function (r3) {
                return !!(r3 && r3.ok);
              },
            );
          });
        });
      })
      .catch(function () {
        return false;
      })
      .then(function (persisted) {
        // Demo API may not persist writes; keep the optimistic local state
        // instead of reloading stale data over it.
        if (persisted) return loadProjects(listEl);
        rerenderProjectLists();
        return mapState.projects;
      });
  }

  /** PUT a partial update (origin planService.updatePlan) and refresh lists. */
  function putPlanPatch(id, patch, listEl) {
    var plan = findPlanById(id);
    if (plan) {
      Object.assign(plan, patch);
      if (mapState.activePlan && planIdOf(mapState.activePlan) === String(id)) {
        Object.assign(mapState.activePlan, patch);
        setActivePlan(mapState.activePlan, { center: false });
      }
    }
    rerenderProjectLists();
    var body = JSON.stringify(Object.assign({ id: id, _id: id }, plan || {}, patch));
    return apiFetch("/api/plans/" + encodeURIComponent(id), { method: "PUT", body: body })
      .then(function (r) {
        if (r && r.ok) return true;
        return apiFetch("/api/plans", { method: "PUT", body: body }).then(function (r2) {
          return !!(r2 && r2.ok);
        });
      })
      .catch(function () {
        return false;
      })
      .then(function (persisted) {
        if (persisted) return loadProjects(listEl || qs("#plan-projects-list"));
        rerenderProjectLists();
        return mapState.projects;
      });
  }

  /** Origin downloadProjectAddressesCSV: marketing addresses → CSV file download. */
  function downloadPlanAddressesCSV(id, plan) {
    function toCsv(addresses) {
      if (!addresses.length) {
        toastSummary(
          '<h3>Download CSV</h3><p class="cwl-empty-honest" data-cwl-empty-honest="1">No addresses found in this project.</p>',
        );
        return;
      }
      var cols = ["address", "city", "state", "zip", "lat", "lng", "status"];
      var lines = [cols.join(",")];
      addresses.forEach(function (a) {
        lines.push(
          cols
            .map(function (c) {
              var v = a[c] != null ? a[c] : c === "lng" && a.lon != null ? a.lon : "";
              v = String(v).replace(/"/g, '""');
              return /[",\n]/.test(v) ? '"' + v + '"' : v;
            })
            .join(","),
        );
      });
      var blob = new Blob([lines.join("\n")], { type: "text/csv" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download =
        ((plan && (plan.name || plan.title)) || "plan").replace(/[^\w-]+/g, "_") +
        "_addresses.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
      }, 5000);
    }
    apiFetch("/api/plans/" + encodeURIComponent(id) + "/marketing/addresses")
      .then(function (r) {
        return r && r.ok ? r.json() : null;
      })
      .then(function (body) {
        var addrs =
          (body && (body.addresses || body.items)) ||
          (Array.isArray(body) ? body : null) ||
          (plan && plan.marketing && plan.marketing.addresses) ||
          [];
        toCsv(addrs);
      })
      .catch(function () {
        toCsv((plan && plan.marketing && plan.marketing.addresses) || []);
      });
  }

  function deletePlanLocal(id) {
    mapState.projects = mapState.projects.filter(function (p) {
      return planIdOf(p) !== String(id);
    });
    if (mapState.activePlanId && String(mapState.activePlanId) === String(id)) {
      setActivePlan(mapState.projects[0] || null, { center: false });
    }
    rerenderProjectLists();
    var listEl = qs("#plan-projects-list");
    apiFetch("/api/plans/" + encodeURIComponent(id), { method: "DELETE" })
      .then(function (r) {
        if (!(r && r.ok)) throw new Error("plan delete " + (r && r.status));
        return loadProjects(listEl);
      })
      .catch(function () {
        // Demo API may not persist deletes; keep the optimistic local removal.
        rerenderProjectLists();
      });
  }

  function handlePlanAction(ev, listEl) {
    var btn = ev.target.closest("[data-plan-action]");
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    var action = btn.getAttribute("data-plan-action");
    if (action === "create") {
      closeProjectModalOverlay();
      openCreateProjectModal(listEl || qs("#plan-projects-list"));
      return;
    }
    var article = btn.closest("[data-plan-id]");
    if (!article) return;
    var id = article.getAttribute("data-plan-id");
    var plan = findPlanById(id);
    if (action === "select") {
      setActivePlan(plan || { id: id }, { center: true });
      if (btn.closest(".modal-overlay")) closeProjectModalOverlay();
      return;
    }
    if (action === "approve") {
      // HSS requires status "ready" before POST /approve (D6442).
      var cur = String((plan && plan.status) || "").toLowerCase();
      var ensureReady =
        cur === "ready" || cur === "approved" || cur === "authorized"
          ? Promise.resolve(true)
          : apiFetch("/api/plans/" + encodeURIComponent(id), {
              method: "PUT",
              body: JSON.stringify({ status: "ready" }),
            }).then(function (r) {
              return !!(r && r.ok);
            });
      ensureReady
        .then(function () {
          return apiFetch("/api/plans/" + encodeURIComponent(id) + "/approve", {
            method: "POST",
            body: JSON.stringify({ notes: "chrysalis-plan-approve" }),
          });
        })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
          return patchPlanStatus(id, "approved");
        })
        .catch(function () {
          return patchPlanStatus(id, "approved");
        });
      return;
    }
    if (action === "reject") {
      var reason = "chrysalis-reject";
      var curR = String((plan && plan.status) || "").toLowerCase();
      var ensureReadyR =
        curR === "ready" || curR === "approved"
          ? Promise.resolve(true)
          : apiFetch("/api/plans/" + encodeURIComponent(id), {
              method: "PUT",
              body: JSON.stringify({ status: "ready" }),
            }).then(function (r) {
              return !!(r && r.ok);
            });
      ensureReadyR
        .then(function () {
          return apiFetch("/api/plans/" + encodeURIComponent(id) + "/reject", {
            method: "POST",
            body: JSON.stringify({ reason: reason, notes: "chrysalis-plan-reject" }),
          });
        })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
          return patchPlanStatus(id, "rejected");
        })
        .catch(function () {
          return patchPlanStatus(id, "rejected");
        });
      return;
    }
    if (action === "authorize") {
      apiFetch("/api/plans/" + encodeURIComponent(id) + "/authorize", {
        method: "POST",
        body: JSON.stringify({ notes: "chrysalis-plan-authorize" }),
      })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
          return patchPlanStatus(id, "authorized");
        })
        .catch(function () {
          return patchPlanStatus(id, "authorized");
        });
      return;
    }
    if (action === "feature") {
      apiFetch("/api/plans/" + encodeURIComponent(id) + "/features", {
        method: "POST",
        body: JSON.stringify({
          featureType: "sector",
          geometry: { type: "Point", coordinates: [-104.99, 39.74] },
          properties: { name: "CWL Feature " + Date.now() },
          status: "draft",
          notes: "chrysalis-plan-feature",
        }),
      })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
          throw new Error("feature " + (r && r.status));
        })
        .catch(function () {
          /* honest residual if schema differs */
        });
      return;
    }
    if (action === "toggle-visibility") {
      apiFetch("/api/plans/" + encodeURIComponent(id) + "/toggle-visibility", {
        method: "PUT",
        body: JSON.stringify({ showOnMap: true }),
      })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
          throw new Error("toggle-visibility " + (r && r.status));
        })
        .catch(function () {
          /* honest residual */
        });
      return;
    }
    if (action === "requirements") {
      apiFetch("/api/plans/" + encodeURIComponent(id) + "/requirements", {
        method: "POST",
        body: JSON.stringify({
          category: "Radio Equipment",
          equipmentType: "radio",
          quantity: 1,
          notes: "chrysalis-plan-requirements",
        }),
      })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
          throw new Error("requirements " + (r && r.status));
        })
        .catch(function () {
          /* honest residual */
        });
      return;
    }
    if (action === "analyze") {
      apiFetch("/api/plans/" + encodeURIComponent(id) + "/analyze", {
        method: "POST",
        body: JSON.stringify({ notes: "chrysalis-plan-analyze" }),
      })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
          throw new Error("analyze " + (r && r.status));
        })
        .catch(function () {
          /* honest residual */
        });
      return;
    }
    if (action === "purchase-order") {
      apiFetch("/api/plans/" + encodeURIComponent(id) + "/purchase-order", {
        method: "POST",
        body: JSON.stringify({}),
      })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
          throw new Error("purchase-order " + (r && r.status));
        })
        .catch(function () {
          /* honest if no missing hardware */
        });
      return;
    }
    if (action === "patch-feature" || action === "delete-feature") {
      var features = (plan && plan.features) || [];
      var fid = features[0] && (features[0]._id || features[0].id);
      if (!fid) {
        apiFetch("/api/plans/" + encodeURIComponent(id) + "/features", {
          method: "POST",
          body: JSON.stringify({
            featureType: "sector",
            geometry: { type: "Point", coordinates: [-104.99, 39.74] },
            properties: { name: "CWL Feature " + Date.now() },
            status: "draft",
          }),
        })
          .then(function (r) {
            return r && r.ok ? r.json() : null;
          })
          .then(function (body) {
            var created =
              body &&
              ((body.feature && (body.feature._id || body.feature.id)) ||
                body._id ||
                body.id ||
                (Array.isArray(body.features) &&
                  body.features[body.features.length - 1] &&
                  (body.features[body.features.length - 1]._id ||
                    body.features[body.features.length - 1].id)));
            if (!created) return loadProjects(listEl);
            var path =
              "/api/plans/" +
              encodeURIComponent(id) +
              "/features/" +
              encodeURIComponent(created);
            return apiFetch(path, {
              method: action === "patch-feature" ? "PATCH" : "DELETE",
              body: action === "patch-feature" ? JSON.stringify({ notes: "chrysalis-feature-patch" }) : undefined,
            }).then(function () {
              return loadProjects(listEl);
            });
          })
          .catch(function () {});
        return;
      }
      apiFetch(
        "/api/plans/" + encodeURIComponent(id) + "/features/" + encodeURIComponent(fid),
        {
          method: action === "patch-feature" ? "PATCH" : "DELETE",
          body: action === "patch-feature" ? JSON.stringify({ notes: "chrysalis-feature-patch" }) : undefined,
        },
      )
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
        })
        .catch(function () {});
      return;
    }
    if (action === "delete-requirement") {
      apiFetch("/api/plans/" + encodeURIComponent(id) + "/requirements/0", {
        method: "DELETE",
      })
        .then(function (r) {
          if (r && r.ok) return loadProjects(listEl);
        })
        .catch(function () {});
      return;
    }
    if (action === "start") {
      patchPlanStatus(id, "active");
      return;
    }
    if (action === "deploy") {
      patchPlanStatus(id, "deployed");
      return;
    }
    if (action === "delete") {
      deletePlanLocal(id);
      return;
    }
    // Origin lifecycle: finishProject → ready, pauseProject → draft (+hidden),
    // cancelProject → cancelled, reopenProject → active.
    if (action === "finish") {
      putPlanPatch(id, { status: "ready" }, listEl);
      return;
    }
    if (action === "pause") {
      putPlanPatch(id, { status: "draft", showOnMap: false }, listEl);
      return;
    }
    if (action === "cancel") {
      putPlanPatch(id, { status: "cancelled" }, listEl);
      return;
    }
    if (action === "reopen") {
      putPlanPatch(id, { status: "active" }, listEl);
      return;
    }
    if (action === "download-csv") {
      downloadPlanAddressesCSV(id, plan);
      return;
    }
  }

  function ensureLayerPanel(root) {
    var panel = qs("#plan-layers-panel", root);
    if (panel) return panel;
    panel = document.createElement("aside");
    panel.id = "plan-layers-panel";
    panel.className = "plan-side-panel plan-layers-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Map filters");
    panel.innerHTML =
      '<div class="plan-panel-header"><h2>Map Filters</h2>' +
      '<button type="button" class="plan-panel-close" data-action="close-layers" aria-label="Close">✕</button></div>' +
      '<div class="plan-layers-list" data-section="assetTypes">' +
      '<label><input type="checkbox" data-layer="showNetworkAssets" checked /> Network Assets</label>' +
      '<label><input type="checkbox" data-layer="showTowers" checked /> Tower Sites</label>' +
      '<label><input type="checkbox" data-layer="showSectors" checked /> Sectors</label>' +
      '<label><input type="checkbox" data-layer="showCPE" checked /> CPE Devices</label>' +
      '<label><input type="checkbox" data-layer="showEquipment" checked /> Equipment</label>' +
      '<label><input type="checkbox" data-layer="showMarketing" checked /> Marketing Addresses</label>' +
      '<label><input type="checkbox" data-layer="showPlanFeatures" checked /> Plan Features</label>' +
      '<label><input type="checkbox" data-layer="showBackhaul" /> Backhaul Links</label>' +
      "</div>" +
      '<div class="plan-layers-list" data-section="bands"><strong>Bands</strong>' +
      '<label><input type="checkbox" data-band="LTE" checked /> LTE</label>' +
      '<label><input type="checkbox" data-band="CBRS" checked /> CBRS</label>' +
      '<label><input type="checkbox" data-band="FWA" checked /> FWA</label>' +
      '<label><input type="checkbox" data-band="5G" checked /> 5G</label>' +
      '<label><input type="checkbox" data-band="WiFi" checked /> WiFi</label></div>';
    root.appendChild(panel);
    function syncFiltersFromPanel() {
      panel.querySelectorAll("[data-layer]").forEach(function (input) {
        mapState.layerFilters[input.getAttribute("data-layer")] = !!input.checked;
      });
      mapState.layerFilters.bandFilters = ["LTE", "CBRS", "FWA", "5G", "WiFi"].map(function (b) {
        var el = panel.querySelector('[data-band="' + b + '"]');
        return { band: b, enabled: !!(el && el.checked) };
      });
      postToMapBoth("layer-filters-changed", mapState.layerFilters);
    }
    panel.addEventListener("change", function (ev) {
      if (!ev.target.closest("[data-layer],[data-band]")) return;
      syncFiltersFromPanel();
    });
    return panel;
  }

  function ensureProjectsPanel(root) {
    var panel = qs("#plan-projects-panel", root);
    if (panel) return panel;
    panel = document.createElement("aside");
    panel.id = "plan-projects-panel";
    panel.className = "plan-side-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Plan projects");
    panel.innerHTML =
      '<div class="plan-panel-header"><h2>Projects</h2>' +
      '<button type="button" class="plan-panel-close" data-action="close-projects" aria-label="Close">✕</button></div>' +
      '<div id="plan-projects-list" class="plan-projects-list"><p class="plan-panel-loading">Loading projects…</p></div>';
    root.appendChild(panel);
    if (!qs("#plan-active-summary", root)) {
      var summary = document.createElement("div");
      summary.id = "plan-active-summary";
      summary.className = "plan-summary";
      summary.hidden = true;
      root.appendChild(summary);
    }
    return panel;
  }

  function ensureHardwarePanel(root) {
    var panel = qs("#plan-hardware-panel", root);
    if (panel) return panel;
    panel = document.createElement("aside");
    panel.id = "plan-hardware-panel";
    panel.className = "plan-side-panel plan-hardware-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Hardware inventory");
    panel.innerHTML =
      '<div class="plan-panel-header"><h2>Hardware</h2>' +
      '<button type="button" class="plan-panel-close" data-action="close-hardware" aria-label="Close">✕</button></div>' +
      '<div id="plan-hardware-list" class="plan-projects-list"><p class="plan-panel-loading">Loading inventory…</p></div>';
    root.appendChild(panel);
    return panel;
  }

  function rowsFromInventory(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    var keys = ["items", "devices", "inventory", "hardware"];
    var i;
    for (i = 0; i < keys.length; i++) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    return [];
  }

  function openHardwarePanel(root, layersPanel, projectsPanel) {
    var panel = ensureHardwarePanel(root);
    var list = qs("#plan-hardware-list", panel);
    if (layersPanel) layersPanel.hidden = true;
    if (projectsPanel) projectsPanel.hidden = true;
    panel.hidden = false;
    list.innerHTML = '<p class="plan-panel-loading">Loading inventory…</p>';
    Promise.all([
      apiFetch("/api/inventory")
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .catch(function () {
          return null;
        }),
      apiFetch("/api/hardware")
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .catch(function () {
          return null;
        }),
    ]).then(function (pair) {
      var inv = rowsFromInventory(pair[0]);
      var hw = rowsFromInventory(pair[1]);
      var merged = inv.slice();
      var seen = {};
      var i;
      for (i = 0; i < inv.length; i++) {
        seen[String(inv[i].id || inv[i]._id || inv[i].name || i)] = true;
      }
      for (i = 0; i < hw.length; i++) {
        var key = String(hw[i].id || hw[i]._id || hw[i].name || "hw-" + i);
        if (!seen[key]) merged.push(hw[i]);
      }
      if (!merged.length) {
        list.innerHTML =
          '<p class="plan-panel-empty cwl-empty-honest" data-cwl-empty-honest="1">No inventory/hardware rows returned from /api/inventory or /api/hardware.</p>';
        return;
      }
      var rows = merged
        .map(function (row) {
          return (
            "<tr><td>" +
            escapeHtml(row.name || row.model || row.id || "item") +
            "</td><td>" +
            escapeHtml(row.status || row.state || "") +
            "</td><td>" +
            escapeHtml(row.serialNumber || row.serial || row.id || "") +
            "</td></tr>"
          );
        })
        .join("");
      list.innerHTML =
        '<table class="wisp-demo-table"><thead><tr><th>Name</th><th>Status</th><th>Id / Serial</th></tr></thead><tbody>' +
        rows +
        "</tbody></table>";
    });
  }

  function showAssetDetail(detail) {
    var host = qs("#plan-active-summary") || qs(".wisp-header-overlay");
    if (!host || !detail) return;
    var box = qs("#map-asset-detail");
    if (!box) {
      box = document.createElement("div");
      box.id = "map-asset-detail";
      box.className = "plan-summary map-asset-detail";
      if (host.parentElement) host.parentElement.appendChild(box);
      else document.body.appendChild(box);
    }
    box.hidden = false;
    var kind = String(detail.kind || detail.type || "").toLowerCase();
    var name = detail.name || detail.id || "Feature";
    var status = detail.status ? " · " + escapeHtml(detail.status) : "";
    var caps = capabilitiesForMode(mapState.mode);
    var actions = [];
    if (kind === "tower" || kind === "site") {
      actions.push(
        '<button type="button" class="btn-secondary btn-sm" data-map-asset-action="open-hardware">View hardware</button>',
      );
      if (caps.canEditTemporary || caps.canAssignTasks) {
        actions.push(
          '<button type="button" class="btn-primary btn-sm" data-map-asset-action="edit-site">Edit site</button>',
        );
      }
    } else if (kind === "sector") {
      actions.push(
        '<button type="button" class="btn-secondary btn-sm" data-map-asset-action="open-pci">PCI tools</button>',
      );
      if (caps.canEditTemporary) {
        actions.push(
          '<button type="button" class="btn-primary btn-sm" data-map-asset-action="edit-sector">Edit sector</button>',
        );
      }
    } else if (kind === "marketing") {
      actions.push(
        '<button type="button" class="btn-secondary btn-sm" data-map-asset-action="open-marketing">Marketing</button>',
      );
    } else if (caps.canAssignTasks || caps.canMarkProgress) {
      actions.push(
        '<button type="button" class="btn-primary btn-sm" data-map-asset-action="open-hardware">Open in hardware</button>',
      );
    }
    actions.push(
      '<button type="button" class="btn-secondary btn-sm" data-map-asset-action="center">Center map</button>',
      '<button type="button" class="btn-secondary btn-sm" data-map-asset-action="dismiss">Dismiss</button>',
    );
    box.innerHTML =
      "<h3>Map selection</h3><p>" +
      escapeHtml(name) +
      "</p><p>" +
      escapeHtml(detail.kind || detail.type || "") +
      status +
      "</p>" +
      (actions.length
        ? '<div class="map-asset-actions" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem">' +
          actions.join("") +
          "</div>"
        : "");
    box._mapAssetDetail = detail;
    if (box.getAttribute("data-asset-wired") !== "1") {
      box.setAttribute("data-asset-wired", "1");
      box.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest("[data-map-asset-action]") : null;
        if (!btn) return;
        ev.preventDefault();
        var action = btn.getAttribute("data-map-asset-action");
        var d = box._mapAssetDetail || {};
        if (action === "dismiss") {
          box.hidden = true;
          return;
        }
        if (action === "center" && d.lat != null && (d.lng != null || d.lon != null)) {
          postToMapBoth("center-map-on-location", {
            lat: Number(d.lat),
            lon: Number(d.lng != null ? d.lng : d.lon),
            zoom: 14,
          });
          return;
        }
        if (action === "open-hardware" && window.wispSharedMap && window.wispSharedMap.openHardware) {
          window.wispSharedMap.openHardware();
          return;
        }
        if (action === "open-pci" && window.wispSharedMap && window.wispSharedMap.openPci) {
          window.wispSharedMap.openPci();
          return;
        }
        if (action === "open-marketing" && window.wispSharedMap && window.wispSharedMap.openMarketing) {
          window.wispSharedMap.openMarketing();
          return;
        }
        if (action === "edit-site" || action === "edit-sector") {
          // Prefer a lifted origin modal if the page carries one; else re-post
          // object-action so island listeners / future handlers can react.
          var shell =
            document.querySelector('[data-cwl-lifted-component*="Tower"]') ||
            document.querySelector('[data-cwl-lifted-component*="Sector"]') ||
            document.querySelector('[data-cwl-lifted-component*="Site"]');
          if (shell && window.openLiftedShell) {
            try {
              window.openLiftedShell(shell);
            } catch (_e) {
              /* fall through */
            }
          }
          postToMapBoth("object-action", {
            objectId: d.id,
            action: action,
            data: d,
          });
        }
      });
    }
  }

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function collectGeoPoints(data, source) {
    var out = [];
    if (!data || typeof data !== "object") return out;
    var bags = [];
    var keys = ["coverage", "sites", "towers", "items", "sectors", "addresses", "networkDevices"];
    var k;
    for (k = 0; k < keys.length; k++) {
      if (Array.isArray(data[keys[k]])) bags.push({ rows: data[keys[k]], source: source + ":" + keys[k] });
    }
    if (!bags.length && Array.isArray(data)) bags.push({ rows: data, source: source });
    var b;
    for (b = 0; b < bags.length; b++) {
      bags[b].rows.forEach(function (row) {
        if (!row || typeof row !== "object") return;
        var lat =
          num(row.lat) != null
            ? num(row.lat)
            : num(row.latitude) != null
              ? num(row.latitude)
              : row.geometry
                ? num(row.geometry.lat) != null
                  ? num(row.geometry.lat)
                  : num(row.geometry.y)
                : row.location
                  ? num(row.location.lat) != null
                    ? num(row.location.lat)
                    : num(row.location.latitude)
                  : null;
        var lng =
          num(row.lng) != null
            ? num(row.lng)
            : num(row.lon) != null
              ? num(row.lon)
              : num(row.longitude) != null
                ? num(row.longitude)
                : row.geometry
                  ? num(row.geometry.lng) != null
                    ? num(row.geometry.lng)
                    : num(row.geometry.x)
                  : row.location
                    ? num(row.location.lng) != null
                      ? num(row.location.lng)
                      : num(row.location.lon) != null
                        ? num(row.location.lon)
                        : num(row.location.longitude)
                    : null;
        if (lat == null || lng == null) return;
        out.push({
          lat: lat,
          lng: lng,
          name: String(row.name || row.address || row.id || "point"),
          status: String(row.status || ""),
          source: bags[b].source,
          id: String(row.id || row._id || ""),
          address: row.address || row.name || null,
        });
      });
    }
    return out;
  }

  function pointInBbox(pt, box) {
    if (!box || pt.lat == null || pt.lng == null) return false;
    var west = num(box.west);
    var east = num(box.east);
    var south = num(box.south);
    var north = num(box.north);
    if (west == null || east == null || south == null || north == null) return false;
    var minLng = Math.min(west, east);
    var maxLng = Math.max(west, east);
    var minLat = Math.min(south, north);
    var maxLat = Math.max(south, north);
    return pt.lng >= minLng && pt.lng <= maxLng && pt.lat >= minLat && pt.lat <= maxLat;
  }

  function toMarketingAddress(pt) {
    return {
      id: pt.id || "m-" + pt.lat + "-" + pt.lng,
      address: pt.address || pt.name,
      name: pt.name,
      lat: pt.lat,
      lng: pt.lng,
      status: pt.status || "lead",
      source: pt.source,
    };
  }

  function showMarketingResults(plan, addresses, sourceNote) {
    var rows = addresses
      .map(function (a) {
        return (
          "<tr><td>" +
          escapeHtml(a.address || a.name) +
          "</td><td>" +
          escapeHtml(a.lat) +
          "</td><td>" +
          escapeHtml(a.lng) +
          "</td><td>" +
          escapeHtml(a.source || "") +
          "</td></tr>"
        );
      })
      .join("");
    openModal(
      "Marketing leads (" + addresses.length + ")",
      "<p>" +
        escapeHtml(sourceNote) +
        " Merged into plan <strong>" +
        escapeHtml(plan.name || plan.id) +
        "</strong>.</p>" +
        '<table class="wisp-demo-table"><thead><tr><th>Address / Name</th><th>Lat</th><th>Lng</th><th>Source</th></tr></thead><tbody>' +
        rows +
        "</tbody></table>",
    );
    toastSummary("<h3>Marketing draw</h3><p>" + addresses.length + " leads; plan updated.</p>");
    setActivePlan(plan, { center: false });
    postToMapBoth("set-marketing-leads", { addresses: plan.marketing.addresses });
    postToMapBoth("disable-rectangle-drawing", {});
  }

  function mergeMarketingIntoPlan(plan, inside) {
    if (!plan.marketing || typeof plan.marketing !== "object") plan.marketing = {};
    var existing = Array.isArray(plan.marketing.addresses) ? plan.marketing.addresses.slice() : [];
    var seen = {};
    var merged = [];
    function addAddr(a) {
      var key = String(a.id || "") + "|" + String(a.lat) + "|" + String(a.lng);
      if (seen[key]) return;
      seen[key] = true;
      merged.push(a);
    }
    var i;
    for (i = 0; i < existing.length; i++) addAddr(existing[i]);
    for (i = 0; i < inside.length; i++) addAddr(inside[i]);
    plan.marketing.addresses = merged;
    plan.marketing.lastResultCount = inside.length;
    mapState.activePlan = plan;
    return updatePlanOnServer(plan).then(function () {
      return merged;
    });
  }

  function discoverMarketingLeads(detail) {
    var box = (detail && detail.boundingBox) || (detail && detail.payload && detail.payload.boundingBox);
    if (!box) {
      openModal(
        "Marketing discovery",
        '<p class="cwl-empty-honest" data-cwl-empty-honest="1">Rectangle had no boundingBox — nothing to filter.</p>',
      );
      return;
    }
    var plan = mapState.activePlan;
    var planId = planIdOf(plan) || mapState.activePlanId;
    var discoverBody = {
      planId: planId,
      boundingBox: box,
      center: detail.center || null,
      options: {
        algorithms: ["microsoft_footprints", "osm_buildings"],
      },
    };

    function spatialFallback() {
      return Promise.all([
        apiFetch("/api/network/sites").then(function (r) {
          return r && r.ok ? r.json() : null;
        }).catch(function () { return null; }),
        apiFetch("/api/network/sectors").then(function (r) {
          return r && r.ok ? r.json() : null;
        }).catch(function () { return null; }),
        apiFetch("/api/network").then(function (r) {
          return r && r.ok ? r.json() : null;
        }).catch(function () { return null; }),
        apiFetch("/api/coverage").then(function (r) {
          return r && r.ok ? r.json() : null;
        }).catch(function () { return null; }),
      ]).then(function (parts) {
        var points = []
          .concat(collectGeoPoints(parts[0], "sites"))
          .concat(collectGeoPoints(parts[1], "sectors"))
          .concat(collectGeoPoints(parts[2], "network"))
          .concat(collectGeoPoints(parts[3], "coverage"));
        var inside = [];
        var i;
        for (i = 0; i < points.length; i++) {
          if (pointInBbox(points[i], box)) inside.push(toMarketingAddress(points[i]));
        }
        return { addresses: inside, note: "Spatial fallback over /api/network/* + /api/coverage (discover API unavailable)." };
      });
    }

    var discoverPromise = planId
      ? apiFetch("/api/plans/" + encodeURIComponent(planId) + "/marketing/discover", {
          method: "POST",
          body: JSON.stringify(discoverBody),
        })
          .then(function (r) {
            if (r && r.ok) return r.json().catch(function () { return null; });
            // Legacy global path (often 404 on HSS) — try once, then spatial fallback.
            return apiFetch("/api/plans/marketing/discover", {
              method: "POST",
              body: JSON.stringify(discoverBody),
            }).then(function (r2) {
              if (!r2 || !r2.ok) return null;
              return r2.json().catch(function () {
                return null;
              });
            });
          })
          .then(function (data) {
            if (data && Array.isArray(data.addresses) && data.addresses.length) {
              return {
                addresses: data.addresses.map(toMarketingAddress),
                note: "POST /api/plans/:id/marketing/discover (boundingBox).",
              };
            }
            return null;
          })
          .catch(function () {
            return null;
          })
      : Promise.resolve(null);

    discoverPromise.then(function (fromApi) {
      return fromApi || spatialFallback();
    }).then(function (result) {
      var inside = (result && result.addresses) || [];
      if (!inside.length) {
        openModal(
          "Marketing discovery",
          '<p class="cwl-empty-honest" data-cwl-empty-honest="1">No leads in this rectangle from discover API or network/coverage geometry. No invented footprints.</p>',
        );
        postToMapBoth("disable-rectangle-drawing", {});
        return;
      }
      if (!plan) {
        openModal(
          "Marketing discovery",
          "<p>Found " +
            inside.length +
            " points, but no active plan is selected. Select a project, then redraw.</p>",
        );
        postToMapBoth("disable-rectangle-drawing", {});
        return;
      }
      mergeMarketingIntoPlan(plan, inside).then(function () {
        showMarketingResults(plan, inside, result.note || "Marketing discover");
      });
    });
  }

  function handleMapMessage(ev) {
    var data = ev.data;
    if (!data || data.source !== "coverage-map") return;
    if (data.type === "request-state" || data.type === "map-ready") {
      postStateToIframe();
      return;
    }
    if (data.type === "view-extent") {
      mapState.lastExtent = data.payload || data.detail || null;
      return;
    }
    if (data.type === "asset-click") {
      showAssetDetail(data.detail || data.payload);
      return;
    }
    if (data.type === "object-action") {
      showAssetDetail(
        (data.data && (data.data.tower || data.data)) || {
          id: data.objectId,
          name: data.action,
        },
      );
      return;
    }
    if (data.type === "rectangle-drawn") {
      var detail = data.detail || data.payload || {};
      if (detail.detail && !detail.boundingBox) detail = detail.detail;
      mapState.lastMarketingRect = detail;
      discoverMarketingLeads(detail);
    }
  }

  /** Open the lifted origin "➕ Create New Project" modal when the page carries it. */
  function openCreateProjectLifted(listEl) {
    var content = document.querySelector(".modal-content.create-modal");
    var overlay = content ? content.closest(".modal-overlay") : null;
    if (!overlay) return false;
    overlay.hidden = false;
    overlay.removeAttribute("aria-hidden");
    overlay.style.display = "flex";
    function closeIt() {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.display = "none";
    }
    function submitCreate() {
      var nameEl = qs("#projectName", overlay);
      var descEl = qs("#projectDescription", overlay);
      var lookupEl = qs("#project-location-lookup", overlay);
      var name = ((nameEl && nameEl.value) || "").trim();
      if (!name) {
        if (nameEl) nameEl.focus();
        return;
      }
      var payload = {
        name: name,
        description: ((descEl && descEl.value) || "").trim(),
        status: "draft",
        kind: "plan-project",
      };
      var loc = ((lookupEl && lookupEl.value) || "").trim();
      var m = loc.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
      if (m) {
        payload.lat = Number(m[1]);
        payload.lng = Number(m[2]);
      }
      apiFetch("/api/plans", { method: "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("create " + r.status);
          return r.json().catch(function () {
            return payload;
          });
        })
        .then(function (created) {
          closeIt();
          return loadProjects(listEl || qs("#plan-projects-list")).then(function () {
            var id = planIdOf(created) || (created && created.id);
            var plan = id && findPlanById(id);
            if (!plan) {
              // Demo API may not persist creates; keep the new project locally.
              plan = Object.assign({ id: "local-" + Date.now(), kind: "plan-project" }, payload);
              mapState.projects.push(plan);
              rerenderProjectLists();
            }
            setActivePlan(plan, { center: true });
          });
        })
        .catch(function () {
          var alertEl = qs(".alert-error", overlay);
          if (alertEl) {
            alertEl.hidden = false;
            alertEl.removeAttribute("aria-hidden");
          }
        });
    }
    if (!overlay.__wispWired) {
      overlay.__wispWired = true;
      overlay.addEventListener("click", function (ev) {
        if (ev.target === overlay) {
          closeIt();
          return;
        }
        var chrome = ev.target.closest("[data-cwl-action]");
        if (chrome === overlay) chrome = null;
        var act = chrome ? chrome.getAttribute("data-cwl-action") || "" : "";
        if (/closeCreateProjectModal/.test(act)) {
          ev.preventDefault();
          ev.stopPropagation();
          closeIt();
          return;
        }
        if (/^createProject$/.test(act)) {
          ev.preventDefault();
          ev.stopPropagation();
          submitCreate();
        }
      });
      overlay.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") closeIt();
      });
      var form = qs("form", overlay);
      if (form) {
        form.addEventListener("submit", function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          submitCreate();
        });
      }
    }
    var focusEl = qs("#projectName", overlay);
    if (focusEl) focusEl.focus();
    return true;
  }

  function openCreateProjectModal(listEl) {
    if (openCreateProjectLifted(listEl)) return;
    var body =
      '<form class="wisp-wizard-form" id="wisp-create-project-form">' +
      '<div class="form-group"><label for="cp-name">Project name *</label>' +
      '<input id="cp-name" name="name" type="text" required /></div>' +
      '<div class="form-group"><label for="cp-lat">Latitude (optional)</label>' +
      '<input id="cp-lat" name="lat" type="text" inputmode="decimal" /></div>' +
      '<div class="form-group"><label for="cp-lng">Longitude (optional)</label>' +
      '<input id="cp-lng" name="lng" type="text" inputmode="decimal" /></div>' +
      '<div class="wisp-wizard-status" aria-live="polite" hidden></div>' +
      '<footer><button type="submit" class="wisp-demo-btn primary">Create</button></footer></form>';
    var modal = openModal("Create plan project", body);
    var form = qs("#wisp-create-project-form", modal.overlay);
    var status = qs(".wisp-wizard-status", modal.overlay);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = (qs('[name="name"]', form).value || "").trim();
      var lat = num(qs('[name="lat"]', form).value);
      var lng = num(qs('[name="lng"]', form).value);
      if (!name) return;
      var payload = { name: name, status: "draft", kind: "plan-project" };
      if (lat != null) payload.lat = lat;
      if (lng != null) payload.lng = lng;
      status.hidden = false;
      status.textContent = "Creating…";
      apiFetch("/api/plans", { method: "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) {
            return r.text().then(function (t) {
              throw new Error("Create failed (" + r.status + "): " + String(t).slice(0, 140));
            });
          }
          return r.json().catch(function () {
            return payload;
          });
        })
        .then(function (created) {
          status.textContent = "Created.";
          modal.close();
          return loadProjects(listEl).then(function () {
            var id = planIdOf(created) || (created && created.id);
            var plan = (id && findPlanById(id)) || created || payload;
            setActivePlan(plan, { center: true });
          });
        })
        .catch(function (e) {
          status.classList.add("error");
          status.textContent = (e && e.message) || "Create failed";
        });
    });
  }

  function loadSitesAndSectors() {
    return Promise.all([
      apiFetch("/api/network/sites").then(function (r) {
        return r && r.ok ? r.json() : null;
      }).catch(function () { return null; }),
      apiFetch("/api/network/sectors").then(function (r) {
        return r && r.ok ? r.json() : null;
      }).catch(function () { return null; }),
      apiFetch("/api/network").then(function (r) {
        return r && r.ok ? r.json() : null;
      }).catch(function () { return null; }),
    ]).then(function (parts) {
      function arr(body, keys) {
        if (!body) return [];
        if (Array.isArray(body)) return body;
        var i;
        for (i = 0; i < keys.length; i++) {
          if (Array.isArray(body[keys[i]])) return body[keys[i]];
        }
        return Array.isArray(body.items) ? body.items : [];
      }
      var sites = arr(parts[0], ["sites", "towers"]);
      if (!sites.length) sites = arr(parts[2], ["sites", "towers"]);
      var sectors = arr(parts[1], ["sectors"]);
      if (!sectors.length) sectors = arr(parts[2], ["sectors"]);
      return { sites: sites, sectors: sectors };
    });
  }

  function openFrequencyModal() {
    // True rendering: the lifted FrequencyPlannerModal from the origin page.
    var lifted = openLiftedShell("FrequencyPlannerModal", null);
    if (lifted) {
      loadSitesAndSectors().then(function (data) {
        var sectors = (data.sectors || []).filter(function (s) {
          var st = String(s.status || "").toLowerCase();
          return st === "active" || st === "deployed" || st === "online" || !st;
        });
        var conflicts = pciConflictGroups(sectors);
        if (window.__wispHydrateShellScope) {
          window.__wispHydrateShellScope(
            lifted,
            {
              sectors: sectors,
              cells: sectors,
              conflicts: conflicts,
              plan: null,
              isAnalyzing: false,
              isOptimizing: false,
              loading: false,
              isLoading: false,
              activeTab: "analysis",
            },
            sectors,
          );
        }
      });
      return;
    }
    openModal("Frequency planner", '<p class="plan-panel-loading">Loading /api/network/sectors…</p>');
    loadSitesAndSectors().then(function (data) {
      var sectors = (data.sectors || []).filter(function (s) {
        var st = String(s.status || "").toLowerCase();
        var tech = String(s.technology || s.band || "").toUpperCase();
        var okStatus = st === "active" || st === "deployed" || st === "online" || !st;
        var okTech =
          !tech ||
          tech === "LTE" ||
          tech === "CBRS" ||
          tech === "LTECBRS" ||
          tech === "LTE+CBRS" ||
          tech === "FWA" ||
          tech === "5G";
        return okStatus && okTech;
      });
      if (!sectors.length) {
        openModal(
          "Frequency planner",
          '<p class="cwl-empty-honest" data-cwl-empty-honest="1">No sectors from /api/network/sectors (or /api/network). Frequencies are not invented when the API does not provide earfcn/band/pci.</p>',
        );
        return;
      }
      var pciMap = {};
      var conflicts = [];
      sectors.forEach(function (s) {
        var pci = s.pci != null ? String(s.pci) : "";
        if (!pci) return;
        if (!pciMap[pci]) pciMap[pci] = [];
        pciMap[pci].push(s);
      });
      Object.keys(pciMap).forEach(function (pci) {
        if (pciMap[pci].length > 1) conflicts.push({ pci: pci, sectors: pciMap[pci] });
      });
      var html =
        '<div class="wisp-planner-tabs">' +
        "<p><strong>Analysis</strong> — " +
        sectors.length +
        " sectors from network API. Duplicate PCI groups: " +
        conflicts.length +
        ".</p>" +
        '<table class="wisp-demo-table"><thead><tr><th>Sector</th><th>Site</th><th>Tech</th><th>EARFCN</th><th>PCI</th><th>Azimuth</th></tr></thead><tbody>';
      sectors.forEach(function (s) {
        html +=
          "<tr><td>" +
          escapeHtml(s.name || s.id) +
          "</td><td>" +
          escapeHtml(s.siteId || "") +
          "</td><td>" +
          escapeHtml(s.technology || s.band || "") +
          "</td><td>" +
          escapeHtml(s.earfcn != null ? s.earfcn : "—") +
          "</td><td>" +
          escapeHtml(s.pci != null ? s.pci : "—") +
          "</td><td>" +
          escapeHtml(s.azimuth != null ? s.azimuth : "—") +
          "</td></tr>";
      });
      html += "</tbody></table>";
      if (conflicts.length) {
        html += "<p><strong>Conflicts</strong></p><ul>";
        conflicts.forEach(function (c) {
          html +=
            "<li>PCI " +
            escapeHtml(c.pci) +
            " used by " +
            c.sectors
              .map(function (s) {
                return escapeHtml(s.name || s.id);
              })
              .join(", ") +
            "</li>";
        });
        html += "</ul>";
      } else {
        html +=
          '<p class="cwl-empty-honest" data-cwl-empty-honest="1">No duplicate PCI values among loaded sectors.</p>';
      }
      html +=
        "<p><strong>Suggestions</strong> — reassign colliding PCIs locally (no invented spectrum planner API).</p><ul>";
      conflicts.forEach(function (c, idx) {
        html +=
          "<li>Move " +
          escapeHtml((c.sectors[1] && (c.sectors[1].name || c.sectors[1].id)) || "sector") +
          " from PCI " +
          escapeHtml(c.pci) +
          " → candidate " +
          escapeHtml(String(300 + idx)) +
          "</li>";
      });
      if (!conflicts.length) html += "<li>No reassignments needed from loaded data.</li>";
      html += "</ul></div>";
      var modal = openModal("Frequency planner", html);
      var footer = qs("footer", modal.overlay);
      if (footer) {
        var exp = document.createElement("button");
        exp.type = "button";
        exp.className = "wisp-demo-btn";
        exp.textContent = "Export JSON";
        exp.addEventListener("click", function () {
          var blob = new Blob([JSON.stringify({ sectors: sectors, conflicts: conflicts }, null, 2)], {
            type: "application/json",
          });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "frequency-plan.json";
          a.click();
        });
        footer.insertBefore(exp, footer.firstChild);
      }
    });
  }

  /**
   * Open a converted-original (lifted) modal shell and hydrate its holes with
   * live data. Returns false when the shell is absent so callers can fall
   * back to a synthetic surface. The lifted markup is the true rendering of
   * the origin Svelte component — always prefer it.
   */
  function openLiftedShell(name, data, rows) {
    var S = window.WispCwlShell;
    if (!S || typeof S.find !== "function") return null;
    var el = S.find(name);
    if (!el) return null;
    S.open(el);
    // Hole hydration is single-shot (settled holes drop their bind markers),
    // so only hydrate here when the caller passes final data. Callers doing
    // async loads pass null and hydrate once the API responds.
    if (data && window.__wispHydrateShellScope) {
      try {
        window.__wispHydrateShellScope(el, data, rows || []);
      } catch (e) {
        /* leave unhydrated holes honest */
      }
    }
    return el;
  }

  function pciConflictGroups(sectors) {
    var byPci = {};
    sectors.forEach(function (s) {
      if (s.pci == null) return;
      var k = String(s.pci);
      if (!byPci[k]) byPci[k] = [];
      byPci[k].push(s);
    });
    var groups = [];
    Object.keys(byPci).forEach(function (pci) {
      if (byPci[pci].length > 1) groups.push({ pci: pci, sectors: byPci[pci], cells: byPci[pci] });
    });
    return groups;
  }

  function openPciModal() {
    // True rendering: the lifted PCIPlannerModal from the origin Svelte page.
    var lifted = openLiftedShell("PCIPlannerModal", null);
    if (lifted) {
      loadSitesAndSectors().then(function (data) {
        var sectors = (data.sectors || []).filter(function (s) {
          var st = String(s.status || "").toLowerCase();
          return st === "active" || st === "deployed" || st === "online" || !st;
        });
        var conflicts = pciConflictGroups(sectors);
        if (window.__wispHydrateShellScope) {
          window.__wispHydrateShellScope(
            lifted,
            {
              cells: sectors,
              sectors: sectors,
              conflicts: conflicts,
              isAnalyzing: false,
              loading: false,
              isLoading: false,
              activeTab: "analysis",
            },
            sectors,
          );
        }
      });
      return;
    }
    openModal("PCI planner", '<p class="plan-panel-loading">Loading sectors for PCI analysis…</p>');
    loadSitesAndSectors().then(function (data) {
      var sectors = (data.sectors || []).filter(function (s) {
        var st = String(s.status || "").toLowerCase();
        return st === "active" || st === "deployed" || st === "online" || !st;
      });
      if (!sectors.length) {
        openModal(
          "PCI planner",
          '<p class="cwl-empty-honest" data-cwl-empty-honest="1">No sectors available from /api/network/sectors. PCI values are not invented.</p>',
        );
        return;
      }
      var byPci = {};
      sectors.forEach(function (s) {
        if (s.pci == null) return;
        var k = String(s.pci);
        if (!byPci[k]) byPci[k] = [];
        byPci[k].push(s);
      });
      var collisions = Object.keys(byPci).filter(function (k) {
        return byPci[k].length > 1;
      });
      var html =
        "<p>Client-side PCI analysis over loaded sectors (Module_Manager pciService shape). Sites: " +
        (data.sites || []).length +
        ", sectors: " +
        sectors.length +
        ", collisions: " +
        collisions.length +
        ".</p>" +
        '<table class="wisp-demo-table"><thead><tr><th>Sector</th><th>eNodeB</th><th>PCI</th><th>Tech</th><th>Status</th></tr></thead><tbody>';
      sectors.forEach(function (s) {
        html +=
          "<tr><td>" +
          escapeHtml(s.name || s.id) +
          "</td><td>" +
          escapeHtml(s.eNodeB != null ? s.eNodeB : "—") +
          "</td><td>" +
          escapeHtml(s.pci != null ? s.pci : "—") +
          "</td><td>" +
          escapeHtml(s.technology || s.band || "") +
          "</td><td>" +
          escapeHtml(s.status || "") +
          "</td></tr>";
      });
      html += "</tbody></table>";
      if (collisions.length) {
        html += "<p><strong>Conflicts</strong></p><ul>";
        collisions.forEach(function (pci) {
          html +=
            "<li>PCI " +
            escapeHtml(pci) +
            ": " +
            byPci[pci]
              .map(function (s) {
                return escapeHtml(s.name || s.id);
              })
              .join(", ") +
            "</li>";
        });
        html += "</ul><p><strong>Optimization</strong> (local):</p><ul>";
        collisions.forEach(function (pci, i) {
          html +=
            "<li>Reassign " +
            escapeHtml(byPci[pci][1].name || byPci[pci][1].id) +
            " → PCI " +
            (50 + i) +
            "</li>";
        });
        html += "</ul>";
      } else {
        html +=
          '<p class="cwl-empty-honest" data-cwl-empty-honest="1">No PCI collisions in loaded sector set.</p>';
      }
      html +=
        '<p><a class="wisp-demo-btn" href="/modules/pci-resolution">Open PCI Resolution module</a></p>';
      openModal("PCI planner", html);
    });
  }

  function deployActivePlan() {
    var plan = mapState.activePlan;
    if (!plan) {
      toastSummary(
        '<h3>Deploy Plan</h3><p class="cwl-empty-honest" data-cwl-empty-honest="1">Select a plan project first.</p>',
      );
      return;
    }
    var planId = planIdOf(plan);
    var body = JSON.stringify({ planId: planId, name: plan.name || plan.title || planId });
    apiFetch("/api/deploy", { method: "POST", body: body })
      .then(function (r) {
        return patchPlanStatus(planId, "deployed").then(function () {
          toastSummary(
            "<h3>Deploy Plan</h3><p>" +
              escapeHtml(plan.name || planId) +
              (r && r.ok
                ? " posted to /api/deploy and marked deployed.</p>"
                : " marked deployed locally (deploy API returned " +
                  (r ? r.status : "error") +
                  ").</p>"),
          );
        });
      })
      .catch(function () {
        patchPlanStatus(planId, "deployed");
        toastSummary(
          "<h3>Deploy Plan</h3><p>" +
            escapeHtml(plan.name || planId) +
            " marked deployed (deploy POST failed; status patch attempted).</p>",
        );
      });
  }

  // --- wizards (Module_Manager wizard launcher surface) ---
  var WIZARDS = [
    {
      id: "customer",
      title: "Add Customer",
      desc: "Create a customer record (billing, service address, contact).",
      api: "/api/customers",
      fields: [
        { name: "firstName", label: "First name", required: true },
        { name: "lastName", label: "Last name", required: true },
        { name: "email", label: "Email", type: "email" },
        { name: "primaryPhone", label: "Phone" },
      ],
    },
    {
      id: "subscriber",
      title: "Add Subscriber",
      desc: "Provision an HSS subscriber (IMSI, key material).",
      api: "/api/hss/subscribers",
      fields: [
        { name: "imsi", label: "IMSI", required: true },
        { name: "msisdn", label: "MSISDN" },
        { name: "ki", label: "Ki (hex)" },
        { name: "opc", label: "OPc (hex)" },
      ],
    },
    {
      id: "work-order",
      title: "Create Work Order",
      desc: "Schedule field work (install, repair, survey).",
      api: "/api/work-orders",
      fields: [
        { name: "title", label: "Title", required: true },
        { name: "type", label: "Type (install/repair/survey)" },
        { name: "description", label: "Description" },
      ],
    },
    {
      id: "inventory",
      title: "Add Inventory Item",
      desc: "Register hardware (CPE, radios, routers).",
      api: "/api/inventory",
      fields: [
        { name: "name", label: "Item name", required: true },
        { name: "serialNumber", label: "Serial number" },
        { name: "model", label: "Model" },
      ],
    },
  ];

  function wizardModal(wiz) {
    var overlay = document.createElement("div");
    overlay.className = "wisp-wizard-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    var inputs = wiz.fields
      .map(function (f) {
        return (
          '<div class="form-group"><label for="wiz-' +
          f.name +
          '">' +
          f.label +
          (f.required ? " *" : "") +
          '</label><input id="wiz-' +
          f.name +
          '" name="' +
          f.name +
          '" type="' +
          (f.type || "text") +
          '"' +
          (f.required ? " required" : "") +
          " /></div>"
        );
      })
      .join("");
    overlay.innerHTML =
      '<div class="wisp-wizard-modal"><header><h2>' +
      wiz.title +
      "</h2>" +
      '<button type="button" class="wisp-wizard-close" aria-label="Close">×</button></header>' +
      '<p class="wisp-wizard-desc">' +
      wiz.desc +
      "</p>" +
      '<form class="wisp-wizard-form">' +
      inputs +
      '<div class="wisp-wizard-status" aria-live="polite" hidden></div>' +
      '<footer><button type="button" class="wisp-demo-btn wisp-wizard-cancel">Cancel</button>' +
      '<button type="submit" class="wisp-demo-btn primary">Create</button></footer></form></div>';
    document.body.appendChild(overlay);
    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay || ev.target.closest(".wisp-wizard-close, .wisp-wizard-cancel")) close();
    });
    var form = overlay.querySelector(".wisp-wizard-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var payload = {};
      wiz.fields.forEach(function (f) {
        var el = form.querySelector('[name="' + f.name + '"]');
        if (el && el.value) payload[f.name] = el.value;
      });
      status.hidden = false;
      status.textContent = "Creating…";
      status.classList.remove("error");
      apiFetch(wiz.api, { method: "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) {
            return r.text().then(function (t) {
              throw new Error("Backend rejected (" + r.status + "): " + String(t).slice(0, 140));
            });
          }
          status.textContent = "Created — saved to the live backend.";
          setTimeout(close, 1200);
        })
        .catch(function (e) {
          status.classList.add("error");
          status.textContent = (e && e.message) || "Create failed";
        });
    });
  }

  function initWizardLauncher() {
    var page = qs('[data-wisp-page="wizards"]');
    if (!page) return;
    var panel = page.querySelector(".wisp-demo-panel");
    if (!panel) return;
    var grid = document.createElement("div");
    grid.className = "wisp-wizard-grid";
    grid.innerHTML = WIZARDS.map(function (w) {
      return (
        '<article class="wisp-wizard-card" data-wizard="' +
        w.id +
        '">' +
        "<h3>" +
        w.title +
        "</h3><p>" +
        w.desc +
        "</p>" +
        '<button type="button" class="wisp-demo-btn primary" data-wizard-launch="' +
        w.id +
        '">Launch wizard</button></article>'
      );
    }).join("");
    panel.insertBefore(grid, panel.firstChild);
    page.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-wizard-launch]");
      if (!btn) return;
      var wiz = WIZARDS.filter(function (w) {
        return w.id === btn.getAttribute("data-wizard-launch");
      })[0];
      if (wiz) wizardModal(wiz);
    });
  }

  /** The lifted origin "📁 Deployment Projects" modal overlay from plan +page.svelte. */
  function planProjectModalOverlay() {
    var content = document.querySelector(".modal-content.project-modal");
    return content ? content.closest(".modal-overlay") : null;
  }

  function planProjectModalList() {
    var overlay = planProjectModalOverlay();
    if (!overlay || overlay.hidden) return null;
    return qs(".project-list", overlay);
  }

  function closeProjectModalOverlay() {
    var overlay = planProjectModalOverlay();
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.display = "none";
  }

  /** Open the lifted origin project modal and render live projects into it. */
  function openProjectModalLifted() {
    var overlay = planProjectModalOverlay();
    if (!overlay) return false;
    overlay.hidden = false;
    overlay.removeAttribute("aria-hidden");
    overlay.style.display = "flex";
    if (!overlay.__wispWired) {
      overlay.__wispWired = true;
      overlay.addEventListener("click", function (ev) {
        if (ev.target === overlay) {
          closeProjectModalOverlay();
          return;
        }
        var chrome = ev.target.closest("[data-cwl-action]");
        if (chrome === overlay) chrome = null;
        if (chrome) {
          var act = chrome.getAttribute("data-cwl-action") || "";
          if (/closeProjectModal/.test(act)) {
            ev.preventDefault();
            ev.stopPropagation();
            closeProjectModalOverlay();
            return;
          }
          if (/openCreateProject/.test(act)) {
            ev.preventDefault();
            ev.stopPropagation();
            closeProjectModalOverlay();
            openCreateProjectModal(qs("#plan-projects-list"));
            return;
          }
        }
        handlePlanAction(ev, qs(".project-list", overlay));
      });
      overlay.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") closeProjectModalOverlay();
      });
    }
    var list = qs(".project-list", overlay);
    if (list) {
      list.innerHTML = '<p class="plan-panel-loading">Loading projects…</p>';
      loadProjects(list);
    }
    return true;
  }

  function openProjectsPanel(projectsPanel, layersPanel, hardwarePanel, listEl, modeHint) {
    if (hardwarePanel) hardwarePanel.hidden = true;
    if (layersPanel) layersPanel.hidden = true;
    if (modeHint === "deploy-projects") {
      mapState.filterMode = "ready+approved+draft";
    } else if (modeHint) {
      mapState.filterMode = modeHint;
    } else {
      mapState.filterMode = "all";
    }
    // Prefer the lifted origin modal (true rendering); fall back to the side drawer.
    if (openProjectModalLifted()) {
      if (projectsPanel) projectsPanel.hidden = true;
      return;
    }
    if (!projectsPanel) return;
    projectsPanel.hidden = false;
    loadProjects(listEl);
  }

  /** Open the lifted PlanApprovalModal (true origin rendering) for a plan. */
  function openPlanApprovalLifted(plan) {
    if (!plan) return false;
    var normalized = Object.assign({}, plan);
    if (!normalized.scope || typeof normalized.scope !== "object") {
      normalized.scope = {};
    }
    normalized.scope = Object.assign(
      { towers: [], sectors: [], cpeDevices: [], equipment: [] },
      normalized.scope,
    );
    var lifted = openLiftedShell("PlanApprovalModal", {
      show: true,
      plan: normalized,
      isProcessing: false,
      rejectionReason: "",
      getRejectionReasonLabel: function (x) {
        return String(x || "");
      },
    });
    return !!lifted;
  }

  /** Open the lifted DeployedHardwareModal with live deployment data. */
  function openDeployedHardwareLifted() {
    var lifted = openLiftedShell("DeployedHardwareModal", null);
    if (!lifted) return false;
    function rowsOf(body, keys) {
      if (!body) return [];
      if (Array.isArray(body)) return body;
      for (var i = 0; i < keys.length; i++) {
        if (Array.isArray(body[keys[i]])) return body[keys[i]];
      }
      return [];
    }
    Promise.all([
      apiFetch("/api/network/hardware-deployments")
        .then(function (r) {
          return r && r.ok ? r.json() : null;
        })
        .catch(function () {
          return null;
        }),
      apiFetch("/api/epc")
        .then(function (r) {
          return r && r.ok ? r.json() : null;
        })
        .catch(function () {
          return null;
        }),
    ]).then(function (pair) {
      var deployments = rowsOf(pair[0], ["deployments", "items", "hardware"]);
      var epcDevices = rowsOf(pair[1], ["devices", "items", "epcs"]);
      if (window.__wispHydrateShellScope) {
        window.__wispHydrateShellScope(
          lifted,
          {
            deployments: deployments,
            epcDevices: epcDevices,
            loading: false,
            activeTab: "hardware",
            getPlanName: function (id) {
              var p = findPlanById(id);
              return (p && (p.name || p.title)) || String(id || "");
            },
          },
          deployments,
        );
      }
    });
    return true;
  }

  function initMapShell(pageSel, mode) {
    var page = qs(pageSel);
    if (!page) return;
    mapState.mode = mode;
    var projectsPanel = ensureProjectsPanel(page);
    var listEl = qs("#plan-projects-list", page);
    var layersPanel = ensureLayerPanel(page);
    var hardwarePanel = ensureHardwarePanel(page);
    var iframe = mapIframe();
    if (iframe) {
      iframe.addEventListener("load", function () {
        postStateToIframe();
      });
    }

    apiFetch("/api/plans")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        var projects = projectsFromApi(data);
        mapState.projects = projects;
        if (projects.length && !mapState.activePlan) setActivePlan(projects[0], { center: false });
      })
      .catch(function () {});

    if (listEl) {
      listEl.addEventListener("click", function (ev) {
        handlePlanAction(ev, listEl);
      });
    }

    function startMarketingDraw() {
      if (!mapState.activePlanId) {
        toastSummary(
          '<h3>Find Addresses</h3><p class="cwl-empty-honest" data-cwl-empty-honest="1">Select a plan project first, then draw a rectangle on the map.</p>',
        );
        openProjectsPanel(projectsPanel, layersPanel, hardwarePanel, listEl, "all");
        return;
      }
      postToMapBoth("enable-rectangle-drawing", { planId: mapState.activePlanId });
      postToMapBoth("marketing-draw", { planId: mapState.activePlanId });
      toastSummary(
        "<h3>Find Addresses</h3><p>Draw a rectangle on the map. Discovery uses POST /api/plans/marketing/discover, with spatial fallback over /api/network/*.</p>",
      );
    }

    page.addEventListener("click", function (ev) {
      var helpLink = ev.target.closest("a.help-link");
      if (helpLink) {
        ev.preventDefault();
        openModal(
          "Help",
          "<p>Plan and deploy operator help.</p><p><a href=\"/help\">Help center</a> · <a href=\"/docs\">Documentation</a></p>",
        );
        return;
      }
      var btn =
        ev.target.closest("[data-action]") ||
        ev.target.closest("[data-cwl-action]") ||
        ev.target.closest("[data-cwl-toggle]");
      if (!btn || !page.contains(btn)) return;
      var action =
        btn.getAttribute("data-action") ||
        btn.getAttribute("data-cwl-action") ||
        "";
      var toggleKey = (btn.getAttribute("data-cwl-toggle") || "").split(":")[0] || "";
      // Map converted Svelte handler names onto the plan/deploy island actions.
      var mapped = String(action || toggleKey || "")
        .replace(/^(?:handle|open|show)/i, "")
        .toLowerCase();
      if (/^back$/i.test(action)) {
        location.href = "/dashboard";
        return;
      }
      if (action === "help" || /helpmodal/i.test(toggleKey)) {
        openModal(
          "Help",
          "<p>Plan and deploy operator help.</p><p><a href=\"/help\">Help center</a> · <a href=\"/docs\">Documentation</a></p>",
        );
        return;
      }
      if (
        action === "projects" ||
        /openprojectlist|projectlist/i.test(action) ||
        /planapproval|openplanapproval/i.test(action) ||
        mapped === "planapproval" ||
        mapped === "projectlist"
      ) {
        ev.preventDefault();
        // True rendering first: origin PlanApprovalModal for the active plan.
        if (
          /planapproval/i.test(action + mapped) &&
          openPlanApprovalLifted(mapState.activePlan || mapState.projects[0])
        ) {
          return;
        }
        openProjectsPanel(
          projectsPanel,
          layersPanel,
          hardwarePanel,
          listEl,
          mode === "deploy" ? "deploy-projects" : "all",
        );
        return;
      }
      if (
        action === "approved" ||
        /projectfilters/i.test(toggleKey) ||
        /projectfilters/i.test(action)
      ) {
        ev.preventDefault();
        openProjectsPanel(projectsPanel, layersPanel, hardwarePanel, listEl, "approved");
        var filterPanel = page.querySelector(
          "[data-cwl-lifted-component='ProjectFilterPanel'], .project-filter-panel",
        );
        if (filterPanel) {
          filterPanel.hidden = false;
          filterPanel.removeAttribute("hidden");
          filterPanel.setAttribute("aria-hidden", "false");
          filterPanel.style.display = "";
        }
        return;
      }
      if (
        action === "deployed" ||
        /deployedhardware/i.test(toggleKey) ||
        /deployedhardware/i.test(action)
      ) {
        ev.preventDefault();
        // True rendering first: origin DeployedHardwareModal.
        if (openDeployedHardwareLifted()) return;
        openProjectsPanel(projectsPanel, layersPanel, hardwarePanel, listEl, "deployed");
        openHardwarePanel(page, layersPanel, projectsPanel);
        return;
      }
      if (action === "close-projects") {
        if (projectsPanel) projectsPanel.hidden = true;
        return;
      }
      if (action === "close-layers") {
        if (layersPanel) layersPanel.hidden = true;
        return;
      }
      if (action === "close-hardware") {
        if (hardwarePanel) hardwarePanel.hidden = true;
        return;
      }
      if (
        action === "hardware" ||
        /openhardwareview|hardwareview/i.test(action) ||
        /deployedhardware/i.test(toggleKey)
      ) {
        ev.preventDefault();
        if (openDeployedHardwareLifted()) return;
        openHardwarePanel(page, layersPanel, projectsPanel);
        return;
      }
      if (action === "layers") {
        if (layersPanel) {
          layersPanel.hidden = !layersPanel.hidden;
          if (projectsPanel) projectsPanel.hidden = true;
          if (hardwarePanel) hardwarePanel.hidden = true;
        }
        postToMapBoth("toggle-layers", mapState.layerFilters);
        postToMapBoth("layer-filters-changed", mapState.layerFilters);
        return;
      }
      if (action === "marketing" || /openmarketingtools|marketingtools/i.test(action)) {
        ev.preventDefault();
        startMarketingDraw();
        return;
      }
      if (action === "create-project" || /opencreateproject|createproject/i.test(action)) {
        ev.preventDefault();
        openCreateProjectModal(listEl);
        return;
      }
      if (
        action === "pci" ||
        /pciplanner|openpciplanner/i.test(action)
      ) {
        ev.preventDefault();
        openPciModal();
        return;
      }
      if (
        action === "frequency" ||
        /frequencyplanner|openfrequencyplanner/i.test(action)
      ) {
        ev.preventDefault();
        openFrequencyModal();
        return;
      }
      if (
        action === "deploy-plan" ||
        /pushactiveplanto field|pushactiveplantofield|pushactiveplan/i.test(
          String(action).replace(/\s+/g, ""),
        )
      ) {
        ev.preventDefault();
        deployActivePlan();
        return;
      }
    });

    window.wispSharedMap = {
      postToMap: postToMapBoth,
      postStateToIframe: postStateToIframe,
      setActivePlan: setActivePlan,
      state: mapState,
      openPci: openPciModal,
      openFrequency: openFrequencyModal,
      deployActivePlan: deployActivePlan,
      openProjects: function () {
        openProjectsPanel(
          projectsPanel,
          layersPanel,
          hardwarePanel,
          listEl,
          mode === "deploy" ? "deploy-projects" : "all",
        );
      },
      openApproved: function () {
        openProjectsPanel(projectsPanel, layersPanel, hardwarePanel, listEl, "approved");
        var filterPanel = page.querySelector(
          "[data-cwl-lifted-component='ProjectFilterPanel'], .project-filter-panel",
        );
        if (filterPanel) {
          filterPanel.hidden = false;
          filterPanel.removeAttribute("hidden");
          filterPanel.setAttribute("aria-hidden", "false");
          filterPanel.style.display = "";
        }
      },
      openHardware: function () {
        if (openDeployedHardwareLifted()) return;
        openHardwarePanel(page, layersPanel, projectsPanel);
      },
      openDeployedHardware: function () {
        if (openDeployedHardwareLifted()) return;
        openHardwarePanel(page, layersPanel, projectsPanel);
      },
      openPlanApproval: function (plan) {
        if (openPlanApprovalLifted(plan || mapState.activePlan || mapState.projects[0]))
          return;
        openProjectsPanel(
          projectsPanel,
          layersPanel,
          hardwarePanel,
          listEl,
          mode === "deploy" ? "deploy-projects" : "all",
        );
      },
      openCreateProject: function () {
        openCreateProjectModal(listEl);
      },
      openMarketing: startMarketingDraw,
    };
  }

  initWizardLauncher();
  window.addEventListener("message", handleMapMessage);
  initMapShell('[data-wisp-page="plan"]', "plan");
  initMapShell('[data-wisp-page="deploy"]', "deploy");
})();
