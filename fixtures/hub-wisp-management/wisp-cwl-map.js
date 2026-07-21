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
  // Plan/Deploy SharedMap iframe — fit chrome + modals to the pane, not 100vw desktop.
  if (inIframe || mode === "plan" || mode === "deploy") {
    try {
      document.documentElement.setAttribute("data-cwl-map-embed", "1");
    } catch (_e) {
      /* ignore */
    }
  }

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
  var deploymentsLayer = null;
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

  var dataCache = { towers: [], sectors: [], cpeDevices: [], equipment: [], deployments: [] };
  var marketingAddresses = [];
  var activePlanId = params.get("planId") || null;
  /** @type {{ id: string, kind: string, name?: string, lat?: number, lng?: number, planFeatureId?: string, raw?: object } | null} */
  var selectedMapAsset = null;
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
    renderDeployments(dataCache.deployments || []);
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

  /**
   * Hardware deployments (site-nested lat/lng). Distinct from inventory equipment
   * so productionHardware state-updates never wipe live network equipment.
   */
  function renderDeployments(rows) {
    if (!deploymentsLayer || !Graphic || !Point || !SimpleMarkerSymbol) return;
    deploymentsLayer.removeAll();
    (rows || []).forEach(function (d) {
      if (!d) return;
      var site = d.siteId && typeof d.siteId === "object" ? d.siteId : null;
      var merged = Object.assign({}, d, {
        location: (site && site.location) || d.location,
        name: d.name || (site && site.name) || "Deployment",
      });
      var ll = latLngOf(merged);
      if (!ll) return;
      deploymentsLayer.add(
        new Graphic({
          geometry: new Point({ longitude: ll.lng, latitude: ll.lat }),
          symbol: new SimpleMarkerSymbol({
            style: "triangle",
            color: [34, 197, 94, 0.95],
            size: 11,
            outline: { color: [26, 35, 50, 1], width: 1 },
          }),
          attributes: Object.assign({}, merged, {
            kind: "deployment",
            type: "deployment",
            lat: ll.lat,
            lng: ll.lng,
            hardware_type: d.hardware_type || d.type || "hardware",
          }),
          popupTemplate: {
            title: "{name}",
            content: "Deployment · {hardware_type} · {status}",
          },
        }),
      );
    });
    deploymentsLayer.visible = !!filters.showEquipment;
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
            name: f.name || f.label || (f.properties && f.properties.name) || f.id,
            lat: ll.lat,
            lng: ll.lng,
            planFeatureId: String(f.id || f._id || f.featureId || ""),
            id: String(f.id || f._id || f.featureId || ""),
            featureType: f.featureType || (f.properties && f.properties.featureType) || f.type,
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
    // Origin does NOT paint productionHardware as the equipment layer — coverage-map
    // owns towers/sectors/cpe/equipment via loadNetworkData. Re-rendering equipment
    // from HardwareView wiped live network graphics and made the map feel fake.
    if (Array.isArray(state.hardwareDeployments)) {
      dataCache.deployments = state.hardwareDeployments;
      renderDeployments(state.hardwareDeployments);
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
    if (hidden) {
      el.setAttribute("hidden", "");
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      el.classList.remove("cwl-shell-open");
      if (el.style && el.style.display === "flex") el.style.display = "none";
    } else {
      el.removeAttribute("hidden");
      el.hidden = false;
      el.setAttribute("aria-hidden", "false");
      el.classList.add("cwl-shell-open");
      if (el.style && el.style.display === "none") el.style.display = "";
    }
  }

  /**
   * Lifted MapContextMenu / AddSiteModal / TowerActionsMenu wrap a still-hidden
   * .cwl-self-gated-shell — unhide host alone does nothing (ancestor [hidden]).
   */
  function revealLiftedHost(host) {
    if (!host) return null;
    setHidden(host, false);
    host.querySelectorAll(".cwl-self-gated-shell, [data-cwl-shell-key]").forEach(function (shell) {
      setHidden(shell, false);
    });
    host.querySelectorAll('[data-cwl-bind="if"]').forEach(function (panel) {
      var detail = panel.getAttribute("data-cwl-hole-detail") || "";
      if (
        /^show\b|\bshow\s*&&/.test(detail) ||
        panel.querySelector(
          ".context-menu, .tower-menu, .sector-menu, .backhaul-menu, .actions-menu, .modal-overlay, .menu-item",
        )
      ) {
        setHidden(panel, false);
      }
    });
    host
      .querySelectorAll(
        ".modal-overlay, .context-menu, .tower-menu, .sector-menu, .backhaul-menu, .actions-menu, .plan-draft-menu",
      )
      .forEach(function (surface) {
        setHidden(surface, false);
        if (surface.style) {
          if (surface.style.width === "0px") surface.style.width = "";
          if (surface.style.height === "0px") surface.style.height = "";
        }
      });
    return host;
  }

  function concealLiftedHost(host) {
    if (!host) return;
    host
      .querySelectorAll(
        ".modal-overlay, .context-menu, .tower-menu, .sector-menu, .backhaul-menu, .actions-menu, .cwl-self-gated-shell, [data-cwl-shell-key]",
      )
      .forEach(function (el) {
        setHidden(el, true);
      });
    setHidden(host, true);
  }

  /** Keep fixed menus inside the available iframe/viewport. */
  function placeFixedMenu(menu, screenX, screenY) {
    if (!menu) return;
    menu.style.position = "fixed";
    menu.style.zIndex = "10050";
    menu.style.visibility = "hidden";
    menu.style.left = "0px";
    menu.style.top = "0px";
    var margin = 8;
    var vw = window.innerWidth || document.documentElement.clientWidth || 800;
    var vh = window.innerHeight || document.documentElement.clientHeight || 600;
    var rect = menu.getBoundingClientRect();
    var w = rect.width || menu.offsetWidth || 260;
    var h = rect.height || menu.offsetHeight || 200;
    var maxH = Math.max(120, vh - margin * 2);
    menu.style.maxWidth = Math.max(160, vw - margin * 2) + "px";
    menu.style.maxHeight = maxH + "px";
    menu.style.overflowY = "auto";
    menu.style.overflowX = "hidden";
    var left = Math.min(Math.max(margin, screenX), Math.max(margin, vw - w - margin));
    var top = Math.min(Math.max(margin, screenY), Math.max(margin, vh - Math.min(h, maxH) - margin));
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    menu.style.visibility = "";
  }

  /** Shrink Add/Edit modal cards to the available map pane. */
  function fitModalToViewport(host) {
    if (!host) return;
    var overlay = host.querySelector(".modal-overlay") || host;
    if (overlay && overlay.classList && overlay.classList.contains("modal-overlay")) {
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.padding = "0.5rem";
      overlay.style.boxSizing = "border-box";
      overlay.style.overflow = "auto";
    }
    var content =
      host.querySelector(".modal-content") ||
      host.querySelector(".help-modal") ||
      host.querySelector(".tips-modal");
    if (!content) return;
    var vw = window.innerWidth || document.documentElement.clientWidth || 800;
    var vh = window.innerHeight || document.documentElement.clientHeight || 600;
    content.style.width = Math.min(vw - 16, 576) + "px";
    content.style.maxWidth = Math.max(200, vw - 16) + "px";
    content.style.maxHeight = Math.max(160, vh - 16) + "px";
    content.style.boxSizing = "border-box";
    content.style.overflow = "hidden";
    content.style.display = "flex";
    content.style.flexDirection = "column";
    var body = content.querySelector(".modal-body");
    if (body) {
      body.style.flex = "1 1 auto";
      body.style.minHeight = "0";
      body.style.overflowY = "auto";
    }
  }

  function toggleFiltersOverlay() {
    var shell =
      document.querySelector('[data-cwl-shell-key="showFilters"]') ||
      document.querySelector(".modal-overlay:has(.filters-modal)") ||
      document.querySelector('[data-cwl-lifted-component="FilterPanel"]') ||
      document.getElementById("cwl-map-filter-panel");
    if (!shell) return;
    var open =
      !shell.hasAttribute("hidden") &&
      shell.getAttribute("aria-hidden") !== "true" &&
      shell.classList.contains("cwl-shell-open");
    if (open) concealLiftedHost(shell);
    else {
      revealLiftedHost(shell);
      fitModalToViewport(shell);
      wireFilterPanel();
    }
  }

  function toggleStatsOverlay() {
    var shell =
      document.querySelector('[data-cwl-shell-key="showStats"]') ||
      document.querySelector(".modal-overlay:has(.stats-modal)") ||
      document.querySelector(".stats-modal");
    if (shell) {
      var open =
        !shell.hasAttribute("hidden") &&
        shell.getAttribute("aria-hidden") !== "true" &&
        shell.classList.contains("cwl-shell-open");
      if (open) concealLiftedHost(shell);
      else {
        revealLiftedHost(shell);
        hydrateStatsOverlay(shell);
        fitModalToViewport(shell);
      }
      return;
    }
    if (statsEl) setHidden(statsEl, !statsEl.hasAttribute("hidden"));
  }

  function hydrateStatsOverlay(shell) {
    if (!shell) return;
    var towers = (dataCache.towers || []).length;
    var sectors = (dataCache.sectors || []).length;
    var cpe = (dataCache.cpeDevices || []).length;
    var equipment = (dataCache.equipment || []).length;
    var deployments = (dataCache.deployments || []).length;
    var cards = shell.querySelectorAll(".stat-card, .stat-content");
    // Fill known interp holes / numeric slots with live cache counts.
    var map = {
      tower: towers,
      site: towers,
      sector: sectors,
      cpe: cpe,
      equipment: equipment,
      deployment: deployments,
      hardware: equipment + deployments,
    };
    shell.querySelectorAll(".stat-value, .stat-number, [data-cwl-bind='interp']").forEach(function (el) {
      var label = ((el.closest(".stat-card") || el.parentElement || el).textContent || "").toLowerCase();
      var key = Object.keys(map).find(function (k) {
        return label.indexOf(k) >= 0;
      });
      if (key != null && (el.classList.contains("stat-value") || el.classList.contains("stat-number") || !String(el.textContent || "").trim() || /\{|interp|null|undefined/i.test(el.textContent || ""))) {
        el.textContent = String(map[key]);
      }
    });
    // Dedicated honesty line if cards are empty.
    if (!cards.length) {
      setHonesty(
        "Stats — towers " +
          towers +
          ", sectors " +
          sectors +
          ", CPE " +
          cpe +
          ", equipment " +
          equipment,
      );
    }
  }

  /** @param {string} sel */
  function togglePanel(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    var shell =
      el.matches && el.matches("[data-cwl-shell-key], .cwl-self-gated-shell")
        ? el
        : el.querySelector("[data-cwl-shell-key], .cwl-self-gated-shell") || el;
    var host = el.closest("[data-cwl-lifted-component]") || el;
    var open =
      !shell.hasAttribute("hidden") &&
      shell.getAttribute("aria-hidden") !== "true" &&
      (shell.classList.contains("cwl-shell-open") || host.classList.contains("cwl-shell-open"));
    if (open) concealLiftedHost(host);
    else {
      revealLiftedHost(host);
      if (/DeviceManagement/i.test(sel) || host.getAttribute("data-cwl-lifted-component") === "DeviceManagementPanel") {
        hydrateDeviceManagementPanel(host);
      }
    }
  }

  function hydrateDeviceManagementPanel(host) {
    if (!host) return;
    var body =
      host.querySelector(".panel-body, .device-list, .panel-content, [data-cwl-device-list]") ||
      host.querySelector(".device-panel");
    if (!body) return;
    var list = body.querySelector("[data-cwl-device-list]");
    if (!list) {
      list = document.createElement("div");
      list.setAttribute("data-cwl-device-list", "1");
      list.className = "cwl-hydrated-list";
      body.appendChild(list);
    }
    var rows = []
      .concat(
        (dataCache.towers || []).map(function (r) {
          return Object.assign({}, r, { kind: "tower" });
        }),
        (dataCache.sectors || []).map(function (r) {
          return Object.assign({}, r, { kind: "sector" });
        }),
        (dataCache.cpeDevices || []).map(function (r) {
          return Object.assign({}, r, { kind: "cpe" });
        }),
        (dataCache.equipment || []).map(function (r) {
          return Object.assign({}, r, { kind: "equipment" });
        }),
      )
      .slice(0, 80);
    if (!rows.length) {
      list.textContent = "No network devices loaded yet.";
      return;
    }
    list.innerHTML = rows
      .map(function (r) {
        var id = r.id || r._id || "";
        var name = r.name || id || r.kind;
        return (
          '<button type="button" class="menu-item cwl-device-row" data-cwl-device-id="' +
          String(id).replace(/"/g, "") +
          '" data-cwl-device-kind="' +
          String(r.kind || "") +
          '">' +
          String(r.kind || "").toUpperCase() +
          " · " +
          String(name) +
          "</button>"
        );
      })
      .join("");
    if (list.getAttribute("data-cwl-device-wired") === "1") return;
    list.setAttribute("data-cwl-device-wired", "1");
    list.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest("[data-cwl-device-id]") : null;
      if (!btn) return;
      ev.preventDefault();
      var id = btn.getAttribute("data-cwl-device-id");
      var kind = btn.getAttribute("data-cwl-device-kind");
      var device = findCachedEntity(kind, id);
      openLiftedModal("UnifiedDeviceDetailsModal", { device: device || { id: id, kind: kind } });
    });
  }

  /** @param {string} sel */
  function openShell(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    revealLiftedHost(el.closest("[data-cwl-lifted-component]") || el);
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
    if (type === "hardware-deployments") {
      var deps = payload.deployments || payload.items || payload;
      if (Array.isArray(deps)) {
        dataCache.deployments = deps;
        renderDeployments(deps);
      }
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
        selectedMapAsset = normalizeHitAttrs(attrs);
        postToParent("asset-click", {
          detail: Object.assign({}, selectedMapAsset, {
            isRightClick: false,
            screenX: event.x,
            screenY: event.y,
            planId: activePlanId,
          }),
        });
        postToParent("object-action", {
          objectId: selectedMapAsset && selectedMapAsset.id,
          action: "select",
          data: selectedMapAsset,
        });
      });
    });
    // Origin: right-click hitTest → asset menu; blank map → MapContextMenu.
    // ArcGIS may expose button on the event or native MouseEvent.
    var lastRightClickAt = 0;
    function handleMapRightClick(screenX, screenY, mapPointHint) {
      var now = Date.now();
      if (now - lastRightClickAt < 350) return;
      lastRightClickAt = now;
      var mapPoint =
        mapPointHint ||
        (view && view.toMap ? view.toMap({ x: screenX, y: screenY }) : null);
      view.hitTest({ x: screenX, y: screenY }).then(function (response) {
        var results = (response && response.results) || [];
        var hit = results.find(function (r) {
          return r.graphic && r.graphic.attributes && r.graphic.attributes.kind;
        });
        if (hit) {
          var attrs = hit.graphic.attributes;
          selectedMapAsset = normalizeHitAttrs(attrs);
          postToParent("asset-click", {
            detail: Object.assign({}, selectedMapAsset, {
              isRightClick: true,
              screenX: screenX,
              screenY: screenY,
              planId: activePlanId,
            }),
          });
          openAssetActionsMenu(selectedMapAsset, screenX, screenY);
          return;
        }
        selectedMapAsset = null;
        if (mapPoint) {
          openMapContextMenu(screenX, screenY, mapPoint.latitude, mapPoint.longitude);
        }
      });
    }
    view.on("pointer-down", function (event) {
      var btn =
        event && event.button != null
          ? event.button
          : event && event.native && event.native.button != null
            ? event.native.button
            : -1;
      if (btn !== 2) return;
      try {
        if (typeof event.stopPropagation === "function") event.stopPropagation();
      } catch (_e) {
        /* ignore */
      }
      var mapPoint =
        event.mapPoint && event.mapPoint.latitude != null ? event.mapPoint : null;
      handleMapRightClick(event.x, event.y, mapPoint);
    });
    if (host && host.getAttribute("data-cwl-ctx-wired") !== "1") {
      host.setAttribute("data-cwl-ctx-wired", "1");
      host.addEventListener(
        "contextmenu",
        function (ev) {
          ev.preventDefault();
          if (!view) return;
          var rect = host.getBoundingClientRect();
          var screenX = ev.clientX - rect.left;
          var screenY = ev.clientY - rect.top;
          handleMapRightClick(screenX, screenY, null);
        },
        true,
      );
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
    wirePlanDraftMenuActions();
    wireHardwareDeploymentEpcBridge();
    wireEpcDeploymentModalSave();
    wireSiteEditModalSave();
    wireSectorEditModalSave();
    wireCpeEditModalSave();
    wireMapContextMenuActions();
    wireMapGeocodeControls();
    wireMapReverseGeocodeControl();
  }

  function normalizeHitAttrs(attrs) {
    if (!attrs || typeof attrs !== "object") return null;
    var kind = String(attrs.kind || attrs.type || "").toLowerCase();
    return {
      id: String(attrs.id || attrs._id || attrs.featureId || ""),
      kind: kind,
      name: attrs.name || attrs.label || attrs.id,
      status: attrs.status,
      lat: attrs.lat,
      lng: attrs.lng,
      planFeatureId: attrs.planFeatureId || (kind.indexOf("staged") >= 0 ? attrs.id : null),
      hardware_type: attrs.hardware_type,
      raw: attrs,
    };
  }

  /**
   * Open the lifted Tower/Sector/Backhaul/plan-draft action menu at the cursor,
   * bound to selectedMapAsset (origin right-click object menus).
   */
  function openAssetActionsMenu(asset, screenX, screenY) {
    if (!asset) return;
    var kind = String(asset.kind || "").toLowerCase();
    // Origin: plan drafts use the inline plan-draft-menu, not TowerActionsMenu.
    if (kind === "staged-feature" || asset.planFeatureId) {
      openPlanDraftMenu(asset, screenX, screenY);
      return;
    }
    var menuName = "TowerActionsMenu";
    if (kind === "sector") menuName = "SectorActionsMenu";
    else if (kind === "equipment" || kind === "backhaul" || kind === "deployment")
      menuName = "BackhaulActionsMenu";
    else if (kind === "cpe") menuName = "TowerActionsMenu";
    var wrap =
      document.querySelector('[data-cwl-lifted-component="' + menuName + '"]') ||
      document.querySelector('[data-cwl-lifted-component*="' + menuName.replace("ActionsMenu", "") + '"]');
    if (!wrap) {
      if (asset.lat != null && asset.lng != null) {
        openMapContextMenu(screenX, screenY, asset.lat, asset.lng);
      }
      setHonesty(
        (asset.name || asset.kind || "Feature") +
          " selected — use Edit/Delete from the action menu when available.",
      );
      return;
    }
    ["TowerActionsMenu", "SectorActionsMenu", "BackhaulActionsMenu", "MapContextMenu"].forEach(
      function (n) {
        var el = document.querySelector('[data-cwl-lifted-component="' + n + '"]');
        if (el && el !== wrap) concealLiftedHost(el);
      },
    );
    var draftMenu = document.querySelector('[data-cwl-shell-key="showPlanDraftMenu"], .plan-draft-menu');
    if (draftMenu) setHidden(draftMenu, true);
    revealLiftedHost(wrap);
    var menu =
      wrap.querySelector(".tower-menu, .sector-menu, .backhaul-menu, .actions-menu, .context-menu, .menu") ||
      wrap;
    wrap.setAttribute("data-cwl-selected-id", String(asset.id || ""));
    wrap.setAttribute("data-cwl-selected-kind", String(asset.kind || ""));
    if (asset.planFeatureId) wrap.setAttribute("data-cwl-plan-feature-id", String(asset.planFeatureId));
    else wrap.removeAttribute("data-cwl-plan-feature-id");
    placeFixedMenu(menu, screenX, screenY);
    setHonesty((asset.name || asset.kind || "Feature") + " — right-click actions");
  }

  function openPlanDraftMenu(asset, screenX, screenY) {
    hideActionMenus();
    var menu =
      document.querySelector('[data-cwl-shell-key="showPlanDraftMenu"]') ||
      document.querySelector(".plan-draft-menu");
    if (!menu) {
      setHonesty("Plan draft menu not on this page");
      return;
    }
    revealLiftedHost(menu);
    menu.setAttribute("data-cwl-selected-id", String(asset.id || asset.planFeatureId || ""));
    menu.setAttribute("data-cwl-plan-feature-id", String(asset.planFeatureId || asset.id || ""));
    menu.setAttribute("data-cwl-selected-kind", "staged-feature");
    if (asset.lat != null) menu.setAttribute("data-cwl-ctx-lat", String(asset.lat));
    if (asset.lng != null) menu.setAttribute("data-cwl-ctx-lng", String(asset.lng));
    var title = menu.querySelector(".menu-header strong, .menu-header");
    if (title) {
      var nameEl = title.querySelector("span") || title;
      nameEl.textContent = String(asset.name || asset.featureType || "Draft Object");
    }
    var coords = menu.querySelector(".coords");
    if (coords && asset.lat != null && asset.lng != null) {
      coords.textContent =
        "📍 " + Number(asset.lat).toFixed(5) + ", " + Number(asset.lng).toFixed(5);
    }
    // Ensure remove affordance.
    if (!menu.querySelector("[data-cwl-remove-plan-feature]")) {
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "menu-item danger";
      rm.setAttribute("data-cwl-remove-plan-feature", "1");
      rm.textContent = "🗑️ Remove From Plan";
      menu.appendChild(rm);
    }
    placeFixedMenu(menu, screenX, screenY);
    wirePlanDraftMenuActions();
    setHonesty((asset.name || "Draft") + " — plan draft actions");
  }

  function wirePlanDraftMenuActions() {
    var menu =
      document.querySelector('[data-cwl-shell-key="showPlanDraftMenu"]') ||
      document.querySelector(".plan-draft-menu");
    if (!menu || menu.getAttribute("data-wisp-draft-wired") === "1") return;
    menu.setAttribute("data-wisp-draft-wired", "1");
    menu.addEventListener("click", function (ev) {
      var item = ev.target && ev.target.closest ? ev.target.closest("button, .menu-item") : null;
      if (!item || !menu.contains(item)) return;
      ev.preventDefault();
      ev.stopPropagation();
      var args = String(item.getAttribute("data-cwl-action-args") || "")
        .replace(/^['"]|['"]$/g, "")
        .toLowerCase();
      var label = ((item.textContent || "") + " " + args).toLowerCase();
      var lat = Number(menu.getAttribute("data-cwl-ctx-lat"));
      var lng = Number(menu.getAttribute("data-cwl-ctx-lng"));
      var fid =
        menu.getAttribute("data-cwl-plan-feature-id") ||
        menu.getAttribute("data-cwl-selected-id") ||
        "";
      var siteHint = {
        id: fid,
        lat: lat,
        lng: lng,
        name: (selectedMapAsset && selectedMapAsset.name) || "Draft site",
      };
      setHidden(menu, true);

      if (item.getAttribute("data-cwl-remove-plan-feature") === "1" || label.indexOf("remove") >= 0) {
        if (!fid || !activePlanId) {
          setHonesty("Select a plan draft to remove");
          return;
        }
        setHonesty("Removing plan feature…");
        apiFetch(
          "/api/plans/" +
            encodeURIComponent(activePlanId) +
            "/features/" +
            encodeURIComponent(fid),
          { method: "DELETE" },
        )
          .then(function (r) {
            if (!r || !r.ok) throw new Error("Plan feature DELETE failed (" + (r && r.status) + ")");
            selectedMapAsset = null;
            setHonesty("Removed from plan");
            return reloadStagedFeatures();
          })
          .catch(function (e) {
            setHonesty((e && e.message) || "Remove failed");
          });
        return;
      }
      if (args.indexOf("edit-site") >= 0 || label.indexOf("edit") >= 0) {
        openLiftedModal("AddSiteModal", { lat: lat, lng: lng, type: "tower" });
        return;
      }
      if (args.indexOf("add-sector") >= 0 || label.indexOf("sector") >= 0) {
        openLiftedModal("AddSectorModal", { lat: lat, lng: lng, siteId: fid });
        return;
      }
      if (args.indexOf("add-backhaul") >= 0 || label.indexOf("backhaul") >= 0) {
        openLiftedModal("AddBackhaulLinkModal", { lat: lat, lng: lng, fromSiteId: fid });
        return;
      }
      if (args.indexOf("add-inventory") >= 0 || label.indexOf("equipment") >= 0 || label.indexOf("inventory") >= 0) {
        openLiftedModal("AddInventoryModal", { lat: lat, lng: lng });
        return;
      }
      if (args.indexOf("deploy-epc") >= 0 || label.indexOf("epc") >= 0 || label.indexOf("snmp") >= 0) {
        openEpcDeploymentModal(siteHint);
        return;
      }
      if (args.indexOf("deploy-hardware") >= 0 || (label.indexOf("deploy") >= 0 && label.indexOf("hardware") >= 0)) {
        openLiftedModal("HardwareDeploymentModal", { siteId: fid, site: siteHint });
        return;
      }
    });
  }

  function openEpcDeploymentModal(site) {
    hideActionMenus();
    var host = document.querySelector('[data-cwl-lifted-component="EPCDeploymentModal"]');
    if (!host) {
      setHonesty("EPCDeploymentModal not lifted");
      return;
    }
    revealLiftedHost(host);
    fitModalToViewport(host);
    var overlay = host.querySelector(".modal-overlay") || host;
    setHidden(overlay, false);
    if (site) {
      host.setAttribute("data-cwl-epc-site-id", String(site.id || ""));
      if (site.lat != null) host.setAttribute("data-cwl-ctx-lat", String(site.lat));
      if (site.lng != null) host.setAttribute("data-cwl-ctx-lng", String(site.lng));
      // Prefill obvious name/lat/lng fields when present.
      var nameIn = overlay.querySelector('input[name="siteName"], input[placeholder*="Site" i], input[type="text"]');
      if (nameIn && site.name) nameIn.value = String(site.name);
      var nums = overlay.querySelectorAll('input[type="number"]');
      if (nums[0] && site.lat != null) /** @type {HTMLInputElement} */ (nums[0]).value = String(site.lat);
      if (nums[1] && site.lng != null) /** @type {HTMLInputElement} */ (nums[1]).value = String(site.lng);
    }
    setHonesty("EPC / SNMP deployment — complete the form (HSS agent mount may be unavailable)");
    wireEpcDeploymentModalSave();
  }

  function wireEpcDeploymentModalSave() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="EPCDeploymentModal"]');
    if (!hostEl || hostEl.getAttribute("data-cwl-epc-save-wired") === "1") return;
    hostEl.setAttribute("data-cwl-epc-save-wired", "1");
    hostEl.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest(".btn-primary, button") : null;
      if (!btn || !hostEl.contains(btn)) return;
      var label = (btn.textContent || "").toLowerCase();
      if (label.indexOf("deploy") < 0 && label.indexOf("save") < 0 && label.indexOf("create") < 0) return;
      ev.preventDefault();
      // Origin posts to HSS/deploy endpoints; without a live agent, stay honest.
      setHonesty("EPCDeploymentModal — HSS/agent mount unavailable (form opened; no invent POST)");
      concealLiftedHost(hostEl);
    });
  }

  function wireHardwareDeploymentEpcBridge() {
    var hostEl = document.querySelector('[data-cwl-lifted-component="HardwareDeploymentModal"]');
    if (!hostEl || hostEl.getAttribute("data-cwl-epc-bridge") === "1") return;
    hostEl.setAttribute("data-cwl-epc-bridge", "1");
    hostEl.addEventListener("click", function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest("button, .btn, .menu-item") : null;
      if (!btn || !hostEl.contains(btn)) return;
      var t = (btn.textContent || "").toLowerCase();
      if (t.indexOf("epc") < 0 && t.indexOf("snmp") < 0 && t.indexOf("server") < 0) return;
      if (t.indexOf("deploy") < 0 && t.indexOf("open") < 0 && t.indexOf("continue") < 0 && t.indexOf("epc") < 0)
        return;
      ev.preventDefault();
      ev.stopPropagation();
      var siteId = hostEl.getAttribute("data-cwl-selected-id") || "";
      var site =
        findCachedEntity("tower", siteId) ||
        (selectedMapAsset && selectedMapAsset.kind === "tower" ? selectedMapAsset : null) ||
        { id: siteId };
      concealLiftedHost(hostEl);
      openEpcDeploymentModal(site);
    });
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
    ["TowerActionsMenu", "SectorActionsMenu", "BackhaulActionsMenu"].forEach(function (n) {
      var el = document.querySelector('[data-cwl-lifted-component="' + n + '"]');
      if (el) concealLiftedHost(el);
    });
    var wrap =
      document.querySelector('[data-cwl-lifted-component="MapContextMenu"]') ||
      document.querySelector(".context-menu");
    if (!wrap) {
      setHonesty("Map context menu not on this page");
      return;
    }
    revealLiftedHost(wrap);
    var menu =
      (wrap.classList && wrap.classList.contains("context-menu") && wrap) ||
      wrap.querySelector(".context-menu") ||
      wrap;
    menu.setAttribute("data-cwl-ctx-lat", String(lat));
    menu.setAttribute("data-cwl-ctx-lng", String(lng));
    var coords = menu.querySelector(".coords");
    if (coords) {
      coords.textContent =
        "📍 " + (Number(lat).toFixed(5) || "") + ", " + (Number(lng).toFixed(5) || "");
    }
    placeFixedMenu(menu, screenX, screenY);
    setHonesty(
      "Map menu @ " +
        Number(lat).toFixed(5) +
        ", " +
        Number(lng).toFixed(5) +
        (isPlanStagingMode() ? " (plan mode)" : ""),
    );
  }

  function wireMapContextMenuActions() {
    var wrap = document.querySelector('[data-cwl-lifted-component="MapContextMenu"]');
    if (!wrap || wrap.getAttribute("data-wisp-wired") === "1") return;
    wrap.setAttribute("data-wisp-wired", "1");
    wrap.addEventListener("click", function (ev) {
      var item = ev.target && ev.target.closest ? ev.target.closest(".menu-item, button") : null;
      if (!item || !wrap.contains(item)) return;
      ev.preventDefault();
      ev.stopPropagation();
      var args = String(item.getAttribute("data-cwl-action-args") || "")
        .replace(/^['"]|['"]$/g, "")
        .toLowerCase();
      var label = ((item.textContent || "") + " " + args).toLowerCase();
      var menu = wrap.querySelector(".context-menu") || wrap;
      var lat = Number(menu.getAttribute("data-cwl-ctx-lat"));
      var lng = Number(menu.getAttribute("data-cwl-ctx-lng"));
      concealLiftedHost(wrap);
      if (label.indexOf("copy") >= 0) {
        try {
          navigator.clipboard.writeText(lat + ", " + lng);
          setHonesty("Copied " + lat.toFixed(5) + ", " + lng.toFixed(5));
        } catch (_e) {
          setHonesty("Coords: " + lat + ", " + lng);
        }
        return;
      }
      if (label.indexOf("reverse") >= 0 || (label.indexOf("address") >= 0 && label.indexOf("add") < 0)) {
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
      if (
        args.indexOf("create-site-tower") >= 0 ||
        label.indexOf("tower") >= 0 ||
        label.indexOf("other site") >= 0 ||
        args.indexOf("create-site-other") >= 0
      ) {
        openLiftedModal("AddSiteModal", {
          lat: lat,
          lng: lng,
          type: args.indexOf("other") >= 0 || label.indexOf("other") >= 0 ? "other" : "tower",
        });
        return;
      }
      if (args.indexOf("create-site-noc") >= 0 || label.indexOf("noc") >= 0) {
        openLiftedModal("AddNOCModal", { lat: lat, lng: lng });
        return;
      }
      if (args.indexOf("create-site-warehouse") >= 0 || label.indexOf("warehouse") >= 0) {
        openLiftedModal("AddWarehouseModal", { lat: lat, lng: lng });
        return;
      }
      if (args.indexOf("create-sector") >= 0 || label.indexOf("sector") >= 0) {
        openLiftedModal("AddSectorModal", { lat: lat, lng: lng });
        return;
      }
      if (args.indexOf("create-cpe") >= 0 || label.indexOf("cpe") >= 0) {
        openLiftedModal("AddCPEModal", { lat: lat, lng: lng });
        return;
      }
      if (label.indexOf("backhaul") >= 0) {
        openLiftedModal("AddBackhaulLinkModal", {});
        return;
      }
      if (label.indexOf("equipment") >= 0 || label.indexOf("radio") >= 0) {
        if (isPlanStagingMode()) {
          setHonesty("Staging equipment on plan…");
          apiFetch("/api/plans/" + encodeURIComponent(activePlanId) + "/features", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              featureType: "equipment",
              geometry: { type: "Point", coordinates: [lng, lat] },
              properties: { name: "Plan Equip " + Date.now(), latitude: lat, longitude: lng },
              status: "draft",
            }),
          })
            .then(function (r) {
              if (!r || !r.ok) throw new Error("Plan equipment stage failed (" + (r && r.status) + ")");
              setHonesty("Equipment staged in plan");
              return reloadStagedFeatures();
            })
            .catch(function (e) {
              setHonesty((e && e.message) || "Plan equipment stage failed");
            });
          return;
        }
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
    if (name === "EPCDeploymentModal") {
      openEpcDeploymentModal(opts.site || { id: opts.siteId, lat: opts.lat, lng: opts.lng, name: opts.name });
      return;
    }
    var hostEl =
      document.querySelector('[data-cwl-lifted-component="' + name + '"]') ||
      document.querySelector('[data-cwl-modal-shell="' + name + '"]');
    if (!hostEl) {
      setHonesty(name + " not lifted");
      return;
    }
    hideActionMenus();
    revealLiftedHost(hostEl);
    fitModalToViewport(hostEl);
    var overlay = hostEl.querySelector(".modal-overlay") || hostEl;
    setHidden(overlay, false);
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
      var fromPrefer =
        opts.fromSiteId ||
        (selectedMapAsset && selectedMapAsset.kind === "tower" && selectedMapAsset.id) ||
        nearestSiteId(Number(opts.lat), Number(opts.lng));
      if (sels[0]) fillSiteOptions(sels[0], fromPrefer);
      if (sels[1]) {
        var toPrefer = "";
        (dataCache.towers || []).some(function (t) {
          var tid = String(t.id || t._id || "");
          if (tid && tid !== String(fromPrefer || "")) {
            toPrefer = tid;
            return true;
          }
          return false;
        });
        fillSiteOptions(sels[1], toPrefer);
      }
    }
    if (name === "HardwareDeploymentModal") {
      var hwSite = opts.site || findCachedEntity("tower", opts.siteId) || selectedMapAsset;
      var hwId = opts.siteId || (hwSite && (hwSite.id || hwSite._id)) || "";
      if (hwId) hostEl.setAttribute("data-cwl-selected-id", String(hwId));
      wireHardwareDeploymentEpcBridge();
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
        (opts.deviceId &&
          (findCachedEntity("cpe", opts.deviceId) ||
            findCachedEntity("sector", opts.deviceId) ||
            findCachedEntity("equipment", opts.deviceId) ||
            findCachedEntity("tower", opts.deviceId))) ||
        (selectedMapAsset && selectedMapAsset.raw) ||
        selectedMapAsset ||
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
        : "No device/site selected — right-click a map feature first.";
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

  /** Origin plan mode: POST /api/plans/:id/features instead of live network creates. */
  function isPlanStagingMode() {
    return (mode === "plan" || mode === "planning") && !!activePlanId;
  }

  function featureTypeFromNetworkEndpoint(endpoint, body) {
    var ep = String(endpoint || "");
    if (ep.indexOf("/sites") >= 0) return "site";
    if (ep.indexOf("/sectors") >= 0) return "sector";
    if (ep.indexOf("/cpe") >= 0) return "cpe";
    if (ep.indexOf("/equipment") >= 0) return "equipment";
    if (ep.indexOf("/backhaul") >= 0 || ep.indexOf("/links") >= 0) return "link";
    var t = body && (body.type || body.featureType);
    if (Array.isArray(t)) t = t[0];
    return String(t || "site").toLowerCase();
  }

  function geometryFromBody(body) {
    var loc = (body && body.location) || {};
    var lat = Number(
      (body && body.latitude) != null
        ? body.latitude
        : loc.latitude != null
          ? loc.latitude
          : loc.lat,
    );
    var lng = Number(
      (body && body.longitude) != null
        ? body.longitude
        : loc.longitude != null
          ? loc.longitude
          : loc.lng != null
            ? loc.lng
            : loc.lon,
    );
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { type: "Point", coordinates: [-104.99, 39.74] };
    return { type: "Point", coordinates: [lng, lat] };
  }

  function reloadStagedFeatures() {
    if (!activePlanId) return Promise.resolve();
    return apiFetch("/api/plans/" + encodeURIComponent(activePlanId) + "/features")
      .then(function (r) {
        return r && r.ok ? r.json() : [];
      })
      .then(function (data) {
        var rows = Array.isArray(data)
          ? data
          : Array.isArray(data && data.features)
            ? data.features
            : Array.isArray(data && data.items)
              ? data.items
              : [];
        renderStagedFeatures(rows);
        postToParent("plan-features-changed", { planId: activePlanId, features: rows });
        return rows;
      })
      .catch(function () {
        postToParent("plan-features-changed", { planId: activePlanId });
      });
  }

  function hideActionMenus() {
    ["TowerActionsMenu", "SectorActionsMenu", "BackhaulActionsMenu", "MapContextMenu"].forEach(
      function (n) {
        var el = document.querySelector('[data-cwl-lifted-component="' + n + '"]');
        if (el) concealLiftedHost(el);
      },
    );
    var draft =
      document.querySelector('[data-cwl-shell-key="showPlanDraftMenu"]') ||
      document.querySelector(".plan-draft-menu");
    if (draft) setHidden(draft, true);
  }

  function findCachedEntity(kind, id) {
    var want = String(id || "");
    if (!want) return null;
    var bags = [];
    var k = String(kind || "").toLowerCase();
    if (k === "tower" || k === "site" || k === "noc" || k === "warehouse") bags = dataCache.towers || [];
    else if (k === "sector") bags = dataCache.sectors || [];
    else if (k === "cpe") bags = dataCache.cpeDevices || [];
    else if (k === "equipment" || k === "backhaul" || k === "deployment")
      bags = [].concat(dataCache.equipment || [], dataCache.deployments || []);
    else
      bags = [].concat(
        dataCache.towers || [],
        dataCache.sectors || [],
        dataCache.cpeDevices || [],
        dataCache.equipment || [],
        dataCache.deployments || [],
      );
    var i;
    for (i = 0; i < bags.length; i++) {
      var row = bags[i];
      if (!row) continue;
      var rid = String(row.id || row._id || "");
      if (rid === want) return row;
    }
    return selectedMapAsset && selectedMapAsset.raw ? selectedMapAsset.raw : null;
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
      // Plan mode stages drafts on the active plan (origin Add*Modal + mapLayerManager).
      if (isPlanStagingMode() && String(built.endpoint || "").indexOf("/api/network/") === 0) {
        var featureType = featureTypeFromNetworkEndpoint(built.endpoint, built.body);
        var props = Object.assign({}, built.body || {}, {
          name: (built.body && built.body.name) || featureType,
          featureType: featureType,
        });
        apiFetch("/api/plans/" + encodeURIComponent(activePlanId) + "/features", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            featureType: featureType,
            geometry: geometryFromBody(built.body),
            properties: props,
            status: "draft",
          }),
        })
          .then(function (r) {
            if (!r || !r.ok) throw new Error("Plan feature save failed (" + (r && r.status) + ")");
            setHidden(overlay, true);
            setHonesty((built.okMsg || "Saved") + " (staged in plan)");
            return reloadStagedFeatures();
          })
          .catch(function (e) {
            setHonesty((e && e.message) || "Plan feature save failed");
          });
        return;
      }
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
    ["AddVehicleModal", "AddRMAModal", "HSSRegistrationModal"].forEach(function (name) {
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
        var selId =
          hostEl.getAttribute("data-cwl-selected-id") ||
          (selectedMapAsset && selectedMapAsset.id) ||
          "";
        var selKind =
          hostEl.getAttribute("data-cwl-selected-kind") ||
          (selectedMapAsset && selectedMapAsset.kind) ||
          "";
        var planFeatureId =
          hostEl.getAttribute("data-cwl-plan-feature-id") ||
          (selectedMapAsset && selectedMapAsset.planFeatureId) ||
          (String(selKind).indexOf("staged") >= 0 ? selId : "");
        var asset = selectedMapAsset;
        var entity = findCachedEntity(selKind || (name === "SectorActionsMenu" ? "sector" : name === "BackhaulActionsMenu" ? "equipment" : "tower"), selId);

        // Remove staged plan draft (origin PlanDraftActionsMenu).
        if (
          item.getAttribute("data-cwl-remove-plan-feature") === "1" ||
          ((t.indexOf("remove") >= 0 || t.indexOf("delete") >= 0) &&
            (planFeatureId || String(selKind).indexOf("staged") >= 0) &&
            activePlanId)
        ) {
          ev.preventDefault();
          var fid = planFeatureId || selId;
          if (!fid || !activePlanId) {
            setHonesty("Select a plan draft to remove");
            return;
          }
          hideActionMenus();
          setHonesty("Removing plan feature…");
          apiFetch(
            "/api/plans/" +
              encodeURIComponent(activePlanId) +
              "/features/" +
              encodeURIComponent(fid),
            { method: "DELETE" },
          )
            .then(function (r) {
              if (!r || !r.ok) throw new Error("Plan feature DELETE failed (" + (r && r.status) + ")");
              selectedMapAsset = null;
              setHonesty("Removed from plan — refreshing drafts");
              return reloadStagedFeatures();
            })
            .catch(function (e) {
              setHonesty((e && e.message) || "Remove from plan failed");
            });
          return;
        }

        if (t.indexOf("edit") >= 0 && t.indexOf("cpe") >= 0) {
          ev.preventDefault();
          hideActionMenus();
          var cpeRow =
            (selKind === "cpe" && entity) ||
            findCachedEntity("cpe", selId) ||
            (selectedMapAsset && selectedMapAsset.kind === "cpe" ? selectedMapAsset.raw || selectedMapAsset : null);
          if (cpeRow) openLiftedModal("AddCPEModal", { cpeId: cpeRow.id || cpeRow._id, cpe: cpeRow });
          else setHonesty("No CPE selected to edit");
          return;
        }
        if (t.indexOf("edit") >= 0 && name === "TowerActionsMenu") {
          ev.preventDefault();
          hideActionMenus();
          var prefer = entity || findCachedEntity("tower", selId);
          if (prefer) openLiftedModal("SiteEditModal", { siteId: prefer.id || prefer._id, site: prefer });
          else setHonesty("No site selected to edit");
          return;
        }
        if (
          (t.indexOf("deploy") >= 0 && t.indexOf("hardware") >= 0) ||
          t.indexOf("hardware deployment") >= 0 ||
          (t.indexOf("deploy") >= 0 && name === "TowerActionsMenu" && t.indexOf("epc") < 0)
        ) {
          ev.preventDefault();
          hideActionMenus();
          var towerHw = entity || findCachedEntity("tower", selId);
          openLiftedModal(
            "HardwareDeploymentModal",
            towerHw ? { siteId: towerHw.id || towerHw._id, site: towerHw } : {},
          );
          return;
        }
        if (t.indexOf("view") >= 0 && t.indexOf("inventory") >= 0) {
          ev.preventDefault();
          hideActionMenus();
          postToParent("object-action", {
            objectId: selId,
            action: "view-inventory",
            data: { tower: entity || asset },
          });
          return;
        }
        if (t.indexOf("edit") >= 0 && name === "SectorActionsMenu") {
          ev.preventDefault();
          hideActionMenus();
          var sec = entity || findCachedEntity("sector", selId);
          if (sec) openLiftedModal("AddSectorModal", { sectorId: sec.id || sec._id, sector: sec });
          else setHonesty("No sector selected to edit");
          return;
        }
        if (t.indexOf("edit") >= 0 && name === "BackhaulActionsMenu") {
          ev.preventDefault();
          hideActionMenus();
          var eq = entity || findCachedEntity("equipment", selId);
          if (!eq) {
            setHonesty("No equipment/backhaul selected to edit");
            return;
          }
          openLiftedModal("UnifiedDeviceDetailsModal", { device: eq });
          var eid = eq.id || eq._id;
          if (!eid) return;
          setHonesty("Editing backhaul via PUT /api/network/equipment/:id");
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
          hideActionMenus();
          var delPath = "";
          var delId = selId || (entity && (entity.id || entity._id)) || "";
          var kindHint = String(selKind || "").toLowerCase();
          if (name === "TowerActionsMenu" || kindHint === "tower" || kindHint === "site" || kindHint === "cpe") {
            if (kindHint === "cpe") {
              delPath = delId ? "/api/network/cpe/" + encodeURIComponent(delId) : "";
            } else {
              delPath = delId ? "/api/network/sites/" + encodeURIComponent(delId) : "";
            }
          } else if (name === "SectorActionsMenu" || kindHint === "sector") {
            delPath = delId ? "/api/network/sectors/" + encodeURIComponent(delId) : "";
          } else if (name === "BackhaulActionsMenu" || kindHint === "equipment" || kindHint === "backhaul") {
            delPath = delId ? "/api/network/equipment/" + encodeURIComponent(delId) : "";
          }
          if (!delPath) {
            setHonesty("No selected map entity to delete — right-click a feature first");
            return;
          }
          setHonesty("Deleting " + delPath + "…");
          apiFetch(delPath, { method: "DELETE" })
            .then(function (r) {
              if (!r || !r.ok) throw new Error("DELETE failed (" + (r && r.status) + ")");
              selectedMapAsset = null;
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
          hideActionMenus();
          var device = entity || asset || null;
          openLiftedModal("UnifiedDeviceDetailsModal", { device: device });
          return;
        }
        if (t.indexOf("add sector") >= 0) {
          ev.preventDefault();
          hideActionMenus();
          openLiftedModal(
            "AddSectorModal",
            entity || asset
              ? { lat: (entity || asset).lat, lng: (entity || asset).lng, siteId: selId }
              : {},
          );
          return;
        }
        if (t.indexOf("add cpe") >= 0) {
          ev.preventDefault();
          hideActionMenus();
          openLiftedModal("AddCPEModal", entity || asset ? { lat: (entity || asset).lat, lng: (entity || asset).lng } : {});
          return;
        }
        if (t.indexOf("add equipment") >= 0 || (t.indexOf("add") >= 0 && t.indexOf("equip") >= 0)) {
          ev.preventDefault();
          hideActionMenus();
          var siteRow =
            entity ||
            findCachedEntity("tower", selId) ||
            (selectedMapAsset && selectedMapAsset.kind === "tower"
              ? selectedMapAsset.raw || selectedMapAsset
              : null);
          if (!siteRow) {
            setHonesty("Select a site before adding equipment");
            return;
          }
          var lat = siteRow.lat != null ? siteRow.lat : 39.74;
          var lng = siteRow.lng != null ? siteRow.lng : -104.99;
          if (isPlanStagingMode()) {
            setHonesty("Staging equipment on plan…");
            apiFetch("/api/plans/" + encodeURIComponent(activePlanId) + "/features", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                featureType: "equipment",
                geometry: { type: "Point", coordinates: [lng, lat] },
                properties: { name: "Plan Equip " + Date.now(), latitude: lat, longitude: lng },
                status: "draft",
              }),
            })
              .then(function (r) {
                if (!r || !r.ok) throw new Error("Plan equipment stage failed (" + (r && r.status) + ")");
                setHonesty("Equipment staged in plan");
                return reloadStagedFeatures();
              })
              .catch(function (e) {
                setHonesty((e && e.message) || "Plan equipment stage failed");
              });
            return;
          }
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
    dataCache.deployments = payload.deployments || dataCache.deployments || [];
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
      fetchJson("/api/network/hardware-deployments"),
    ]).then(function (parts) {
      var sitesBody = parts[0];
      var sectorsBody = parts[1];
      var cpeBody = parts[2];
      var equipmentBody = parts[3];
      var deploymentsBody = parts[4];

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
      var deployments = asArray(deploymentsBody, ["deployments", "items", "hardware"]);

      setData({
        towers: sites,
        sectors: sectors,
        cpeDevices: cpe,
        equipment: equipment,
        deployments: deployments,
      });

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
      var depCount = (dataCache.deployments || []).length;
      var eqCount = (dataCache.equipment || []).length;
      setHonesty(
        "Network loaded: " +
          sites.length +
          " sites, " +
          sectors.length +
          " sectors, " +
          cpe.length +
          " CPE, " +
          eqCount +
          " equipment, " +
          depCount +
          " deployments.",
      );
      setTimeout(function () {
        setHonesty("");
      }, 4000);
      if (allPts.length === 1) return centerOn(allPts[0].lat, allPts[0].lng, 10);
      var graphics = [];
      if (towersLayer) graphics = graphics.concat(towersLayer.graphics.toArray());
      if (sectorsLayer) graphics = graphics.concat(sectorsLayer.graphics.toArray());
      if (deploymentsLayer) graphics = graphics.concat(deploymentsLayer.graphics.toArray());
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
        deploymentsLayer = new api.GraphicsLayer({ title: "Hardware Deployments" });
        marketingLayer = new api.GraphicsLayer({ title: "Marketing Addresses" });
        draftLayer = new api.GraphicsLayer({ title: "Plan draft / draw" });
        mapRef.addMany([
          towersLayer,
          sectorsLayer,
          cpeLayer,
          equipmentLayer,
          deploymentsLayer,
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
