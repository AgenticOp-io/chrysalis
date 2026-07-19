/**
 * WISP CWL CORS helpers — keep cross-origin fallbacks preflight-safe.
 *
 * Browser rule: OPTIONS must not receive a redirect (CORS fails hard).
 * HSS nginx serves CORS on `/admin/`; bare `/admin` 301 → `/admin/` and breaks preflight.
 */
(function (global) {
  "use strict";

  var DEFAULT_ALLOWED = [
    "https://management.wisptools.io",
    "https://wisptools-management.web.app",
    "https://wisptools-management.firebaseapp.com",
    "https://wisptools.io",
    "https://wisptools-production.web.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ];

  /**
   * Normalize a URL used for cross-origin fetch so OPTIONS never 301s.
   * @param {string} url
   * @returns {string}
   */
  function corsSafeUrl(url) {
    if (!url || typeof url !== "string") return url;
    try {
      var u = new URL(url, typeof location !== "undefined" ? location.href : "https://local.invalid");
      // Exact /admin (no trailing slash) → /admin/ (nginx CORS location)
      if (u.pathname === "/admin") {
        u.pathname = "/admin/";
      }
      return u.toString();
    } catch (_e) {
      if (url === "/admin" || /\/admin$/.test(url.replace(/\?.*$/, ""))) {
        return url.replace(/\/admin(?=\?|$)/, "/admin/");
      }
      return url;
    }
  }

  /**
   * Map Module_Manager logical `/api/*` onto HSS mounts without `/api/admin` 404/301 pitfalls.
   * @param {string} backendBase
   * @param {string} path logical path e.g. /api/admin
   */
  /**
   * Logical CWL paths that the real HSS backend serves under different routes.
   * The chimera gateway translates these on GCE; direct-backend mode (Firebase
   * static Hosting) must translate client-side or every call 404s.
   */
  var DIRECT_BACKEND_ALIASES = [
    ["/api/hardware/stats", "/api/inventory/stats"],
    ["/api/hardware", "/api/inventory"],
    ["/api/tenants", "/admin/tenants"],
    ["/api/hss/groups", "/api/hss/groups"],
    ["/api/hss/subscribers", "/api/hss/subscribers"],
    ["/api/hss/bandwidth-plans", "/api/hss/bandwidth-plans"],
    ["/api/hss", "/api/hss/groups"],
  ];

  function aliasDirectBackendPath(path) {
    for (var i = 0; i < DIRECT_BACKEND_ALIASES.length; i++) {
      var from = DIRECT_BACKEND_ALIASES[i][0];
      var to = DIRECT_BACKEND_ALIASES[i][1];
      if (path === from) return to;
      if (path.indexOf(from + "/") === 0) return to + path.slice(from.length);
      if (path.indexOf(from + "?") === 0) return to + path.slice(from.length);
    }
    return path;
  }

  function backendUrlForApiPath(backendBase, path) {
    var base = String(backendBase || "").replace(/\/$/, "");
    if (!base || !path || path.indexOf("/") !== 0) return path;
    var mapped = aliasDirectBackendPath(path);
    var out;
    if (mapped === "/api/admin" || mapped.indexOf("/api/admin/") === 0) {
      out = base + mapped.slice("/api".length); // /admin or /admin/...
    } else {
      out = base + mapped;
    }
    return corsSafeUrl(out);
  }

  function isAllowedOrigin(origin, extra) {
    var list = DEFAULT_ALLOWED.concat(extra || []);
    return !!origin && list.indexOf(origin) !== -1;
  }

  /**
   * Prefer same-origin API (Hosting rewrite / chimera). Only use cross-origin
   * when same-origin is down — and never prefer a 503 CF with no ACAO.
   * @param {number} status
   */
  function shouldSkipCrossOriginProxy(status) {
    // Infra 503 from Hosting→missing function also means CF URL is dead.
    return status === 503 || status === 502 || status === 504;
  }

  function responseUsable(res) {
    return res && (res.ok || res.status === 401 || res.status === 403);
  }

  global.WispCwlCors = {
    DEFAULT_ALLOWED: DEFAULT_ALLOWED,
    corsSafeUrl: corsSafeUrl,
    backendUrlForApiPath: backendUrlForApiPath,
    isAllowedOrigin: isAllowedOrigin,
    shouldSkipCrossOriginProxy: shouldSkipCrossOriginProxy,
    responseUsable: responseUsable,
  };
})(typeof window !== "undefined" ? window : globalThis);
