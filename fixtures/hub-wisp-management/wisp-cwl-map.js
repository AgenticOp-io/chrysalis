(function () {
  var host = document.getElementById("arcgis-map-view");
  if (!host) return;

  function hideLoading() {
    var el = document.getElementById("map-loading");
    if (el) el.classList.add("hidden");
  }

  function loadCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  loadCss("https://js.arcgis.com/4.29/esri/themes/light/main.css");

  function initMap(cfg) {
    if (typeof require !== "function") {
      hideLoading();
      return;
    }
    require(["esri/config", "esri/Map", "esri/views/MapView"], function (esriConfig, Map, MapView) {
      if (cfg && cfg.apiKey) esriConfig.apiKey = cfg.apiKey;
      var params = new URLSearchParams(location.search);
      var isPlan = params.get("planMode") === "true" || params.get("mode") === "plan";
      var map = new Map({ basemap: "topo-vector" });
      var view = new MapView({
        container: host,
        map: map,
        center: [-98.5795, 39.8283],
        zoom: isPlan ? 7 : 4,
      });
      view.when(hideLoading, hideLoading);
      window.wispMapView = view;

      window.addEventListener("message", function (ev) {
        if (!ev.data || ev.data.source !== "wisp-plan-shell") return;
        if (ev.data.type === "zoom-in" && view) view.zoom += 1;
        if (ev.data.type === "zoom-out" && view) view.zoom -= 1;
      });
    });
  }

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
      s.onerror = hideLoading;
      document.head.appendChild(s);
    });
})();
