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
            addresses: Array.isArray(marketing.addresses) ? marketing.addresses : [],
          }
        : null;
    postToMapBoth("state-update", {
      mode: mapState.mode,
      state: {
        mode: mapState.mode,
        activePlanId: mapState.activePlanId,
        activePlan: activePlanSummary(plan),
        activePlanMarketing: activePlanMarketing,
        capabilities: { mode: mapState.mode, readOnly: mapState.mode === "deploy" },
      },
    });
  }

  function setActivePlan(plan, opts) {
    opts = opts || {};
    mapState.activePlan = plan || null;
    mapState.activePlanId = plan ? plan.id || plan._id || null : null;
    postStateToIframe();
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
      ["draft", "approved", "deployed", "ready", "authorized"].indexOf(st) >= 0;
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

  function renderProjects(listEl) {
    if (!listEl) return;
    var projects = filterProjectsForView(mapState.projects || []);
    if (!projects.length) {
      listEl.innerHTML =
        '<p class="plan-panel-empty">No plan projects match this filter. Create one from Create, or change the filter.</p>';
      return;
    }
    listEl.innerHTML = projects
      .map(function (p) {
        var name = escapeHtml(p.name || p.title || "Untitled plan");
        var status = escapeHtml(p.status || "draft");
        var id = escapeHtml(planIdOf(p));
        return (
          '<article class="plan-project-item" data-plan-id="' +
          id +
          '"><h3>' +
          name +
          "</h3><p>Status: " +
          status +
          '</p><div class="plan-project-actions">' +
          '<button type="button" class="wisp-control-btn" data-plan-action="select">Select</button>' +
          '<button type="button" class="wisp-control-btn" data-plan-action="approve">Approve</button>' +
          '<button type="button" class="wisp-control-btn" data-plan-action="start">Start</button>' +
          '<button type="button" class="wisp-control-btn" data-plan-action="deploy">Deploy</button>' +
          '<button type="button" class="wisp-control-btn" data-plan-action="delete">Delete</button>' +
          "</div></article>"
        );
      })
      .join("");
  }

  function findPlanById(id) {
    var i;
    for (i = 0; i < mapState.projects.length; i++) {
      if (planIdOf(mapState.projects[i]) === String(id)) return mapState.projects[i];
    }
    return null;
  }

  function loadProjects(listEl) {
    if (!listEl) return;
    listEl.innerHTML = '<p class="plan-panel-loading">Loading projects…</p>';
    return apiFetch("/api/plans")
      .then(function (r) {
        return r.ok ? r.json() : [];
      })
      .then(function (data) {
        var projects = projectsFromApi(data);
        mapState.projects = projects;
        renderProjects(listEl);
        if (!mapState.activePlan && projects.length) {
          setActivePlan(projects[0], { center: false });
        }
        return projects;
      })
      .catch(function () {
        listEl.innerHTML =
          '<p class="plan-panel-empty">Could not load projects. Sign in and try again.</p>';
        return [];
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
    if (listEl) renderProjects(listEl);
    var body = JSON.stringify({ id: id, status: status });
    return apiFetch("/api/plans", { method: "PATCH", body: body })
      .then(function (r) {
        if (r && r.ok) return true;
        return apiFetch("/api/plans", { method: "PUT", body: body }).then(function (r2) {
          return !!(r2 && r2.ok);
        });
      })
      .catch(function () {
        return false;
      })
      .then(function () {
        return loadProjects(listEl);
      });
  }

  function deletePlanLocal(id) {
    mapState.projects = mapState.projects.filter(function (p) {
      return planIdOf(p) !== String(id);
    });
    if (mapState.activePlanId && String(mapState.activePlanId) === String(id)) {
      setActivePlan(mapState.projects[0] || null, { center: false });
    }
    var listEl = qs("#plan-projects-list");
    if (listEl) renderProjects(listEl);
    var body = JSON.stringify({ id: id, status: "deleted" });
    apiFetch("/api/plans", { method: "PATCH", body: body }).catch(function () {});
    apiFetch("/api/plans/" + encodeURIComponent(id), { method: "DELETE" }).catch(function () {});
  }

  function handlePlanAction(ev, listEl) {
    var btn = ev.target.closest("[data-plan-action]");
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    var article = btn.closest("[data-plan-id]");
    if (!article) return;
    var id = article.getAttribute("data-plan-id");
    var plan = findPlanById(id);
    var action = btn.getAttribute("data-plan-action");
    if (action === "select") {
      setActivePlan(plan || { id: id }, { center: true });
      return;
    }
    if (action === "approve") {
      patchPlanStatus(id, "approved");
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
    box.innerHTML =
      "<h3>Map selection</h3><p>" +
      escapeHtml(detail.name || detail.id || "Feature") +
      "</p><p>" +
      escapeHtml(detail.kind || "") +
      (detail.status ? " · " + escapeHtml(detail.status) : "") +
      "</p>";
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
      ? apiFetch("/api/plans/marketing/discover", {
          method: "POST",
          body: JSON.stringify(discoverBody),
        })
          .then(function (r) {
            if (!r || !r.ok) return null;
            return r.json().catch(function () {
              return null;
            });
          })
          .then(function (data) {
            if (data && Array.isArray(data.addresses) && data.addresses.length) {
              return {
                addresses: data.addresses.map(toMarketingAddress),
                note: "POST /api/plans/marketing/discover (Module_Manager marketing contract).",
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

  function openCreateProjectModal(listEl) {
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

  function openPciModal() {
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

  function openProjectsPanel(projectsPanel, layersPanel, hardwarePanel, listEl, modeHint) {
    if (hardwarePanel) hardwarePanel.hidden = true;
    if (layersPanel) layersPanel.hidden = true;
    if (!projectsPanel) return;
    if (modeHint === "deploy-projects") {
      mapState.filterMode = "ready+approved+draft";
    } else if (modeHint) {
      mapState.filterMode = modeHint;
    } else {
      mapState.filterMode = "all";
    }
    projectsPanel.hidden = false;
    loadProjects(listEl);
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
      var btn = ev.target.closest("[data-action]");
      if (!btn || !page.contains(btn)) return;
      var action = btn.getAttribute("data-action");
      if (action === "back") {
        location.href = "/dashboard";
        return;
      }
      if (action === "help") {
        openModal(
          "Help",
          "<p>Plan and deploy operator help.</p><p><a href=\"/help\">Help center</a> · <a href=\"/docs\">Documentation</a></p>",
        );
        return;
      }
      if (action === "projects") {
        openProjectsPanel(
          projectsPanel,
          layersPanel,
          hardwarePanel,
          listEl,
          mode === "deploy" ? "deploy-projects" : "all",
        );
        return;
      }
      if (action === "approved") {
        openProjectsPanel(projectsPanel, layersPanel, hardwarePanel, listEl, "approved");
        return;
      }
      if (action === "deployed") {
        openProjectsPanel(projectsPanel, layersPanel, hardwarePanel, listEl, "deployed");
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
      if (action === "hardware") {
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
      if (action === "marketing") {
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
        return;
      }
      if (action === "create-project") {
        openCreateProjectModal(listEl);
        return;
      }
      if (action === "pci") {
        openPciModal();
        return;
      }
      if (action === "frequency") {
        openFrequencyModal();
        return;
      }
      if (action === "deploy-plan") {
        deployActivePlan();
        return;
      }
    });

    window.wispSharedMap = {
      postToMap: postToMapBoth,
      postStateToIframe: postStateToIframe,
      setActivePlan: setActivePlan,
      state: mapState,
    };
  }

  initWizardLauncher();
  window.addEventListener("message", handleMapMessage);
  initMapShell('[data-wisp-page="plan"]', "plan");
  initMapShell('[data-wisp-page="deploy"]', "deploy");
})();
