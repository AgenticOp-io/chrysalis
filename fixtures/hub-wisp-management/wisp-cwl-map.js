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
 *
 * ArcGIS vendor island (DESIGN D6441): keep `@arcgis/core` as in Module_Manager —
 * Vite-built same-origin `/assets/wisp-cwl-arcgis.bundle.js` (source toolchain).
 * Do NOT rewrite to Esri AMD CDN or CDN ESM (testing-only / multipleDefine).
 * Missing vendor bundle → honest load failure (no silent CDN rewrite).
 */
(function () {
  if (window.__WISP_CWL_MAP_RUNTIME__) return;
  window.__WISP_CWL_MAP_RUNTIME__ = true;

  var ARCGIS_JS = "https://js.arcgis.com/4.29/";
  var ARCGIS_BUNDLE = "/assets/wisp-cwl-arcgis.bundle.js";
  var ARCGIS_BUNDLE_CSS = "/assets/wisp-cwl-arcgis.bundle.css";
  /** Esri MapView chrome — required; Vite island CSS is Calcite-only and is NOT a substitute. */
  var ARCGIS_THEME_CSS = "https://js.arcgis.com/4.34/esri/themes/light/main.css";
  /** @type {Promise<any> | null} */
  var arcgisApiPromise = null;
  var mapInitStarted = false;

  function ensureHost() {
    var host = document.getElementById("arcgis-map-view");
    if (host) {
      if (!host.classList.contains("map-container")) host.classList.add("map-container");
      return host;
    }
    var fs = document.querySelector(
      ".map-fullscreen, .wisp-coverage-map, .fullscreen-map, [data-wisp-page=\"coverage-map\"]",
    );
    if (!fs) return null;
    var wrap = fs.querySelector(".coverage-map-container");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "coverage-map-container";
      fs.insertBefore(wrap, fs.firstChild);
    }
    host = document.createElement("div");
    host.id = "arcgis-map-view";
    host.className = "map-container";
    host.setAttribute("role", "application");
    host.setAttribute("aria-label", "Coverage map");
    wrap.appendChild(host);
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

  /** Always load Esri theme + optional Vite Calcite companion (D6441: CSS from CDN is stylesheet, not JS rewrite). */
  function loadVendorCss() {
    loadCss(ARCGIS_THEME_CSS);
    loadCss(ARCGIS_BUNDLE_CSS);
  }
  loadVendorCss();

  /** Match Module_Manager `.fullscreen-map` so MapView gets a non-zero container. */
  function ensureFullscreenLayout() {
    try {
      document.documentElement.classList.add("wisp-map-page");
      document.body.classList.add("wisp-map-page");
    } catch (_e) {
      /* ignore */
    }
    var root =
      document.querySelector(".wisp-coverage-map, .map-fullscreen, [data-wisp-page=\"coverage-map\"]") ||
      host.parentElement;
    if (root && root.classList && !root.classList.contains("map-fullscreen")) {
      root.classList.add("map-fullscreen");
    }
    if (host) {
      host.classList.add("map-container");
      host.style.position = "absolute";
      host.style.inset = "0";
      host.style.width = "100%";
      host.style.height = "100%";
    }
  }
  ensureFullscreenLayout();

  /**
   * Load ArcGIS vendor API via Module_Manager Vite island (D6441).
   * Do NOT inject AMD/dojo CDN or CDN ESM.
   * @returns {Promise<{
   *   esriConfig: any, Map: any, MapView: any, GraphicsLayer: any,
   *   OpenStreetMapLayer: any, Graphic: any, Point: any, Polygon: any,
   *   SimpleMarkerSymbol: any, SimpleFillSymbol: any, Sketch: any
   * }>}
   */
  function loadArcGisApi() {
    if (arcgisApiPromise) return arcgisApiPromise;
    function def(mod) {
      return mod && (mod.default != null ? mod.default : mod);
    }
    function fromBundle(ns) {
      return {
        esriConfig: def(ns.esriConfig),
        Map: def(ns.Map),
        MapView: def(ns.MapView),
        GraphicsLayer: def(ns.GraphicsLayer),
        OpenStreetMapLayer: def(ns.OpenStreetMapLayer),
        Graphic: def(ns.Graphic),
        Point: def(ns.Point),
        Polygon: def(ns.Polygon),
        SimpleMarkerSymbol: def(ns.SimpleMarkerSymbol),
        SimpleFillSymbol: def(ns.SimpleFillSymbol),
        Sketch: def(ns.Sketch),
      };
    }
    arcgisApiPromise = import(ARCGIS_BUNDLE)
      .then(fromBundle)
      .catch(function (err) {
        console.error(
          "[wisp-cwl-map] Vendor @arcgis/core island missing. Run: pnpm run hub:wisp-cwl-arcgis-bundle (Module_Manager Vite). No CDN rewrite (D6441).",
          err,
        );
        throw err;
      });
    return arcgisApiPromise;
  }

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
        if (r && r.ok) return r.json().catch(function () { return null; });
        return null;
      })
      .catch(function () {
        return null;
      })
      .then(function (body) {
        if (body) return body;
        // Fallback: oracle golden assets when live HSS/auth fails (D6442 translate, not invent).
        var goldenName =
          "GET-" +
          String(path || "")
            .replace(/^\//, "")
            .replace(/\//g, "-") +
          ".golden.json";
        return fetch("/assets/wisp-api-goldens/" + goldenName, { credentials: "same-origin" })
          .then(function (gr) {
            return gr && gr.ok ? gr.json().catch(function () { return null; }) : null;
          })
          .catch(function () {
            return null;
          });
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
    // Prefer Module_Manager `.stats-modal` values (D6442) — do not invent a parallel stats strip when lifted.
    var modalValues = document.querySelectorAll(".stats-modal .stat-value");
    if (modalValues && modalValues.length >= 4) {
      modalValues[0].textContent = String(towers.length);
      modalValues[1].textContent = String(sectors.length);
      modalValues[2].textContent = String(cpe.length);
      modalValues[3].textContent = String(equipment.length);
      return;
    }
    if (!statsEl) {
      statsEl = document.createElement("div");
      statsEl.id = "cwl-map-stats";
      statsEl.className = "cwl-map-stats";
      statsEl.hidden = true;
      (host.parentElement || document.body).appendChild(statsEl);
    }
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

  function renderStagedFeatures(features) {
    if (!draftLayer || !Graphic || !Point || !SimpleMarkerSymbol) return;
    // Keep marketing/draw sketches; only clear staged feature markers we tagged.
    var keep = [];
    draftLayer.graphics.forEach(function (g) {
      if (!g.attributes || g.attributes.kind !== "staged-feature") keep.push(g);
    });
    draftLayer.removeAll();
    keep.forEach(function (g) {
      draftLayer.add(g);
    });
    if (!filters.showPlanFeatures) return;
    (features || []).forEach(function (f) {
      if (!f) return;
      var ll = latLngOf(f) || (f.geometry && latLngOf(f.geometry)) || (f.location && latLngOf(f.location));
      if (!ll) return;
      draftLayer.add(
        new Graphic({
          geometry: new Point({ longitude: ll.lng, latitude: ll.lat }),
          symbol: new SimpleMarkerSymbol({
            style: "diamond",
            color: [99, 102, 241, 0.95],
            size: 11,
            outline: { color: [255, 255, 255, 1], width: 1.5 },
          }),
          attributes: Object.assign({}, f, {
            kind: "staged-feature",
            type: f.type || f.kind || "staged",
            name: f.name || f.label || f.id,
            lat: ll.lat,
            lng: ll.lng,
          }),
          popupTemplate: {
            title: "{name}",
            content: "Plan feature · {type} · {status}",
          },
        }),
      );
    });
  }

  function applyStateUpdate(payload) {
    if (!payload || typeof payload !== "object") return;
    var state = payload.state || payload;
    if (payload.mode) mode = payload.mode;
    if (state.mode) mode = state.mode;
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
    // Origin SharedMap posts layerFilters + stagedFeatures + productionHardware.
    if (state.layerFilters && typeof state.layerFilters === "object") {
      Object.keys(state.layerFilters).forEach(function (k) {
        filters[k] = state.layerFilters[k];
      });
      applyFilters();
    }
    var marketing = state.activePlanMarketing;
    if (marketing && Array.isArray(marketing.addresses)) renderMarketing(marketing.addresses);
    else if (plan && plan.marketing && Array.isArray(plan.marketing.addresses)) {
      renderMarketing(plan.marketing.addresses);
    }
    if (Array.isArray(state.stagedFeatures)) {
      renderStagedFeatures(state.stagedFeatures);
    }
    if (Array.isArray(state.productionHardware) && state.productionHardware.length) {
      renderEquipment(state.productionHardware);
    }
    // Origin MapCapabilities: only monitor is readOnly. Deploy stays interactive
    // (assign tasks / mark progress). Do not kill Sketch solely because mode=deploy.
    var caps = state.capabilities || {};
    if (caps.readOnly === true && sketchWidget) {
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
    var stamp = Date.now();
    setHonesty("Importing CBRS…");
    return apiFetch("/api/network/import/cbrs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sites: [
          {
            name: "CWL CBRS Site " + stamp,
            displayName: "CWL CBRS Site " + stamp,
            location: { latitude: 39.75, longitude: -104.98 },
          },
        ],
        devices: [
          {
            name: "CWL CBSD " + stamp,
            serialNumber: "CBRS-" + stamp,
            cbsdId: "cbsd-" + stamp,
            manufacturer: "CBRS",
            model: "CBSD",
          },
        ],
      }),
    })
      .then(function (r) {
        if (!r || !r.ok) throw new Error("CBRS import " + (r && r.status));
        return r.json();
      })
      .then(function (body) {
        setHonesty(
          "CBRS import: " +
            (body && body.imported != null ? body.imported + " imported" : "ok") +
            " — reloading map",
        );
        return loadNetworkData();
      })
      .catch(function (e) {
        setHonesty((e && e.message) || "CBRS import failed (endpoint or auth).");
      });
  }

  function ensureMapControls() {
    // Prefer Module_Manager `.floating-controls` from lifted +page (D6442) — do not invent a parallel toolbar.
    var original = document.querySelector(".floating-controls");
    if (original) {
      wireOriginalFloatingControls(original);
      wireHelpButton();
      wireFilterPanel();
      wireModalCloseButtons();
      return;
    }
    if (document.getElementById("cwl-map-controls")) return;
    var bar = document.createElement("div");
    bar.id = "cwl-map-controls";
    bar.className = "cwl-map-controls map-controls";
    bar.innerHTML =
      '<button type="button" data-map-action="toggle-filters" title="Toggle Filters">Filters</button>' +
      '<button type="button" data-map-action="toggle-stats" title="Toggle Statistics">Stats</button>' +
      '<button type="button" data-map-action="reload" title="Reload">Reload</button>';
    (host.parentElement || document.body).appendChild(bar);
    bar.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-map-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-map-action");
      if (action === "toggle-filters") {
        postToParent("toggle-filters", {});
        toggleFiltersOverlay();
        return;
      }
      if (action === "toggle-stats") {
        toggleStatsOverlay();
        return;
      }
      if (action === "reload") loadNetworkData();
    });
  }

  /** @param {Element} root */
  function wireOriginalFloatingControls(root) {
    if (root.getAttribute("data-wisp-wired") === "1") return;
    root.setAttribute("data-wisp-wired", "1");
    root.addEventListener("click", function (ev) {
      var btn = ev.target && /** @type {Element} */ (ev.target).closest
        ? /** @type {Element} */ (ev.target).closest("button, .control-btn")
        : null;
      if (!btn) return;
      var title = (btn.getAttribute("title") || btn.textContent || "").toLowerCase();
      if (title.indexOf("filter") >= 0) {
        ev.preventDefault();
        postToParent("toggle-filters", {});
        toggleFiltersOverlay();
        return;
      }
      if (title.indexOf("stat") >= 0) {
        ev.preventDefault();
        toggleStatsOverlay();
        return;
      }
      if (title.indexOf("device") >= 0) {
        ev.preventDefault();
        togglePanel(
          '[data-cwl-lifted-component="DeviceManagementPanel"], [data-cwl-component="DeviceManagementPanel"], .device-panel, [data-cwl-widget-shell="DeviceManagementPanel"]',
        );
        return;
      }
      if (title.indexOf("street") >= 0) {
        ev.preventDefault();
        changeBasemap("streets-vector");
        return;
      }
      if (title.indexOf("hybrid") >= 0 || title.indexOf("satellit") >= 0) {
        ev.preventDefault();
        changeBasemap("hybrid");
        return;
      }
      if (title.indexOf("topo") >= 0) {
        ev.preventDefault();
        changeBasemap("topo-vector");
        return;
      }
      if (title.indexOf("cbrs") >= 0 || title.indexOf("import") >= 0) {
        ev.preventDefault();
        importCbrs();
        return;
      }
    });
  }

  function wireHelpButton() {
    var help = document.querySelector(".help-button");
    if (!help || help.getAttribute("data-wisp-wired") === "1") return;
    help.setAttribute("data-wisp-wired", "1");
    help.addEventListener("click", function (ev) {
      ev.preventDefault();
      togglePanel(
        '.help-overlay, [data-cwl-lifted-component="HelpModal"] .help-overlay, [data-cwl-lifted-component="HelpModal"], [data-cwl-modal-shell="HelpModal"]',
      );
    });
  }

  function wireFilterPanel() {
    var panel = document.querySelector(".filter-panel, [data-cwl-lifted-component=\"FilterPanel\"]");
    if (!panel || panel.getAttribute("data-wisp-wired") === "1") return;
    panel.setAttribute("data-wisp-wired", "1");
    // Default-check origin asset toggles (FilterPanel starts enabled for towers/sectors/cpe/equipment/marketing).
    panel.querySelectorAll('label.filter-checkbox input[type="checkbox"]').forEach(function (input, idx) {
      if (idx < 5) input.checked = true;
    });
    panel.addEventListener("change", function (ev) {
      var input = ev.target;
      if (!input || input.type !== "checkbox") return;
      var label = (input.closest("label") && input.closest("label").textContent) || "";
      var t = label.toLowerCase();
      if (t.indexOf("tower") >= 0) filters.showTowers = !!input.checked;
      else if (t.indexOf("sector") >= 0) filters.showSectors = !!input.checked;
      else if (t.indexOf("cpe") >= 0) filters.showCPE = !!input.checked;
      else if (t.indexOf("marketing") >= 0 || t.indexOf("lead") >= 0) filters.showMarketing = !!input.checked;
      else if (t.indexOf("equipment") >= 0) filters.showEquipment = !!input.checked;
      else if (t.indexOf("backhaul") >= 0) filters.showBackhaul = !!input.checked;
      applyFilters();
    });
  }

  function wireModalCloseButtons() {
    document.addEventListener("click", function (ev) {
      var btn = ev.target && /** @type {Element} */ (ev.target).closest
        ? /** @type {Element} */ (ev.target).closest(".close-btn, .dismiss-btn")
        : null;
      if (!btn) return;
      var overlay = btn.closest(".modal-overlay, .help-overlay, .device-panel, [data-cwl-lifted-component]");
      if (!overlay) return;
      ev.preventDefault();
      setHidden(overlay, true);
      var hostLift = overlay.closest("[data-cwl-lifted-component]");
      if (hostLift && hostLift !== overlay) setHidden(hostLift, true);
    });
  }

  /** @param {Element} el @param {boolean} hidden */
  function setHidden(el, hidden) {
    if (!el) return;
    if (hidden) el.setAttribute("hidden", "");
    else el.removeAttribute("hidden");
    el.setAttribute("aria-hidden", hidden ? "true" : "false");
  }

  function toggleFiltersOverlay() {
    var overlay =
      document.querySelector(".modal-overlay:has(.filters-modal)") ||
      document.querySelector(".filters-modal") ||
      document.querySelector(".filter-panel") ||
      document.querySelector('[data-cwl-lifted-component="FilterPanel"]') ||
      document.querySelector('[data-cwl-nav-shell="FilterPanel"]') ||
      document.getElementById("cwl-map-filter-panel");
    if (!overlay) return;
    var root = overlay.classList.contains("filters-modal")
      ? overlay.closest(".modal-overlay") || overlay
      : overlay;
    var willHide = !root.hasAttribute("hidden");
    setHidden(root, willHide);
  }

  function toggleStatsOverlay() {
    var overlay =
      document.querySelector(".modal-overlay:has(.stats-modal)") ||
      document.querySelector(".stats-modal");
    if (overlay) {
      var root = overlay.classList.contains("stats-modal")
        ? overlay.closest(".modal-overlay") || overlay
        : overlay;
      setHidden(root, !root.hasAttribute("hidden"));
      return;
    }
    if (statsEl) setHidden(statsEl, !statsEl.hasAttribute("hidden"));
  }

  /** @param {string} sel */
  function togglePanel(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    setHidden(el, !el.hasAttribute("hidden"));
  }

  /** @param {string} sel */
  function openShell(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    setHidden(el, false);
    el.classList.add("cwl-shell-open");
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
    // Origin MapContextMenu opens on map blank click / context — wire right-click (D6442).
    view.on("pointer-down", function (event) {
      if (!event || event.button !== 2) return;
      try {
        if (typeof event.stopPropagation === "function") event.stopPropagation();
      } catch (_e) {
        /* ignore */
      }
      var mapPoint = view.toMap({ x: event.x, y: event.y });
      if (!mapPoint) return;
      openMapContextMenu(event.x, event.y, mapPoint.latitude, mapPoint.longitude);
    });
    if (host && host.getAttribute("data-cwl-ctx-wired") !== "1") {
      host.setAttribute("data-cwl-ctx-wired", "1");
      host.addEventListener("contextmenu", function (ev) {
        ev.preventDefault();
      });
    }
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
    wireAddSiteModalSave();
    wireAddNocModalSave();
    wireAddWarehouseModalSave();
    wireAddSectorModalSave();
    wireAddCpeModalSave();
    wireAddBackhaulModalSave();
    wireAddInventoryModalSave();
    wireHonestUnavailableMapModals();
    wireMapActionMenus();
    wireSiteEditModalSave();
    wireSectorEditModalSave();
    wireCpeEditModalSave();
    wireMapContextMenuActions();
    wireMapGeocodeControls();
    wireMapReverseGeocodeControl();
  }

  /** Pass 44 — POST /api/network/reverse-geocode from map controls (D6442). */
  function wireMapReverseGeocodeControl() {
    var bar =
      document.querySelector(".floating-controls") || document.getElementById("cwl-map-controls");
    if (!bar || bar.querySelector("[data-cwl-reverse-geocode]")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "control-btn";
    btn.setAttribute("data-cwl-reverse-geocode", "1");
    btn.title = "Reverse geocode map center";
    btn.textContent = "RevGeocode";
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      var center = view && view.center;
      var lat = center ? center.latitude : 39.74;
      var lng = center ? center.longitude : -104.99;
      setHonesty("Reverse-geocoding " + lat.toFixed(5) + ", " + lng.toFixed(5) + "…");
      apiFetch("/api/network/reverse-geocode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      })
        .then(function (r) {
          if (!r || !r.ok) throw new Error("reverse-geocode " + (r && r.status));
          return r.json();
        })
        .then(function (data) {
          var addr =
            data.address ||
            (data.result && data.result.address) ||
            data.formattedAddress ||
            JSON.stringify(data).slice(0, 120);
          setHonesty("Reverse-geocode: " + addr);
        })
        .catch(function (e) {
          setHonesty((e && e.message) || "Reverse-geocode failed");
        });
    });
    bar.appendChild(btn);
  }

  /** Pass 37 — POST /api/network/geocode from site modals (D6442). */
  function wireMapGeocodeControls() {
    var hosts = [
      document.querySelector('[data-cwl-lifted-component="AddSiteModal"]'),
      document.querySelector('[data-cwl-lifted-component="SiteEditModal"]'),
      document.querySelector('[data-cwl-lifted-component="AddNOCModal"]'),
      document.querySelector('[data-cwl-lifted-component="AddWarehouseModal"]'),
    ].filter(Boolean);
    hosts.forEach(function (hostEl) {
      if (hostEl.getAttribute("data-cwl-geocode-wired") === "1") return;
      hostEl.setAttribute("data-cwl-geocode-wired", "1");
      hostEl.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest(".cwl-map-geocode, [data-cwl-geocode]") : null;
        if (!btn || !hostEl.contains(btn)) {
          // Inject once when modal opens and user clicks near address field
          var overlay = hostEl.querySelector(".modal-overlay") || hostEl;
          if (overlay.getAttribute("data-cwl-geocode-btn") === "1") return;
          var addrInput =
            overlay.querySelector('input[name="address"]') ||
            overlay.querySelector('input[placeholder*="Address" i]') ||
            overlay.querySelector('input[placeholder*="address" i]');
          if (!addrInput) return;
          overlay.setAttribute("data-cwl-geocode-btn", "1");
          var g = document.createElement("button");
          g.type = "button";
          g.className = "wisp-demo-btn cwl-map-geocode";
          g.setAttribute("data-cwl-geocode", "1");
          g.textContent = "Geocode";
          if (addrInput.parentNode) addrInput.parentNode.appendChild(g);
          return;
        }
        ev.preventDefault();
        ev.stopPropagation();
        var overlay2 = hostEl.querySelector(".modal-overlay") || hostEl;
        var addrEl =
          overlay2.querySelector('input[name="address"]') ||
          overlay2.querySelector('input[placeholder*="Address" i]') ||
          overlay2.querySelector('input[placeholder*="address" i]');
        var addr = addrEl && "value" in addrEl ? String(addrEl.value || "").trim() : "";
        if (!addr) {
          setHonesty("Enter an address to geocode");
          return;
        }
        setHonesty("Geocoding…");
        apiFetch("/api/network/geocode", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address: addr }),
        })
          .then(function (r) {
            if (!r || !r.ok) throw new Error("geocode " + (r && r.status));
            return r.json();
          })
          .then(function (data) {
            var loc = data.location || data.result || data;
            var lat = loc.latitude != null ? loc.latitude : loc.lat;
            var lng = loc.longitude != null ? loc.longitude : loc.lng != null ? loc.lng : loc.lon;
            if (lat == null || lng == null) throw new Error("geocode missing lat/lng");
            var latEl = overlay2.querySelector('input[name="latitude"]');
            var lngEl = overlay2.querySelector('input[name="longitude"]');
            if (!latEl || !lngEl) {
              var nums = overlay2.querySelectorAll('.form-group input[type="number"]');
              if (nums.length >= 2) {
                latEl = nums[0];
                lngEl = nums[1];
              }
            }
            if (latEl && "value" in latEl) latEl.value = String(lat);
            if (lngEl && "value" in lngEl) lngEl.value = String(lng);
            setHonesty("Geocoded to " + lat + ", " + lng);
          })
          .catch(function (e) {
            setHonesty((e && e.message) || "Geocode failed");
          });
      });
    });
  }

  /** @param {number} screenX @param {number} screenY @param {number} lat @param {number} lng */
  function openMapContextMenu(screenX, screenY, lat, lng) {
    var wrap =
      document.querySelector('[data-cwl-lifted-component="MapContextMenu"]') ||
      document.querySelector(".context-menu");
    if (!wrap) return;
    var menu = wrap.classList.contains("context-menu") ? wrap : wrap.querySelector(".context-menu");
    var root = wrap.classList.contains("context-menu") ? wrap : wrap;
    setHidden(root, false);
    if (menu) {
      menu.style.left = Math.max(8, screenX) + "px";
      menu.style.top = Math.max(8, screenY) + "px";
      menu.style.position = "fixed";
      menu.setAttribute("data-cwl-ctx-lat", String(lat));
      menu.setAttribute("data-cwl-ctx-lng", String(lng));
      var coords = menu.querySelector(".coords");
      if (coords) {
        coords.textContent =
          "📍 " + (Number(lat).toFixed(5) || "") + ", " + (Number(lng).toFixed(5) || "");
      }
    }
  }

  function wireMapContextMenuActions() {
    var wrap = document.querySelector('[data-cwl-lifted-component="MapContextMenu"]');
    if (!wrap || wrap.getAttribute("data-wisp-wired") === "1") return;
    wrap.setAttribute("data-wisp-wired", "1");
    wrap.addEventListener("click", function (ev) {
      var item = ev.target && ev.target.closest ? ev.target.closest(".menu-item") : null;
      if (!item) return;
      ev.preventDefault();
      var label = (item.textContent || "").toLowerCase();
      var menu = wrap.querySelector(".context-menu") || wrap;
      var lat = Number(menu.getAttribute("data-cwl-ctx-lat"));
      var lng = Number(menu.getAttribute("data-cwl-ctx-lng"));
      setHidden(wrap, true);
      if (label.indexOf("copy") >= 0) {
        try {
          navigator.clipboard.writeText(lat + ", " + lng);
          setHonesty("Copied " + lat.toFixed(5) + ", " + lng.toFixed(5));
        } catch (_e) {
          setHonesty("Coords: " + lat + ", " + lng);
        }
        return;
      }
      if (label.indexOf("reverse") >= 0 || label.indexOf("address") >= 0) {
        setHonesty("Reverse-geocoding…");
        apiFetch("/api/network/reverse-geocode", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lng }),
        })
          .then(function (r) {
            if (!r || !r.ok) throw new Error("reverse-geocode " + (r && r.status));
            return r.json();
          })
          .then(function (data) {
            var addr =
              data.address ||
              (data.result && data.result.address) ||
              data.formattedAddress ||
              JSON.stringify(data).slice(0, 120);
            setHonesty("Reverse-geocode: " + addr);
          })
          .catch(function (e) {
            setHonesty((e && e.message) || "Reverse-geocode failed");
          });
        return;
      }
      if (label.indexOf("cbrs") >= 0 && label.indexOf("import") >= 0) {
        importCbrs();
        return;
      }
      if (label.indexOf("tower") >= 0 || label.indexOf("other site") >= 0) {
        openLiftedModal("AddSiteModal", { lat: lat, lng: lng, type: label.indexOf("other") >= 0 ? "other" : "tower" });
        return;
      }
      if (label.indexOf("noc") >= 0) {
        openLiftedModal("AddNOCModal", { lat: lat, lng: lng });
        return;
      }
      if (label.indexOf("warehouse") >= 0) {
        openLiftedModal("AddWarehouseModal", { lat: lat, lng: lng });
        return;
      }
      if (label.indexOf("sector") >= 0) {
        openLiftedModal("AddSectorModal", { lat: lat, lng: lng });
        return;
      }
      if (label.indexOf("cpe") >= 0) {
        openLiftedModal("AddCPEModal", { lat: lat, lng: lng });
        return;
      }
      if (label.indexOf("backhaul") >= 0) {
        openLiftedModal("AddBackhaulLinkModal", {});
        return;
      }
      if (label.indexOf("equipment") >= 0 || label.indexOf("radio") >= 0) {
        setHonesty("Creating equipment at " + lat.toFixed(5) + ", " + lng.toFixed(5) + "…");
        apiFetch("/api/network/equipment", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "CWL Equip " + Date.now(),
            type: "backhaul",
            manufacturer: "Trace",
            model: "Map",
            serialNumber: "EQ-MAP-" + Date.now(),
            status: "active",
            location: { latitude: lat, longitude: lng },
            notes: "chrysalis-map-equipment-create",
            createdBy: "demo@wisptools.io",
          }),
        })
          .then(function (r) {
            if (!r || !r.ok) throw new Error("Equipment create failed (" + (r && r.status) + ")");
            return r.json().then(function (body) {
              var eid = body && (body._id || body.id);
              if (!eid) return null;
              return apiFetch("/api/network/equipment/" + encodeURIComponent(eid), {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  notes: "chrysalis-map-equipment-put-" + Date.now(),
                  status: "active",
                }),
              }).then(function (r2) {
                if (!r2 || !r2.ok) throw new Error("Equipment PUT failed (" + (r2 && r2.status) + ")");
                return body;
              });
            });
          })
          .then(function () {
            setHonesty("Equipment created+PUT — reloading map");
            return loadNetworkData();
          })
          .catch(function (e) {
            setHonesty((e && e.message) || "Equipment create failed");
          });
        return;
      }
      if (label.indexOf("inventory") >= 0 || label.indexOf("add item") >= 0) {
        openLiftedModal("AddInventoryModal", { lat: lat, lng: lng });
        return;
      }
      if (label.indexOf("vehicle") >= 0) {
        setHonesty("AddVehicleModal — no HSS vehicle mount (honest skip)");
        return;
      }
      if (label.indexOf("rma") >= 0) {
        setHonesty("AddRMAModal — no HSS RMA mount (honest skip)");
        return;
      }
    });
  }

  /** @param {number} lat @param {number} lng */
  function nearestSiteId(lat, lng) {
    var sites = dataCache.towers || [];
    if (!sites.length) return "";
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return String(sites[0].id || "");
    var best = sites[0];
    var bestD = Infinity;
    sites.forEach(function (s) {
      var d = Math.pow((s.lat || 0) - lat, 2) + Math.pow((s.lng || 0) - lng, 2);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    });
    return String(best.id || "");
  }

  /** @param {HTMLSelectElement | Element | null} selectEl @param {string} [preferId] */
  function fillSiteOptions(selectEl, preferId) {
    if (!selectEl || selectEl.tagName !== "SELECT") return;
    var sites = dataCache.towers || [];
    var keepFirst = selectEl.querySelector("option");
    var placeholder =
      keepFirst && !keepFirst.getAttribute("value")
        ? keepFirst.cloneNode(true)
        : null;
    selectEl.innerHTML = "";
    if (placeholder) selectEl.appendChild(placeholder);
    else {
      var ph = document.createElement("option");
      ph.textContent = "-- Select a site --";
      ph.value = "";
      selectEl.appendChild(ph);
    }
    sites.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = s.name || String(s.id);
      selectEl.appendChild(opt);
    });
    if (preferId) selectEl.value = String(preferId);
    else if (sites.length === 1) selectEl.value = String(sites[0].id);
  }

  /** @param {string} name @param {{ lat?: number, lng?: number, type?: string }} [opts] */
  function openLiftedModal(name, opts) {
    opts = opts || {};
    var hostEl =
      document.querySelector('[data-cwl-lifted-component="' + name + '"]') ||
      document.querySelector('[data-cwl-modal-shell="' + name + '"]');
    if (!hostEl) {
      setHonesty(name + " not lifted");
      return;
    }
    var overlay = hostEl.querySelector(".modal-overlay") || hostEl;
    setHidden(overlay, false);
    setHidden(hostEl, false);
    overlay.removeAttribute("data-cwl-edit-mode");
    overlay.removeAttribute("data-cwl-edit-sector-id");
    overlay.removeAttribute("data-cwl-edit-cpe-id");
    if (opts.lat != null) {
      var inputs = overlay.querySelectorAll('.form-group input[type="number"]');
      if (inputs.length >= 2) {
        /** @type {HTMLInputElement} */ (inputs[0]).value = String(opts.lat);
        /** @type {HTMLInputElement} */ (inputs[1]).value = String(opts.lng);
        inputs[0].setAttribute("name", "latitude");
        inputs[1].setAttribute("name", "longitude");
      }
    }
    if (opts.type) {
      var sel = overlay.querySelector("select");
      if (sel) {
        sel.value = opts.type;
        sel.setAttribute("name", "type");
      }
    }
    var nameInput = overlay.querySelector('input[placeholder*="Tower" i], input[placeholder*="Site" i], input[placeholder*="NOC" i], input[placeholder*="Warehouse" i]');
    if (nameInput) nameInput.setAttribute("name", "name");
    if (name === "AddSectorModal" || name === "AddCPEModal") {
      var siteSel = null;
      var groups = overlay.querySelectorAll(".form-group");
      for (var gi = 0; gi < groups.length; gi++) {
        var gt = (groups[gi].textContent || "").toLowerCase();
        if (gt.indexOf("select site") >= 0 || gt.indexOf("tower site") >= 0) {
          siteSel = groups[gi].querySelector("select");
          break;
        }
      }
      if (!siteSel) siteSel = overlay.querySelector("select");
      var prefer = nearestSiteId(Number(opts.lat), Number(opts.lng));
      fillSiteOptions(siteSel, prefer);
    }
    if (name === "AddBackhaulLinkModal") {
      var sels = overlay.querySelectorAll("select");
      if (sels[0]) fillSiteOptions(sels[0]);
      if (sels[1]) fillSiteOptions(sels[1]);
      if ((dataCache.towers || []).length >= 2 && sels[0] && sels[1]) {
        sels[0].value = String(dataCache.towers[0].id);
        sels[1].value = String(dataCache.towers[1].id);
      }
    }
    if (name === "SiteEditModal" && opts.site) {
      var site = opts.site;
      overlay.setAttribute("data-cwl-edit-site-id", String(opts.siteId || site.id || ""));
      var nameIn = overlay.querySelector('input[type="text"], input:not([type])');
      if (nameIn && site.name) nameIn.value = String(site.name);
      var nums = overlay.querySelectorAll('input[type="number"]');
      if (nums[0] && site.lat != null) /** @type {HTMLInputElement} */ (nums[0]).value = String(site.lat);
      if (nums[1] && site.lng != null) /** @type {HTMLInputElement} */ (nums[1]).value = String(site.lng);
    }
    if (name === "AddSectorModal" && opts.sector) {
      var sector = opts.sector;
      overlay.setAttribute("data-cwl-edit-sector-id", String(opts.sectorId || sector.id || sector._id || ""));
      overlay.setAttribute("data-cwl-edit-mode", "1");
      var sName = overlay.querySelector('input[type="text"], input:not([type])');
      if (sName && sector.name) sName.value = String(sector.name);
    }
    if (name === "AddCPEModal" && opts.cpe) {
      var cpe = opts.cpe;
      overlay.setAttribute("data-cwl-edit-cpe-id", String(opts.cpeId || cpe.id || cpe._id || ""));
      overlay.setAttribute("data-cwl-edit-mode", "1");
      var cName = overlay.querySelector('input[type="text"], input:not([type])');
      if (cName && cpe.name) cName.value = String(cpe.name);
    }
    if (name === "UnifiedDeviceDetailsModal") {
      var detail =
        opts.device ||
        (dataCache.cpeDevices || [])[0] ||
        (dataCache.sectors || [])[0] ||
        (dataCache.equipment || [])[0] ||
        (dataCache.towers || [])[0] ||
        null;
      var host = overlay.querySelector(".modal-body, .device-details, [data-cwl-device-details]") || overlay;
      var pre = host.querySelector("[data-cwl-device-json]");
      if (!pre) {
        pre = document.createElement("pre");
        pre.setAttribute("data-cwl-device-json", "1");
        pre.className = "cwl-hydrated-list";
        host.appendChild(pre);
      }
      pre.textContent = detail
        ? JSON.stringify(detail, null, 2).slice(0, 3500)
        : "No device/site in map cache yet — load network layers first.";
    }
  }

  function wireSiteEditModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="SiteEditModal"]');
    wireLiftedModalSave(hostEl, "save", function (overlay) {
      var siteId = overlay.getAttribute("data-cwl-edit-site-id") || "";
      if (!siteId) {
        var prefer = nearestSiteId(NaN, NaN);
        siteId = prefer;
      }
      if (!siteId) {
        setHonesty("No site selected to edit");
        return null;
      }
      var name =
        readNamedOrPh(overlay, "name", "Tower") ||
        readNamedOrPh(overlay, "name", "Site") ||
        readNamedOrPh(overlay, "name", "Main");
      var lat = readNumberNearLabel(overlay, "lat") || readNumberNearLabel(overlay, "latitude");
      var lng = readNumberNearLabel(overlay, "lng") || readNumberNearLabel(overlay, "longitude");
      var statusSel = overlay.querySelector("select");
      return {
        method: "PUT",
        endpoint: "/api/network/sites/" + encodeURIComponent(siteId),
        body: {
          name: name || undefined,
          status: statusSel && "value" in statusSel ? String(statusSel.value || "active") : "active",
          location:
            lat != null && lng != null
              ? { latitude: lat, longitude: lng }
              : undefined,
          notes: "chrysalis-site-edit",
        },
        okMsg: "Site updated — reloading map",
      };
    });
  }

  function wireSectorEditModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddSectorModal"]');
    if (!hostEl || hostEl.getAttribute("data-cwl-sector-edit-wired") === "1") return;
    hostEl.setAttribute("data-cwl-sector-edit-wired", "1");
    hostEl.addEventListener("click", function (ev) {
      var overlay = hostEl.querySelector(".modal-overlay") || hostEl;
      if (overlay.getAttribute("data-cwl-edit-mode") !== "1") return;
      var btn = ev.target && ev.target.closest ? ev.target.closest(".btn-primary") : null;
      if (!btn || !hostEl.contains(btn)) return;
      var label = (btn.textContent || "").toLowerCase();
      if (label.indexOf("save") < 0 && label.indexOf("create") < 0 && label.indexOf("sector") < 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      var sectorId = overlay.getAttribute("data-cwl-edit-sector-id") || "";
      if (!sectorId) {
        setHonesty("No sector id to update");
        return;
      }
      var name = readNamedOrPh(overlay, "name", "Alpha Sector") || readNamedOrPh(overlay, "name", "Sector");
      var techEl = overlay.querySelectorAll("select")[1];
      var statusEl = overlay.querySelectorAll("select")[2];
      var body = {
        name: name || undefined,
        technology: techEl && "value" in techEl ? String(techEl.value || "LTE") : "LTE",
        status: statusEl && "value" in statusEl ? String(statusEl.value || "active") : "active",
        azimuth: Number.isFinite(readNumberNearLabel(overlay, "azimuth"))
          ? readNumberNearLabel(overlay, "azimuth")
          : undefined,
        beamwidth: Number.isFinite(readNumberNearLabel(overlay, "beamwidth"))
          ? readNumberNearLabel(overlay, "beamwidth")
          : undefined,
      };
      setHonesty("Saving sector…");
      apiFetch("/api/network/sectors/" + encodeURIComponent(sectorId), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(function (r) {
          if (!r || !r.ok) throw new Error("Save failed (" + (r && r.status) + ")");
          setHidden(overlay, true);
          overlay.removeAttribute("data-cwl-edit-mode");
          setHonesty("Sector updated — reloading map");
          return loadNetworkData();
        })
        .catch(function (e) {
          setHonesty((e && e.message) || "Sector save failed");
        });
    }, true);
  }

  function wireCpeEditModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddCPEModal"]');
    if (!hostEl || hostEl.getAttribute("data-cwl-cpe-edit-wired") === "1") return;
    hostEl.setAttribute("data-cwl-cpe-edit-wired", "1");
    hostEl.addEventListener("click", function (ev) {
      var overlay = hostEl.querySelector(".modal-overlay") || hostEl;
      if (overlay.getAttribute("data-cwl-edit-mode") !== "1") return;
      var btn = ev.target && ev.target.closest ? ev.target.closest(".btn-primary") : null;
      if (!btn || !hostEl.contains(btn)) return;
      ev.preventDefault();
      ev.stopPropagation();
      var cpeId = overlay.getAttribute("data-cwl-edit-cpe-id") || "";
      if (!cpeId) {
        setHonesty("No CPE id to update");
        return;
      }
      var name = readNamedOrPh(overlay, "name", "Smith") || readNamedOrPh(overlay, "name", "FWA");
      var body = {
        name: name || undefined,
        manufacturer: readNamedOrPh(overlay, "manufacturer", "Telrad") || undefined,
        model: readNamedOrPh(overlay, "model", "CPE") || undefined,
        status: "active",
      };
      setHonesty("Saving CPE…");
      apiFetch("/api/network/cpe/" + encodeURIComponent(cpeId), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(function (r) {
          if (!r || !r.ok) throw new Error("Save failed (" + (r && r.status) + ")");
          setHidden(overlay, true);
          overlay.removeAttribute("data-cwl-edit-mode");
          setHonesty("CPE updated — reloading map");
          return loadNetworkData();
        })
        .catch(function (e) {
          setHonesty((e && e.message) || "CPE save failed");
        });
    }, true);
  }

  /** @param {HTMLElement} hostEl @param {string} match @param {() => { endpoint: string, body: object, okMsg: string } | null} build */
  function wireLiftedModalSave(hostEl, match, build) {
    if (!hostEl || hostEl.getAttribute("data-cwl-save-wired") === "1") return;
    hostEl.setAttribute("data-cwl-save-wired", "1");
    hostEl.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest(".btn-primary") : null;
      if (!btn || !hostEl.contains(btn)) return;
      var label = (btn.textContent || "").toLowerCase();
      if (label.indexOf(match) < 0 && label.indexOf("create") < 0 && label.indexOf("save") < 0) return;
      ev.preventDefault();
      var overlay = hostEl.querySelector(".modal-overlay") || hostEl;
      var built = build(overlay);
      if (!built) return;
      setHonesty("Saving…");
      apiFetch(built.endpoint, {
        method: built.method || "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(built.body),
      })
        .then(function (r) {
          if (!r || !r.ok) throw new Error("Save failed (" + (r && r.status) + ")");
          setHidden(overlay, true);
          setHonesty(built.okMsg);
          return loadNetworkData();
        })
        .catch(function (e) {
          setHonesty((e && e.message) || "Save failed");
        });
    });
  }

  /** @param {Element} overlay @param {string} ph */
  function inputByPlaceholder(overlay, ph) {
    return overlay.querySelector('input[placeholder*="' + ph + '" i]');
  }

  /** @param {Element} overlay */
  function readSelectValue(overlay, index) {
    var sels = overlay.querySelectorAll("select");
    var el = sels[index];
    return el && "value" in el ? String(el.value || "") : "";
  }

  /** @param {Element} overlay */
  function readNamedOrPh(overlay, name, ph) {
    var el = overlay.querySelector('input[name="' + name + '"]') || (ph ? inputByPlaceholder(overlay, ph) : null);
    return el && "value" in el ? String(el.value || "").trim() : "";
  }

  /** @param {Element} overlay */
  function readNumberNearLabel(overlay, labelHint) {
    var groups = overlay.querySelectorAll(".form-group");
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var lab = (g.textContent || "").toLowerCase();
      if (lab.indexOf(labelHint) < 0) continue;
      var inp = g.querySelector('input[type="number"], input');
      if (inp && "value" in inp) return Number(inp.value);
    }
    return NaN;
  }

  /** @param {Element} overlay @param {string} siteType @param {string} nameHint @param {string} okLabel */
  function buildSiteTypePayload(overlay, siteType, nameHint, okLabel) {
    var nameEl =
      overlay.querySelector('input[name="name"]') ||
      overlay.querySelector('input[placeholder*="' + nameHint + '" i]') ||
      overlay.querySelector('input[type="text"]');
    var latEl = overlay.querySelector('input[name="latitude"]');
    var lngEl = overlay.querySelector('input[name="longitude"]');
    if (!latEl || !lngEl) {
      var nums = overlay.querySelectorAll('.form-group input[type="number"]');
      if (nums.length >= 2) {
        latEl = nums[0];
        lngEl = nums[1];
      }
    }
    var name = nameEl && "value" in nameEl ? String(nameEl.value || "").trim() : "";
    var lat = latEl ? Number(latEl.value) : NaN;
    var lng = lngEl ? Number(lngEl.value) : NaN;
    if (!name) {
      setHonesty(okLabel + " name is required");
      return null;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      setHonesty("Valid latitude/longitude required");
      return null;
    }
    var address = readNamedOrPh(overlay, "address", "Data Center") || readNamedOrPh(overlay, "address", "Storage") || undefined;
    var city = readNamedOrPh(overlay, "city", "York") || undefined;
    var state = readNamedOrPh(overlay, "state", "NY") || undefined;
    var zipCode = readNamedOrPh(overlay, "zip", "10001") || undefined;
    var contactName = readNamedOrPh(overlay, "contact", "Manager") || readNamedOrPh(overlay, "contact", "NOC") || undefined;
    var contactPhone = (function () {
      var el = overlay.querySelector('input[type="tel"]');
      return el && "value" in el ? String(el.value || "").trim() || undefined : undefined;
    })();
    var contactEmail = (function () {
      var el = overlay.querySelector('input[type="email"]');
      return el && "value" in el ? String(el.value || "").trim() || undefined : undefined;
    })();
    var notesEl = overlay.querySelector("textarea");
    var notes = notesEl && "value" in notesEl ? String(notesEl.value || "").trim() || undefined : undefined;
    /** @type {Record<string, unknown>} */
    var body = {
      name: name,
      type: siteType,
      location: { latitude: lat, longitude: lng },
      status: "active",
    };
    if (address) body.location = Object.assign({}, body.location, { address: address });
    if (city) body.location = Object.assign({}, body.location, { city: city });
    if (state) body.location = Object.assign({}, body.location, { state: state });
    if (zipCode) body.location = Object.assign({}, body.location, { zipCode: zipCode });
    if (contactName) {
      body.contact = { name: contactName, phone: contactPhone || "", email: contactEmail || "" };
    }
    if (notes) body.accessInstructions = notes;
    return {
      endpoint: "/api/network/sites",
      body: body,
      okMsg: okLabel + " created — reloading map",
    };
  }

  function wireAddSiteModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddSiteModal"]');
    wireLiftedModalSave(hostEl, "site", function (overlay) {
      var nameEl = overlay.querySelector('input[name="name"]') || overlay.querySelector('input[placeholder*="Tower" i], input[placeholder*="Site" i]');
      var latEl = overlay.querySelector('input[name="latitude"]');
      var lngEl = overlay.querySelector('input[name="longitude"]');
      if (!latEl || !lngEl) {
        var nums = overlay.querySelectorAll('.form-group input[type="number"]');
        if (nums.length >= 2) {
          latEl = nums[0];
          lngEl = nums[1];
        }
      }
      var typeEl = overlay.querySelector('select[name="type"], select');
      var name = nameEl && "value" in nameEl ? String(nameEl.value || "").trim() : "";
      var lat = latEl ? Number(latEl.value) : NaN;
      var lng = lngEl ? Number(lngEl.value) : NaN;
      var type = typeEl && "value" in typeEl ? String(typeEl.value || "tower") : "tower";
      if (!name) {
        setHonesty("Site name is required");
        return null;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        setHonesty("Valid latitude/longitude required");
        return null;
      }
      return {
        endpoint: "/api/network/sites",
        body: {
          name: name,
          type: [type],
          location: { latitude: lat, longitude: lng },
          status: "active",
        },
        okMsg: "Site created — reloading map",
      };
    });
  }

  function wireAddNocModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddNOCModal"]');
    wireLiftedModalSave(hostEl, "noc", function (overlay) {
      return buildSiteTypePayload(overlay, "noc", "Main NOC", "NOC");
    });
  }

  function wireAddWarehouseModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddWarehouseModal"]');
    wireLiftedModalSave(hostEl, "warehouse", function (overlay) {
      return buildSiteTypePayload(overlay, "warehouse", "Main Warehouse", "Warehouse");
    });
  }

  function wireAddSectorModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddSectorModal"]');
    wireLiftedModalSave(hostEl, "sector", function (overlay) {
      var siteId = readSelectValue(overlay, 0);
      var name = readNamedOrPh(overlay, "name", "Alpha Sector") || readNamedOrPh(overlay, "name", "Sector");
      var techEl = overlay.querySelectorAll("select")[1];
      var statusEl = overlay.querySelectorAll("select")[2];
      var technology = techEl && "value" in techEl ? String(techEl.value || "LTE") : "LTE";
      var status = statusEl && "value" in statusEl ? String(statusEl.value || "active") : "active";
      var azimuth = readNumberNearLabel(overlay, "azimuth");
      var beamwidth = readNumberNearLabel(overlay, "beamwidth");
      var tilt = readNumberNearLabel(overlay, "tilt");
      if (!name) {
        setHonesty("Sector name is required");
        return null;
      }
      if (!siteId) {
        setHonesty("Select a site for the sector");
        return null;
      }
      var site = (dataCache.towers || []).find(function (s) {
        return String(s.id) === String(siteId);
      });
      var body = {
        siteId: siteId,
        name: name,
        location: site && site.location ? site.location : { latitude: 0, longitude: 0 },
        azimuth: Number.isFinite(azimuth) ? azimuth : 0,
        beamwidth: Number.isFinite(beamwidth) ? beamwidth : 65,
        tilt: Number.isFinite(tilt) ? tilt : undefined,
        technology: technology,
        band: readNamedOrPh(overlay, "band", "Band") || undefined,
        frequency: readNumberNearLabel(overlay, "frequency") || undefined,
        bandwidth: readNumberNearLabel(overlay, "bandwidth") || undefined,
        status: status,
      };
      return {
        endpoint: "/api/network/sectors",
        body: body,
        okMsg: "Sector created — reloading map",
      };
    });
  }

  function wireAddCpeModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddCPEModal"]');
    wireLiftedModalSave(hostEl, "cpe", function (overlay) {
      var latEl = overlay.querySelector('input[name="latitude"]');
      var lngEl = overlay.querySelector('input[name="longitude"]');
      if (!latEl || !lngEl) {
        var nums = overlay.querySelectorAll('.form-group input[type="number"]');
        if (nums.length >= 2) {
          latEl = nums[0];
          lngEl = nums[1];
        }
      }
      var name = readNamedOrPh(overlay, "name", "Smith") || readNamedOrPh(overlay, "name", "FWA");
      var lat = latEl ? Number(latEl.value) : NaN;
      var lng = lngEl ? Number(lngEl.value) : NaN;
      var manufacturer = readNamedOrPh(overlay, "manufacturer", "Telrad") || "Trace";
      var model = readNamedOrPh(overlay, "model", "CPE") || "CPE";
      var serialNumber = readNamedOrPh(overlay, "serial", "CPE-") || "CPE-" + Date.now();
      if (!name) {
        setHonesty("CPE name is required");
        return null;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setHonesty("Valid latitude/longitude required");
        return null;
      }
      var siteSel = overlay.querySelector("select");
      var siteId = siteSel && "value" in siteSel ? String(siteSel.value || "") : "";
      if (!siteId) siteId = nearestSiteId(lat, lng) || undefined;
      var techSel = null;
      var serviceSel = null;
      var statusSel = null;
      overlay.querySelectorAll("select").forEach(function (sel) {
        var g = sel.closest(".form-group");
        var t = ((g && g.textContent) || "").toLowerCase();
        if (t.indexOf("technology") >= 0) techSel = sel;
        else if (t.indexOf("service") >= 0) serviceSel = sel;
        else if (t.indexOf("status") >= 0) statusSel = sel;
      });
      return {
        endpoint: "/api/network/cpe",
        body: {
          siteId: siteId || undefined,
          name: name,
          location: {
            latitude: lat,
            longitude: lng,
            address: readNamedOrPh(overlay, "address", "Main St") || undefined,
          },
          azimuth: readNumberNearLabel(overlay, "azimuth") || 0,
          beamwidth: readNumberNearLabel(overlay, "beamwidth") || 60,
          heightAGL: readNumberNearLabel(overlay, "height") || undefined,
          manufacturer: manufacturer,
          model: model,
          serialNumber: serialNumber,
          macAddress: readNamedOrPh(overlay, "mac", "00:") || undefined,
          subscriberName: readNamedOrPh(overlay, "subscriber", "John") || undefined,
          serviceType: serviceSel && "value" in serviceSel ? String(serviceSel.value || "residential") : "residential",
          technology: techSel && "value" in techSel ? String(techSel.value || "LTE") : "LTE",
          band: readNamedOrPh(overlay, "band", "GHz") || undefined,
          status: statusSel && "value" in statusSel ? String(statusSel.value || "active") : "active",
        },
        okMsg: "CPE created — reloading map",
      };
    });
  }

  function wireAddInventoryModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddInventoryModal"]');
    wireLiftedModalSave(hostEl, "inventory", function (overlay) {
      var serial =
        readNamedOrPh(overlay, "serial", "Serial") ||
        readNamedOrPh(overlay, "serial", "SN") ||
        "INV" + Date.now();
      var manufacturer = readNamedOrPh(overlay, "manufacturer", "Manufacturer") || "Trace";
      var model = readNamedOrPh(overlay, "model", "Model") || "M1";
      var equipmentType =
        readNamedOrPh(overlay, "type", "Type") ||
        readNamedOrPh(overlay, "equipment", "Equipment") ||
        "Radio";
      var category = readNamedOrPh(overlay, "category", "Category") || "Radio Equipment";
      return {
        endpoint: "/api/inventory",
        body: {
          serialNumber: serial,
          manufacturer: manufacturer,
          model: model,
          equipmentType: equipmentType,
          category: category,
          status: "available",
          currentLocation: { type: "warehouse", name: "Main" },
          notes: "chrysalis-map-add-inventory",
        },
        okMsg: "Inventory item created",
      };
    });
  }

  /** Honest: lifted but no HSS product mount — open shows banner, no invent POST. */
  function wireHonestUnavailableMapModals() {
    ["AddVehicleModal", "AddRMAModal", "EPCDeploymentModal", "HSSRegistrationModal"].forEach(function (name) {
      var hostEl = document.querySelector('[data-cwl-lifted-component="' + name + '"]');
      if (!hostEl || hostEl.getAttribute("data-wisp-honest-wired") === "1") return;
      hostEl.setAttribute("data-wisp-honest-wired", "1");
      hostEl.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest(".btn-primary") : null;
        if (!btn || !hostEl.contains(btn)) return;
        ev.preventDefault();
        setHonesty(name + " — HSS mount unavailable (no invent)");
      });
    });
  }

  function wireMapActionMenus() {
    ["TowerActionsMenu", "SectorActionsMenu", "BackhaulActionsMenu"].forEach(function (name) {
      var hostEl = document.querySelector('[data-cwl-lifted-component="' + name + '"]');
      if (!hostEl || hostEl.getAttribute("data-wisp-menu-wired") === "1") return;
      hostEl.setAttribute("data-wisp-menu-wired", "1");
      hostEl.addEventListener("click", function (ev) {
        var item = ev.target && ev.target.closest ? ev.target.closest("button, .menu-item, a") : null;
        if (!item || !hostEl.contains(item)) return;
        var t = (item.textContent || "").toLowerCase();
        if (t.indexOf("edit") >= 0 && t.indexOf("cpe") >= 0) {
          ev.preventDefault();
          var cpeRow = (dataCache.cpeDevices || [])[0];
          if (cpeRow) openLiftedModal("AddCPEModal", { cpeId: cpeRow.id || cpeRow._id, cpe: cpeRow });
          else setHonesty("No CPE in map cache to edit");
          return;
        }
        if (t.indexOf("edit") >= 0 && name === "TowerActionsMenu") {
          ev.preventDefault();
          var prefer = (dataCache.towers || [])[0];
          openLiftedModal("SiteEditModal", prefer ? { siteId: prefer.id, site: prefer } : {});
          return;
        }
        if (
          (t.indexOf("deploy") >= 0 && t.indexOf("hardware") >= 0) ||
          t.indexOf("hardware deployment") >= 0 ||
          (t.indexOf("deploy") >= 0 && name === "TowerActionsMenu" && t.indexOf("epc") < 0)
        ) {
          ev.preventDefault();
          var towerHw = (dataCache.towers || [])[0];
          openLiftedModal(
            "HardwareDeploymentModal",
            towerHw ? { siteId: towerHw.id, site: towerHw } : {},
          );
          return;
        }
        if (t.indexOf("edit") >= 0 && name === "SectorActionsMenu") {
          ev.preventDefault();
          var sec = (dataCache.sectors || [])[0];
          if (sec) openLiftedModal("AddSectorModal", { sectorId: sec.id || sec._id, sector: sec });
          else setHonesty("No sector in map cache to edit");
          return;
        }
        if (t.indexOf("edit") >= 0 && name === "BackhaulActionsMenu") {
          ev.preventDefault();
          var eq = (dataCache.equipment || [])[0];
          if (!eq) {
            setHonesty("No equipment/backhaul in map cache to edit");
            return;
          }
          openLiftedModal("UnifiedDeviceDetailsModal", { device: eq });
          setHonesty("Editing backhaul via PUT /api/network/equipment/:id");
          var eid = eq.id || eq._id;
          if (!eid || !window.WispCwlApi) return;
          apiFetch("/api/network/equipment/" + encodeURIComponent(eid), {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: eq.name || "Backhaul",
              notes: "chrysalis-map-backhaul-edit",
              status: eq.status || "active",
            }),
          })
            .then(function (r) {
              if (!r || !r.ok) throw new Error("Equipment PUT failed (" + (r && r.status) + ")");
              setHonesty("Backhaul/equipment updated — reloading map");
              return loadNetworkData();
            })
            .catch(function (e) {
              setHonesty((e && e.message) || "Equipment edit failed");
            });
          return;
        }
        if (t.indexOf("delete") >= 0 || t.indexOf("remove") >= 0) {
          ev.preventDefault();
          var delPath = "";
          var delId = "";
          if (name === "TowerActionsMenu") {
            var site = (dataCache.towers || [])[0];
            delId = site && (site.id || site._id);
            delPath = delId ? "/api/network/sites/" + encodeURIComponent(delId) : "";
          } else if (name === "SectorActionsMenu") {
            var secDel = (dataCache.sectors || [])[0];
            delId = secDel && (secDel.id || secDel._id);
            delPath = delId ? "/api/network/sectors/" + encodeURIComponent(delId) : "";
          } else if (name === "BackhaulActionsMenu") {
            var eqDel = (dataCache.equipment || [])[0];
            delId = eqDel && (eqDel.id || eqDel._id);
            delPath = delId ? "/api/network/equipment/" + encodeURIComponent(delId) : "";
          }
          if (!delPath) {
            setHonesty("No network entity in cache to delete");
            return;
          }
          setHonesty("Deleting " + delPath + "…");
          apiFetch(delPath, { method: "DELETE" })
            .then(function (r) {
              if (!r || !r.ok) throw new Error("DELETE failed (" + (r && r.status) + ")");
              setHonesty("Deleted — reloading map");
              return loadNetworkData();
            })
            .catch(function (e) {
              setHonesty((e && e.message) || "Delete failed");
            });
          return;
        }
        if (t.indexOf("detail") >= 0 || t.indexOf("device") >= 0) {
          ev.preventDefault();
          var device =
            (dataCache.cpeDevices || [])[0] ||
            (dataCache.sectors || [])[0] ||
            (dataCache.equipment || [])[0] ||
            (dataCache.towers || [])[0] ||
            null;
          openLiftedModal("UnifiedDeviceDetailsModal", { device: device });
          return;
        }
        if (t.indexOf("add sector") >= 0) {
          ev.preventDefault();
          openLiftedModal("AddSectorModal", {});
          return;
        }
        if (t.indexOf("add cpe") >= 0) {
          ev.preventDefault();
          openLiftedModal("AddCPEModal", {});
          return;
        }
        if (t.indexOf("add equipment") >= 0 || (t.indexOf("add") >= 0 && t.indexOf("equip") >= 0)) {
          ev.preventDefault();
          var site = (dataCache.towers || [])[0];
          var lat = site && site.lat != null ? site.lat : 39.74;
          var lng = site && site.lng != null ? site.lng : -104.99;
          setHonesty("Creating equipment…");
          apiFetch("/api/network/equipment", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: "CWL Equip " + Date.now(),
              type: "backhaul",
              manufacturer: "Trace",
              model: "Menu",
              serialNumber: "EQ-MENU-" + Date.now(),
              status: "active",
              location: { latitude: lat, longitude: lng },
              notes: "chrysalis-menu-equipment-create",
              createdBy: "demo@wisptools.io",
            }),
          })
            .then(function (r) {
              if (!r || !r.ok) throw new Error("Equipment create failed (" + (r && r.status) + ")");
              return r.json().then(function (body) {
                var eid = body && (body._id || body.id);
                if (!eid) return null;
                return apiFetch("/api/network/equipment/" + encodeURIComponent(eid), {
                  method: "PUT",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    notes: "chrysalis-menu-equipment-put-" + Date.now(),
                    status: "active",
                  }),
                }).then(function (r2) {
                  if (!r2 || !r2.ok) throw new Error("Equipment PUT failed (" + (r2 && r2.status) + ")");
                  return body;
                });
              });
            })
            .then(function () {
              setHonesty("Equipment created+PUT — reloading map");
              return loadNetworkData();
            })
            .catch(function (e) {
              setHonesty((e && e.message) || "Equipment create failed");
            });
        }
      });
    });
  }

  function wireAddBackhaulModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="AddBackhaulLinkModal"]');
    wireLiftedModalSave(hostEl, "backhaul", function (overlay) {
      var fromSiteId = readSelectValue(overlay, 0);
      var toSiteId = readSelectValue(overlay, 1);
      var typeSel = overlay.querySelectorAll("select")[2];
      var backhaulType = typeSel && "value" in typeSel ? String(typeSel.value || "fixed-wireless-unlicensed") : "fixed-wireless-unlicensed";
      var name = readNamedOrPh(overlay, "name", "Backhaul") || readNamedOrPh(overlay, "name", "Link");
      if (!name) {
        setHonesty("Backhaul name is required");
        return null;
      }
      if (!fromSiteId || !toSiteId) {
        setHonesty("Select from and to sites");
        return null;
      }
      if (fromSiteId === toSiteId) {
        setHonesty("From and to sites must differ");
        return null;
      }
      var fromSite = (dataCache.towers || []).find(function (s) {
        return String(s.id) === String(fromSiteId);
      });
      var statusSel = null;
      overlay.querySelectorAll("select").forEach(function (sel) {
        var g = sel.closest(".form-group");
        var t = ((g && g.textContent) || "").toLowerCase();
        if (t.indexOf("status") >= 0) statusSel = sel;
      });
      return {
        endpoint: "/api/network/equipment",
        body: {
          siteId: fromSiteId,
          name: name,
          type: "backhaul",
          manufacturer: readNamedOrPh(overlay, "manufacturer", "Cisco") || "Wireless",
          model: readNamedOrPh(overlay, "model", "AirFiber") || "N/A",
          serialNumber: "BH-" + Date.now(),
          status: statusSel && "value" in statusSel ? String(statusSel.value || "active") : "active",
          location: fromSite && fromSite.location ? fromSite.location : { latitude: 0, longitude: 0 },
          specifications: {
            backhaulType: backhaulType,
            fromSiteId: fromSiteId,
            toSiteId: toSiteId,
            capacity: readNumberNearLabel(overlay, "capacity") || 1000,
          },
        },
        okMsg: "Backhaul created — reloading map",
      };
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
    // HSS mounts concrete collection routes under /api/network/*.
    // Root /api/network and /api/coverage are CWL chimera/golden surfaces only (HSS 404).
    setHonesty("Loading network from /api/network/sites…");
    return Promise.all([
      fetchJson("/api/network/sites"),
      fetchJson("/api/network/sectors"),
      fetchJson("/api/network/cpe"),
      fetchJson("/api/network/equipment"),
    ]).then(function (parts) {
      var sitesBody = parts[0];
      var sectorsBody = parts[1];
      var cpeBody = parts[2];
      var equipmentBody = parts[3];

      var sites = asArray(sitesBody, ["sites", "towers"]).map(normalizeSite).filter(Boolean);
      var sitesById = {};
      sites.forEach(function (s) {
        sitesById[s.id] = s;
      });

      var sectors = asArray(sectorsBody, ["sectors"])
        .map(function (s) {
          return normalizeSector(s, sitesById);
        })
        .filter(Boolean);

      var cpe = asArray(cpeBody, ["cpe", "cpeDevices"]);
      var equipment = asArray(equipmentBody, ["equipment"]);

      setData({ towers: sites, sectors: sectors, cpeDevices: cpe, equipment: equipment });

      var allPts = sites.concat(
        sectors.map(function (s) {
          return { lat: s.lat, lng: s.lng };
        }),
      );
      if (!allPts.length) {
        setHonesty(
          "Map ready. No sites/sectors with lat/lng from /api/network/sites|sectors (check login bearer + goldens).",
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
    if (view || mapInitStarted) return;
    mapInitStarted = true;
    loadArcGisApi()
      .then(function (api) {
        if (view) return;
        Graphic = api.Graphic;
        Point = api.Point;
        Polygon = api.Polygon;
        SimpleMarkerSymbol = api.SimpleMarkerSymbol;
        SimpleFillSymbol = api.SimpleFillSymbol;
        Sketch = api.Sketch;
        OpenStreetMapLayerCtor = api.OpenStreetMapLayer;

        var apiKey = cfg && typeof cfg.apiKey === "string" ? cfg.apiKey.trim() : "";
        if (apiKey && /^AIza/i.test(apiKey)) apiKey = "";
        if (apiKey && api.esriConfig) api.esriConfig.apiKey = apiKey;

        // Module_Manager arcgisMapController: topo-vector, fallback gray-vector (not OSM invent — D6442).
        try {
          mapRef = new api.Map({ basemap: "topo-vector" });
        } catch (_basemapErr) {
          mapRef = new api.Map({ basemap: "gray-vector" });
        }

        towersLayer = new api.GraphicsLayer({ title: "Tower Sites" });
        sectorsLayer = new api.GraphicsLayer({ title: "Sectors" });
        cpeLayer = new api.GraphicsLayer({ title: "CPE Devices" });
        equipmentLayer = new api.GraphicsLayer({ title: "Equipment" });
        marketingLayer = new api.GraphicsLayer({ title: "Marketing Addresses" });
        draftLayer = new api.GraphicsLayer({ title: "Plan draft / draw" });
        mapRef.addMany([
          towersLayer,
          sectorsLayer,
          cpeLayer,
          equipmentLayer,
          marketingLayer,
          draftLayer,
        ]);

        // Clear any leftover AMD view nodes from a prior broken load.
        try {
          host.innerHTML = "";
        } catch (_e) {
          /* ignore */
        }

        view = new api.MapView({
          container: host,
          map: mapRef,
          center: [-98.5795, 39.8283],
          zoom: mode === "plan" || mode === "deploy" ? 7 : 4,
        });

        function resizeView() {
          try {
            if (view && typeof view.resize === "function") view.resize();
          } catch (_e) {
            /* ignore */
          }
        }
        window.addEventListener("resize", resizeView);
        // Theme CSS may arrive after construct — reflow once loaded.
        setTimeout(resizeView, 0);
        setTimeout(resizeView, 250);

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
            maybeShowCoverageTips();
          });
        }, hideLoading);
      })
      .catch(function (err) {
        mapInitStarted = false;
        hideLoading();
        setHonesty((err && err.message) || "ArcGIS ESM modules failed to load.");
      });
  }

  /** Origin tipsService + moduleTips['coverage-map'] (D6442) — shown once unless dismissed. */
  function maybeShowCoverageTips() {
    if (inIframe || mode === "plan" || mode === "deploy") return;
    if (window.WispCwlTips && typeof window.WispCwlTips.show === "function") {
      window.WispCwlTips.show("coverage-map");
      return;
    }
    try {
      var dismissed = JSON.parse(localStorage.getItem("wisp_tips_dismissed") || "{}");
      if (dismissed && dismissed.modules && dismissed.modules["coverage-map"]) return;
    } catch (_e) {
      /* ignore */
    }
    if (document.querySelector(".tips-overlay:not([hidden])")) return;
    fetch("/assets/wisp-module-tips.json", { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (doc) {
        var tips = doc && doc.tips && doc.tips["coverage-map"];
        if (!tips || !tips.length) return;
        var tip = tips[Math.floor(Math.random() * tips.length)];
        if (window.WispCwlTips && typeof window.WispCwlTips.show === "function") {
          window.WispCwlTips.show("coverage-map", tip);
          return;
        }
        var overlay = document.createElement("div");
        overlay.className = "tips-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.innerHTML =
          '<div class="tips-modal">' +
          '<div class="tips-header"><div class="tips-title-section">' +
          (tip.icon ? '<span class="tip-icon">' + tip.icon + "</span>" : "") +
          "<h2>" +
          (tip.title || "Tip") +
          '</h2></div>' +
          '<button type="button" class="close-btn" aria-label="Close">×</button></div>' +
          '<div class="tips-body">' +
          (tip.content || "") +
          "</div>" +
          '<div class="tips-footer"><label><input type="checkbox" class="tips-dont-show"> Don\'t show again</label>' +
          '<button type="button" class="close-btn btn-secondary">Got it</button></div></div>';
        document.body.appendChild(overlay);
        function close() {
          var dont = overlay.querySelector(".tips-dont-show");
          if (dont && dont.checked) {
            try {
              var store = JSON.parse(localStorage.getItem("wisp_tips_dismissed") || "{}");
              if (!store.modules) store.modules = {};
              store.version = store.version || "1";
              store.modules["coverage-map"] = true;
              localStorage.setItem("wisp_tips_dismissed", JSON.stringify(store));
            } catch (_e2) {
              /* ignore */
            }
          }
          overlay.remove();
        }
        overlay.querySelectorAll(".close-btn").forEach(function (b) {
          b.addEventListener("click", close);
        });
        overlay.addEventListener("click", function (ev) {
          if (ev.target === overlay) close();
        });
      })
      .catch(function () {
        /* tips optional */
      });
  }

  function boot() {
    if (window.__WISP_CWL_MAP_BOOTED__) return;
    window.__WISP_CWL_MAP_BOOTED__ = true;
    // Drop any leftover AMD/dojo ArcGIS bootstrap tags so they cannot race ESM MapView.
    try {
      document
        .querySelectorAll('script[src*="js.arcgis.com/4.29/"]:not([type="module"])')
        .forEach(function (el) {
          var src = el.getAttribute("src") || "";
          if (src === ARCGIS_JS || src.indexOf("js.arcgis.com/4.29/?") === 0 || /\/4\.29\/?$/.test(src)) {
            el.remove();
          }
        });
    } catch (_e) {
      /* ignore */
    }
    fetch("/assets/wisp-arcgis-config.json", { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : { apiKey: "" };
      })
      .catch(function () {
        return { apiKey: "" };
      })
      .then(function (cfg) {
        initMap(cfg);
      });
  }

  // Wait briefly for wisp-cwl-client.js (defer) to expose WispCwlApi.
  if (window.WispCwlApi) boot();
  else setTimeout(boot, 50);
})();
