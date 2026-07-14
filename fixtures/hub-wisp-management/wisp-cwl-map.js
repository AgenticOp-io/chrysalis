/**
 * WISP ArcGIS coverage-map island — converted from Module_Manager:
 *   coverage-map/lib/dataLoader.ts
 *   coverage-map/lib/coverageMapService.mongodb.ts
 *   coverage-map/lib/arcgisMapController.ts (message + layers)
 *   coverage-map/lib/renderers/{tower,sector}Renderer.ts
 *   coverage-map/components/{MapControls,FilterPanel}.svelte
 *   lib/map/SharedMap.svelte (iframe contract)
 *
 * G9951: auth'd network load via WispCwlApi; sector cones + tower colors; MapControls.
 * Does not invent GenieACS / TR-069 widgets.
 */
(function () {
  function ensureHost() {
    var host = document.getElementById("arcgis-map-view");
    if (host) return host;
    var fs = document.querySelector(
      ".map-fullscreen, .wisp-coverage-map, [data-wisp-page=\"coverage-map\"]",
    );
    if (!fs) return null;
    host = document.createElement("div");
    host.id = "arcgis-map-view";
    host.className = "map-view-host";
    host.setAttribute("role", "application");
    host.setAttribute("aria-label", "Coverage map");
    fs.insertBefore(host, fs.firstChild);
    if (!document.getElementById("map-loading")) {
      var loading = document.createElement("div");
      loading.id = "map-loading";
      loading.className = "map-loading";
      loading.textContent = "Loading map…";
      fs.appendChild(loading);
    }
    return host;
  }

  var host = ensureHost();
  if (!host) return;

  var params = new URLSearchParams(location.search);
  var mode =
    params.get("mode") ||
    (params.get("planMode") === "true"
      ? "plan"
      : params.get("deployMode") === "true"
        ? "deploy"
        : "coverage");
  var inIframe = window.parent && window.parent !== window;
  var hideStats = params.get("hideStats") === "true";

  /** @type {any} */
  var view = null;
  /** @type {any} */
  var towersLayer = null;
  /** @type {any} */
  var sectorsLayer = null;
  /** @type {any} */
  var cpeLayer = null;
  /** @type {any} */
  var equipmentLayer = null;
  /** @type {any} */
  var marketingLayer = null;
  /** @type {any} */
  var draftLayer = null;
  /** @type {any} */
  var Graphic = null;
  /** @type {any} */
  var Point = null;
  /** @type {any} */
  var Polygon = null;
  /** @type {any} */
  var SimpleMarkerSymbol = null;
  /** @type {any} */
  var SimpleFillSymbol = null;
  /** @type {any} */
  var Sketch = null;
  /** @type {any} */
  var sketchWidget = null;
  /** @type {any} */
  var mapRef = null;
  /** @type {any} */
  var OpenStreetMapLayerCtor = null;

  var filters = {
    showTowers: true,
    showSectors: true,
    showCPE: true,
    showEquipment: true,
    showMarketing: true,
    showBackhaul: false,
    showNetworkAssets: true,
    showPlanFeatures: true,
    bandFilters: [
      { band: "LTE", enabled: true, color: "#ef4444" },
      { band: "CBRS", enabled: true, color: "#3b82f6" },
      { band: "FWA", enabled: true, color: "#10b981" },
      { band: "5G", enabled: true, color: "#8b5cf6" },
      { band: "WiFi", enabled: true, color: "#f59e0b" },
    ],
    statusFilter: [],
  };

  var dataCache = { towers: [], sectors: [], cpeDevices: [], equipment: [] };
  var marketingAddresses = [];
  var activePlanId = params.get("planId") || null;
  var statsEl = null;

  var BAND_COLORS = {
    LTE: "#ef4444",
    CBRS: "#3b82f6",
    FWA: "#10b981",
    "5G": "#8b5cf6",
    WiFi: "#f59e0b",
  };

  function hideLoading() {
    var el = document.getElementById("map-loading");
    if (el) el.classList.add("hidden");
  }

  function setHonesty(msg) {
    var el = document.getElementById("map-honesty");
    if (!el) {
      el = document.createElement("div");
      el.id = "map-honesty";
      el.className = "map-honesty";
      el.setAttribute("data-cwl-empty-honest", "1");
      (host.parentElement || document.body).appendChild(el);
    }
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function loadCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  loadCss("https://js.arcgis.com/4.29/esri/themes/light/main.css");

  function postToParent(type, extra) {
    if (!inIframe) return;
    try {
      var msg = Object.assign({ source: "coverage-map", type: type }, extra || {});
      window.parent.postMessage(msg, "*");
    } catch (_) {}
  }

  function num(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function apiFetch(path, opts) {
    opts = opts || {};
    if (window.WispCwlApi && typeof window.WispCwlApi.fetch === "function") {
      return window.WispCwlApi.fetch(path, opts);
    }
    return fetch(path, Object.assign({ credentials: "same-origin" }, opts));
  }

  function fetchJson(path) {
    return apiFetch(path)
      .then(function (r) {
        return r && r.ok ? r.json().catch(function () { return null; }) : null;
      })
      .catch(function () {
        return null;
      });
  }

  function asArray(data, keys) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    if (Array.isArray(data.items)) return data.items;
    return [];
  }

  function latLngOf(row) {
    if (!row || typeof row !== "object") return null;
    var lat =
      num(row.lat) ??
      num(row.latitude) ??
      (row.geometry && (num(row.geometry.lat) ?? num(row.geometry.y))) ??
      (row.location &&
        (num(row.location.lat) ?? num(row.location.latitude)));
    var lng =
      num(row.lng) ??
      num(row.lon) ??
      num(row.longitude) ??
      (row.geometry && (num(row.geometry.lng) ?? num(row.geometry.x))) ??
      (row.location &&
        (num(row.location.lng) ??
          num(row.location.lon) ??
          num(row.location.longitude)));
    if (lat == null || lng == null) return null;
    return { lat: lat, lng: lng };
  }

  function normalizeSite(row) {
    if (!row || typeof row !== "object") return null;
    var ll = latLngOf(row);
    if (!ll) return null;
    var type = row.type;
    if (!Array.isArray(type)) type = type ? [String(type)] : ["tower"];
    return Object.assign({}, row, {
      id: String(row.id || row._id || ""),
      name: String(row.name || row.id || "tower"),
      status: String(row.status || "active"),
      type: type,
      lat: ll.lat,
      lng: ll.lng,
      location: row.location || { latitude: ll.lat, longitude: ll.lng },
    });
  }

  function normalizeSector(row, sitesById) {
    if (!row || typeof row !== "object") return null;
    var ll = latLngOf(row);
    if (!ll && row.siteId && sitesById[row.siteId]) {
      ll = { lat: sitesById[row.siteId].lat, lng: sitesById[row.siteId].lng };
    }
    if (!ll) return null;
    return Object.assign({}, row, {
      id: String(row.id || row._id || ""),
      name: String(row.name || row.id || "sector"),
      status: String(row.status || "active"),
      siteId: row.siteId || null,
      band: String(row.band || row.technology || "LTE"),
      technology: String(row.technology || row.band || "LTE"),
      azimuth: num(row.azimuth) != null ? num(row.azimuth) : 0,
      beamwidth: num(row.beamwidth) != null ? num(row.beamwidth) : 60,
      lat: ll.lat,
      lng: ll.lng,
    });
  }

  function towerColor(tower) {
    var st = String(tower.status || "").toLowerCase();
    if (st === "active" || st === "online" || st === "deployed") return [16, 185, 129, 0.95];
    if (st === "inactive" || st === "offline") return [239, 68, 68, 0.95];
    if (st === "maintenance") return [245, 158, 11, 0.95];
    var t = String((tower.type && tower.type[0]) || "tower").toLowerCase();
    if (t === "rooftop") return [139, 92, 246, 0.95];
    if (t === "monopole" || t === "internet") return [6, 182, 212, 0.95];
    if (t === "warehouse") return [245, 158, 11, 0.95];
    if (t === "noc") return [239, 68, 68, 0.95];
    return [59, 130, 246, 0.95];
  }

  function hexToRgba(hex, alpha) {
    var h = String(hex || "#3b82f6").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!Number.isFinite(n)) return [59, 130, 246, alpha];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
  }

  function createSectorCone(lat, lon, azimuth, beamwidth, radiusDeg) {
    var az = ((Number(azimuth) % 360) + 360) % 360;
    var bw = Math.max(10, Number(beamwidth) || 60);
    var r = radiusDeg || 0.03;
    var start = az - bw / 2;
    var end = az + bw / 2;
    var rings = [[lon, lat]];
    var steps = Math.max(8, Math.ceil(bw / 5));
    for (var i = 0; i <= steps; i++) {
      var a = ((start + (end - start) * (i / steps)) * Math.PI) / 180;
      rings.push([lon + r * Math.sin(a), lat + r * Math.cos(a)]);
    }
    rings.push([lon, lat]);
    return rings;
  }

  function statusAllowed(row) {
    if (!filters.statusFilter || !filters.statusFilter.length) return true;
    var st = String(row.status || "").toLowerCase();
    return filters.statusFilter.some(function (s) {
      return st === String(s).toLowerCase();
    });
  }

  function bandAllowed(sector) {
    var band = String(sector.band || sector.technology || "LTE").toUpperCase();
    var enabled = (filters.bandFilters || []).filter(function (b) {
      return b.enabled;
    });
    if (!enabled.length) return true;
    return enabled.some(function (b) {
      return String(b.band).toUpperCase() === band;
    });
  }

  function applyFilters() {
    var towers = (dataCache.towers || []).filter(function (t) {
      return filters.showTowers && filters.showNetworkAssets !== false && statusAllowed(t);
    });
    var sectors = (dataCache.sectors || []).filter(function (s) {
      return filters.showSectors && filters.showNetworkAssets !== false && statusAllowed(s) && bandAllowed(s);
    });
    var cpe = (dataCache.cpeDevices || []).filter(function (c) {
      return filters.showCPE && statusAllowed(c);
    });
    var equipment = (dataCache.equipment || []).filter(function (e) {
      return filters.showEquipment && statusAllowed(e);
    });
    renderTowers(towers);
    renderSectors(sectors);
    renderCpe(cpe);
    renderEquipment(equipment);
    renderMarketing(marketingAddresses);
    updateStats(towers, sectors, cpe, equipment);
  }

  function renderTowers(towers) {
    if (!towersLayer || !Graphic || !Point || !SimpleMarkerSymbol) return;
    towersLayer.removeAll();
    towers.forEach(function (t) {
      towersLayer.add(
        new Graphic({
          geometry: new Point({ longitude: t.lng, latitude: t.lat }),
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: towerColor(t),
            size: 12,
            outline: { color: [26, 35, 50, 1], width: 1 },
          }),
          attributes: Object.assign({}, t, { kind: "tower", type: "tower" }),
          popupTemplate: {
            title: "{name}",
            content: "Status: {status}<br/>Kind: tower",
          },
        }),
      );
    });
    towersLayer.visible = !!filters.showTowers && filters.showNetworkAssets !== false;
  }

  function renderSectors(sectors) {
    if (!sectorsLayer || !Graphic || !Polygon || !SimpleFillSymbol) return;
    sectorsLayer.removeAll();
    var zoom = view && view.zoom != null ? view.zoom : 10;
    var radius = 0.003 * Math.max(0.5, Math.min(1.5, (zoom - 8) / 10 || 1));
    sectors.forEach(function (s) {
      var band = String(s.band || s.technology || "LTE");
      var hex = BAND_COLORS[band] || BAND_COLORS[band.toUpperCase()] || "#3b82f6";
      var rings = createSectorCone(s.lat, s.lng, s.azimuth, s.beamwidth, radius);
      sectorsLayer.add(
        new Graphic({
          geometry: new Polygon({ rings: [rings] }),
          symbol: new SimpleFillSymbol({
            color: hexToRgba(hex, 0.3),
            outline: { color: hexToRgba(hex, 1), width: 1 },
          }),
          attributes: Object.assign({}, s, { kind: "sector", type: "sector" }),
          popupTemplate: {
            title: "{name}",
            content: "Band: {band}<br/>Azimuth: {azimuth}<br/>PCI: {pci}",
          },
        }),
      );
    });
    sectorsLayer.visible = !!filters.showSectors && filters.showNetworkAssets !== false;
  }

  function renderCpe(rows) {
    if (!cpeLayer || !Graphic || !Point || !SimpleMarkerSymbol) return;
    cpeLayer.removeAll();
    rows.forEach(function (c) {
      var ll = latLngOf(c);
      if (!ll) return;
      cpeLayer.add(
        new Graphic({
          geometry: new Point({ longitude: ll.lng, latitude: ll.lat }),
          symbol: new SimpleMarkerSymbol({
            style: "diamond",
            color: [251, 191, 36, 0.95],
            size: 9,
            outline: { color: [26, 35, 50, 1], width: 1 },
          }),
          attributes: Object.assign({}, c, { kind: "cpe", lat: ll.lat, lng: ll.lng }),
          popupTemplate: { title: "{name}", content: "CPE · {status}" },
        }),
      );
    });
    cpeLayer.visible = !!filters.showCPE;
  }

  function renderEquipment(rows) {
    if (!equipmentLayer || !Graphic || !Point || !SimpleMarkerSymbol) return;
    equipmentLayer.removeAll();
    rows.forEach(function (e) {
      var ll = latLngOf(e);
      if (!ll) return;
      equipmentLayer.add(
        new Graphic({
          geometry: new Point({ longitude: ll.lng, latitude: ll.lat }),
          symbol: new SimpleMarkerSymbol({
            style: "square",
            color: [148, 163, 184, 0.95],
            size: 9,
            outline: { color: [26, 35, 50, 1], width: 1 },
          }),
          attributes: Object.assign({}, e, { kind: "equipment", lat: ll.lat, lng: ll.lng }),
          popupTemplate: { title: "{name}", content: "Equipment · {status}" },
        }),
      );
    });
    equipmentLayer.visible = !!filters.showEquipment;
  }

  function renderMarketing(addresses) {
    marketingAddresses = Array.isArray(addresses) ? addresses : [];
    if (!marketingLayer || !Graphic || !Point || !SimpleMarkerSymbol) return;
    marketingLayer.removeAll();
    if (!filters.showMarketing) {
      marketingLayer.visible = false;
      return;
    }
    marketingAddresses.forEach(function (row) {
      var ll = latLngOf(row);
      if (!ll) return;
      marketingLayer.add(
        new Graphic({
          geometry: new Point({ longitude: ll.lng, latitude: ll.lat }),
          symbol: new SimpleMarkerSymbol({
            style: "circle",
            color: [255, 180, 0, 0.95],
            size: 8,
            outline: { color: [26, 35, 50, 1], width: 1 },
          }),
          attributes: Object.assign({}, row, {
            kind: "marketing",
            name: row.name || row.address || row.id,
            lat: ll.lat,
            lng: ll.lng,
          }),
          popupTemplate: { title: "{name}", content: "Marketing lead" },
        }),
      );
    });
    marketingLayer.visible = true;
  }

  function updateStats(towers, sectors, cpe, equipment) {
    if (hideStats) {
      if (statsEl) statsEl.hidden = true;
      return;
    }
    if (!statsEl) {
      statsEl = document.createElement("div");
      statsEl.id = "cwl-map-stats";
      statsEl.className = "cwl-map-stats";
      (host.parentElement || document.body).appendChild(statsEl);
    }
    statsEl.hidden = false;
    statsEl.innerHTML =
      "<strong>Network</strong> · Towers " +
      towers.length +
      " · Sectors " +
      sectors.length +
      " · CPE " +
      cpe.length +
      " · Equipment " +
      equipment.length;
  }

  function setFilters(next) {
    if (!next || typeof next !== "object") return;
    Object.keys(next).forEach(function (k) {
      filters[k] = next[k];
    });
    // Plan layer panel keys → asset visibility
    if (next.showNetworkAssets != null) {
      filters.showTowers = !!next.showNetworkAssets;
      filters.showSectors = !!next.showNetworkAssets;
    }
    applyFilters();
  }

  function centerOn(lat, lon, zoom) {
    if (!view || lat == null || lon == null) return Promise.resolve();
    return view.goTo({ center: [lon, lat], zoom: zoom != null ? zoom : 14 }).catch(function () {});
  }

  function broadcastExtent() {
    if (!view || !view.extent) return;
    var extent = view.extent;
    var c = view.center;
    postToParent("view-extent", {
      payload: {
        center: c ? { lat: c.latitude, lon: c.longitude } : null,
        boundingBox: {
          west: extent.xmin,
          south: extent.ymin,
          east: extent.xmax,
          north: extent.ymax,
        },
        zoom: view.zoom,
        scale: view.scale,
        mode: mode,
        activePlanId: activePlanId,
      },
    });
  }

  function applyStateUpdate(payload) {
    if (!payload || typeof payload !== "object") return;
    var state = payload.state || payload;
    if (payload.mode) mode = payload.mode;
    if (state.activePlanId != null) activePlanId = state.activePlanId;
    else if (state.activePlan && state.activePlan.id) activePlanId = state.activePlan.id;
    var plan = state.activePlan;
    if (plan) {
      var plat = num(plan.lat) ?? (plan.location && num(plan.location.lat));
      var plng =
        num(plan.lng) ??
        num(plan.lon) ??
        (plan.location && (num(plan.location.lng) ?? num(plan.location.lon)));
      if (plat != null && plng != null) centerOn(plat, plng, 12);
    }
    var marketing = state.activePlanMarketing;
    if (marketing && Array.isArray(marketing.addresses)) renderMarketing(marketing.addresses);
    else if (plan && plan.marketing && Array.isArray(plan.marketing.addresses)) {
      renderMarketing(plan.marketing.addresses);
    }
    if (state.capabilities && state.capabilities.readOnly === true && sketchWidget) {
      disableRectangleDrawing(false);
    }
  }

  function enableRectangleDrawing() {
    if (!view || !draftLayer || !Sketch) {
      setHonesty("Rectangle draw needs ArcGIS Sketch (failed to load).");
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      if (sketchWidget) {
        try {
          sketchWidget.cancel();
        } catch (_) {}
        sketchWidget.destroy();
        sketchWidget = null;
      }
      draftLayer.removeAll();
      sketchWidget = new Sketch({
        view: view,
        layer: draftLayer,
        creationMode: "single",
        availableCreateTools: ["rectangle", "polygon"],
        visibleElements: {
          createTools: { point: false, polyline: false, circle: false },
          selectionTools: {},
          settingsMenu: false,
        },
      });
      view.ui.add(sketchWidget, "top-right");
      sketchWidget.create("rectangle");
      sketchWidget.on("create", function (ev) {
        if (ev.state !== "complete" || !ev.graphic || !ev.graphic.geometry) return;
        var g = ev.graphic.geometry;
        var extent = g.extent || g;
        var center = extent.center || view.center;
        var detail = {
          boundingBox: {
            west: extent.xmin,
            south: extent.ymin,
            east: extent.xmax,
            north: extent.ymax,
          },
          center: center ? { lat: center.latitude, lon: center.longitude } : null,
          planId: activePlanId,
          mode: mode,
        };
        postToParent("rectangle-drawn", { detail: detail, payload: detail });
        setHonesty(
          activePlanId
            ? "Rectangle sent for marketing discovery (plan " + activePlanId + ")."
            : "Rectangle drawn — select a plan project first for marketing discovery.",
        );
      });
      setHonesty("Draw a rectangle on the map for address discovery.");
      resolve();
    });
  }

  function disableRectangleDrawing(clear) {
    if (sketchWidget) {
      var w = sketchWidget;
      sketchWidget = null;
      try {
        w.cancel();
      } catch (_) {}
      try {
        if (view && view.ui) view.ui.remove(w);
      } catch (_) {}
      try {
        w.destroy();
      } catch (_) {}
    }
    if (clear && draftLayer) draftLayer.removeAll();
  }

  function changeBasemap(basemapId) {
    if (!mapRef) return;
    var id = String(basemapId || "topo-vector");
    try {
      if (id === "osm" && OpenStreetMapLayerCtor) {
        mapRef.basemap = { baseLayers: [new OpenStreetMapLayerCtor()] };
      } else if (id === "street-map") {
        mapRef.basemap = "streets-vector";
      } else if (id === "satellite") {
        mapRef.basemap = "satellite";
      } else {
        mapRef.basemap = "topo-vector";
      }
    } catch (_) {}
  }

  function exportCsv() {
    var rows = [["kind", "id", "name", "status", "lat", "lng", "band"]];
    (dataCache.towers || []).forEach(function (t) {
      rows.push(["tower", t.id, t.name, t.status, t.lat, t.lng, ""]);
    });
    (dataCache.sectors || []).forEach(function (s) {
      rows.push(["sector", s.id, s.name, s.status, s.lat, s.lng, s.band || ""]);
    });
    var csv = rows
      .map(function (r) {
        return r
          .map(function (c) {
            return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"';
          })
          .join(",");
      })
      .join("\n");
    var blob = new Blob([csv], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "coverage-map-export.csv";
    a.click();
  }

  function importCbrs() {
    setHonesty("Importing CBRS…");
    return apiFetch("/api/network/import/cbrs", {
      method: "POST",
      body: JSON.stringify({}),
    })
      .then(function (r) {
        return r && r.ok ? r.json() : null;
      })
      .then(function () {
        return loadNetworkData();
      })
      .then(function () {
        setHonesty("CBRS import requested; map reloaded from /api/network/*.");
      })
      .catch(function () {
        setHonesty("CBRS import failed (endpoint or auth).");
      });
  }

  function ensureMapControls() {
    if (document.getElementById("cwl-map-controls")) return;
    var bar = document.createElement("div");
    bar.id = "cwl-map-controls";
    bar.className = "cwl-map-controls map-controls";
    bar.innerHTML =
      '<button type="button" data-map-action="toggle-filters" title="Filters">Filters</button>' +
      '<button type="button" data-map-action="toggle-stats" title="Stats">Stats</button>' +
      '<label class="cwl-map-basemap">Basemap <select data-map-action="change-basemap">' +
      '<option value="topo-vector">Topographic</option>' +
      '<option value="satellite">Satellite</option>' +
      '<option value="street-map">Street Map</option>' +
      '<option value="osm">OpenStreetMap</option>' +
      "</select></label>" +
      '<button type="button" data-map-action="export-csv">Export CSV</button>' +
      '<button type="button" data-map-action="export-pdf">Print</button>' +
      '<button type="button" data-map-action="import-cbrs">Import CBRS</button>' +
      '<button type="button" data-map-action="reload">Reload</button>';
    (host.parentElement || document.body).appendChild(bar);
    bar.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-map-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-map-action");
      if (action === "toggle-filters") {
        postToParent("toggle-filters", {});
        var panel = document.getElementById("cwl-map-filter-panel");
        if (panel) panel.hidden = !panel.hidden;
        return;
      }
      if (action === "toggle-stats") {
        if (statsEl) statsEl.hidden = !statsEl.hidden;
        return;
      }
      if (action === "export-csv") {
        exportCsv();
        return;
      }
      if (action === "export-pdf") {
        window.print();
        return;
      }
      if (action === "import-cbrs") {
        importCbrs();
        return;
      }
      if (action === "reload") {
        loadNetworkData();
        return;
      }
    });
    bar.addEventListener("change", function (ev) {
      var sel = ev.target.closest('select[data-map-action="change-basemap"]');
      if (sel) changeBasemap(sel.value);
    });

    var panel = document.createElement("aside");
    panel.id = "cwl-map-filter-panel";
    panel.className = "cwl-map-filter-panel plan-side-panel";
    panel.hidden = true;
    panel.innerHTML =
      "<h2>Map Filters</h2>" +
      '<label><input type="checkbox" data-filter="showTowers" checked /> Tower Sites</label>' +
      '<label><input type="checkbox" data-filter="showSectors" checked /> Sectors</label>' +
      '<label><input type="checkbox" data-filter="showCPE" checked /> CPE Devices</label>' +
      '<label><input type="checkbox" data-filter="showMarketing" checked /> Marketing Leads</label>' +
      '<label><input type="checkbox" data-filter="showEquipment" checked /> Equipment</label>' +
      '<div class="filter-bands"><strong>Bands</strong>' +
      '<label><input type="checkbox" data-band="LTE" checked /> LTE</label>' +
      '<label><input type="checkbox" data-band="CBRS" checked /> CBRS</label>' +
      '<label><input type="checkbox" data-band="FWA" checked /> FWA</label>' +
      '<label><input type="checkbox" data-band="5G" checked /> 5G</label>' +
      '<label><input type="checkbox" data-band="WiFi" checked /> WiFi</label></div>';
    (host.parentElement || document.body).appendChild(panel);
    panel.addEventListener("change", function () {
      var next = {
        showTowers: !!panel.querySelector('[data-filter="showTowers"]').checked,
        showSectors: !!panel.querySelector('[data-filter="showSectors"]').checked,
        showCPE: !!panel.querySelector('[data-filter="showCPE"]').checked,
        showMarketing: !!panel.querySelector('[data-filter="showMarketing"]').checked,
        showEquipment: !!panel.querySelector('[data-filter="showEquipment"]').checked,
        bandFilters: ["LTE", "CBRS", "FWA", "5G", "WiFi"].map(function (b) {
          var el = panel.querySelector('[data-band="' + b + '"]');
          return { band: b, enabled: !!(el && el.checked), color: BAND_COLORS[b] };
        }),
      };
      setFilters(next);
      postToParent("layer-filters-changed", { detail: next, payload: next });
    });
  }

  function handleIncomingMessage(ev) {
    var data = ev.data;
    if (!data || typeof data !== "object") return;
    var source = data.source;
    var type = data.type;
    var payload = data.payload || data.detail || {};
    if (source !== "shared-map" && source !== "wisp-plan-shell" && source !== "plan-page") return;

    if (type === "request-extent") {
      broadcastExtent();
      return;
    }
    if (type === "center-map-on-location" && payload) {
      centerOn(payload.lat, payload.lon != null ? payload.lon : payload.lng, payload.zoom);
      return;
    }
    if (type === "state-update") {
      applyStateUpdate(payload);
      return;
    }
    if (type === "select-plan") {
      activePlanId = payload.planId || payload.id || activePlanId;
      if (payload.lat != null && (payload.lon != null || payload.lng != null)) {
        centerOn(payload.lat, payload.lon != null ? payload.lon : payload.lng, payload.zoom || 12);
      }
      setHonesty(activePlanId ? "Active plan: " + activePlanId : "");
      return;
    }
    if (type === "toggle-layers" || type === "layer-filters-changed") {
      if (payload && typeof payload === "object") setFilters(payload);
      return;
    }
    if (type === "change-basemap") {
      changeBasemap(payload.basemapId || payload.id || payload);
      return;
    }
    if (type === "set-marketing-leads" || type === "marketing-addresses") {
      renderMarketing(payload.addresses || payload);
      return;
    }
    if (type === "marketing-draw" || type === "enable-rectangle-drawing") {
      enableRectangleDrawing();
      return;
    }
    if (type === "disable-rectangle-drawing") {
      disableRectangleDrawing(false);
      return;
    }
    if (type === "clear-drawing-graphics") {
      if (draftLayer) draftLayer.removeAll();
      return;
    }
    if (type === "zoom-in" && view) {
      view.zoom += 1;
      return;
    }
    if (type === "zoom-out" && view) {
      view.zoom -= 1;
      return;
    }
    if (type === "reload-network") {
      loadNetworkData();
    }
  }

  function wireViewEvents() {
    if (!view) return;
    view.on("click", function (event) {
      view.hitTest(event).then(function (response) {
        var results = (response && response.results) || [];
        var hit = results.find(function (r) {
          return r.graphic && r.graphic.attributes;
        });
        if (!hit) return;
        var attrs = hit.graphic.attributes;
        postToParent("asset-click", {
          detail: {
            id: attrs.id,
            name: attrs.name,
            kind: attrs.kind || attrs.type,
            status: attrs.status,
            lat: attrs.lat,
            lng: attrs.lng,
            planId: activePlanId,
          },
        });
        postToParent("object-action", {
          objectId: attrs.id,
          action: "select",
          data: attrs,
        });
      });
    });
    view.watch("extent", function () {
      broadcastExtent();
    });
    view.watch("zoom", function () {
      if (filters.showSectors) renderSectors(
        (dataCache.sectors || []).filter(function (s) {
          return statusAllowed(s) && bandAllowed(s);
        }),
      );
    });
  }

  function setData(payload) {
    dataCache.towers = (payload.towers || []).map(normalizeSite).filter(Boolean);
    var sitesById = {};
    dataCache.towers.forEach(function (t) {
      sitesById[t.id] = t;
    });
    dataCache.sectors = (payload.sectors || [])
      .map(function (s) {
        return normalizeSector(s, sitesById);
      })
      .filter(Boolean);
    dataCache.cpeDevices = payload.cpeDevices || payload.cpe || [];
    dataCache.equipment = payload.equipment || [];
    applyFilters();
  }

  function loadNetworkData() {
    setHonesty("Loading network from /api/network/*…");
    return Promise.all([
      fetchJson("/api/network/sites"),
      fetchJson("/api/network/sectors"),
      fetchJson("/api/network/cpe"),
      fetchJson("/api/network/equipment"),
      fetchJson("/api/network"),
      fetchJson("/api/coverage"),
    ]).then(function (parts) {
      var sitesBody = parts[0];
      var sectorsBody = parts[1];
      var cpeBody = parts[2];
      var equipmentBody = parts[3];
      var networkBag = parts[4];
      var coverageBody = parts[5];

      var sites = asArray(sitesBody, ["sites", "towers"]).map(normalizeSite).filter(Boolean);
      if (!sites.length && networkBag) {
        sites = asArray(networkBag, ["sites", "towers"]).map(normalizeSite).filter(Boolean);
      }

      var sitesById = {};
      sites.forEach(function (s) {
        sitesById[s.id] = s;
      });

      var sectors = asArray(sectorsBody, ["sectors"])
        .map(function (s) {
          return normalizeSector(s, sitesById);
        })
        .filter(Boolean);
      if (!sectors.length && networkBag) {
        sectors = asArray(networkBag, ["sectors"])
          .map(function (s) {
            return normalizeSector(s, sitesById);
          })
          .filter(Boolean);
      }
      if (!sectors.length && coverageBody) {
        sectors = asArray(coverageBody, ["coverage", "sectors", "items"])
          .map(function (s) {
            return normalizeSector(
              Object.assign({}, s, { band: s.band || s.technology || "LTE", azimuth: s.azimuth || 0, beamwidth: s.beamwidth || 60 }),
              sitesById,
            );
          })
          .filter(Boolean);
      }

      var cpe = asArray(cpeBody, ["cpe", "cpeDevices"]);
      if (!cpe.length && networkBag) cpe = asArray(networkBag, ["cpe", "cpeDevices"]);
      var equipment = asArray(equipmentBody, ["equipment"]);
      if (!equipment.length && networkBag) equipment = asArray(networkBag, ["equipment"]);

      setData({ towers: sites, sectors: sectors, cpeDevices: cpe, equipment: equipment });

      var allPts = sites.concat(
        sectors.map(function (s) {
          return { lat: s.lat, lng: s.lng };
        }),
      );
      if (!allPts.length) {
        setHonesty(
          "Map ready. No sites/sectors with lat/lng from /api/network/* (check login bearer + goldens).",
        );
        return;
      }
      setHonesty("");
      if (allPts.length === 1) return centerOn(allPts[0].lat, allPts[0].lng, 10);
      var graphics = [];
      if (towersLayer) graphics = graphics.concat(towersLayer.graphics.toArray());
      if (sectorsLayer) graphics = graphics.concat(sectorsLayer.graphics.toArray());
      return view.goTo(graphics).catch(function () {});
    });
  }

  function initMap(cfg) {
    if (typeof require !== "function") {
      hideLoading();
      setHonesty("ArcGIS JS API failed to load.");
      return;
    }
    require(
      [
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/GraphicsLayer",
        "esri/layers/OpenStreetMapLayer",
        "esri/Graphic",
        "esri/geometry/Point",
        "esri/geometry/Polygon",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/widgets/Sketch",
      ],
      function (
        esriConfig,
        Map,
        MapView,
        GraphicsLayer,
        OpenStreetMapLayer,
        GraphicCtor,
        PointCtor,
        PolygonCtor,
        SimpleMarkerSymbolCtor,
        SimpleFillSymbolCtor,
        SketchCtor,
      ) {
        Graphic = GraphicCtor;
        Point = PointCtor;
        Polygon = PolygonCtor;
        SimpleMarkerSymbol = SimpleMarkerSymbolCtor;
        SimpleFillSymbol = SimpleFillSymbolCtor;
        Sketch = SketchCtor;
        OpenStreetMapLayerCtor = OpenStreetMapLayer;

        var apiKey = cfg && typeof cfg.apiKey === "string" ? cfg.apiKey.trim() : "";
        if (apiKey && /^AIza/i.test(apiKey)) apiKey = "";
        if (apiKey) esriConfig.apiKey = apiKey;

        mapRef = apiKey
          ? new Map({ basemap: "topo-vector" })
          : new Map({ basemap: { baseLayers: [new OpenStreetMapLayer()] } });

        towersLayer = new GraphicsLayer({ title: "Tower Sites" });
        sectorsLayer = new GraphicsLayer({ title: "Sectors" });
        cpeLayer = new GraphicsLayer({ title: "CPE Devices" });
        equipmentLayer = new GraphicsLayer({ title: "Equipment" });
        marketingLayer = new GraphicsLayer({ title: "Marketing Addresses" });
        draftLayer = new GraphicsLayer({ title: "Plan draft / draw" });
        mapRef.addMany([
          towersLayer,
          sectorsLayer,
          cpeLayer,
          equipmentLayer,
          marketingLayer,
          draftLayer,
        ]);

        view = new MapView({
          container: host,
          map: mapRef,
          center: [-98.5795, 39.8283],
          zoom: mode === "plan" || mode === "deploy" ? 7 : 4,
        });

        ensureMapControls();

        window.wispMapView = view;
        window.wispMapController = {
          postToParent: postToParent,
          centerOn: centerOn,
          enableRectangleDrawing: enableRectangleDrawing,
          disableRectangleDrawing: disableRectangleDrawing,
          applyStateUpdate: applyStateUpdate,
          setData: setData,
          setFilters: setFilters,
          changeBasemap: changeBasemap,
          setMarketingLeads: renderMarketing,
          loadNetworkData: loadNetworkData,
          mode: function () {
            return mode;
          },
          activePlanId: function () {
            return activePlanId;
          },
        };

        view.when(function () {
          hideLoading();
          wireViewEvents();
          window.addEventListener("message", handleIncomingMessage);
          postToParent("request-state", {});
          postToParent("map-ready", { mode: mode, planId: activePlanId });
          loadNetworkData().then(function () {
            broadcastExtent();
          });
        }, hideLoading);
      },
    );
  }

  function boot() {
    fetch("/assets/wisp-arcgis-config.json", { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : { apiKey: "" };
      })
      .catch(function () {
        return { apiKey: "" };
      })
      .then(function (cfg) {
        if (typeof require === "function") {
          initMap(cfg);
          return;
        }
        var s = document.createElement("script");
        s.src = "https://js.arcgis.com/4.29/";
        s.onload = function () {
          initMap(cfg);
        };
        s.onerror = function () {
          hideLoading();
          setHonesty("ArcGIS JS API script failed to load.");
        };
        document.head.appendChild(s);
      });
  }

  // Wait briefly for wisp-cwl-client.js (defer) to expose WispCwlApi.
  if (window.WispCwlApi) boot();
  else setTimeout(boot, 50);
})();
