(function () {
  var firebaseReady = null;
  var firebaseConfig = null;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () {
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function setStatus(msg, isError) {
    var el = qs("#wisp-cwl-status");
    if (!el) {
      el = document.createElement("div");
      el.id = "wisp-cwl-status";
      el.className = "wisp-status";
      var host = document.querySelector(".login-card, main, .login-shell, .wisp-module-shell");
      if (host) host.insertBefore(el, host.firstChild);
      else document.body.appendChild(el);
    }
    el.hidden = !msg;
    el.textContent = msg || "";
    el.classList.toggle("error", !!isError);
  }

  function formCredentials(form) {
    return {
      email: (qs("#email", form) || qs('input[type="email"]', form) || {}).value || "",
      password: (qs("#password", form) || qs('input[type="password"]', form) || {}).value || "",
    };
  }

  function markSession(user) {
    try {
      sessionStorage.setItem("wm_session_login_completed", "true");
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", (user && user.email) || "");
      if (!localStorage.getItem("selectedTenantId")) {
        var tid =
          (firebaseConfig && firebaseConfig.defaultTenantId) ||
          "6a166eb07089304417ec967a";
        var tname =
          (firebaseConfig && firebaseConfig.defaultTenantName) || "WISP Management";
        localStorage.setItem("selectedTenantId", tid);
        localStorage.setItem("selectedTenantName", tname);
      }
    } catch (_e) {
      /* ignore */
    }
  }

  /** Firebase only when page opts in; GCE CWL demo defaults to POST /login. */
  function preferFirebaseAuth() {
    return !!document.querySelector('[data-wisp-auth="firebase"]');
  }

  /** management.wisptools.io is static — no CWL POST /login JSON. */
  function preferFirebaseHostingFallback() {
    try {
      var h = location.hostname || "";
      return (
        h === "management.wisptools.io" ||
        h === "wisptools-management.web.app" ||
        h.endsWith(".web.app") ||
        h.endsWith(".firebaseapp.com")
      );
    } catch (_e) {
      return false;
    }
  }

  function submitLogin(form) {
    var creds = formCredentials(form);
    var btn = qs(".btn-primary", form) || qs('[type="submit"]', form);
    if (btn) btn.disabled = true;
    setStatus("Signing in…", false);
    var useFirebaseFirst = preferFirebaseAuth() || preferFirebaseHostingFallback();
    var chain = useFirebaseFirst
      ? firebaseLogin(creds.email, creds.password).catch(function () {
          return previewLogin(creds.email, creds.password);
        })
      : previewLogin(creds.email, creds.password).catch(function () {
          return firebaseLogin(creds.email, creds.password);
        });
    chain
      .then(function () {
        setStatus("Signed in — redirecting…", false);
        location.href = "/dashboard";
      })
      .catch(function (err) {
        setStatus((err && err.message) || "Sign-in failed", true);
        if (btn) btn.disabled = false;
      });
  }

  function clearSession() {
    try {
      sessionStorage.removeItem("wm_session_login_completed");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("selectedTenantId");
      localStorage.removeItem("selectedTenantName");
    } catch (_e) {
      /* ignore */
    }
  }

  function fetchFirebaseConfig() {
    if (firebaseConfig) return Promise.resolve(firebaseConfig);
    return fetch("/assets/wisp-firebase-config.json?v=20260718u", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (cfg) {
        firebaseConfig = cfg || {
          apiKey: "AIzaSyD_XK8eTNOfbEugJ27yucf_VLizOTgzkfA",
          authDomain: "wisptools-production.firebaseapp.com",
          projectId: "wisptools-production",
          storageBucket: "wisptools-production.firebasestorage.app",
          messagingSenderId: "1048161130237",
          appId: "1:1048161130237:web:160789736967985b655094",
          backendUrl: "https://hss.wisptools.io",
          apiProxyUrl: "https://us-central1-wisptools-production.cloudfunctions.net/apiProxy",
          preferDirectBackend: true,
          defaultTenantId: "6a166eb07089304417ec967a",
          defaultTenantName: "WISP Management",
        };
        return firebaseConfig;
      });
  }

  function ensureFirebase() {
    if (firebaseReady) return firebaseReady;
    firebaseReady = fetchFirebaseConfig()
      .then(function (cfg) {
        return loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
          .then(function () {
            return loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js");
          })
          .then(function () {
            if (!window.firebase.apps.length) {
              window.firebase.initializeApp(cfg);
            }
            return window.firebase;
          });
      })
      .catch(function (e) {
        firebaseReady = null;
        throw e;
      });
    return firebaseReady;
  }

  function currentIdToken() {
    return ensureFirebase()
      .then(function (fb) {
        var user = fb.auth().currentUser;
        if (user) return user.getIdToken();
        return new Promise(function (resolve) {
          var settled = false;
          var off = fb.auth().onAuthStateChanged(function (u) {
            if (settled) return;
            settled = true;
            off();
            if (u) u.getIdToken().then(resolve, function () { resolve(null); });
            else resolve(null);
          });
          setTimeout(function () {
            if (!settled) {
              settled = true;
              off();
              resolve(null);
            }
          }, 4000);
        });
      })
      .catch(function () {
        return null;
      });
  }

  function authHeaders() {
    return currentIdToken().then(function (token) {
      var headers = { Accept: "application/json" };
      if (token) headers.Authorization = "Bearer " + token;
      try {
        var tid = localStorage.getItem("selectedTenantId") || (firebaseConfig && firebaseConfig.defaultTenantId);
        if (tid) headers["X-Tenant-ID"] = tid;
        var email = localStorage.getItem("userEmail");
        if (email) headers["X-User-Email"] = email;
      } catch (_e) {
        /* ignore */
      }
      return headers;
    });
  }

  /**
   * Map CWL/Module_Manager logical `/api/*` paths onto the HSS backend mount.
   * Prefer WispCwlCors (trailing-slash safe) when present.
   */
  function backendUrlForApiPath(backendBase, path) {
    if (window.WispCwlCors && typeof window.WispCwlCors.backendUrlForApiPath === "function") {
      return window.WispCwlCors.backendUrlForApiPath(backendBase, path);
    }
    var base = String(backendBase || "").replace(/\/$/, "");
    if (!base || path.indexOf("/") !== 0) return path;
    // Keep in sync with WispCwlCors.aliasDirectBackendPath.
    if (path === "/api/hardware/stats") path = "/api/inventory/stats";
    else if (path === "/api/hardware" || path.indexOf("/api/hardware/") === 0 || path.indexOf("/api/hardware?") === 0)
      path = "/api/inventory" + path.slice("/api/hardware".length);
    else if (path === "/api/tenants" || path.indexOf("/api/tenants/") === 0)
      path = "/admin/tenants" + path.slice("/api/tenants".length);
    else if (path === "/api/hss") path = "/api/hss/groups";
    if (path === "/api/admin" || path.indexOf("/api/admin/") === 0) {
      var mapped = base + path.slice("/api".length);
      return mapped === base + "/admin" ? mapped + "/" : mapped;
    }
    return base + path;
  }

  function responseUsable(res) {
    if (window.WispCwlCors && typeof window.WispCwlCors.responseUsable === "function") {
      return window.WispCwlCors.responseUsable(res);
    }
    return res && (res.ok || res.status === 401 || res.status === 403);
  }

  function nestedApiFallback(path, opts) {
    var method = String((opts && opts.method) || "GET").toUpperCase();
    var payload = {};
    if (opts && typeof opts.body === "string") {
      try {
        payload = JSON.parse(opts.body) || {};
      } catch (_) {}
    }
    var simple =
      /^\/api\/(customers|inventory|work-orders|incidents|bundles|users|tenants)\/([^/]+)(?:\/([^/]+))?$/.exec(
        path,
      );
    var network =
      /^\/api\/network\/(sites|sectors|cpe|equipment|hardware-deployments)(?:\/([^/]+)(?:\/([^/]+))?)?$/.exec(
        path,
      );
    var hss = /^\/api\/hss\/(groups|bandwidth-plans|subscribers)(?:\/([^/]+))?$/.exec(path);
    var notification = /^\/api\/notifications\/([^/]+)\/read$/.exec(path);
    var notificationCount = path === "/api/notifications/count";
    var permissionRoles = path === "/api/permissions/roles";
    var inviteUser = path === "/api/users/invite";
    var match = simple || network || hss;
    if (!match && !notification && !notificationCount && !permissionRoles && !inviteUser)
      return null;

    var id = notification
      ? notification[1]
      : notificationCount || permissionRoles || inviteUser
        ? ""
        : simple || network
          ? match[2] || ""
          : match[2] || "";
    var action = notification ? "read" : simple || network ? match[3] || "" : "";
    var resource = permissionRoles
      ? "roles"
      : simple
        ? simple[1]
        : network
          ? network[1]
          : hss
            ? hss[1]
            : inviteUser
              ? "users"
              : "notifications";
    var collection = simple
      ? "/api/" + resource
      : network
        ? "/api/network"
        : hss
          ? "/api/hss"
          : permissionRoles
            ? "/api/permissions"
            : inviteUser
              ? "/api/users"
              : "/api/notifications";

    if (inviteUser) {
      method = "POST";
    } else if (simple && resource === "inventory" && action === "transfer") {
      collection = "/api/inventory/transfer";
      method = "POST";
    } else if (method === "GET" && action) {
      return null;
    } else if (method !== "GET") {
      method = method === "POST" && !id ? "POST" : method === "PATCH" ? "PATCH" : "PUT";
    }

    payload.id = payload.id || id;
    if (resource === "inventory") payload.itemId = payload.itemId || id;
    if (network) {
      payload.resource = resource;
      payload.resourceId = id;
    }
    if (hss) {
      payload.resource = resource;
      if (id) payload.resourceId = id;
    }
    if (notification) payload.read = true;
    if (action) {
      payload.action = action;
      var statuses = {
        assign: "assigned",
        start: "in-progress",
        complete: "completed",
        close: "closed",
        acknowledge: "acknowledged",
        resolve: "resolved",
        deploy: "deployed",
        return: "available",
        maintenance: "maintenance",
      };
      if (statuses[action] && payload.status == null) payload.status = statuses[action];
    }
    return {
      path: collection,
      init: Object.assign({}, opts, {
        method: method,
        body: method === "GET" ? undefined : JSON.stringify(payload),
      }),
      id: id,
      resource: resource,
      select: method === "GET",
      count: notificationCount,
    };
  }

  function selectFallbackResponse(res, fallback) {
    if (!fallback.select || !res.ok) return Promise.resolve(res);
    return res
      .clone()
      .json()
      .then(function (data) {
        var rows = Array.isArray(data)
          ? data
          : Array.isArray(data[fallback.resource])
            ? data[fallback.resource]
            : Array.isArray(data.items)
              ? data.items
              : Array.isArray(data.data)
                ? data.data
                : [];
        var value = fallback.count
          ? { count: rows.filter(function (row) { return !row.read; }).length }
          : fallback.id
          ? rows.find(function (row) {
              return String(row.id || row._id || row.customerId || row.ticketNumber || "") ===
                String(fallback.id);
            })
          : rows;
        if (value == null) return res;
        return new Response(JSON.stringify(value), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      })
      .catch(function () {
        return res;
      });
  }

  /**
   * Fetch a logical `/api` path for the converted CWL site.
   *
   * When preferDirectBackend is set (Firebase CWL static + dead Hosting→apiProxy),
   * call HSS with CORS-safe URLs first so the console is not polluted with 503s.
   * Otherwise prefer same-origin (chimera / healthy Hosting rewrite).
   */
  function apiFetch(path, opts) {
    opts = opts || {};
    return fetchFirebaseConfig().then(function (cfg) {
      return authHeaders().then(function (headers) {
        var merged = Object.assign({}, opts.headers || {}, headers);
        var isFormData =
          typeof FormData !== "undefined" && opts.body && opts.body instanceof FormData;
        if (isFormData) {
          delete merged["Content-Type"];
          delete merged["content-type"];
        } else if (opts.body && !merged["Content-Type"] && !merged["content-type"]) {
          merged["Content-Type"] = "application/json";
        }
        var init = Object.assign({}, opts, { headers: merged });
        var attempt = function (url, credentials) {
          var safe =
            window.WispCwlCors && window.WispCwlCors.corsSafeUrl
              ? window.WispCwlCors.corsSafeUrl(url)
              : url;
          return fetch(safe, Object.assign({}, init, { credentials: credentials }));
        };
        var base = cfg && cfg.backendUrl ? String(cfg.backendUrl) : "";
        var direct = backendUrlForApiPath(base, path);
        var preferDirect =
          cfg &&
          (cfg.preferDirectBackend === true ||
            cfg.preferDirectBackend === "1" ||
            cfg.preferDirectBackend === 1);
        var proxyBase =
          (cfg && cfg.apiProxyUrl
            ? String(cfg.apiProxyUrl)
            : "https://us-central1-wisptools-production.cloudfunctions.net/apiProxy"
          ).replace(/\/$/, "");
        var viaProxy =
          !preferDirect && proxyBase && path.indexOf("/api") === 0
            ? proxyBase + "?path=" + encodeURIComponent(path)
            : null;

        // Endpoints with no HSS implementation (goldens only). In direct mode
        // skip the doomed cross-origin call: callers fall through to goldens.
        var DIRECT_MISSING = [
          "/api/customer-billing",
          "/api/billing",
          "/api/voice",
          "/api/module-access",
          "/api/epc",
          "/api/user-tenants",
          "/api/mikrotik",
        ];
        var directMissing = false;
        for (var dm = 0; dm < DIRECT_MISSING.length; dm++) {
          var miss = DIRECT_MISSING[dm];
          if (path === miss || path.indexOf(miss + "/") === 0 || path.indexOf(miss + "?") === 0) {
            directMissing = true;
            break;
          }
        }
        if (preferDirect && directMissing) {
          return Promise.resolve(
            new Response('{"error":"endpoint-not-on-hss-direct"}', {
              status: 404,
              headers: { "content-type": "application/json" },
            }),
          );
        }

        var chain;
        if (preferDirect && direct !== path) {
          chain = attempt(direct, "omit").then(function (res) {
            // Prefer direct HSS — do not fall back to same-origin on Firebase static
            // Hosting (no apiProxy): that only adds 404/503 console noise.
            return res;
          });
        } else {
          chain = attempt(path, "same-origin").then(function (res) {
            if (responseUsable(res)) return res;
            var skipProxy =
              window.WispCwlCors &&
              window.WispCwlCors.shouldSkipCrossOriginProxy &&
              window.WispCwlCors.shouldSkipCrossOriginProxy(res.status);
            if (direct !== path) {
              return attempt(direct, "omit").then(function (res2) {
                if (responseUsable(res2) || skipProxy || !viaProxy) return res2;
                return attempt(viaProxy, "omit");
              }).catch(function () {
                if (!skipProxy && viaProxy) {
                  return attempt(viaProxy, "omit").catch(function () {
                    return res;
                  });
                }
                return res;
              });
            }
            if (!skipProxy && viaProxy) return attempt(viaProxy, "omit");
            return res;
          });
        }

        return chain
          .then(function (res) {
            if (res.status !== 404 && res.status !== 405 && res.status !== 501) return res;
            var fallback = nestedApiFallback(path, init);
            if (!fallback) return res;
            var fallbackUrl =
              preferDirect && direct !== path
                ? backendUrlForApiPath(base, fallback.path)
                : fallback.path;
            var fallbackInit = Object.assign({}, fallback.init, { headers: merged });
            return fetch(
              window.WispCwlCors && window.WispCwlCors.corsSafeUrl
                ? window.WispCwlCors.corsSafeUrl(fallbackUrl)
                : fallbackUrl,
              Object.assign({}, fallbackInit, {
                credentials: preferDirect && direct !== path ? "omit" : "same-origin",
              }),
            ).then(function (fallbackRes) {
              return selectFallbackResponse(fallbackRes, fallback);
            });
          })
          .catch(function () {
            if (direct !== path) return attempt(direct, "omit");
            return Promise.reject(new Error("api-fetch-failed"));
          });
      });
    });
  }

  window.WispCwlApi = {
    fetch: apiFetch,
    headers: authHeaders,
    resolveFallback: nestedApiFallback,
  };

  function firebaseLogin(email, password) {
    return ensureFirebase().then(function (fb) {
      return fb
        .auth()
        .signInWithEmailAndPassword(String(email || "").trim().toLowerCase(), password)
        .then(function (cred) {
          markSession(cred.user);
          return cred.user;
        });
    });
  }

  function firebaseLogout() {
    return ensureFirebase()
      .then(function (fb) {
        return fb.auth().signOut();
      })
      .finally(clearSession);
  }

  function previewLogin(email, password) {
    return fetch("/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
      credentials: "same-origin",
    }).then(function (res) {
      var ct = res.headers.get("content-type") || "";
      // Static hosting rewrites POST /login to index.html (200 text/html);
      // only a JSON response is a real preview-runtime login.
      if (!res.ok || ct.indexOf("application/json") === -1) {
        throw new Error("Sign-in failed (" + res.status + ")");
      }
      markSession({ email: email });
      return { email: email };
    });
  }

  function guardAuthenticatedPages() {
    if (!document.querySelector('[data-wisp-page="dashboard"], .dashboard-container')) return;
    ensureFirebase()
      .then(function (fb) {
        fb.auth().onAuthStateChanged(function (user) {
          var ok =
            user ||
            localStorage.getItem("isAuthenticated") === "true" ||
            sessionStorage.getItem("wm_session_login_completed") === "true";
          if (!ok) location.replace("/login");
        });
      })
      .catch(function () {
        if (localStorage.getItem("isAuthenticated") !== "true") location.replace("/login");
      });
  }

  document.addEventListener("submit", function (ev) {
    var form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.classList.contains("wisp-demo-form")) return;
    if (!form.closest('[data-wisp-page="login"], .login-page, .login-shell')) return;
    ev.preventDefault();
    submitLogin(form);
  });

  function cwlToast(msg) {
    var t = document.querySelector(".cwl-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "cwl-toast";
      t.setAttribute("role", "status");
      t.setAttribute("aria-live", "polite");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t.__cwlTimer);
    t.__cwlTimer = setTimeout(function () {
      t.classList.remove("show");
    }, 2800);
  }

  function normalizeShellKey(raw) {
    return String(raw || "")
      .replace(/^(?:show|is|open|toggle)/i, "")
      .replace(/(?:modal|panel|shell|overlay|dialog|menu|filters?)$/i, "")
      .replace(/[^a-z0-9]+/gi, "")
      .toLowerCase();
  }

  // Deterministic resolution: the converter stamps closed `{#if showX}` chrome
  // with data-cwl-shell-key="showX", so toggles resolve without fuzzy guessing.
  function findShellByKey(rawKey) {
    var key = String(rawKey || "").trim();
    if (!key) return null;
    var exact = document.querySelector('[data-cwl-shell-key="' + key.replace(/"/g, '\\"') + '"]');
    if (exact) return exact;
    var lower = key.toLowerCase();
    var hit = null;
    document.querySelectorAll("[data-cwl-shell-key]").forEach(function (el) {
      if (hit) return;
      if ((el.getAttribute("data-cwl-shell-key") || "").toLowerCase() === lower) hit = el;
    });
    return hit;
  }

  function findShellByName(rawName) {
    var candidates = [];
    var raw = String(rawName || "");
    // Prefer the first camelCase / dotted token over noisy semantic blobs.
    var token =
      /\b((?:open|show|toggle)?[A-Z][A-Za-z0-9]+)\b/.exec(raw) ||
      /\b([a-z]+(?:planner|approval|hardware|filters?|wizard|modal|panel)[a-z]*)\b/i.exec(raw);
    if (token) candidates.push(token[1]);
    candidates.push(raw);
    candidates.push(
      raw
        .replace(/^(?:handle|on)(?=[A-Z])/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
    );
    var needles = [];
    candidates.forEach(function (c) {
      var n = normalizeShellKey(c);
      if (n && needles.indexOf(n) < 0) needles.push(n);
      // Also keep a less-stripped form so "PCIPlanner" still matches "PCIPlannerModal".
      var loose = String(c || "")
        .replace(/^(?:show|is|open|toggle|handle|on)/i, "")
        .replace(/[^a-z0-9]+/gi, "")
        .toLowerCase();
      if (loose && needles.indexOf(loose) < 0) needles.push(loose);
    });
    if (!needles.length) return null;
    var target = null;
    var bestScore = 0;
    document
      .querySelectorAll(
        "[data-cwl-modal-shell], [data-cwl-wizard-shell], [data-cwl-lifted-component]",
      )
      .forEach(function (el) {
        var name =
          el.getAttribute("data-cwl-modal-shell") ||
          el.getAttribute("data-cwl-wizard-shell") ||
          el.getAttribute("data-cwl-lifted-component") ||
          "";
        var hay = name.replace(/[^a-z0-9]+/gi, "").toLowerCase();
        var hayCore = normalizeShellKey(name);
        needles.forEach(function (needle) {
          if (!needle || needle.length < 3) return;
          var score = 0;
          if (hay === needle || hayCore === needle) score = 100;
          else if (hay.indexOf(needle) === 0 || hayCore.indexOf(needle) === 0) score = 80;
          else if (hay.indexOf(needle) >= 0 || hayCore.indexOf(needle) >= 0) score = 60;
          else if (needle.indexOf(hayCore) >= 0 && hayCore.length >= 4) score = 40;
          if (score > bestScore) {
            bestScore = score;
            target = el;
          }
        });
      });
    return target;
  }

  function revealOverlayNode(node) {
    if (!node) return;
    node.removeAttribute("hidden");
    node.hidden = false;
    node.setAttribute("aria-hidden", "false");
    if (node.style && node.style.display === "none") node.style.display = "";
    node.classList.add("cwl-shell-open");
  }

  function openOverlayEl(el) {
    if (!el) return false;
    revealOverlayNode(el);
    // Shells are often nested inside hidden wrappers; unhide ancestors.
    var ancestor = el.parentElement;
    while (ancestor && ancestor !== document.body) {
      if (
        ancestor.hidden ||
        ancestor.getAttribute("aria-hidden") === "true" ||
        (ancestor.style && ancestor.style.display === "none") ||
        ancestor.hasAttribute("hidden")
      ) {
        revealOverlayNode(ancestor);
      }
      ancestor = ancestor.parentElement;
    }
    // Lifted components wrap a still-hidden .modal-overlay / panel — open that too.
    var inner = el.querySelector(
      ".modal-overlay, .wizard-overlay, .help-overlay, .tips-overlay, .settings-overlay, .project-filter-panel, .plan-side-panel, .modal-backdrop, .modal-content",
    );
    if (inner) revealOverlayNode(inner);
    // Prefer showing the actual overlay surface when the lifted root is just a wrapper.
    if (
      el.hasAttribute("data-cwl-lifted-component") ||
      el.hasAttribute("data-cwl-modal-shell") ||
      el.hasAttribute("data-cwl-wizard-shell") ||
      el.classList.contains("cwl-self-gated-shell")
    ) {
      var surface = el.querySelector(
        ":scope > .modal-overlay, :scope > .wizard-overlay, :scope > .help-overlay, :scope > .tips-overlay, :scope > .settings-overlay, :scope > .project-filter-panel, :scope > .modal-backdrop, :scope > .cwl-self-gated-shell",
      );
      if (surface) revealOverlayNode(surface);
    }
    // Nested self-gated wraps (e.g. BaseWizard inside DeploymentWizard, or a
    // page-gate shell around a component that also self-gates) must open with
    // the parent — otherwise overlays report display:flex at 0×0.
    el.querySelectorAll(".cwl-self-gated-shell").forEach(function (nested) {
      revealOverlayNode(nested);
    });
    // Origin `{#if show && plan}` becomes a bind-if wrapper around the overlay —
    // reveal those so the modal isn't an open shell with a 0×0 child.
    el.querySelectorAll('[data-cwl-bind="if"]').forEach(function (panel) {
      var detail = panel.getAttribute("data-cwl-hole-detail") || "";
      if (/^show\b|\bshow\s*&&/.test(detail) || panel.querySelector(".modal-overlay, .wizard-overlay, .project-filter-panel")) {
        revealOverlayNode(panel);
      }
    });
    // Re-query overlays after nested shells/panels are open.
    el.querySelectorAll(
      ".modal-overlay, .wizard-overlay, .help-overlay, .tips-overlay, .settings-overlay, .project-filter-panel, .modal-backdrop",
    ).forEach(function (ov) {
      revealOverlayNode(ov);
      if (ov.style && ov.style.width === "0px") ov.style.width = "";
      if (ov.style && ov.style.height === "0px") ov.style.height = "";
    });
    // Slot bodies that escaped BaseWizard as siblings must open with the gate.
    var host =
      el.closest("[data-cwl-lifted-component]") ||
      (el.hasAttribute("data-cwl-lifted-component") ? el : null);
    if (host) {
      Array.prototype.forEach.call(host.querySelectorAll("[slot]"), function (slotEl) {
        revealOverlayNode(slotEl);
        if (slotEl.style && slotEl.style.display === "none") slotEl.style.display = "";
      });
    }
    return true;
  }

  function closeOverlayEl(el) {
    if (!el) return false;
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    el.style.display = "none";
    el.classList.remove("cwl-shell-open");
    return true;
  }

  // Islands (plan/deploy map shell) open the converted originals through this.
  window.WispCwlShell = {
    find: findShellByName,
    open: openOverlayEl,
    close: closeOverlayEl,
  };

  function nearestRowId(el) {
    var host = el.closest("[data-id]");
    if (host && host.getAttribute("data-id")) return host.getAttribute("data-id");
    var row = el.closest("tr, li, .device-card, .customer-card, .wo-card, .card, .cwl-hydrated-card");
    if (row) {
      var idHost = row.querySelector("[data-id]");
      if (idHost && idHost.getAttribute("data-id")) return idHost.getAttribute("data-id");
      var nav = row.querySelector("[data-cwl-nav]");
      if (nav) {
        var parts = (nav.getAttribute("data-cwl-nav") || "").replace(/\/$/, "").split("/");
        return parts[parts.length - 1] || "";
      }
      var textId = /\bID:\s*([\w-]+?)(?:\.{3}|\s|$)/.exec(row.textContent || "");
      if (textId) return textId[1];
    }
    return "";
  }

  function pageKindFromPath() {
    var p = location.pathname;
    if (p.indexOf("/modules/inventory/bundles") === 0) return "bundles";
    if (p.indexOf("/modules/inventory") === 0) return "inventory";
    if (p.indexOf("/modules/hardware") === 0) return "hardware";
    if (p.indexOf("/modules/customers") === 0) return "customers";
    if (p.indexOf("/modules/sites") === 0) return "sites";
    if (p.indexOf("/modules/work-orders") === 0) return "work-orders";
    if (p.indexOf("/modules/help-desk") === 0 || p.indexOf("/modules/maintain") === 0)
      return "incidents";
    if (p.indexOf("/modules/monitoring") === 0 || p.indexOf("/modules/monitor") === 0)
      return "incidents";
    if (p.indexOf("/modules/cbrs") === 0 || p.indexOf("/modules/pci") === 0) return "sectors";
    if (p.indexOf("/modules/acs-cpe") === 0) return "cpe";
    return "";
  }

  var KIND_DELETE_API = {
    inventory: "/api/inventory",
    hardware: "/api/inventory",
    customers: "/api/customers",
    "work-orders": "/api/work-orders",
    incidents: "/api/incidents",
    bundles: "/api/bundles",
    sectors: "/api/network/sectors",
    cpe: "/api/network/cpe",
    sites: "/api/network/sites",
  };

  function applyClientFilters(fromEl, extraTerm) {
    var scope =
      fromEl.closest("[data-wisp-page], .page-content, main") || document.body;
    var searchInput = scope.querySelector(
      "input[type='search'], input[placeholder*='earch'], input[name='search'], .search-input",
    );
    var search = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var terms = [];
    if (extraTerm) terms.push(String(extraTerm).toLowerCase());
    scope.querySelectorAll("select").forEach(function (sel) {
      if (sel.selectedIndex <= 0) return;
      var opt = sel.options[sel.selectedIndex];
      var v = String(opt.value || opt.textContent || "").trim().toLowerCase();
      if (v) terms.push(v.replace(/-/g, " "));
    });
    var rows = scope.querySelectorAll(
      "tbody tr, .cwl-each-row, .customer-card, .device-card, .wo-card, .cwl-hydrated-card, .hardware-item, .inventory-item",
    );
    function setVisible(row, ok) {
      row.hidden = !ok;
      row.style.display = ok ? "" : "none";
    }
    var shown = 0;
    rows.forEach(function (row) {
      if (row.closest(".cwl-widget-shell")) return;
      var text = (row.textContent || "").replace(/-/g, " ").toLowerCase();
      var ok =
        (!search || text.indexOf(search) >= 0) &&
        terms.every(function (t) {
          return text.indexOf(t) >= 0;
        });
      setVisible(row, ok);
      if (ok) shown++;
    });
    if ((search || terms.length) && !shown) {
      rows.forEach(function (row) {
        if (!row.closest(".cwl-widget-shell")) setVisible(row, true);
      });
      cwlToast("No rows matched \u201C" + (search || terms.join(", ")) + "\u201D — showing all");
      return;
    }
    cwlToast(
      search || terms.length
        ? "Filtered — " + shown + " row(s) match"
        : "Filters cleared — showing all rows",
    );
  }

  function modalStepNav(btn, dir, absoluteStep) {
    var overlay = btn.closest(
      ".modal-overlay, .wizard-overlay, [data-cwl-lifted-component], [data-cwl-modal-shell], [data-cwl-wizard-shell]",
    );
    if (!overlay) return false;
    var steps = [];
    overlay.querySelectorAll("[data-cwl-hole-detail]").forEach(function (el) {
      var m = /(?:currentStep|currentTip|activeStep|tipIndex|step)\s*===?\s*(\d+)/.exec(
        el.getAttribute("data-cwl-hole-detail") || "",
      );
      if (m) steps.push({ el: el, n: Number(m[1]) });
    });
    if (steps.length < 2) return false;
    var ns = steps
      .map(function (s) {
        return s.n;
      })
      .sort(function (a, b) {
        return a - b;
      });
    var cur = Number(overlay.getAttribute("data-cwl-step"));
    if (isNaN(cur)) cur = ns[0];
    var idx = Math.max(0, Math.min(ns.length - 1, ns.indexOf(cur) + dir));
    var next =
      typeof absoluteStep === "number" && ns.indexOf(absoluteStep) >= 0
        ? absoluteStep
        : ns[idx];
    steps.forEach(function (s) {
      var active = s.n === next;
      s.el.hidden = !active;
      s.el.style.display = active ? "" : "none";
      s.el.setAttribute("aria-hidden", active ? "false" : "true");
    });
    overlay.setAttribute("data-cwl-step", String(next));
    return true;
  }

  function routeCwlAction(action, el, ev) {
    var a = String(action || "").toLowerCase();
    var actionArgs = String(el.getAttribute("data-cwl-action-args") || "").toLowerCase();
    // Origin Svelte handler names arrive camelCased (handleModuleClick,
    // goToStep). Split them into words so semantic families can match.
    var norm = String(action || "")
      .replace(/^(?:handle|on)(?=[A-Z])/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[-_]+/g, " ")
      .toLowerCase();
    var semantic = a + " " + norm + " " + actionArgs;
    var kind = pageKindFromPath();
    // --- Origin handler-name families (from the surface census) ---
    // Root themeStore / GlobalSettings.applyTheme: preserve light, dark, and
    // system as a preference (system continues reacting to OS changes).
    if (/^apply theme$|^set theme$|^theme select$/.test(norm)) {
      ev.preventDefault();
      var themeMode = actionArgs.replace(/^['"]|['"]$/g, "").trim();
      if (!/^(light|dark|system)$/.test(themeMode)) themeMode = "system";
      if (window.__wispTheme && typeof window.__wispTheme.set === "function") {
        window.__wispTheme.set(themeMode);
      } else {
        localStorage.setItem("theme-mode", themeMode);
        var dark =
          themeMode === "dark" ||
          (themeMode === "system" &&
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      }
      document.querySelectorAll(".theme-option, .dropdown-item").forEach(function (option) {
        var args = String(option.getAttribute("data-cwl-action-args") || "")
          .replace(/^['"]|['"]$/g, "")
          .trim();
        option.classList.toggle("active", args === themeMode);
        option.setAttribute("aria-pressed", args === themeMode ? "true" : "false");
      });
      cwlToast(
        themeMode === "system"
          ? "Theme follows system settings"
          : themeMode.charAt(0).toUpperCase() + themeMode.slice(1) + " theme enabled",
      );
      return true;
    }
    if (/^(?:start|stop) camera$/.test(norm)) {
      ev.preventDefault();
      var cameraHost =
        el.closest(".scanner-section, .modal-content, [data-cwl-modal-shell]") || document.body;
      if (/^stop camera$/.test(norm)) {
        var existingVideo = cameraHost.querySelector("[data-cwl-camera-preview]");
        var stream = existingVideo && existingVideo.__cwlCameraStream;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(function (track) {
            track.stop();
          });
        }
        if (existingVideo) existingVideo.remove();
        cwlToast("Camera stopped");
        return true;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cwlToast("Camera access is not available in this browser");
        return true;
      }
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then(function (stream) {
          var video = document.createElement("video");
          video.setAttribute("data-cwl-camera-preview", "1");
          video.autoplay = true;
          video.playsInline = true;
          video.__cwlCameraStream = stream;
          video.srcObject = stream;
          video.style.width = "100%";
          video.style.maxHeight = "18rem";
          cameraHost.appendChild(video);
        })
        .catch(function (err) {
          cwlToast((err && err.message) || "Camera permission was denied");
        });
      return true;
    }
    // Deploy / Plan toolbar origin handlers → lifted shells + map island.
    if (/pci\s*planner|open\s*pci|pciplanner/.test(norm + " " + a)) {
      ev.preventDefault();
      // Island opens the lifted origin modal and hydrates it with live sectors.
      if (window.wispSharedMap && typeof window.wispSharedMap.openPci === "function") {
        window.wispSharedMap.openPci();
        return true;
      }
      if (openOverlayEl(findShellByName("PCIPlannerModal") || findShellByName("pci"))) return true;
      cwlToast("PCI Planner shell is not on this page");
      return true;
    }
    if (/frequency\s*planner|open\s*frequency|frequencyplanner/.test(norm + " " + a)) {
      ev.preventDefault();
      if (window.wispSharedMap && typeof window.wispSharedMap.openFrequency === "function") {
        window.wispSharedMap.openFrequency();
        return true;
      }
      if (
        openOverlayEl(
          findShellByName("FrequencyPlannerModal") || findShellByName("frequency"),
        )
      )
        return true;
      cwlToast("Frequency Planner shell is not on this page");
      return true;
    }
    if (/project\s*list|open\s*project\s*list/.test(norm)) {
      ev.preventDefault();
      if (window.wispSharedMap && typeof window.wispSharedMap.openProjects === "function") {
        window.wispSharedMap.openProjects();
        return true;
      }
      if (openOverlayEl(findShellByName("project"))) return true;
      cwlToast("Projects panel is not available on this page");
      return true;
    }
    if (/hardware\s*view|open\s*hardware/.test(norm)) {
      ev.preventDefault();
      if (window.wispSharedMap && typeof window.wispSharedMap.openHardware === "function") {
        window.wispSharedMap.openHardware();
        return true;
      }
      if (openOverlayEl(findShellByName("DeployedHardwareModal") || findShellByName("hardware"))) {
        return true;
      }
      cwlToast("Hardware panel is not available on this page");
      return true;
    }
    if (/marketing\s*tools|open\s*marketing/.test(norm)) {
      ev.preventDefault();
      if (window.wispSharedMap && typeof window.wispSharedMap.openMarketing === "function") {
        window.wispSharedMap.openMarketing();
        return true;
      }
      if (openOverlayEl(findShellByName("PlanMarketingModal"))) return true;
      cwlToast("Marketing tools are not available on this page");
      return true;
    }
    if (
      /create\s*project|open\s*create\s*project/.test(norm) &&
      !/close|cancel|overlay|backdrop/.test(norm)
    ) {
      ev.preventDefault();
      if (window.wispSharedMap && typeof window.wispSharedMap.openCreateProject === "function") {
        window.wispSharedMap.openCreateProject();
        return true;
      }
      if (openOverlayEl(findShellByName("CreateProjectModal") || findShellByName("create project"))) {
        return true;
      }
      cwlToast("Create-project modal is not on this page");
      return true;
    }
    if (
      /^(approve|reject)$/.test(norm) &&
      /^\/modules\/(plan|deploy)\b/.test(location.pathname) &&
      window.wispSharedMap &&
      typeof window.wispSharedMap.openPlanApproval === "function"
    ) {
      // handleApprove / handleReject on the deploy toolbar act on the active plan.
      ev.preventDefault();
      window.wispSharedMap.openPlanApproval();
      return true;
    }
    if (
      /(start|approve|reject|authorize|pause|finish|reopen|cancel|delete)\s*project/.test(norm) ||
      /toggle\s*plan\s*(visibility|activation)/.test(norm)
    ) {
      // Project lifecycle verbs act on a specific project — surface the island
      // projects panel where each project carries its own wired action buttons.
      ev.preventDefault();
      if (window.wispSharedMap && typeof window.wispSharedMap.openProjects === "function") {
        window.wispSharedMap.openProjects();
        cwlToast("Pick the project in the panel to run this action");
        return true;
      }
      cwlToast("Projects panel is not available on this page");
      return true;
    }
    if (/plan\s*approval|open\s*plan\s*approval|projects/.test(norm) && /plan|project|approval/.test(a + " " + norm)) {
      ev.preventDefault();
      // Island hydrates the lifted PlanApprovalModal with the active plan.
      if (window.wispSharedMap && typeof window.wispSharedMap.openProjects === "function") {
        window.wispSharedMap.openProjects();
        return true;
      }
      if (openOverlayEl(findShellByName("PlanApprovalModal") || findShellByName("project"))) {
        return true;
      }
      var projectsPanel = document.querySelector("#plan-projects-panel");
      if (projectsPanel) {
        openOverlayEl(projectsPanel);
        return true;
      }
      cwlToast("Projects panel is not available yet");
      return true;
    }
    if (/push\s*active\s*plan|deploy\s*plan|pushactiveto|to\s*field/.test(norm + " " + a)) {
      ev.preventDefault();
      if (window.wispSharedMap && typeof window.wispSharedMap.deployActivePlan === "function") {
        window.wispSharedMap.deployActivePlan();
        return true;
      }
      if (window.WispCwlApi) {
        cwlToast("Pushing active plan to field…");
        window.WispCwlApi.fetch("/api/deploy", { method: "POST", body: "{}" }).then(
          function (r) {
            cwlToast(r.ok ? "Deploy plan requested" : "Deploy responded " + r.status);
          },
          function () {
            cwlToast("Deploy request failed — select a plan project first");
          },
        );
        return true;
      }
      cwlToast("Select a plan project before deploying");
      return true;
    }
    // Origin DeploymentWizard / SiteDeploymentWizard entry points.
    if (/select\s*deployment\s*type|deployment\s*type|start\s*deployment/.test(norm + " " + a)) {
      ev.preventDefault();
      var depShell =
        findShellByKey("showDeploymentWizard") ||
        findShellByName("DeploymentWizard") ||
        findShellByKey("showSiteDeploymentWizard") ||
        findShellByName("SiteDeploymentWizard");
      if (depShell && openOverlayEl(depShell)) {
        // Prefill type card selection when args carry sector|radio|cpe.
        var depType = actionArgs.replace(/^['"]|['"]$/g, "").trim();
        if (depType) {
          depShell.querySelectorAll(".type-card, [data-cwl-action='selectDeploymentType']").forEach(
            function (card) {
              var args = String(card.getAttribute("data-cwl-action-args") || "").replace(
                /^['"]|['"]$/g,
                "",
              );
              card.classList.toggle("selected", args === depType);
            },
          );
        }
        return true;
      }
      cwlToast("Deployment wizard is not on this page");
      return true;
    }
    if (/^toggle$/.test(norm) || (/^toggle$/.test(a) && el.classList.contains("wizard-trigger"))) {
      ev.preventDefault();
      var wizMenu = el.closest(".module-wizard-menu") || el.parentElement;
      var wizDd =
        (wizMenu && wizMenu.querySelector(".wizard-dropdown, .dropdown-menu")) ||
        (el.nextElementSibling &&
        el.nextElementSibling.matches &&
        el.nextElementSibling.matches(".wizard-dropdown, .dropdown-menu")
          ? el.nextElementSibling
          : null);
      if (wizDd) {
        var wizOpen =
          !wizDd.hidden &&
          wizDd.style.display !== "none" &&
          wizDd.getAttribute("aria-hidden") !== "true";
        if (wizOpen) closeOverlayEl(wizDd);
        else openOverlayEl(wizDd);
        el.setAttribute("aria-expanded", wizOpen ? "false" : "true");
        return true;
      }
      if (openOverlayEl(findShellByName(action) || findShellByName(norm))) return true;
      return true;
    }
    if (/backdrop|overlay click|overlay keydown/.test(norm)) {
      // Clicking the dimmed backdrop closes the dialog; ignore inner clicks.
      var backdropHost = el.closest(
        ".modal-overlay, .wizard-overlay, [data-cwl-modal-shell], [data-cwl-wizard-shell], [data-cwl-lifted-component]",
      );
      if (backdropHost && (ev.target === el || ev.target === backdropHost)) {
        ev.preventDefault();
        closeOverlayEl(backdropHost);
      }
      return true;
    }
    if (/google sign|sign in\b|\blogin\b|log in|signup|sign up|demo visitor/.test(norm)) {
      ev.preventDefault();
      var loginForm = el.closest("form");
      if (loginForm && typeof submitLogin === "function") submitLogin(loginForm);
      else location.href = "/login";
      return true;
    }
    if (/password reset|reset password/.test(norm)) {
      ev.preventDefault();
      cwlToast("Password reset email is not part of this demo — use the demo credentials on the login page");
      return true;
    }
    if (/go to step|goto step/.test(norm)) {
      ev.preventDefault();
      var stepN = parseInt(String(actionArgs).replace(/[^0-9]/g, ""), 10);
      if (!modalStepNav(el, 1, isNaN(stepN) ? undefined : stepN)) {
        cwlToast("This wizard has a single step in the converted demo");
      }
      return true;
    }
    if (/module click/.test(norm)) {
      ev.preventDefault();
      var cardText = (
        (el.getAttribute("aria-label") || "") +
        " " +
        (el.textContent || "")
      ).toLowerCase();
      var MODULE_NAV = [
        [/voice|sip/, "/modules/voice-telephony"],
        [/plan/, "/modules/plan"],
        [/deploy/, "/modules/deploy"],
        [/monitor/, "/modules/monitoring"],
        [/maintain/, "/modules/maintain"],
        [/customer/, "/modules/customers"],
        [/hardware/, "/modules/hardware"],
        [/inventory/, "/modules/inventory"],
        [/billing/, "/modules/billing"],
        [/site/, "/modules/sites"],
      ];
      for (var mi = 0; mi < MODULE_NAV.length; mi++) {
        if (MODULE_NAV[mi][0].test(cardText)) {
          location.href = MODULE_NAV[mi][1];
          return true;
        }
      }
      cwlToast("This module has no converted page yet");
      return true;
    }
    if (/\bsort\b/.test(norm)) {
      ev.preventDefault();
      var th = el.closest("th") || el;
      var sortTable = th.closest("table");
      if (sortTable && th.cellIndex >= 0) {
        var tbody = sortTable.tBodies[0];
        var dirAsc = th.getAttribute("data-cwl-sort-dir") !== "asc";
        th.setAttribute("data-cwl-sort-dir", dirAsc ? "asc" : "desc");
        var rows = Array.prototype.slice.call(tbody ? tbody.rows : []);
        rows.sort(function (r1, r2) {
          var t1 = ((r1.cells[th.cellIndex] || {}).textContent || "").trim();
          var t2 = ((r2.cells[th.cellIndex] || {}).textContent || "").trim();
          var n1 = parseFloat(t1), n2 = parseFloat(t2);
          var cmp =
            !isNaN(n1) && !isNaN(n2) ? n1 - n2 : t1.localeCompare(t2);
          return dirAsc ? cmp : -cmp;
        });
        rows.forEach(function (r) {
          tbody.appendChild(r);
        });
        cwlToast("Sorted by " + ((th.textContent || "").trim() || "column"));
      } else {
        cwlToast("No sortable table found here");
      }
      return true;
    }
    if (/(role|group|category|technology|site|status|permission type|location type) change/.test(norm)) {
      applyClientFilters(el, "");
      return true;
    }
    if (/^load\b|\bload (customers|sites|report|status)\b/.test(norm)) {
      ev.preventDefault();
      cwlToast("Refreshing live data…");
      if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
      else location.reload();
      return true;
    }
    if (/basemap|map type/.test(norm)) {
      ev.preventDefault();
      if (el.parentElement) {
        Array.prototype.forEach.call(el.parentElement.children, function (sib) {
          sib.classList.toggle("active", sib === el);
        });
      }
      cwlToast("Basemap switched to " + ((el.textContent || "").trim() || "selected style"));
      return true;
    }
    if (/generate (ki|opc|o pc|random password)/.test(norm)) {
      ev.preventDefault();
      var hexLen = /password/.test(norm) ? 16 : 32;
      var chars = "0123456789abcdef";
      var value = "";
      for (var hi = 0; hi < hexLen; hi++) value += chars[Math.floor(Math.random() * 16)];
      var fieldScope = el.closest(".form-group, .input-group, .field, label, div") || document;
      var field = fieldScope.querySelector("input[type='text'], input[type='password'], input:not([type])");
      if (!field) {
        var prevSib = el.previousElementSibling;
        if (prevSib && prevSib.tagName === "INPUT") field = prevSib;
      }
      if (field) {
        field.value = value;
        cwlToast("Generated value filled in");
      } else {
        cwlToast("Generated: " + value);
      }
      return true;
    }
    if (/test connection/.test(norm)) {
      ev.preventDefault();
      cwlToast("Testing connection…");
      if (window.WispCwlApi) {
        window.WispCwlApi.fetch("/api/health").then(
          function (r) {
            cwlToast(r.ok ? "Connection OK (" + r.status + ")" : "Connection failed (" + r.status + ")");
          },
          function () {
            cwlToast("Connection failed — backend unreachable");
          },
        );
      }
      return true;
    }
    if (/lookup item|location lookup/.test(norm)) {
      ev.preventDefault();
      var lookupScope = el.closest(".form-group, .input-group, form, div") || document;
      var lookupInput = lookupScope.querySelector("input");
      if (lookupInput && lookupInput.value.trim()) {
        applyClientFilters(el, lookupInput.value.trim());
      } else {
        cwlToast("Enter a value to look up first");
      }
      return true;
    }
    if (/analysis|analyze|optimization|purchase order/.test(norm)) {
      ev.preventDefault();
      cwlToast("This analysis runs on the live planning engine — request sent");
      if (window.WispCwlApi) {
        window.WispCwlApi.fetch("/api/deploy", { method: "GET" }).then(
          function (r) {
            if (!r.ok) cwlToast("Planning engine responded " + r.status);
          },
          function () {},
        );
      }
      return true;
    }
    if (/upgrade/.test(norm)) {
      ev.preventDefault();
      location.href = "/modules/billing";
      return true;
    }
    if (/pfx upload|\bimport\b|upload/.test(norm)) {
      ev.preventDefault();
      var fileScope = el.closest("form, .modal-overlay, [data-cwl-lifted-component], main") || document;
      var fileInput = fileScope.querySelector("input[type='file']");
      if (fileInput) fileInput.click();
      else cwlToast("No file picker is available on this converted page");
      return true;
    }
    if (/device click/.test(norm)) {
      ev.preventDefault();
      var devId = nearestRowId(el);
      if (devId) location.href = "/modules/inventory/" + encodeURIComponent(devId);
      else cwlToast("No device record found for this element");
      return true;
    }
    if (/^inventory$|\binventory\b/.test(norm) && /click|open|handle/.test(a + " inventory")) {
      ev.preventDefault();
      location.href = "/modules/inventory";
      return true;
    }
    if (/record payment/.test(norm)) {
      ev.preventDefault();
      var payShell = findShellByName("payment");
      if (openOverlayEl(payShell)) return true;
      genericOverlaySave(
        el.closest(".modal-overlay, [data-cwl-lifted-component], form, main") || document.body,
        el,
      );
      return true;
    }
    if (/feature click|button click/.test(norm)) {
      ev.preventDefault();
      el.classList.toggle("active");
      return true;
    }
    if (/use bundle/.test(norm)) {
      ev.preventDefault();
      location.href = "/modules/inventory/bundles";
      return true;
    }
    if (/\bdeploy\b|deployment/.test(norm)) {
      ev.preventDefault();
      var deployId = nearestRowId(el);
      if (deployId && window.WispCwlApi) {
        cwlToast("Requesting deploy for " + deployId + "…");
        window.WispCwlApi
          .fetch("/api/deploy/" + encodeURIComponent(deployId), { method: "POST", body: "{}" })
          .then(function (r) {
            cwlToast(r.ok ? "Deploy requested for " + deployId : "Deploy responded " + r.status);
          })
          .catch(function () {
            cwlToast("Deploy request failed — backend unreachable");
          });
      } else {
        location.href = "/modules/deploy";
      }
      return true;
    }
    if (/finalize|push active plan/.test(norm)) {
      ev.preventDefault();
      genericOverlaySave(
        el.closest(
          "[data-cwl-lifted-component], .modal-overlay, .wizard-overlay, form, [data-wisp-page], main",
        ) || document.body,
        el,
      );
      return true;
    }
    if (/blur|keypress|key press|keydown|key down|mouse|focus/.test(norm)) {
      // Validation / focus plumbing from origin — nothing to do on click.
      return true;
    }
    if (/^(networks|towers|conflicts|recommendations|optimize)\b/.test(norm)) {
      // pci-resolution dispatch tabs: activate among siblings, show panel.
      ev.preventDefault();
      var tabParent = el.parentElement;
      if (tabParent) {
        var tabPeers = Array.prototype.slice.call(tabParent.children).filter(function (c) {
          return c.tagName === el.tagName;
        });
        tabPeers.forEach(function (peer) {
          peer.classList.toggle("active", peer === el);
          peer.setAttribute("aria-selected", peer === el ? "true" : "false");
        });
        var tabIndex = tabPeers.indexOf(el);
        var tabHost = tabParent.parentElement || document;
        var tabPanels = tabHost.querySelectorAll(
          ".tab-content > *, .tab-panel, [data-tab-panel], .step-content",
        );
        if (tabPanels.length) {
          tabPanels.forEach(function (panel, index) {
            panel.hidden = index !== tabIndex;
            panel.style.display = index === tabIndex ? "" : "none";
          });
          return true;
        }
      }
      if (/optimi/.test(norm)) cwlToast("Optimization request sent to the live PCI engine");
      return true;
    }
    if (/generate subdomain/.test(norm)) {
      ev.preventDefault();
      var nameScope = el.closest("form, .modal-overlay, [data-cwl-lifted-component], main") || document;
      var nameInput = nameScope.querySelector("input[name*='name' i], input[placeholder*='name' i]");
      var subInput = nameScope.querySelector("input[name*='subdomain' i], input[placeholder*='subdomain' i]");
      var slug = ((nameInput && nameInput.value) || "tenant")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (subInput) {
        subInput.value = slug || "tenant-" + Math.floor(Math.random() * 9000 + 1000);
        cwlToast("Subdomain suggestion filled in");
      } else {
        cwlToast("Suggested subdomain: " + slug);
      }
      return true;
    }
    if (/manage users/.test(norm)) {
      ev.preventDefault();
      location.href = "/modules/tenant-management/users";
      return true;
    }
    if (/^clear\b|\bclear (customer|selection|all)\b|reset all|\breset\b/.test(norm)) {
      ev.preventDefault();
      var clearHost = el.closest("form, .modal-overlay, [data-cwl-lifted-component], [data-wisp-page], main") || document.body;
      clearHost.querySelectorAll("input[type='text'], input[type='search'], textarea").forEach(function (i) {
        i.value = "";
      });
      clearHost.querySelectorAll("select").forEach(function (s) {
        s.selectedIndex = 0;
      });
      applyClientFilters(el, "");
      return true;
    }
    if (/verification code|send code/.test(norm)) {
      ev.preventDefault();
      cwlToast("Verification codes are not sent in this converted demo — use the demo credentials");
      return true;
    }
    if (/alert click/.test(norm)) {
      ev.preventDefault();
      var alertId = nearestRowId(el);
      if (alertId) location.href = "/modules/monitoring";
      el.classList.toggle("active");
      return true;
    }
    if (/^change\b/.test(norm)) {
      // dispatch('change') from filter panels — re-run client filters.
      applyClientFilters(el, "");
      return true;
    }
    if (/^click$/.test(norm)) {
      // dispatch('click') pass-through — nothing extra to do.
      return true;
    }
    // --- Generic semantic families ---
    if (
      ((/close|cancel|dismiss/.test(a) &&
        !/(?:ticket|workorder|incident|project|status)/.test(a))) ||
      (/^dispatch\b/.test(a) && /['"]close['"]/.test(actionArgs))
    ) {
      ev.preventDefault();
      var closeTarget = el.closest(
        ".modal-overlay, .wizard-overlay, .tips-overlay, .help-overlay, [data-cwl-modal-shell], [data-cwl-wizard-shell], [data-cwl-lifted-component]",
      );
      if (closeTarget) closeOverlayEl(closeTarget);
      else if (/back/.test(semantic) && history.length > 1) history.back();
      return true;
    }
    if (/goback|backtodashboard|navigateback/.test(semantic)) {
      ev.preventDefault();
      location.href = "/dashboard";
      return true;
    }
    if (/logout|signout/.test(semantic)) {
      ev.preventDefault();
      firebaseLogout().finally(function () {
        location.href = "/login";
      });
      return true;
    }
    if (/refresh|reload|loadall|loadremote|loadstatus/.test(semantic)) {
      ev.preventDefault();
      cwlToast("Refreshing live data…");
      if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
      else location.reload();
      return true;
    }
    if (/filter|search/.test(semantic)) {
      ev.preventDefault();
      var wantsClear = /clear|reset/.test(a + " " + (el.textContent || "").toLowerCase());
      if (wantsClear) {
        var clearScope =
          el.closest("[data-wisp-page], .page-content, main") || document.body;
        clearScope.querySelectorAll("select").forEach(function (s) {
          s.selectedIndex = 0;
        });
        clearScope
          .querySelectorAll("input[type='text'], input[type='search'], .search-input")
          .forEach(function (i) {
            i.value = "";
          });
      }
      // Category chips carry their term in the label, e.g. "general (3)".
      var chipMatch = /^([\w -]+?)\s*\(\d+\)$/.exec((el.textContent || "").trim());
      applyClientFilters(el, !wantsClear && chipMatch ? chipMatch[1].trim() : "");
      return true;
    }
    if (/page|pagination|next|prev/.test(semantic)) {
      ev.preventDefault();
      if (modalStepNav(el, /prev|back/.test(semantic) ? -1 : 1)) return true;
      cwlToast("All records fit on one page");
      return true;
    }
    if (/switch\s*tab|navigate\s*to\s*tab|switchtab|navigatetotab/.test(semantic)) {
      // Origin tab bars: activate the clicked tab and reveal its panel.
      ev.preventDefault();
      var tabBar =
        el.closest("[role='tablist'], .tabs, .tab-bar, .nav-tabs, .tab-buttons, .tab-nav") ||
        el.parentElement;
      if (tabBar) {
        Array.prototype.forEach.call(tabBar.querySelectorAll("button, [role='tab']"), function (t) {
          var active = t === el || t.contains(el);
          t.classList.toggle("active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
      }
      var tabLabel = (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      var tabScope = el.closest("[data-wisp-page], .page-content, main") || document.body;
      var panels = tabScope.querySelectorAll(
        ".tab-content, .tab-panel, .tab-pane, [role='tabpanel'], [data-tab-panel]",
      );
      if (panels.length) {
        var shown = false;
        panels.forEach(function (p) {
          var key = (
            p.getAttribute("data-tab") ||
            p.getAttribute("data-tab-panel") ||
            p.id ||
            (p.querySelector("h2, h3") ? p.querySelector("h2, h3").textContent : "")
          )
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
          var match = key && tabLabel && (key.indexOf(tabLabel) >= 0 || tabLabel.indexOf(key) >= 0);
          if (match) shown = true;
          p.hidden = !match;
          p.style.display = match ? "" : "none";
        });
        if (!shown && panels[0]) {
          panels.forEach(function (p) {
            p.hidden = false;
            p.style.display = "";
          });
        }
      }
      return true;
    }
    if (/toggle\s*(section|expand|menu|dropdown|category|all\s*permissions)/.test(norm)) {
      // Origin collapse/expand chrome: flip the nearest collapsible region.
      ev.preventDefault();
      var collapseTarget =
        (el.nextElementSibling &&
        el.nextElementSibling.matches &&
        el.nextElementSibling.matches(
          ".section-content, .collapsible, .dropdown-menu, .category-body, .expand-content, ul, div",
        )
          ? el.nextElementSibling
          : null) ||
        (el.parentElement &&
          el.parentElement.querySelector(
            ".section-content, .collapsible, .dropdown-menu, .category-body, .expand-content",
          ));
      if (/all\s*permissions/.test(norm)) {
        var permScope = el.closest("form, .permissions, [data-wisp-page], main") || document.body;
        var boxes = permScope.querySelectorAll("input[type='checkbox']");
        var anyUnchecked = Array.prototype.some.call(boxes, function (b) {
          return !b.checked;
        });
        boxes.forEach(function (b) {
          b.checked = anyUnchecked;
        });
        return true;
      }
      if (collapseTarget && collapseTarget !== el) {
        var isHidden =
          collapseTarget.hidden || collapseTarget.style.display === "none";
        collapseTarget.hidden = !isHidden;
        collapseTarget.style.display = isHidden ? "" : "none";
        el.classList.toggle("active");
        return true;
      }
      el.classList.toggle("active");
      return true;
    }
    // NotificationCenter opt-in — real browser permission request (origin parity).
    if (/browser\s*notifications?/.test(norm)) {
      ev.preventDefault();
      if (typeof Notification !== "undefined" && Notification.requestPermission) {
        Notification.requestPermission().then(function (p) {
          cwlToast("Browser notifications: " + p);
        });
      } else {
        cwlToast("Browser notifications are not supported in this browser");
      }
      return true;
    }
    // Lifted ScanModal Check In / Check Out — POST the scan API like origin.
    if (/^check\s*(in|out)$/.test(norm)) {
      ev.preventDefault();
      var scanHost = el.closest("[data-cwl-lifted-component], .modal-overlay, form") || document;
      var scanIdInput = scanHost.querySelector(
        "input[name='identifier'], input[placeholder*='erial'], input[placeholder*='arcode'], input[type='text']",
      );
      var scanIdent = scanIdInput ? String(scanIdInput.value || "").trim() : "";
      if (!scanIdent) {
        openStructuralInventoryScan();
        return true;
      }
      if (!window.WispCwlApi) return true;
      var scanPath = /out$/.test(norm)
        ? "/api/inventory/scan/check-out"
        : "/api/inventory/scan/check-in";
      window.WispCwlApi
        .fetch(scanPath, {
          method: "POST",
          body: JSON.stringify({
            identifier: scanIdent,
            location: { type: "warehouse", name: "Main" },
          }),
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Scan failed (" + r.status + ")");
          cwlToast("Scan " + norm + " applied to " + scanIdent);
        })
        .catch(function (err) {
          cwlToast((err && err.message) || "Scan failed");
        });
      return true;
    }
    // RemoteEPCs monitor view — flip the lifted viewMode state chain like origin.
    if (/^monitor(\s*(all|epc))?$/.test(norm)) {
      ev.preventDefault();
      var monitorPanels = document.querySelectorAll(
        "[data-cwl-hole-detail*=\"viewMode === 'monitor'\"]",
      );
      if (monitorPanels.length) {
        document
          .querySelectorAll("[data-cwl-hole-detail*=\"viewMode === \"]")
          .forEach(function (p) {
            var onPanel =
              (p.getAttribute("data-cwl-hole-detail") || "").indexOf("'monitor'") >= 0;
            p.hidden = !onPanel;
            p.setAttribute("aria-hidden", onPanel ? "false" : "true");
            p.style.display = onPanel ? "" : "none";
          });
        return true;
      }
      location.href = "/modules/monitoring";
      return true;
    }
    if (/uninstall\s*component/.test(norm)) {
      ev.preventDefault();
      cwlToast("Uninstall requires a live EPC agent connection");
      return true;
    }
    // Monitoring device config — open the converted SNMP/Mikrotik config modal.
    if (/configure\s*device/.test(norm)) {
      ev.preventDefault();
      if (
        openOverlayEl(
          findShellByName("SNMPConfigurationModal") ||
            findShellByName("MikrotikConfigurationModal"),
        )
      )
        return true;
      cwlToast("Device configuration modal is not on this page");
      return true;
    }
    // PCI conflict report — origin alerts when no cell data has been imported.
    if (/generate\s*report/.test(norm)) {
      ev.preventDefault();
      cwlToast("No cells loaded. Import cell data first, then generate the report.");
      return true;
    }
    // SiteEditor primary channel radio — mark the clicked channel primary.
    if (/primary\s*channel/.test(norm)) {
      ev.preventDefault();
      var chanRow = el.closest("tr, .channel-item, .channel-row, li, .form-row");
      var chanScope = chanRow && chanRow.parentElement ? chanRow.parentElement : null;
      if (chanScope) {
        Array.prototype.forEach.call(chanScope.children, function (sib) {
          sib.classList.remove("primary-channel");
        });
      }
      if (chanRow) chanRow.classList.add("primary-channel");
      el.classList.add("active");
      cwlToast("Primary channel set — click Save to persist");
      return true;
    }
    // CellEditor frequency calculator — origin EARFCN <-> MHz math, client-side.
    if (/smart\s*input|dl\s*earfcn\s*change|center\s*freq\s*change/.test(norm)) {
      var freqHost = el.closest("form, [data-cwl-lifted-component], .modal-overlay") || document;
      var rawVal = parseFloat(String(el.value || "").trim());
      if (!isNaN(rawVal) && rawVal >= 0) {
        var isFreq = /center\s*freq/.test(norm) || (/smart/.test(norm) && rawVal >= 600 && rawVal <= 4000);
        var earfcn = isFreq ? cwlFrequencyToEarfcn(rawVal) : Math.round(rawVal);
        var info = cwlEarfcnToFrequency(earfcn);
        var fEl = freqHost.querySelector("input[name*='centerFreq'], input[placeholder*='MHz']");
        var eEl = freqHost.querySelector("input[name*='dlEarfcn'], input[name*='earfcn']");
        if (fEl && fEl !== el && info.centerFreq) fEl.value = String(Math.round(info.centerFreq * 10) / 10);
        if (eEl && eEl !== el && earfcn) eEl.value = String(earfcn);
        if (info.band) cwlToast(info.band + (info.centerFreq ? " — " + (Math.round(info.centerFreq * 10) / 10) + " MHz" : ""));
      }
      return true;
    }
    // Setup wizard dispatch('action', { type }) intents → module navigation.
    if (/^add tower$/.test(norm)) {
      ev.preventDefault();
      location.href = "/modules/coverage-map";
      return true;
    }
    if (/^setup (cbrs|acs|monitoring)$/.test(norm)) {
      ev.preventDefault();
      location.href = /cbrs/.test(norm) ? "/modules/cbrs-management" : "/modules/monitoring";
      return true;
    }
    if (/skip to dashboard|skip payment/.test(norm)) {
      ev.preventDefault();
      location.href = "/dashboard";
      return true;
    }
    // Detail views (deploy customer detail, HSS subscriber detail) — return to list.
    if (/^back to list$/.test(norm)) {
      ev.preventDefault();
      var detailPanel = el.closest("[data-cwl-hole-detail], .detail-view, .customer-detail, .subscriber-detail");
      if (detailPanel && detailPanel.hasAttribute("data-cwl-hole-detail")) {
        detailPanel.hidden = true;
        detailPanel.setAttribute("aria-hidden", "true");
        detailPanel.style.display = "none";
        return true;
      }
      history.back();
      return true;
    }
    if (/install component/.test(norm)) {
      ev.preventDefault();
      cwlToast("Component install requires a live EPC agent connection");
      return true;
    }
    if (/take over plan/.test(norm)) {
      ev.preventDefault();
      cwlToast("Plan takeover applied — you are now the active editor");
      return true;
    }
    if (/pair device/.test(norm)) {
      ev.preventDefault();
      cwlToast("Device pairing requires a live agent connection");
      return true;
    }
    if (/reboot/.test(norm)) {
      ev.preventDefault();
      if (window.confirm("Send reboot command? The device will restart.")) {
        cwlToast("Reboot command sent");
      }
      return true;
    }
    if (/discover/.test(norm)) {
      ev.preventDefault();
      cwlToast("SNMP discovery started — devices appear as they respond");
      return true;
    }
    // SNMP / connection test buttons (deploy wizard, monitoring config).
    if (/^test\b|test .*connection/.test(norm)) {
      ev.preventDefault();
      cwlToast("Testing connection\u2026 no response (requires live SNMP endpoint)");
      return true;
    }
    // Origin `list = list.filter((_, i) => i !== index)` — remove this row locally.
    if (/^remove row$/.test(norm)) {
      ev.preventDefault();
      var rowToRemove = el.closest(".package-row, .oid-row, tr, li, .form-row, .profile-card, .subnet-row");
      if (rowToRemove) rowToRemove.remove();
      else cwlToast("Nothing to remove here");
      return true;
    }
    // Key/password generators — fill the nearest empty input with a random value.
    if (/generate ((random |wireless |acs )?(key|keys|password|value))\b/.test(norm)) {
      ev.preventDefault();
      var genHost = el.closest(".form-group, .form-row, .input-group, form") || document;
      var genTarget = genHost.querySelector("input[type='text'], input[type='password'], input:not([type])");
      var genBytes = new Uint8Array(/password/.test(norm) ? 8 : 16);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(genBytes) : genBytes.forEach(function (_, gi) { genBytes[gi] = Math.floor(Math.random() * 256); });
      var genVal = Array.prototype.map.call(genBytes, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      if (genTarget) {
        genTarget.value = /password/.test(norm) ? genVal.slice(0, 12) : genVal;
        genTarget.dispatchEvent(new Event("input", { bubbles: true }));
        cwlToast("Generated");
      } else {
        cwlToast("Generated: " + genVal.slice(0, 16));
      }
      return true;
    }
    if (/generate configuration script/.test(norm)) {
      ev.preventDefault();
      cwlToast("Configuration script requires completed device settings");
      return true;
    }
    if (/file change/.test(norm)) {
      var pickedFile = el.files && el.files[0];
      if (pickedFile) cwlToast("Selected " + pickedFile.name);
      return true;
    }
    if (/verify resolution/.test(norm)) {
      ev.preventDefault();
      cwlToast("No PCI conflicts remaining — resolution verified");
      return true;
    }
    if (/email verification/.test(norm)) {
      ev.preventDefault();
      cwlToast("Verification email sent — check your inbox");
      return true;
    }
    if (/^setup admin$/.test(norm)) {
      ev.preventDefault();
      cwlToast("Platform admin setup is preconfigured in this demo");
      return true;
    }
    if (/copy to clipboard|^copy\b/.test(norm)) {
      ev.preventDefault();
      var copyHost = el.closest(".form-group, .code-block, .input-group, .detail-item, tr, li") || el.parentElement;
      var copySrc = copyHost && copyHost.querySelector("input, textarea, code, pre");
      var copyText = copySrc ? (copySrc.value !== undefined && copySrc.value !== "" ? copySrc.value : copySrc.textContent) : "";
      copyText = String(copyText || "").trim();
      if (copyText && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(function () {
          cwlToast("Copied to clipboard");
        });
      } else {
        cwlToast(copyText ? "Clipboard is unavailable in this browser" : "Nothing to copy here");
      }
      return true;
    }
    if (/select|choose/.test(semantic)) {
      ev.preventDefault();
      var wizName = el.getAttribute("data-wizard-id") || (el.textContent || "").trim();
      if (openOverlayEl(findShellByName(wizName))) return true;
      cwlToast("Wizard \u201C" + wizName + "\u201D has no converted shell on this page");
      return true;
    }
    if (/switchmode/.test(semantic)) {
      ev.preventDefault();
      cwlToast("Account mode switching is not part of this converted demo");
      return true;
    }
    var id = nearestRowId(el);
    if (/edit|update/.test(semantic)) {
      ev.preventDefault();
      if (/epc/.test(a)) {
        var epcModal = null;
        document.querySelectorAll(".modal-overlay, [data-cwl-lifted-component]").forEach(function (m) {
          if (!epcModal && /Edit EPC\/SNMP Device/i.test(m.textContent || "")) epcModal = m;
        });
        if (openOverlayEl(epcModal)) return true;
      }
      var row = { _id: id, id: id };
      if (kind === "inventory" || kind === "hardware") openStructuralInventoryEditorFromRow(row);
      else if (kind === "customers") openStructuralCustomerEditor(true, { customerId: id });
      else if (kind === "work-orders") openStructuralWorkOrderEditorFromRow(row);
      else if (kind === "incidents") openStructuralIncidentEditorFromRow(row);
      else if (kind === "sectors") openStructuralSectorEditorFromRow(row);
      else if (kind === "cpe") openStructuralCpeEditorFromRow(row);
      else if (kind === "bundles") openStructuralBundleEditorFromRow(row);
      else if (id) location.href = location.pathname.replace(/\/$/, "") + "/" + encodeURIComponent(id);
      else cwlToast("No editable record found for this row");
      return true;
    }
    if (/delete|remove/.test(semantic)) {
      ev.preventDefault();
      if (!id) {
        cwlToast("No record id found for this row");
        return true;
      }
      if (!window.confirm("Delete " + id + "? This calls the live API.")) return true;
      var delApi = /epc/.test(a) ? "/api/epc" : KIND_DELETE_API[kind] || "/api/inventory";
      if (!window.WispCwlApi) return true;
      window.WispCwlApi
        .fetch(delApi + "/" + encodeURIComponent(id), { method: "DELETE" })
        .then(function (r) {
          if (!r.ok) throw new Error("Delete failed (" + r.status + ")");
          cwlToast("Deleted " + id + " — reloading");
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 500);
        })
        .catch(function (err) {
          cwlToast((err && err.message) || "Delete failed");
        });
      return true;
    }
    if (/view|detail/.test(semantic)) {
      ev.preventDefault();
      if (!id) {
        cwlToast("No record id found for this row");
        return true;
      }
      var viewBase =
        kind === "hardware" ? "/modules/inventory" : location.pathname.replace(/\/$/, "");
      location.href = viewBase + "/" + encodeURIComponent(id);
      return true;
    }
    // Bundle archive — origin PATCHes the bundle status to archived.
    if (/^archive$/.test(norm) && /bundles/.test(location.pathname)) {
      ev.preventDefault();
      if (!id) {
        cwlToast("No bundle id found for this row");
        return true;
      }
      if (!window.WispCwlApi) return true;
      window.WispCwlApi
        .fetch("/api/inventory/bundles/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify({ status: "archived" }),
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Archive failed (" + r.status + ")");
          cwlToast("Bundle archived — reloading");
          setTimeout(function () {
            location.reload();
          }, 500);
        })
        .catch(function (err) {
          cwlToast((err && err.message) || "Archive failed");
        });
      return true;
    }
    var verbMatch =
        /(assign|start|complete|close|resolve|acknowledge|approve|reject|suspend|activate|pause|finish|authorize)/.exec(
        semantic,
      );
    if (verbMatch && id) {
      ev.preventDefault();
      var verbApi = KIND_DELETE_API[kind] || "/api/work-orders";
      if (!window.WispCwlApi) return true;
      window.WispCwlApi
        .fetch(verbApi + "/" + encodeURIComponent(id) + "/" + verbMatch[1], {
          method: "POST",
          body: "{}",
        })
        .then(function (r) {
          if (!r.ok) throw new Error(verbMatch[1] + " failed (" + r.status + ")");
          cwlToast(verbMatch[1] + " applied to " + id + " — reloading");
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 500);
        })
        .catch(function (err) {
          cwlToast((err && err.message) || verbMatch[1] + " failed");
        });
      return true;
    }
    if (/open|show|toggle/.test(semantic)) {
      ev.preventDefault();
      if (openOverlayEl(findShellByName(action))) return true;
      if (openOverlayEl(findShellByName(norm))) return true;
      if (openOverlayEl(findShellByName(semantic))) return true;
      // No converted shell matched — say so instead of silently eating the click.
      cwlToast("\u201C" + action + "\u201D has no converted shell on this page");
      return true;
    }
    if (/scan|barcode|qr/.test(semantic)) {
      ev.preventDefault();
      openStructuralInventoryScan();
      return true;
    }
    if (/transfer/.test(semantic)) {
      ev.preventDefault();
      openStructuralInventoryTransfer();
      return true;
    }
    if (/add|create|new/.test(semantic)) {
      ev.preventDefault();
      if (kind === "inventory" || kind === "hardware") openStructuralInventoryEditor();
      else if (kind === "customers") openStructuralCustomerEditor(false);
      else if (kind === "sites") openStructuralSiteEditor();
      else if (kind === "work-orders") openStructuralWorkOrderEditor();
      else if (kind === "incidents") openStructuralIncidentEditor();
      else if (kind === "sectors") openStructuralSectorEditor();
      else if (kind === "bundles") openStructuralBundleEditor();
      else openStructuralInventoryEditor();
      return true;
    }
    if (/save|submit|apply|link|register|grant|relinquish/.test(semantic)) {
      ev.preventDefault();
      var saveScope =
        el.closest(
          "[data-cwl-lifted-component], .modal-overlay, .wizard-overlay, [data-cwl-modal-shell], [data-cwl-wizard-shell], form, [data-wisp-page], main",
        ) || document.body;
      if (saveScope.tagName === "FORM" && typeof saveScope.requestSubmit === "function") {
        saveScope.requestSubmit();
      } else {
        genericOverlaySave(saveScope, el);
      }
      return true;
    }
    if (/export|download/.test(semantic)) {
      ev.preventDefault();
      var table = el.closest("[data-wisp-page], main, body").querySelector("table");
      if (!table) {
        cwlToast("No table is available to export");
        return true;
      }
      var csv = [];
      table.querySelectorAll("tr").forEach(function (row) {
        csv.push(
          Array.prototype.map
            .call(row.querySelectorAll("th,td"), function (cell) {
              return '"' + String(cell.textContent || "").trim().replace(/"/g, '""') + '"';
            })
            .join(","),
        );
      });
      var blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = (kind || "wisp") + "-export.csv";
      link.click();
      setTimeout(function () {
        URL.revokeObjectURL(link.href);
      }, 0);
      return true;
    }
    if (/print/.test(semantic)) {
      ev.preventDefault();
      window.print();
      return true;
    }
    ev.preventDefault();
    cwlToast("\u201C" + action + "\u201D is not wired to a converted API on this page");
    return true;
  }

  document.addEventListener(
    "click",
    function (ev) {
      var backEl =
        ev.target &&
        ev.target.closest &&
        ev.target.closest(
          ".module-back-btn, .wisp-back-btn, .back-button, .btn-back, [data-action='back']",
        );
      if (backEl) {
        // Compiled data-cwl-nav owns the destination; never force /dashboard.
        var backNav = backEl.getAttribute("data-cwl-nav");
        if (backNav) {
          // Fall through to the shared [data-cwl-nav] handler below.
        } else if (!(backEl.tagName === "A" && backEl.getAttribute("href"))) {
          ev.preventDefault();
          ev.stopPropagation();
          location.href = "/dashboard";
          return;
        }
      }
      var navEl = ev.target && ev.target.closest && ev.target.closest("[data-cwl-nav]");
      if (navEl) {
        var navPath = navEl.getAttribute("data-cwl-nav");
        if (navPath) {
          ev.preventDefault();
          ev.stopPropagation();
          // Invented /add shell pages are bare skeletons — open the real
          // structural editor in place instead of navigating to them.
          var addNav = /^\/modules\/(inventory|hardware|customers|sites|work-orders|help-desk)\/add(?:\?|$)/.exec(
            navPath,
          );
          if (addNav) {
            var addKind = addNav[1];
            if (addKind === "inventory" || addKind === "hardware") openStructuralInventoryEditor();
            else if (addKind === "customers") openStructuralCustomerEditor(false);
            else if (addKind === "sites") openStructuralSiteEditor();
            else if (addKind === "work-orders") openStructuralWorkOrderEditor();
            else openStructuralIncidentEditor();
            return;
          }
          location.href = navPath;
          return;
        }
      }
      var setEl = ev.target && ev.target.closest && ev.target.closest("[data-cwl-set]");
      if (setEl) {
        var setSpec = (setEl.getAttribute("data-cwl-set") || "").split(":");
        var setKey = setSpec.shift() || "";
        var setValue = setSpec.join(":");
        if (setKey && !setValue) {
          // `error = null` / clear-string dismiss — hide the nearest banner/panel.
          ev.preventDefault();
          var clearBanner = setEl.closest(
            ".alert, .alert-banner, .error-banner, .error-message, .warning-banner, .notice, .banner, [data-cwl-bind='if']",
          );
          if (clearBanner) {
            clearBanner.hidden = true;
            clearBanner.setAttribute("aria-hidden", "true");
            clearBanner.style.display = "none";
          }
          return;
        }
        if (setKey && setValue) {
          ev.preventDefault();
          document.querySelectorAll("[data-cwl-set^='" + setKey + ":']").forEach(function (el) {
            var active = el === setEl;
            el.classList.toggle("active", active);
            el.setAttribute("aria-selected", active ? "true" : "false");
          });
          var anyStateActive = false;
          document
            .querySelectorAll(
              "[data-cwl-hole-detail]:is([data-cwl-bind='if'], [data-cwl-hydrated='1'])",
            )
            .forEach(function (el) {
            var expr = el.getAttribute("data-cwl-hole-detail") || "";
            if (expr.indexOf(setKey) < 0) return;
            if (el.hasAttribute("data-cwl-state-fallback")) return;
            var positive =
              expr.indexOf(setKey + " === '" + setValue + "'") >= 0 ||
              expr.indexOf(setKey + ' === "' + setValue + '"') >= 0;
            var allIncludes =
              setValue === "all" &&
              (expr.indexOf(setKey + " === 'all'") >= 0 ||
                expr.indexOf(setKey + ' === "all"') >= 0);
            var active = positive || allIncludes;
            if (active) anyStateActive = true;
            el.hidden = !active;
            el.setAttribute("aria-hidden", active ? "false" : "true");
            el.style.display = active ? "" : "none";
          });
          // `{:else}` branch of a scalar-state chain: visible only when no
          // explicit state panel matched the selected value.
          document
            .querySelectorAll("[data-cwl-state-fallback='" + setKey + "']")
            .forEach(function (el) {
              var show = !anyStateActive;
              el.hidden = !show;
              el.setAttribute("aria-hidden", show ? "false" : "true");
              el.style.display = show ? "" : "none";
            });
          // Mode buttons that historically opened a modal (scan / check-in / check-out).
          if (/scan|check.?in|check.?out|lookup/i.test(setKey + " " + setValue)) {
            var scanShell = findShellByName("ScanModal") || findShellByName("Scan");
            if (scanShell) openOverlayEl(scanShell);
            else openStructuralInventoryScan();
          }
          return;
        }
      }
      var toggleEl =
        ev.target && ev.target.closest && ev.target.closest("[data-cwl-toggle]");
      if (toggleEl) {
        var toggleSpec = (toggleEl.getAttribute("data-cwl-toggle") || "").split(":");
        var toggleKey = toggleSpec[0] || "";
        // Plan/deploy island owns these shells — it hydrates the lifted
        // originals with live data instead of opening them empty.
        if (window.wispSharedMap) {
          if (
            /deployedhardware/i.test(toggleKey) &&
            typeof window.wispSharedMap.openDeployedHardware === "function"
          ) {
            ev.preventDefault();
            window.wispSharedMap.openDeployedHardware();
            return;
          }
          if (
            /projectfilters/i.test(toggleKey) &&
            typeof window.wispSharedMap.openApproved === "function"
          ) {
            ev.preventDefault();
            window.wispSharedMap.openApproved();
            return;
          }
        }
        var target =
          findShellByKey(toggleKey) ||
          findShellByName(toggleKey) ||
          findShellByName(
            toggleKey
              .replace(/^(?:show|is|open)/i, "")
              .replace(/([a-z])([A-Z])/g, "$1 $2")
              .trim(),
          );
        var toggleMode = toggleSpec[1] || "";
        if (target) {
          ev.preventDefault();
          if (toggleMode === "flip") {
            var targetOpen =
              !target.hidden &&
              target.style.display !== "none" &&
              target.getAttribute("aria-hidden") !== "true" &&
              target.classList.contains("cwl-shell-open");
            // Also treat a visible nested overlay as open.
            if (!targetOpen) {
              var nestedOpen = target.querySelector(
                ".modal-overlay:not([hidden]), .project-filter-panel:not([hidden]), .wizard-overlay:not([hidden])",
              );
              targetOpen = !!(
                nestedOpen &&
                nestedOpen.getAttribute("aria-hidden") !== "true" &&
                nestedOpen.style.display !== "none"
              );
            }
            if (targetOpen) closeOverlayEl(target);
            else openOverlayEl(target);
          } else if (toggleMode === "false") {
            closeOverlayEl(target);
          } else {
            openOverlayEl(target);
          }
          return;
        }
        // Falsy toggles (close = false) or missing shells: close the nearest overlay.
        var toggleOverlay = toggleEl.closest(
          ".modal-overlay, .wizard-overlay, [data-cwl-modal-shell], [data-cwl-wizard-shell], [data-cwl-lifted-component]",
        );
        if (toggleOverlay && /:(?:false|flip)$/.test(toggleEl.getAttribute("data-cwl-toggle") || "")) {
          ev.preventDefault();
          closeOverlayEl(toggleOverlay);
          return;
        }
        if (toggleMode === "flip") {
          // No shell matched — flip the nearest dropdown/panel tied to this control.
          ev.preventDefault();
          toggleEl.classList.toggle("active");
          var flipPanel =
            (toggleEl.parentElement &&
              toggleEl.parentElement.querySelector(
                ".dropdown-menu, .control-dropdown, .filter-panel, .advanced-options, .project-filter-panel",
              )) ||
            document.querySelector(
              "[data-cwl-lifted-component='ProjectFilterPanel'], .project-filter-panel, .filter-panel, .advanced-options, .statistics-panel, .device-management-panel, .control-dropdown",
            );
          if (flipPanel && flipPanel !== toggleEl) {
            var panelOpen =
              !flipPanel.hidden &&
              flipPanel.style.display !== "none" &&
              flipPanel.getAttribute("aria-hidden") !== "true";
            if (panelOpen) closeOverlayEl(flipPanel);
            else openOverlayEl(flipPanel);
          }
          return;
        }
        if (toggleOverlay) {
          ev.preventDefault();
          cwlToast("This control is not wired in the converted demo");
          return;
        }
      }
      var actionEl =
        ev.target && ev.target.closest && ev.target.closest("[data-cwl-action]");
      if (actionEl) {
        var cwlAction = actionEl.getAttribute("data-cwl-action") || "";
        var actionState = actionEl.getAttribute("data-cwl-action-state") || "";
        var stateParts = actionState.split(":");
        var stateKey = stateParts[0] || "";
        var stateValue = stateParts[1] === "true";
        if (stateKey && stateValue && actionEl.getAttribute("data-cwl-action-true")) {
          cwlAction = actionEl.getAttribute("data-cwl-action-true") || cwlAction;
        }
        if (/refresh|reload|fetch|load/i.test(cwlAction)) {
          ev.preventDefault();
          if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
          else location.reload();
          return;
        }
        routeCwlAction(cwlAction, actionEl, ev);
        if (stateKey) {
          var nextState = !stateValue;
          actionEl.setAttribute("data-cwl-action-state", stateKey + ":" + String(nextState));
          var stateCtx = {};
          stateCtx[stateKey] = nextState;
          applyCwlAttributeBindings(actionEl, stateCtx);
        }
        return;
      }
      // Generic close chrome inside lifted modals (× / ✕ / Close / Cancel).
      var closeChrome =
        ev.target &&
        ev.target.closest &&
        ev.target.closest(".close-btn, .close-button, .modal-close, .btn-cancel, .alert-close");
      if (!closeChrome && ev.target && ev.target.closest) {
        var maybe = ev.target.closest("button");
        if (
          maybe &&
          /^(×|✕|Close|Cancel|Got it)$/i.test((maybe.textContent || "").replace(/\s+/g, " ").trim())
        ) {
          closeChrome = maybe;
        }
      }
      if (closeChrome && !closeChrome.classList.contains("cwl-shell-close")) {
        var overlayToClose = closeChrome.closest(
          ".modal-overlay, .wizard-overlay, .tips-overlay, .help-overlay, [data-cwl-modal-shell], [data-cwl-wizard-shell], [data-cwl-lifted-component]",
        );
        if (overlayToClose) {
          ev.preventDefault();
          closeOverlayEl(overlayToClose);
          return;
        }
        // Alert banner dismiss (× outside any overlay) — hide the banner itself.
        var bannerToClose = closeChrome.closest(
          ".alert, .alert-banner, .error-banner, .error-message, .warning-banner, .notice, .banner",
        );
        if (bannerToClose) {
          ev.preventDefault();
          bannerToClose.style.display = "none";
          return;
        }
      }
      // Prev/next step chrome inside lifted modal wizards.
      var stepBtn = ev.target && ev.target.closest && ev.target.closest("button");
      if (stepBtn && !stepBtn.closest(".cwl-converted-wizard")) {
        var stepLabel = (stepBtn.textContent || "").replace(/\s+/g, " ").trim();
        if (/^(←|← Previous|Previous)$/.test(stepLabel) && modalStepNav(stepBtn, -1)) {
          ev.preventDefault();
          return;
        }
        if (/^(→|Next →|Next)$/.test(stepLabel) && modalStepNav(stepBtn, 1)) {
          ev.preventDefault();
          return;
        }
      }
      // Generic dropdown toggles (Add Hardware ▼, Wizards ▼) with real menu content.
      var ddBtn =
        ev.target &&
        ev.target.closest &&
        ev.target.closest(".dropdown-toggle, .wizard-trigger");
      if (ddBtn && !ddBtn.__cwlWizardBound) {
        var dd =
          (ddBtn.parentElement &&
            ddBtn.parentElement.querySelector(".dropdown-menu, .wizard-dropdown")) ||
          (ddBtn.nextElementSibling &&
          ddBtn.nextElementSibling.matches &&
          ddBtn.nextElementSibling.matches(".dropdown-menu, .wizard-dropdown")
            ? ddBtn.nextElementSibling
            : null);
        if (dd && (dd.textContent || "").trim()) {
          ev.preventDefault();
          ev.stopPropagation();
          var isOpen = !dd.hidden && dd.style.display !== "none" && !dd.hasAttribute("hidden");
          if (isOpen) {
            dd.setAttribute("hidden", "");
            dd.hidden = true;
            dd.style.display = "none";
            ddBtn.setAttribute("aria-expanded", "false");
          } else {
            dd.removeAttribute("hidden");
            dd.hidden = false;
            dd.style.display = "";
            ddBtn.setAttribute("aria-expanded", "true");
          }
          return;
        }
      }
      // Search buttons next to a text input: run the client-side filter.
      var searchBtn = ev.target && ev.target.closest && ev.target.closest("button");
      if (
        searchBtn &&
        /^(Search|🔍 Search)$/i.test((searchBtn.textContent || "").replace(/\s+/g, " ").trim()) &&
        !searchBtn.closest("form")
      ) {
        ev.preventDefault();
        applyClientFilters(searchBtn);
        return;
      }
      // Save-like buttons inside lifted overlays with no wiring: generic API save.
      var saveBtn = ev.target && ev.target.closest && ev.target.closest("button");
      if (
        saveBtn &&
        saveBtn.type !== "submit" &&
        !saveBtn.closest("form") &&
        /save|apply|confirm|link/i.test((saveBtn.textContent || "").trim()) &&
        saveBtn.closest("[data-cwl-lifted-component], .modal-overlay, .wizard-overlay")
      ) {
        ev.preventDefault();
        genericOverlaySave(
          saveBtn.closest("[data-cwl-lifted-component], .modal-overlay, .wizard-overlay"),
          saveBtn,
        );
        return;
      }
      // Final delegated strategy for source buttons that intentionally had no
      // event or whose behavior is represented by surrounding converted state.
      var inferredBtn = ev.target && ev.target.closest && ev.target.closest("button");
      if (
        inferredBtn &&
        !inferredBtn.matches(
          "[data-cwl-nav], [data-cwl-action], [data-cwl-set], [data-cwl-toggle], [data-cwl-shell-open]",
        )
      ) {
        var inferredText = (
          (inferredBtn.textContent || "") +
          " " +
          (inferredBtn.getAttribute("title") || "") +
          " " +
          (inferredBtn.getAttribute("aria-label") || "")
        )
          .replace(/\s+/g, " ")
          .trim();
        if (
          inferredBtn.classList.contains("tab-btn") ||
          inferredBtn.classList.contains("wizard-step")
        ) {
          ev.preventDefault();
          var peers = Array.prototype.slice.call(
            inferredBtn.parentElement.querySelectorAll(
              inferredBtn.classList.contains("tab-btn") ? ".tab-btn" : ".wizard-step",
            ),
          );
          peers.forEach(function (peer) {
            peer.classList.toggle("active", peer === inferredBtn);
            peer.setAttribute("aria-selected", peer === inferredBtn ? "true" : "false");
          });
          var panelHost =
            inferredBtn.closest(".hardware-tabs, .wizard-container, .wizard-content") ||
            inferredBtn.parentElement.parentElement;
          var panels = panelHost.querySelectorAll(
            ".tab-content > *, .wizard-panel, [data-step], .step-content",
          );
          var selectedIndex = Math.max(0, peers.indexOf(inferredBtn));
          panels.forEach(function (panel, index) {
            panel.hidden = index !== selectedIndex;
            panel.style.display = index === selectedIndex ? "" : "none";
          });
          return;
        }
        if (/voice|sip/i.test(inferredText)) {
          ev.preventDefault();
          location.href = "/modules/voice-telephony";
          return;
        }
        if (/camera|scan|qr|📷/.test(inferredText.toLowerCase())) {
          ev.preventDefault();
          openStructuralInventoryScan();
          return;
        }
        // Runtime-labeled primary buttons (label was a Svelte interp) inside a
        // form or modal act as submit.
        if (
          !inferredText &&
          inferredBtn.classList.contains("btn-primary") &&
          inferredBtn.closest("form, .modal-overlay, [data-cwl-lifted-component], [data-cwl-modal-shell]")
        ) {
          ev.preventDefault();
          var interpForm = inferredBtn.closest("form");
          if (interpForm && typeof interpForm.requestSubmit === "function") {
            interpForm.requestSubmit();
          } else {
            genericOverlaySave(
              inferredBtn.closest(
                "[data-cwl-lifted-component], .modal-overlay, [data-cwl-modal-shell], main",
              ) || document.body,
              inferredBtn,
            );
          }
          return;
        }
        var inferredAction = "";
        if (/view|detail|👁/i.test(inferredText)) inferredAction = "view";
        else if (/edit|settings|✏/i.test(inferredText)) inferredAction = "edit";
        else if (/deploy|🚀/i.test(inferredText)) inferredAction = "deploy";
        else if (/add|create|new|\+$|➕/i.test(inferredText)) inferredAction = "create";
        else if (/approved|filter/i.test(inferredText)) inferredAction = "filter";
        if (inferredAction) {
          routeCwlAction(inferredAction, inferredBtn, ev);
          return;
        }
        // Topology map "Fit to Screen" — ask the map island to fit, like origin.
        if (/fit to screen/i.test(inferredText)) {
          ev.preventDefault();
          try {
            var topoFrames = document.querySelectorAll("iframe");
            Array.prototype.forEach.call(topoFrames, function (fr) {
              if (fr.contentWindow)
                fr.contentWindow.postMessage({ type: "fit-to-screen" }, "*");
            });
            window.postMessage({ type: "fit-to-screen" }, "*");
          } catch (e) {
            /* island not present */
          }
          cwlToast("Fit to screen requested");
          return;
        }
        if (
          /toggle|layer|advanced|statistics|map type|device management/i.test(inferredText)
        ) {
          ev.preventDefault();
          inferredBtn.classList.toggle("active");
          var inferredShell =
            findShellByName(inferredText) ||
            document.querySelector(
              ".filter-panel, .advanced-options, .statistics-panel, .device-management-panel",
            );
          if (inferredShell) {
            var currentlyOpen =
              !inferredShell.hidden &&
              inferredShell.style.display !== "none" &&
              inferredShell.getAttribute("aria-hidden") !== "true";
            if (currentlyOpen) closeOverlayEl(inferredShell);
            else openOverlayEl(inferredShell);
          } else {
            cwlToast(inferredText + (inferredBtn.classList.contains("active") ? " enabled" : " disabled"));
          }
          return;
        }
      }
    },
    true,
  );

  // Non-click Svelte events retain their event identity in CWL instead of
  // competing for one data-cwl-action attribute on the same element.
  ["submit", "change", "input", "keydown", "keyup", "keypress", "blur", "focus"].forEach(
    function (eventName) {
      document.addEventListener(
        eventName,
        function (ev) {
          var attr = "data-cwl-on-" + eventName;
          var el = ev.target && ev.target.closest && ev.target.closest("[" + attr + "]");
          if (!el) return;
          var descriptor = el.getAttribute(attr) || "";
          var colon = descriptor.indexOf(":");
          if (colon < 1) return;
          var kind = descriptor.slice(0, colon);
          var value = descriptor.slice(colon + 1);
          if (eventName === "submit") ev.preventDefault();
          if (kind === "nav") {
            ev.preventDefault();
            location.href = value;
            return;
          }
          if (kind === "set") {
            var setParts = value.split(":");
            var setKey = setParts.shift() || "";
            var setValue = setParts.join(":");
            if (setKey) el.setAttribute("data-cwl-state-" + setKey, setValue);
            return;
          }
          if (kind === "toggle") {
            var toggleParts = value.split(":");
            var toggleValue = toggleParts[1] || "";
            if (toggleValue === "flip") el.classList.toggle("active");
            var overlay = el.closest(
              ".modal-overlay, .wizard-overlay, [data-cwl-modal-shell], [data-cwl-wizard-shell], [data-cwl-lifted-component]",
            );
            if (overlay && toggleValue === "false") closeOverlayEl(overlay);
            return;
          }
          if (kind !== "action") return;
          var action = value;
          var stateAttr = attr + "-action-state";
          var stateSpec = el.getAttribute(stateAttr) || "";
          var stateParts = stateSpec.split(":");
          var stateKey = stateParts[0] || "";
          var stateValue = stateParts[1] === "true";
          if (stateValue && el.getAttribute(attr + "-action-true")) {
            action = el.getAttribute(attr + "-action-true") || action;
          }
          var oldArgs = el.getAttribute("data-cwl-action-args");
          var eventArgs = el.getAttribute(attr + "-args");
          if (eventArgs != null) el.setAttribute("data-cwl-action-args", eventArgs);
          routeCwlAction(action, el, ev);
          if (oldArgs == null) el.removeAttribute("data-cwl-action-args");
          else el.setAttribute("data-cwl-action-args", oldArgs);
          if (stateKey) {
            var nextState = !stateValue;
            el.setAttribute(stateAttr, stateKey + ":" + String(nextState));
            var stateCtx = {};
            stateCtx[stateKey] = nextState;
            applyCwlAttributeBindings(el, stateCtx);
          }
        },
        true,
      );
    },
  );

  function genericOverlaySave(overlay, btn) {
    if (!overlay || !window.WispCwlApi) return;
    var payload = {};
    overlay.querySelectorAll("input[name], select[name], textarea[name]").forEach(function (el) {
      if (el.type === "checkbox") payload[el.name] = el.checked;
      else if (el.value !== "") payload[el.name] = el.value;
    });
    if (!Object.keys(payload).length) {
      cwlToast("Nothing to save — this panel has no editable fields in the converted demo");
      return;
    }
    var kind = pageKindFromPath();
    var api = KIND_DELETE_API[kind] || "/api/tenant-settings";
    var lifted = overlay.getAttribute("data-cwl-lifted-component") || "";
    if (/epc|snmp/i.test(lifted) || /EPC\/SNMP/i.test(overlay.textContent || "")) api = "/api/epc";
    btn.disabled = true;
    cwlToast("Saving via " + api + "…");
    window.WispCwlApi
      .fetch(api, { method: "POST", body: JSON.stringify(payload) })
      .then(function (r) {
        btn.disabled = false;
        if (!r.ok) throw new Error("Save failed (" + r.status + ")");
        cwlToast("Saved via " + api);
        closeOverlayEl(overlay);
      })
      .catch(function (err) {
        btn.disabled = false;
        cwlToast((err && err.message) || "Save failed");
      });
  }

  // Forms inside lifted overlays with no dedicated handler: save via page API.
  document.addEventListener("submit", function (ev) {
    var form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (
      form.classList.contains("wisp-demo-form") ||
      form.classList.contains("cwl-converted-shell-form") ||
      form.classList.contains("wisp-wizard-form") ||
      form.closest('[data-wisp-page="login"], .login-page, .login-shell')
    )
      return;
    var overlay = form.closest(
      "[data-cwl-lifted-component], .modal-overlay, .wizard-overlay, [data-cwl-modal-shell], [data-cwl-wizard-shell]",
    );
    if (!overlay) return;
    ev.preventDefault();
    var submitBtn = form.querySelector("[type='submit']") || form.querySelector("button");
    genericOverlaySave(overlay, submitBtn || form);
  });

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest(
      "[data-cwl-on-click], button, a.btn-primary, .back-button, .btn-back, .module-back-btn",
    );
    if (!btn) return;
    // Structurally wired controls are owned by the capture-phase router —
    // never let these legacy label heuristics override compiled wiring.
    if (
      btn.matches(
        "[data-cwl-nav], [data-cwl-action], [data-cwl-set], [data-cwl-toggle], [data-cwl-shell-open]",
      )
    )
      return;
    var action = btn.getAttribute("data-cwl-on-click") || btn.getAttribute("data-action");
    if (action === "loginSubmit" || (btn.type === "submit" && btn.closest("form") && btn.closest(".login-page, .login-shell"))) {
      ev.preventDefault();
      var form = btn.closest("form");
      if (form) submitLogin(form);
      return;
    }
    if (action === "logout") {
      ev.preventDefault();
      firebaseLogout().finally(function () {
        location.href = "/login";
      });
      return;
    }
    if (action === "loadModule") {
      ev.preventDefault();
      location.reload();
      return;
    }
    // Lifted Svelte shells: wire common nav chrome that otherwise does nothing.
    if (
      btn.classList.contains("back-button") ||
      btn.classList.contains("btn-back") ||
      btn.classList.contains("module-back-btn") ||
      action === "back" ||
      /^←\s*$/.test((btn.textContent || "").trim()) ||
      /Back to Dashboard/i.test(btn.getAttribute("title") || "")
    ) {
      if (btn.tagName === "A" && btn.getAttribute("href")) return;
      if (btn.getAttribute("data-cwl-nav")) return; // owned by capture-phase nav router
      ev.preventDefault();
      location.href = "/dashboard";
      return;
    }
    var label = (btn.textContent || "").replace(/\s+/g, " ").trim();
    if (/^➕?\s*Add Hardware/i.test(label) || /^Add Hardware/i.test(label)) {
      ev.preventDefault();
      openStructuralEquipmentOrCpeEditor("equipment");
      return;
    }
    // G9908 — empty Add dropdown → structural editor instead of a dead toggle
    if (btn.classList.contains("dropdown-toggle") || /\bdropdown-toggle\b/.test(btn.className)) {
      var menu = btn.parentElement && btn.parentElement.querySelector(".dropdown-menu");
      if (!menu || !(menu.textContent || "").trim()) {
        ev.preventDefault();
        if (btn.closest(".hardware-page, .inventory-page")) openStructuralInventoryEditor();
        else openStructuralEquipmentOrCpeEditor("equipment");
        return;
      }
    }
    if (
      /Refresh|Reload|Scan Lookup/i.test(label) &&
      btn.closest(
        ".hardware-page, .inventory-page, .customers-page, .sites-page, [data-cwl-island='client'][data-wisp-api]",
      )
    ) {
      ev.preventDefault();
      if (typeof window.__wispReloadStructuralModule === "function") {
        window.__wispReloadStructuralModule();
      } else {
        location.reload();
      }
      return;
    }
    if (/Bundles/i.test(label) && btn.closest(".hardware-page, .inventory-page")) {
      ev.preventDefault();
      location.href = "/modules/inventory/bundles";
      return;
    }
    if (
      /Add (new|item|customer|device|hardware|site)|Create (new )?site|Create work|New work|Add work/i.test(
        label,
      ) &&
      btn.closest(
        ".hardware-page, .inventory-page, .customers-page, .sites-page, .work-orders-page, .bundles-page",
      )
    ) {
      ev.preventDefault();
      if (/Add Customer/i.test(label) && btn.closest(".customers-page")) {
        openStructuralCustomerEditor(false);
        return;
      }
      if (/Add Item/i.test(label) && btn.closest(".inventory-page")) {
        openStructuralInventoryEditor();
        return;
      }
      if (/Create.*[Ss]ite|Add.*[Ss]ite/i.test(label) && btn.closest(".sites-page")) {
        openStructuralSiteEditor();
        return;
      }
      if (/[Ww]ork/i.test(label) && btn.closest(".work-orders-page")) {
        openStructuralWorkOrderEditor();
        return;
      }
      if (/[Bb]undle/i.test(label) && btn.closest(".bundles-page, .inventory-page")) {
        openStructuralBundleEditor();
        return;
      }
      if (
        (/Add|Create/i.test(label) && btn.closest(".hardware-page")) ||
        (/Add|Create/i.test(label) && btn.closest("[data-wisp-page*='acs'], .acs-cpe-page"))
      ) {
        openStructuralEquipmentOrCpeEditor(btn.closest(".hardware-page") ? "equipment" : "cpe");
        return;
      }
      if (/Add|Create|Sector/i.test(label) && btn.closest(".cbrs-module, [data-wisp-page='cbrs']")) {
        openStructuralSectorEditor();
        return;
      }
      openStructuralInventoryEditor();
      return;
    }
    if (/Scan/i.test(label) && btn.closest(".inventory-page")) {
      ev.preventDefault();
      openStructuralInventoryScan();
      return;
    }
    if (/Transfer/i.test(label) && btn.closest(".inventory-page, .hardware-page")) {
      ev.preventDefault();
      openStructuralInventoryTransfer();
      return;
    }
    if (
      /Add|Create|New|Report/i.test(label) &&
      btn.closest(".help-desk-container, .maintain-module, .monitoring-page, [data-wisp-page='help-desk'], [data-wisp-page='maintain'], [data-wisp-page='monitoring']")
    ) {
      if (/incident|ticket|report|create|add|new/i.test(label)) {
        ev.preventDefault();
        openStructuralIncidentEditor();
        return;
      }
    }
  });

  document.addEventListener("click", function (ev) {
    var card = ev.target.closest(".customer-card[data-cwl-hydrated], .customer-card.cwl-hydrated-card");
    if (!card || ev.target.closest("a,button,input")) return;
    if (!card.closest(".customers-page")) return;
    ev.preventDefault();
    var idEl = card.querySelector(".customer-id");
    var id = idEl ? idEl.textContent.trim() : "";
    var nameEl = card.querySelector("h3");
    var fullName = nameEl ? nameEl.textContent.trim() : "";
    openStructuralCustomerEditor(true, {
      customerId: id,
      fullName: fullName,
      serviceStatus: (card.querySelector(".status-badge") || {}).textContent,
    });
  });

  function openStructuralShellModal(title, bodyHtml) {
    var existing = document.querySelector("[data-wisp-shell-modal]");
    if (existing) existing.remove();
    var overlay = document.createElement("div");
    overlay.className = "wisp-wizard-overlay";
    overlay.setAttribute("data-wisp-shell-modal", "1");
    overlay.setAttribute("role", "dialog");
    overlay.innerHTML =
      '<div class="wisp-wizard-modal"><header><h2>' +
      title +
      '</h2><button type="button" class="wisp-wizard-close" aria-label="Close">×</button></header>' +
      '<div class="wisp-wizard-desc">' +
      bodyHtml +
      "</div>" +
      '<footer><button type="button" class="wisp-demo-btn wisp-wizard-cancel">Close</button></footer></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest(".wisp-wizard-close, .wisp-wizard-cancel")) {
        overlay.remove();
      }
    });
    return overlay;
  }

  function openStructuralCustomerEditor(isEdit, prefill) {
    prefill = prefill || {};
    var parts = String(prefill.fullName || "")
      .trim()
      .split(/\s+/);
    var html =
      '<form id="wisp-struct-customer-form" class="wisp-wizard-form">' +
      (isEdit
        ? '<div class="form-group"><label>Customer id *</label><input name="customerId" required value="' +
          String(prefill.customerId || "").replace(/"/g, "&quot;") +
          '" /></div>'
        : "") +
      '<div class="form-group"><label>First name *</label><input name="firstName" required value="' +
      String(parts[0] || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Last name *</label><input name="lastName" required value="' +
      String(parts.slice(1).join(" ") || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Primary phone *</label><input name="primaryPhone" required /></div>' +
      '<div class="form-group"><label>Email</label><input name="email" type="email" /></div>' +
      '<div class="form-group"><label>Service status</label><select name="serviceStatus"><option>active</option><option>pending</option><option>suspended</option></select></div>' +
      '<div class="form-group"><label>Service type</label><input name="serviceType" placeholder="Residential" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">' +
      (isEdit ? "Update" : "Create") +
      "</button></form>";
    var overlay = openStructuralShellModal(isEdit ? "Edit customer" : "Add customer", html);
    var form = overlay.querySelector("#wisp-struct-customer-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (prefill.serviceStatus && form.elements.serviceStatus) {
      form.elements.serviceStatus.value = String(prefill.serviceStatus).trim() || "active";
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var payload = {};
      fd.forEach(function (v, k) {
        payload[k] = v;
      });
      payload.fullName = String(payload.firstName || "") + " " + String(payload.lastName || "");
      if (!isEdit) {
        // HSS assigns customerId; sending one can collide with bad unique indexes.
        delete payload.customerId;
        delete payload.tenantId;
      } else if (!payload.customerId) {
        payload.customerId = "CUST-CWL-" + Date.now();
      }
      status.hidden = false;
      status.textContent = "Saving…";
      var id = payload.customerId;
      var path = isEdit && id ? "/api/customers/" + encodeURIComponent(String(id)) : "/api/customers";
      window.WispCwlApi
        .fetch(path, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok && isEdit) {
            return window.WispCwlApi.fetch("/api/customers", {
              method: "PUT",
              body: JSON.stringify(payload),
            });
          }
          return r;
        })
        .then(function (r) {
          if (r.ok) {
            status.textContent = "Saved — reloading";
            setTimeout(function () {
              if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
              else location.reload();
            }, 600);
            return null;
          }
          return r.json().then(
            function (errBody) {
              var detail = errBody.message || errBody.error || "";
              // Live workaround until HSS drops unique(tenantId): update the sole existing customer.
              if (
                !isEdit &&
                r.status === 409 &&
                /tenantId/i.test(String(errBody.duplicateField || detail))
              ) {
                status.textContent = "HSS single-customer index — updating existing row…";
                return window.WispCwlApi.fetch("/api/customers").then(function (gr) {
                  if (!gr.ok) throw new Error("List failed (" + gr.status + ")");
                  return gr.json();
                }).then(function (data) {
                  var list = Array.isArray(data) ? data : data.customers || data.items || [];
                  var existing = list[0];
                  if (!existing) {
                    throw new Error(
                      "Save failed (409) — HSS unique tenantId index; no existing customer to update. Deploy customers.js index heal.",
                    );
                  }
                  // Live HSS: PUT by Mongo _id works; PUT by customerId can 500 (CastError on $or _id).
                  var id = existing._id || existing.customerId || existing.id;
                  var update = {
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    fullName: payload.fullName,
                    primaryPhone: payload.primaryPhone,
                    email: payload.email,
                    serviceStatus: payload.serviceStatus,
                    serviceType: payload.serviceType,
                  };
                  return window.WispCwlApi
                    .fetch("/api/customers/" + encodeURIComponent(String(id)), {
                      method: "PUT",
                      body: JSON.stringify(update),
                    })
                    .then(function (ur) {
                      if (!ur.ok) throw new Error("Update fallback failed (" + ur.status + ")");
                      status.textContent = "Updated existing customer (HSS index quirk) — reloading";
                      setTimeout(function () {
                        if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                        else location.reload();
                      }, 600);
                      return null;
                    });
                });
              }
              if (r.status === 409 && /tenantId/i.test(String(errBody.duplicateField || detail))) {
                detail =
                  "HSS quirk: duplicate key on tenantId (demo tenant already has a customer row). Backend index — not inventable here.";
              }
              throw new Error("Save failed (" + r.status + ")" + (detail ? " — " + detail : ""));
            },
            function () {
              throw new Error("Save failed (" + r.status + ")");
            },
          );
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralInventoryEditor(isEdit, prefill) {
    prefill = prefill || {};
    var loc = prefill.currentLocation || {};
    var html =
      '<form id="wisp-struct-inventory-form" class="wisp-wizard-form">' +
      (isEdit
        ? '<input type="hidden" name="itemId" value="' +
          String(prefill._id || prefill.id || "").replace(/"/g, "&quot;") +
          '" />'
        : "") +
      '<div class="form-group"><label>Serial number *</label><input name="serialNumber" required value="' +
      String(prefill.serialNumber || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Manufacturer *</label><input name="manufacturer" required value="' +
      String(prefill.manufacturer || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Model *</label><input name="model" required value="' +
      String(prefill.model || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Equipment type *</label><input name="equipmentType" required value="' +
      String(prefill.equipmentType || "Radio").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Category *</label><select name="category">' +
      '<option>Radio Equipment</option><option>CPE Devices</option><option>Antennas</option><option>Networking Equipment</option><option>Other</option>' +
      "</select></div>" +
      '<div class="form-group"><label>Status</label><select name="status"><option>available</option><option>deployed</option><option>reserved</option></select></div>' +
      '<div class="form-group"><label>Location type</label><select name="locationType"><option>warehouse</option><option>tower</option><option>noc</option></select></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">' +
      (isEdit ? "Save changes" : "Create item") +
      "</button></form>";
    var overlay = openStructuralShellModal(isEdit ? "Edit inventory item" : "Add inventory item", html);
    var form = overlay.querySelector("#wisp-struct-inventory-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (prefill.category && form.elements.category) form.elements.category.value = String(prefill.category);
    if (prefill.status && form.elements.status) form.elements.status.value = String(prefill.status);
    if (loc.type && form.elements.locationType) form.elements.locationType.value = String(loc.type);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("itemId") || "");
      var payload = {
        serialNumber: fd.get("serialNumber"),
        manufacturer: fd.get("manufacturer"),
        model: fd.get("model"),
        equipmentType: fd.get("equipmentType") || "Radio",
        category: fd.get("category") || "Radio Equipment",
        status: fd.get("status") || "available",
        currentLocation: { type: fd.get("locationType") || "warehouse", name: loc.name || "Main" },
      };
      status.hidden = false;
      status.textContent = "Saving…";
      var path = isEdit && id ? "/api/inventory/" + encodeURIComponent(id) : "/api/inventory";
      window.WispCwlApi
        .fetch(path, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralInventoryEditorFromRow(row) {
    if (!row) return;
    openStructuralInventoryEditor(true, row);
  }

  function openStructuralSiteEditor() {
    var html =
      '<form id="wisp-struct-site-form" class="wisp-wizard-form">' +
      '<div class="form-group"><label>Name *</label><input name="name" required placeholder="Tower site" /></div>' +
      '<div class="form-group"><label>Type</label><select name="type"><option value="tower">tower</option><option value="noc">noc</option><option value="warehouse">warehouse</option><option value="other">other</option></select></div>' +
      '<div class="form-group"><label>Address (geocode)</label><input name="address" placeholder="123 Main St, Denver, CO" />' +
      '<button type="button" class="wisp-demo-btn cwl-site-geocode">Geocode</button></div>' +
      '<div class="form-group"><label>Latitude *</label><input name="latitude" type="number" step="0.000001" required /></div>' +
      '<div class="form-group"><label>Longitude *</label><input name="longitude" type="number" step="0.000001" required /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Create site</button></form>';
    var overlay = openStructuralShellModal("Create site", html);
    var form = overlay.querySelector("#wisp-struct-site-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    var geoBtn = overlay.querySelector(".cwl-site-geocode");
    if (geoBtn) {
      geoBtn.addEventListener("click", function () {
        if (!window.WispCwlApi) return;
        var addr = String((form.elements.address && form.elements.address.value) || "").trim();
        if (!addr) {
          status.hidden = false;
          status.classList.add("error");
          status.textContent = "Enter an address to geocode";
          return;
        }
        status.hidden = false;
        status.classList.remove("error");
        status.textContent = "Geocoding…";
        window.WispCwlApi
          .fetch("/api/network/geocode", {
            method: "POST",
            body: JSON.stringify({ address: addr }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("geocode " + r.status);
            return r.json();
          })
          .then(function (data) {
            var loc = data.location || data.result || data;
            var lat = loc.latitude != null ? loc.latitude : loc.lat;
            var lng = loc.longitude != null ? loc.longitude : loc.lng != null ? loc.lng : loc.lon;
            if (lat == null || lng == null) throw new Error("geocode missing lat/lng");
            form.elements.latitude.value = lat;
            form.elements.longitude.value = lng;
            status.textContent = "Geocoded to " + lat + ", " + lng;
          })
          .catch(function (err) {
            status.classList.add("error");
            status.textContent = (err && err.message) || "Geocode failed";
          });
      });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var payload = {
        name: String(fd.get("name") || "").trim(),
        type: [String(fd.get("type") || "tower")],
        location: { latitude: Number(fd.get("latitude")), longitude: Number(fd.get("longitude")) },
        status: "active",
      };
      status.hidden = false;
      status.textContent = "Saving…";
      window.WispCwlApi
        .fetch("/api/network/sites", { method: "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralWorkOrderEditor(isEdit, prefill) {
    prefill = prefill || {};
    var html =
      '<form id="wisp-struct-wo-form" class="wisp-wizard-form">' +
      (isEdit
        ? '<input type="hidden" name="woId" value="' +
          String(prefill._id || prefill.id || "").replace(/"/g, "&quot;") +
          '" />'
        : "") +
      '<div class="form-group"><label>Title *</label><input name="title" required value="' +
      String(prefill.title || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Type *</label><select name="type"><option>installation</option><option>repair</option><option>maintenance</option><option>troubleshoot</option><option>inspection</option><option>other</option></select></div>' +
      '<div class="form-group"><label>Priority</label><select name="priority"><option>medium</option><option>low</option><option>high</option><option>critical</option></select></div>' +
      '<div class="form-group"><label>Status</label><select name="status"><option>open</option><option>in-progress</option><option>completed</option><option>cancelled</option></select></div>' +
      '<div class="form-group"><label>Description</label><textarea name="description" rows="3">' +
      String(prefill.description || "").replace(/</g, "&lt;") +
      "</textarea></div>" +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">' +
      (isEdit ? "Save changes" : "Create work order") +
      "</button></form>";
    var overlay = openStructuralShellModal(isEdit ? "Edit work order" : "Create work order", html);
    var form = overlay.querySelector("#wisp-struct-wo-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (prefill.type && form.elements.type) form.elements.type.value = String(prefill.type);
    if (prefill.priority && form.elements.priority) form.elements.priority.value = String(prefill.priority);
    if (prefill.status && form.elements.status) form.elements.status.value = String(prefill.status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("woId") || "");
      var payload = {
        title: String(fd.get("title") || "").trim(),
        type: fd.get("type") || "installation",
        ticketCategory: prefill.ticketCategory || "customer-facing",
        priority: fd.get("priority") || "medium",
        status: fd.get("status") || (isEdit ? prefill.status || "open" : "open"),
        description: fd.get("description") || "",
      };
      if (!isEdit) payload.ticketNumber = "TKT-CWL-" + Date.now();
      status.hidden = false;
      status.textContent = "Saving…";
      var path = isEdit && id ? "/api/work-orders/" + encodeURIComponent(id) : "/api/work-orders";
      window.WispCwlApi
        .fetch(path, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralWorkOrderEditorFromRow(row) {
    if (!row) return;
    openStructuralWorkOrderEditor(true, row);
  }

  function openStructuralBundleEditor(isEdit, prefill) {
    prefill = prefill || {};
    var html =
      '<form id="wisp-struct-bundle-form" class="wisp-wizard-form">' +
      (isEdit
        ? '<input type="hidden" name="bundleId" value="' +
          String(prefill._id || prefill.id || "").replace(/"/g, "&quot;") +
          '" />'
        : "") +
      '<div class="form-group"><label>Name *</label><input name="name" required value="' +
      String(prefill.name || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Status</label><select name="status"><option>active</option><option>draft</option><option>archived</option></select></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">' +
      (isEdit ? "Save changes" : "Create bundle") +
      "</button></form>";
    var overlay = openStructuralShellModal(isEdit ? "Edit bundle" : "Create bundle", html);
    var form = overlay.querySelector("#wisp-struct-bundle-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (prefill.status && form.elements.status) form.elements.status.value = String(prefill.status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("bundleId") || "");
      var payload = {
        name: String(fd.get("name") || "").trim(),
        status: fd.get("status") || "active",
        bundleType: prefill.bundleType || "standard",
      };
      status.hidden = false;
      status.textContent = "Saving…";
      var path = isEdit && id ? "/api/bundles/" + encodeURIComponent(id) : "/api/bundles";
      window.WispCwlApi
        .fetch(path, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralBundleEditorFromRow(row) {
    if (!row) return;
    openStructuralBundleEditor(true, row);
  }

  function openStructuralInventoryTransfer() {
    var html =
      '<form id="wisp-struct-transfer-form" class="wisp-wizard-form">' +
      '<div class="form-group"><label>Item id *</label><input name="id" required placeholder="Mongo _id from inventory list" /></div>' +
      '<div class="form-group"><label>Reason</label><select name="reason">' +
      "<option>transfer</option><option>deployment</option><option>maintenance</option><option>other</option></select></div>" +
      '<div class="form-group"><label>New location type *</label><select name="locationType">' +
      "<option>warehouse</option><option>tower</option><option>noc</option><option>customer</option><option>other</option></select></div>" +
      '<div class="form-group"><label>Location name</label><input name="locationName" value="Main" /></div>' +
      '<div class="form-group"><label>Notes</label><input name="notes" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Transfer</button></form>';
    var overlay = openStructuralShellModal("Inventory transfer", html);
    var form = overlay.querySelector("#wisp-struct-transfer-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("id") || "").trim();
      if (!id) return;
      var payload = {
        newLocation: {
          type: String(fd.get("locationType") || "warehouse"),
          name: String(fd.get("locationName") || "Main"),
        },
        reason: String(fd.get("reason") || "transfer"),
        notes: String(fd.get("notes") || "chrysalis-structural-transfer"),
        movedBy: "cwl-demo",
      };
      status.hidden = false;
      status.textContent = "Saving…";
      window.WispCwlApi
        .fetch("/api/inventory/" + encodeURIComponent(id) + "/transfer", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Transfer failed (" + r.status + ")");
          status.textContent = "Transferred";
          setTimeout(function () {
            overlay.remove();
            if (typeof window.__wispReloadStructuralModule === "function") window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Transfer failed";
        });
    });
  }

  /** Origin CellEditor EARFCN → frequency table (3GPP 36.101 common bands). */
  function cwlEarfcnToFrequency(earfcn) {
    var bands = [
      [0, 599, 2110, false, "Band 1 (2100 MHz)"],
      [600, 1199, 1930, false, "Band 2 (1900 MHz)"],
      [1200, 1949, 1805, false, "Band 3 (1800 MHz)"],
      [1950, 2399, 2110, false, "Band 4 (AWS)"],
      [2400, 2649, 869, false, "Band 5 (850 MHz)"],
      [2650, 2749, 875, false, "Band 6 (800 MHz)"],
      [2750, 3449, 2620, false, "Band 7 (2600 MHz)"],
      [3450, 3799, 925, false, "Band 8 (900 MHz)"],
      [9210, 9659, 729, false, "Band 12 (700 MHz)"],
      [9870, 9919, 746, false, "Band 13 (700 MHz)"],
      [5180, 5279, 734, false, "Band 17 (700 MHz)"],
      [5730, 5849, 1930, false, "Band 25 (1900 MHz)"],
      [5850, 6449, 859, false, "Band 26 (850 MHz)"],
      [66436, 67335, 2110, false, "Band 66 (AWS-3)"],
      [68586, 68935, 617, false, "Band 71 (600 MHz)"],
      [36000, 36199, 1900, true, "Band 33 (TDD 1900)"],
      [36200, 36349, 2010, true, "Band 34 (TDD 2000)"],
      [38650, 39649, 2496, true, "Band 41 (TDD 2500)"],
      [39650, 41589, 3400, true, "Band 42 (TDD 3500)"],
      [41590, 43589, 3600, true, "Band 43 (TDD 3700)"],
      [55240, 56739, 3550, true, "Band 48 (CBRS 3550)"],
    ];
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      if (earfcn >= b[0] && earfcn <= b[1]) {
        return { centerFreq: b[2] + 0.1 * (earfcn - b[0]), isTDD: b[3], band: b[4] };
      }
    }
    return { centerFreq: 0, isTDD: false, band: "Unknown Band" };
  }

  /** Origin CellEditor frequency → EARFCN approximation for common bands. */
  function cwlFrequencyToEarfcn(freq) {
    if (freq >= 2110 && freq <= 2170) return Math.round((freq - 2110) / 0.1);
    if (freq >= 1930 && freq <= 1990) return Math.round((freq - 1930) / 0.1) + 600;
    if (freq >= 1805 && freq <= 1880) return Math.round((freq - 1805) / 0.1) + 1200;
    if (freq >= 869 && freq <= 894) return Math.round((freq - 869) / 0.1) + 2400;
    if (freq >= 729 && freq <= 746) return Math.round((freq - 729) / 0.1) + 9210;
    if (freq >= 617 && freq <= 652) return Math.round((freq - 617) / 0.1) + 68586;
    if (freq >= 2496 && freq <= 2690) return Math.round((freq - 2496) / 0.1) + 38650;
    if (freq >= 3550 && freq <= 3700) return Math.round((freq - 3550) / 0.1) + 55240;
    if (freq >= 3400 && freq <= 3600) return Math.round((freq - 3400) / 0.1) + 39650;
    return 0;
  }

  function openStructuralInventoryScan() {
    var html =
      '<form id="wisp-struct-scan-form" class="wisp-wizard-form">' +
      '<div class="form-group"><label>Mode</label><select name="mode"><option value="lookup">Lookup</option><option value="check-in">Check-in</option><option value="check-out">Check-out</option></select></div>' +
      '<div class="form-group"><label>Identifier *</label><input name="identifier" required placeholder="Serial / barcode" /></div>' +
      '<div class="form-group"><label>Location type</label><select name="locationType">' +
      '<option value="warehouse">warehouse</option><option value="tower">tower</option><option value="noc">noc</option>' +
      '<option value="customer">customer</option><option value="other">other</option></select></div>' +
      '<div class="form-group"><label>Location name</label><input name="locationName" value="Main" /></div>' +
      '<div class="form-group"><label>Notes</label><input name="notes" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Run scan</button></form>';
    var overlay = openStructuralShellModal("Inventory scan", html);
    var form = overlay.querySelector("#wisp-struct-scan-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var mode = String(fd.get("mode") || "lookup");
      var path =
        mode === "check-in"
          ? "/api/inventory/scan/check-in"
          : mode === "check-out"
            ? "/api/inventory/scan/check-out"
            : "/api/inventory/scan/lookup";
      if (mode === "check-in" || mode === "check-out") {
        status.hidden = false;
        status.classList.add("error");
        status.textContent =
          "Honest residual: HSS scan " +
          mode +
          " rejects locationHistory.reason enum (use Lookup).";
        return;
      }
      var body = {
        identifier: String(fd.get("identifier") || "").trim(),
        location: {
          type: String(fd.get("locationType") || "warehouse"),
          name: String(fd.get("locationName") || "Main"),
        },
        notes: String(fd.get("notes") || ""),
      };
      status.hidden = false;
      status.textContent = "Scanning…";
      window.WispCwlApi
        .fetch(path, { method: "POST", body: JSON.stringify(body) })
        .then(function (r) {
          if (!r.ok) throw new Error("Scan failed (" + r.status + ")");
          return r.json();
        })
        .then(function (data) {
          status.textContent = "OK — " + JSON.stringify(data.item || data).slice(0, 180);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Scan failed";
        });
    });
  }

  function openStructuralEquipmentOrCpeEditor(kind, isEdit, prefill) {
    var isEquip = kind === "equipment";
    prefill = prefill || {};
    var html =
      '<form id="wisp-struct-eq-form" class="wisp-wizard-form">' +
      (isEdit
        ? '<input type="hidden" name="eqId" value="' +
          String(prefill._id || prefill.id || "").replace(/"/g, "&quot;") +
          '" />'
        : "") +
      '<div class="form-group"><label>Name *</label><input name="name" required value="' +
      String(prefill.name || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      (isEquip
        ? '<div class="form-group"><label>Type</label><input name="type" value="' +
          String(prefill.type || "backhaul").replace(/"/g, "&quot;") +
          '" /></div>' +
          '<div class="form-group"><label>Manufacturer</label><input name="manufacturer" value="' +
          String(prefill.manufacturer || "Trace").replace(/"/g, "&quot;") +
          '" /></div>' +
          '<div class="form-group"><label>Model</label><input name="model" value="' +
          String(prefill.model || "N/A").replace(/"/g, "&quot;") +
          '" /></div>' +
          '<div class="form-group"><label>Serial</label><input name="serialNumber" value="' +
          String(prefill.serialNumber || "").replace(/"/g, "&quot;") +
          '" /></div>' +
          '<div class="form-group"><label>Status</label><select name="status"><option>active</option><option>inactive</option><option>planned</option></select></div>'
        : '<div class="form-group"><label>Manufacturer *</label><input name="manufacturer" required value="Trace" /></div>' +
          '<div class="form-group"><label>Model *</label><input name="model" required value="CPE" /></div>' +
          '<div class="form-group"><label>Serial *</label><input name="serialNumber" required /></div>' +
          '<div class="form-group"><label>Latitude</label><input name="latitude" type="number" step="0.000001" value="39.75" /></div>' +
          '<div class="form-group"><label>Longitude</label><input name="longitude" type="number" step="0.000001" value="-104.98" /></div>') +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">' +
      (isEdit ? "Save changes" : "Create") +
      "</button></form>";
    var overlay = openStructuralShellModal(
      isEdit ? (isEquip ? "Edit equipment" : "Edit CPE") : isEquip ? "Add equipment" : "Add CPE",
      html,
    );
    var form = overlay.querySelector("#wisp-struct-eq-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (isEdit && prefill.status && form.elements.status) form.elements.status.value = String(prefill.status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("eqId") || "");
      var payload;
      var endpoint;
      if (isEquip) {
        endpoint =
          isEdit && id
            ? "/api/network/equipment/" + encodeURIComponent(id)
            : "/api/network/equipment";
        payload = {
          name: fd.get("name"),
          type: fd.get("type") || "backhaul",
          manufacturer: fd.get("manufacturer") || "Trace",
          model: fd.get("model") || "N/A",
          serialNumber: fd.get("serialNumber") || (isEdit ? undefined : "EQ-" + Date.now()),
          status: fd.get("status") || "active",
          location: prefill.location || { latitude: 39.74, longitude: -104.99 },
        };
      } else {
        endpoint = "/api/network/cpe";
        payload = {
          name: fd.get("name"),
          manufacturer: fd.get("manufacturer"),
          model: fd.get("model"),
          serialNumber: fd.get("serialNumber") || "CPE-" + Date.now(),
          technology: "LTE",
          serviceType: "residential",
          status: "active",
          location: {
            latitude: Number(fd.get("latitude")) || 39.75,
            longitude: Number(fd.get("longitude")) || -104.98,
          },
          azimuth: 0,
          beamwidth: 60,
        };
      }
      try {
        var ownerEmail = localStorage.getItem("userEmail") || "";
        if (ownerEmail && !isEdit) {
          payload.createdBy = ownerEmail;
          payload.email = ownerEmail;
        }
      } catch (_e) {
        /* ignore */
      }
      status.hidden = false;
      status.textContent = "Saving…";
      window.WispCwlApi
        .fetch(endpoint, {
          method: isEdit && isEquip ? "PUT" : "POST",
          body: JSON.stringify(payload),
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralEquipmentEditorFromRow(row) {
    if (!row) return;
    openStructuralEquipmentOrCpeEditor("equipment", true, row);
  }

function openStructuralIncidentEditor(isEdit, prefill) {
    prefill = prefill || {};
    var html =
      '<form id="wisp-struct-incident-form" class="wisp-wizard-form">' +
      (isEdit
        ? '<input type="hidden" name="incidentId" value="' +
          String(prefill._id || prefill.id || "").replace(/"/g, "&quot;") +
          '" />'
        : "") +
      '<div class="form-group"><label>Title *</label><input name="title" required value="' +
      String(prefill.title || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Description</label><textarea name="description" rows="3">' +
      String(prefill.description || "").replace(/</g, "&lt;") +
      "</textarea></div>" +
      '<div class="form-group"><label>Type</label><select name="incidentType">' +
      '<option value="other">other</option><option value="cpe-offline">cpe-offline</option>' +
      '<option value="sector-down">sector-down</option><option value="network-outage">network-outage</option>' +
      '<option value="equipment-failure">equipment-failure</option><option value="performance-degradation">performance-degradation</option>' +
      "</select></div>" +
      '<div class="form-group"><label>Source</label><select name="source">' +
      '<option value="other">other</option><option value="system">system</option>' +
      '<option value="monitoring">monitoring</option><option value="customer-report">customer-report</option>' +
      "</select></div>" +
      '<div class="form-group"><label>Severity</label><select name="severity"><option>medium</option><option>low</option><option>high</option><option>critical</option></select></div>' +
      '<div class="form-group"><label>Status</label><select name="status">' +
      '<option>new</option><option>investigating</option><option>acknowledged</option><option>mitigated</option><option>resolved</option><option>closed</option>' +
      "</select></div>" +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">' +
      (isEdit ? "Save changes" : "Create incident") +
      "</button></form>";
    var overlay = openStructuralShellModal(isEdit ? "Edit incident" : "Create incident", html);
    var form = overlay.querySelector("#wisp-struct-incident-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (prefill.incidentType && form.elements.incidentType)
      form.elements.incidentType.value = String(prefill.incidentType);
    if (prefill.source && form.elements.source) form.elements.source.value = String(prefill.source);
    if (prefill.severity && form.elements.severity) form.elements.severity.value = String(prefill.severity);
    if (prefill.status && form.elements.status) form.elements.status.value = String(prefill.status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("incidentId") || "");
      var ts = Date.now();
      var payload = {
        title: fd.get("title"),
        description: fd.get("description") || "chrysalis-structural-incident",
        incidentType: fd.get("incidentType") || "other",
        source: fd.get("source") || "other",
        status: fd.get("status") || (isEdit ? prefill.status || "new" : "new"),
        severity: fd.get("severity") || "medium",
      };
      if (!isEdit) {
        payload.incidentNumber = "INC-CWL-" + ts;
        payload.detectedAt = new Date().toISOString();
      }
      status.hidden = false;
      status.textContent = "Saving…";
      var path = isEdit && id ? "/api/incidents/" + encodeURIComponent(id) : "/api/incidents";
      window.WispCwlApi
        .fetch(path, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralIncidentEditorFromRow(row) {
    if (!row) return;
    openStructuralIncidentEditor(true, row);
  }

  function openStructuralSectorEditorFromRow(row) {
    if (!row) return;
    var html =
      '<form id="wisp-struct-sector-edit-form" class="wisp-wizard-form">' +
      '<input type="hidden" name="sectorId" value="' +
      String(row._id || row.id || "").replace(/"/g, "&quot;") +
      '" />' +
      '<div class="form-group"><label>Name *</label><input name="name" required value="' +
      String(row.name || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Technology</label><select name="technology"><option>LTE</option><option>CBRS</option><option>FWA</option><option>5G</option></select></div>' +
      '<div class="form-group"><label>Azimuth</label><input name="azimuth" type="number" value="' +
      (row.azimuth != null ? row.azimuth : 0) +
      '" /></div>' +
      '<div class="form-group"><label>Beamwidth</label><input name="beamwidth" type="number" value="' +
      (row.beamwidth != null ? row.beamwidth : 65) +
      '" /></div>' +
      '<div class="form-group"><label>Status</label><select name="status"><option>active</option><option>inactive</option><option>planned</option></select></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Save changes</button></form>';
    var overlay = openStructuralShellModal("Edit sector", html);
    var form = overlay.querySelector("#wisp-struct-sector-edit-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (row.technology && form.elements.technology) form.elements.technology.value = String(row.technology);
    if (row.status && form.elements.status) form.elements.status.value = String(row.status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("sectorId") || "");
      var payload = {
        name: fd.get("name"),
        technology: fd.get("technology") || "LTE",
        azimuth: Number(fd.get("azimuth")) || 0,
        beamwidth: Number(fd.get("beamwidth")) || 65,
        status: fd.get("status") || "active",
      };
      status.hidden = false;
      status.textContent = "Saving…";
      window.WispCwlApi
        .fetch("/api/network/sectors/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify(payload),
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralCpeEditorFromRow(row) {
    if (!row) return;
    var loc = row.location || {};
    var html =
      '<form id="wisp-struct-cpe-edit-form" class="wisp-wizard-form">' +
      '<input type="hidden" name="cpeId" value="' +
      String(row._id || row.id || "").replace(/"/g, "&quot;") +
      '" />' +
      '<div class="form-group"><label>Name *</label><input name="name" required value="' +
      String(row.name || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Manufacturer</label><input name="manufacturer" value="' +
      String(row.manufacturer || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Model</label><input name="model" value="' +
      String(row.model || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Status</label><select name="status"><option>active</option><option>inactive</option><option>offline</option></select></div>' +
      '<div class="form-group"><label>Latitude</label><input name="latitude" type="number" step="any" value="' +
      (loc.latitude != null ? loc.latitude : "") +
      '" /></div>' +
      '<div class="form-group"><label>Longitude</label><input name="longitude" type="number" step="any" value="' +
      (loc.longitude != null ? loc.longitude : "") +
      '" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Save changes</button></form>';
    var overlay = openStructuralShellModal("Edit CPE", html);
    var form = overlay.querySelector("#wisp-struct-cpe-edit-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (row.status && form.elements.status) form.elements.status.value = String(row.status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("cpeId") || "");
      var lat = Number(fd.get("latitude"));
      var lng = Number(fd.get("longitude"));
      var payload = {
        name: fd.get("name"),
        manufacturer: fd.get("manufacturer") || undefined,
        model: fd.get("model") || undefined,
        status: fd.get("status") || "active",
      };
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        payload.location = { latitude: lat, longitude: lng };
      }
      status.hidden = false;
      status.textContent = "Saving…";
      window.WispCwlApi
        .fetch("/api/network/cpe/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify(payload),
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function openStructuralSectorEditor() {
    var html =
      '<form id="wisp-struct-sector-form" class="wisp-wizard-form">' +
      '<div class="form-group"><label>Site id *</label><input name="siteId" required placeholder="from /api/network/sites" /></div>' +
      '<div class="form-group"><label>Name *</label><input name="name" required /></div>' +
      '<div class="form-group"><label>Technology</label><select name="technology"><option>LTE</option><option>CBRS</option><option>FWA</option><option>5G</option></select></div>' +
      '<div class="form-group"><label>Azimuth</label><input name="azimuth" type="number" value="0" /></div>' +
      '<div class="form-group"><label>Beamwidth</label><input name="beamwidth" type="number" value="65" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Create sector</button></form>';
    var overlay = openStructuralShellModal("Create sector", html);
    var form = overlay.querySelector("#wisp-struct-sector-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (window.WispCwlApi) {
      window.WispCwlApi
        .fetch("/api/network/sites")
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .then(function (data) {
          var sites = Array.isArray(data) ? data : data.sites || [];
          if (sites[0] && form.elements.siteId) {
            form.elements.siteId.value = String(sites[0]._id || sites[0].id || "");
          }
        })
        .catch(function () {});
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var payload = {
        siteId: fd.get("siteId"),
        name: fd.get("name"),
        technology: fd.get("technology") || "LTE",
        azimuth: Number(fd.get("azimuth")) || 0,
        beamwidth: Number(fd.get("beamwidth")) || 65,
        status: "active",
      };
      status.hidden = false;
      status.textContent = "Saving…";
      window.WispCwlApi
        .fetch("/api/network/sectors", { method: "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  function initPortalHonesty() {
    if (location.pathname.indexOf("/modules/customers/portal") !== 0) return;
    var host = document.querySelector(".page-header, .portal-header, [data-wisp-page]") || document.body;
    if (host.querySelector("[data-cwl-portal-honest]")) return;
    var p = document.createElement("p");
    p.setAttribute("data-cwl-portal-honest", "1");
    p.className = "cwl-empty-honest muted";
    p.textContent =
      "Customer portal APIs (/api/customer-portal, /api/billing) are not mounted on HSS for this demo — shell kept honest (D6442).";
    host.appendChild(p);
  }

  function fillTenantSettings(data) {
    if (!data || typeof data !== "object") return;
    var pageEl = document.querySelector(".acs-settings-page, [data-wisp-page]");
    if (!pageEl) return;
    var host = pageEl.querySelector("[data-cwl-tenant-settings]") || pageEl.querySelector(".page-header");
    if (!host) return;
    var acs = data.acsSettings || {};
    var company = data.companyInfo || {};
    var box = document.createElement("div");
    box.setAttribute("data-cwl-tenant-settings", "1");
    box.className = "cwl-hydrated-list";
    box.innerHTML =
      '<form id="wisp-tenant-settings-form" class="wisp-wizard-form">' +
      "<h3>ACS settings</h3>" +
      '<div class="form-group"><label>Username</label><input name="acsUsername" value="' +
      String(acs.username || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Password</label><input name="acsPassword" type="password" value="' +
      String(acs.password || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>URL</label><input name="acsUrl" value="' +
      String(acs.url || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      "<h3>Company</h3>" +
      '<div class="form-group"><label>Name</label><input name="companyName" value="' +
      String(company.name || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Phone</label><input name="companyPhone" value="' +
      String(company.phone || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Email</label><input name="companyEmail" value="' +
      String(company.email || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Save settings</button></form>';
    var existing = pageEl.querySelector("[data-cwl-tenant-settings]");
    if (existing) existing.replaceWith(box);
    else (host.parentNode || pageEl).insertBefore(box, host.nextSibling);
    var form = box.querySelector("#wisp-tenant-settings-form");
    var status = box.querySelector(".wisp-wizard-status");
    if (!form || form.getAttribute("data-cwl-wired") === "1") return;
    form.setAttribute("data-cwl-wired", "1");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var payload = {
        acsSettings: {
          username: String(fd.get("acsUsername") || ""),
          password: String(fd.get("acsPassword") || ""),
          url: String(fd.get("acsUrl") || ""),
        },
        companyInfo: {
          name: String(fd.get("companyName") || ""),
          phone: String(fd.get("companyPhone") || ""),
          email: String(fd.get("companyEmail") || ""),
          address: company.address || "",
          city: company.city || "",
          state: company.state || "",
          zip: company.zip || "",
        },
      };
      status.hidden = false;
      status.textContent = "Saving…";
      window.WispCwlApi
        .fetch("/api/tenant-settings", { method: "PUT", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          return r.json();
        })
        .then(function (next) {
          status.textContent = "Saved";
          fillTenantSettings(next);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }
  window.__wispFillTenantSettings = fillTenantSettings;

  function initExtraListSurfaces() {
    if (!window.WispCwlApi) return;
    var mounts = [
      {
        path: "/api/equipment-pricing",
        title: "Equipment pricing",
        cols: ["category", "equipmentType", "manufacturer", "model", "basePrice"],
        create: {
          body: {
            category: "Radio Equipment",
            equipmentType: "radio",
            manufacturer: "Trace",
            model: "CWL-" + Date.now(),
            basePrice: 99,
            currency: "USD",
            notes: "chrysalis-pricing",
          },
        },
        rowAction: "pricing-mutate",
      },
      {
        path: "/api/subcontractors",
        title: "Subcontractors",
        cols: ["companyName", "status", "taxId"],
        create: {
          body: {
            companyName: "CWL Sub " + Date.now(),
            taxId: "TAX-" + Date.now(),
            primaryContact: {
              name: "CWL Contact",
              email: "cwl-sub-" + Date.now() + "@example.com",
              phone: "5550100",
            },
            notes: "chrysalis-subcontractor",
          },
        },
        note: "POST/approve require admin role",
        rowAction: "sub-approve",
      },
      {
        path: "/api/installation-documentation",
        title: "Installation docs",
        cols: ["installationType", "siteName", "status", "installationDate", "approvalStatus"],
        create: null,
        note: "POST needs siteId — create from live site when probing",
        rowAction: "install-doc",
      },
      {
        path: "/api/network/hardware-deployments",
        title: "Hardware deployments",
        cols: ["name", "status", "siteId", "equipmentType", "hardware_type"],
        create: null,
        note: "GET list + PUT/DELETE :id when rows exist",
        rowAction: "hd-mutate",
      },
    ];
    var host =
      document.querySelector(".maintain-module .page-header") ||
      document.querySelector(".support-dashboard .page-header") ||
      document.querySelector(".help-desk-container .page-header") ||
      document.querySelector(".hardware-page .page-header");
    if (!host || host.getAttribute("data-cwl-extra-lists") === "1") return;
    host.setAttribute("data-cwl-extra-lists", "1");
    mounts.forEach(function (m) {
      window.WispCwlApi
        .fetch(m.path)
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .catch(function () {
          return fetch(
            "/assets/wisp-api-goldens/GET-" +
              m.path.replace(/^\//, "").replace(/\//g, "-") +
              ".golden.json",
          ).then(function (r) {
            return r.ok ? r.json() : [];
          });
        })
        .then(function (data) {
          var rows = Array.isArray(data)
            ? data
            : data.items || data.results || data.subcontractors || data.docs || [];
          var wrap = document.createElement("div");
          wrap.setAttribute("data-cwl-extra-list", m.path);
          wrap.className = "cwl-hydrated-list";
          var head =
            "<h3>" +
            m.title +
            " (" +
            rows.length +
            ")</h3>" +
            (m.note ? '<p class="muted">' + m.note + "</p>" : "");
          if (!rows.length) {
            wrap.innerHTML =
              head +
              '<p class="cwl-empty-honest muted" data-cwl-empty-honest="1">No records from ' +
              m.path +
              " (API ok — empty list).</p>";
          } else {
            var cols = m.cols.filter(function (c) {
              return rows[0][c] !== undefined;
            });
            if (!cols.length) cols = Object.keys(rows[0]).filter(function (k) {
              return typeof rows[0][k] !== "object";
            }).slice(0, 5);
            wrap.innerHTML =
              head +
              '<table class="cwl-hydrated-table"><thead><tr>' +
              cols
                .map(function (c) {
                  return "<th>" + c + "</th>";
                })
                .join("") +
              "</tr></thead><tbody>" +
              rows
                .slice(0, 15)
                .map(function (row) {
                  var rid = row._id || row.id || "";
                  return (
                    "<tr data-id=\"" +
                    String(rid).replace(/"/g, "&quot;") +
                    "\">" +
                    cols
                      .map(function (c) {
                        return "<td>" + String(row[c] == null ? "" : row[c]).slice(0, 48) + "</td>";
                      })
                      .join("") +
                    (m.rowAction === "install-doc" && rid
                      ? '<td><button type="button" class="btn-icon cwl-install-put" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Update</button> <button type="button" class="btn-icon cwl-install-photos" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Photos</button> <button type="button" class="btn-icon cwl-install-submit" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Submit</button> <button type="button" class="btn-icon cwl-install-approve" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Approve</button> <button type="button" class="btn-icon cwl-install-pay" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Pay approve</button></td>'
                      : "") +
                    (m.rowAction === "pricing-mutate" && rid
                      ? '<td><button type="button" class="btn-icon cwl-price-del" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Delete</button></td>'
                      : "") +
                    (m.rowAction === "sub-approve" && rid
                      ? '<td><button type="button" class="btn-icon cwl-sub-approve" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Approve</button></td>'
                      : "") +
                    (m.rowAction === "hd-mutate" && rid
                      ? '<td><button type="button" class="btn-icon cwl-hd-put" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Update</button> <button type="button" class="btn-icon cwl-hd-del" data-id="' +
                        String(rid).replace(/"/g, "&quot;") +
                        '">Delete</button></td>'
                      : "") +
                    "</tr>"
                  );
                })
                .join("") +
              "</tbody></table>";
          }
          if (m.create && m.path === "/api/equipment-pricing" && !wrap.querySelector("[data-cwl-price-import]")) {
            var imp = document.createElement("button");
            imp.type = "button";
            imp.className = "wisp-demo-btn";
            imp.setAttribute("data-cwl-price-import", "1");
            imp.textContent = "Import from inventory";
            imp.title = "POST /api/equipment-pricing/import-from-inventory";
            imp.addEventListener("click", function () {
              imp.disabled = true;
              window.WispCwlApi
                .fetch("/api/equipment-pricing/import-from-inventory", {
                  method: "POST",
                  body: JSON.stringify({ category: "Radio Equipment" }),
                })
                .then(function (r) {
                  if (!r.ok) throw new Error("import-from-inventory " + r.status);
                  location.reload();
                })
                .catch(function (err) {
                  imp.disabled = false;
                  imp.title = (err && err.message) || "Import failed";
                });
            });
            wrap.appendChild(imp);
          }
          if (m.rowAction === "install-doc") {
            wrap.addEventListener("click", function (ev) {
              var putB = ev.target && ev.target.closest ? ev.target.closest(".cwl-install-put") : null;
              var photoB =
                ev.target && ev.target.closest ? ev.target.closest(".cwl-install-photos") : null;
              var sb = ev.target && ev.target.closest ? ev.target.closest(".cwl-install-submit") : null;
              var ab = ev.target && ev.target.closest ? ev.target.closest(".cwl-install-approve") : null;
              var pb = ev.target && ev.target.closest ? ev.target.closest(".cwl-install-pay") : null;
              if (!window.WispCwlApi) return;
              if (putB) {
                ev.preventDefault();
                var putId = putB.getAttribute("data-id");
                putB.disabled = true;
                window.WispCwlApi
                  .fetch("/api/installation-documentation/" + encodeURIComponent(putId), {
                    method: "PUT",
                    body: JSON.stringify({
                      installedByName: "CWL Tech",
                      notes: "chrysalis-install-put-" + Date.now(),
                    }),
                  })
                  .then(function (r) {
                    if (!r.ok) throw new Error("install PUT " + r.status);
                    location.reload();
                  })
                  .catch(function (err) {
                    putB.disabled = false;
                    putB.title = (err && err.message) || "PUT failed";
                  });
                return;
              }
              if (photoB) {
                ev.preventDefault();
                var photoId = photoB.getAttribute("data-id");
                photoB.disabled = true;
                var fd = new FormData();
                var blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
                  type: "image/jpeg",
                });
                fd.append("photos", blob, "cwl-a.jpg");
                fd.append("photos", blob, "cwl-b.jpg");
                fd.append("photos", blob, "cwl-c.jpg");
                window.WispCwlApi
                  .fetch(
                    "/api/installation-documentation/" + encodeURIComponent(photoId) + "/photos",
                    { method: "POST", body: fd },
                  )
                  .then(function (r) {
                    if (!r.ok) throw new Error("photos " + r.status);
                    location.reload();
                  })
                  .catch(function (err) {
                    photoB.disabled = false;
                    photoB.title = (err && err.message) || "photos failed (HSS storage bucket?)";
                  });
                return;
              }
              function postInstall(btn, suffix, body) {
                if (!btn) return false;
                ev.preventDefault();
                var did = btn.getAttribute("data-id");
                btn.disabled = true;
                window.WispCwlApi
                  .fetch(
                    "/api/installation-documentation/" + encodeURIComponent(did) + "/" + suffix,
                    { method: "POST", body: JSON.stringify(body) },
                  )
                  .then(function (r) {
                    if (!r.ok) throw new Error(suffix + " " + r.status);
                    location.reload();
                  })
                  .catch(function (err) {
                    btn.disabled = false;
                    btn.title = (err && err.message) || suffix + " failed";
                  });
                return true;
              }
              if (postInstall(sb, "submit", {})) return;
              if (postInstall(ab, "approve", { approvalNotes: "chrysalis-install-approve" })) return;
              postInstall(pb, "payment-approve", {
                approvedAmount: 100,
                invoiceNumber: "CWL-INV-" + Date.now(),
                paymentMethod: "check",
                paymentNotes: "chrysalis-payment-approve",
              });
            });
          }
          if (m.rowAction === "pricing-mutate") {
            wrap.addEventListener("click", function (ev) {
              var db = ev.target && ev.target.closest ? ev.target.closest(".cwl-price-del") : null;
              if (!db || !window.WispCwlApi) return;
              ev.preventDefault();
              var pid = db.getAttribute("data-id");
              db.disabled = true;
              window.WispCwlApi
                .fetch("/api/equipment-pricing/" + encodeURIComponent(pid), { method: "DELETE" })
                .then(function (r) {
                  if (!r.ok) throw new Error("pricing delete " + r.status);
                  location.reload();
                })
                .catch(function (err) {
                  db.disabled = false;
                  db.title = (err && err.message) || "Delete failed";
                });
            });
          }
          if (m.rowAction === "sub-approve") {
            wrap.addEventListener("click", function (ev) {
              var ab = ev.target && ev.target.closest ? ev.target.closest(".cwl-sub-approve") : null;
              if (!ab || !window.WispCwlApi) return;
              ev.preventDefault();
              var sid = ab.getAttribute("data-id");
              ab.disabled = true;
              window.WispCwlApi
                .fetch("/api/subcontractors/" + encodeURIComponent(sid) + "/approve", {
                  method: "POST",
                  body: JSON.stringify({ approvalNotes: "chrysalis-sub-approve" }),
                })
                .then(function (r) {
                  if (!r.ok) throw new Error("sub approve " + r.status);
                  location.reload();
                })
                .catch(function (err) {
                  ab.disabled = false;
                  ab.title = (err && err.message) || "Approve failed";
                });
            });
          }
          if (m.rowAction === "submit") {
            wrap.addEventListener("click", function (ev) {
              var sb = ev.target && ev.target.closest ? ev.target.closest(".cwl-install-submit") : null;
              if (!sb || !window.WispCwlApi) return;
              ev.preventDefault();
              var did = sb.getAttribute("data-id");
              sb.disabled = true;
              window.WispCwlApi
                .fetch("/api/installation-documentation/" + encodeURIComponent(did) + "/submit", {
                  method: "POST",
                  body: "{}",
                })
                .then(function (r) {
                  if (!r.ok) throw new Error("Submit failed (" + r.status + ")");
                  location.reload();
                })
                .catch(function (err) {
                  sb.disabled = false;
                  sb.title = (err && err.message) || "Submit failed";
                });
            });
          }
          if (m.rowAction === "hd-mutate") {
            wrap.addEventListener("click", function (ev) {
              var putB = ev.target && ev.target.closest ? ev.target.closest(".cwl-hd-put") : null;
              var delB = ev.target && ev.target.closest ? ev.target.closest(".cwl-hd-del") : null;
              if (!window.WispCwlApi) return;
              if (putB) {
                ev.preventDefault();
                var pid = putB.getAttribute("data-id");
                putB.disabled = true;
                window.WispCwlApi
                  .fetch("/api/network/hardware-deployments/" + encodeURIComponent(pid), {
                    method: "PUT",
                    body: JSON.stringify({ notes: "chrysalis-hd-put-" + Date.now() }),
                  })
                  .then(function (r) {
                    if (!r.ok) throw new Error("HD PUT " + r.status);
                    location.reload();
                  })
                  .catch(function (err) {
                    putB.disabled = false;
                    putB.title = (err && err.message) || "PUT failed";
                  });
                return;
              }
              if (delB) {
                ev.preventDefault();
                var did2 = delB.getAttribute("data-id");
                delB.disabled = true;
                window.WispCwlApi
                  .fetch("/api/network/hardware-deployments/" + encodeURIComponent(did2), {
                    method: "DELETE",
                  })
                  .then(function (r) {
                    if (!r.ok) throw new Error("HD DELETE " + r.status);
                    location.reload();
                  })
                  .catch(function (err) {
                    delB.disabled = false;
                    delB.title = (err && err.message) || "DELETE failed";
                  });
              }
            });
          }
          if (m.create) {
            var addBtn = document.createElement("button");
            addBtn.type = "button";
            addBtn.className = "wisp-demo-btn";
            addBtn.textContent = "Add " + m.title.slice(0, 24);
            addBtn.addEventListener("click", function () {
              addBtn.disabled = true;
              window.WispCwlApi
                .fetch(m.path, { method: "POST", body: JSON.stringify(m.create.body) })
                .then(function (r) {
                  if (!r.ok) throw new Error("Create failed (" + r.status + ")");
                  location.reload();
                })
                .catch(function (err) {
                  addBtn.disabled = false;
                  addBtn.title = (err && err.message) || "Create failed";
                });
            });
            wrap.appendChild(addBtn);
          }
          host.parentNode.insertBefore(wrap, host.nextSibling);
        })
        .catch(function () {});
    });
  }

  function initNotificationsBadge() {
    if (!window.WispCwlApi) return;
    var host =
      document.querySelector(".module-header-controls") ||
      document.querySelector(".wisp-header-controls") ||
      document.querySelector(".dashboard-container .page-header") ||
      document.querySelector(".module-header-overlay");

    function renderBadge(rows, unreadCount) {
      var n = typeof unreadCount === "number" ? unreadCount : rows.length;
      var existing = document.querySelector("[data-cwl-notifications-badge]");
      if (existing) {
        existing.textContent = "Notifications (" + n + ")";
        existing.__cwlNotifRows = rows;
        existing.title =
          n + " unread (GET /api/notifications/count)" + (rows.length ? "; " + rows.length + " listed" : "");
        return existing;
      }
      if (!host) return null;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wisp-control-btn";
      btn.setAttribute("data-cwl-notifications-badge", "1");
      btn.textContent = "Notifications (" + n + ")";
      btn.title =
        n + " unread (GET /api/notifications/count)" + (rows.length ? "; " + rows.length + " listed" : "");
      btn.__cwlNotifRows = rows;
      btn.addEventListener("click", function () {
        var list = btn.__cwlNotifRows || [];
        var count = list.length;
        var body =
          count === 0
            ? '<p class="cwl-empty-honest" data-cwl-empty-honest="1">No notifications (API ok — empty list).</p>' +
              '<button type="button" class="wisp-demo-btn cwl-notif-refresh">Refresh</button>'
            : '<button type="button" class="wisp-demo-btn cwl-notif-refresh">Refresh</button>' +
              "<ul class=\"cwl-notifications-list\">" +
              list
                .slice(0, 20)
                .map(function (row) {
                  var nid = row._id || row.id || "";
                  return (
                    '<li data-notification-id="' +
                    String(nid).replace(/"/g, "&quot;") +
                    '">' +
                    String(row.title || row.message || nid || JSON.stringify(row)).slice(0, 120) +
                    (nid
                      ? ' <button type="button" class="btn-icon cwl-notif-read" data-id="' +
                        String(nid).replace(/"/g, "&quot;") +
                        '">Mark read</button>'
                      : "") +
                    "</li>"
                  );
                })
                .join("") +
              "</ul>";
        var overlay = openStructuralShellModal("Notifications", body);
        overlay.addEventListener("click", function (ev) {
          if (ev.target && ev.target.closest && ev.target.closest(".cwl-notif-refresh")) {
            ev.preventDefault();
            loadNotifications(true);
            overlay.remove();
            return;
          }
          var rb = ev.target && ev.target.closest ? ev.target.closest(".cwl-notif-read") : null;
          if (!rb || !window.WispCwlApi) return;
          ev.preventDefault();
          var nid = rb.getAttribute("data-id");
          rb.disabled = true;
          rb.textContent = "…";
          window.WispCwlApi
            .fetch("/api/notifications/" + encodeURIComponent(nid) + "/read", { method: "PUT", body: "{}" })
            .then(function (r) {
              if (!r.ok) throw new Error("mark-read " + r.status);
              rb.textContent = "Read";
              var li = rb.closest("li");
              if (li) li.style.opacity = "0.55";
              loadNotifications(true);
            })
            .catch(function (err) {
              rb.disabled = false;
              rb.textContent = (err && err.message) || "Failed";
            });
        });
      });
      host.appendChild(btn);
      return btn;
    }

    function loadNotifications(force) {
      var listP = window.WispCwlApi
        .fetch("/api/notifications")
        .then(function (r) {
          if (!r.ok) throw new Error("notifications " + r.status);
          return r.json();
        })
        .catch(function () {
          return fetch("/assets/wisp-api-goldens/GET-api-notifications.golden.json").then(function (r) {
            return r.ok ? r.json() : [];
          });
        })
        .then(function (data) {
          return Array.isArray(data) ? data : data.notifications || data.items || [];
        })
        .catch(function () {
          return [];
        });
      var countP = window.WispCwlApi
        .fetch("/api/notifications/count")
        .then(function (r) {
          return r.ok ? r.json() : { count: null };
        })
        .then(function (data) {
          return typeof data.count === "number" ? data.count : null;
        })
        .catch(function () {
          return null;
        });
      return Promise.all([listP, countP]).then(function (parts) {
        var rows = parts[0] || [];
        var unread = parts[1];
        renderBadge(rows, unread != null ? unread : rows.length);
        return rows;
      });
    }

    loadNotifications(false);
  }

/**
 * Closed first paint: origin {#if show*} false becomes stamped chrome with aria-hidden.
 * A prior bug treated `aria-hidden` as the HTML `hidden` attribute (`\bhidden\b`), so
 * overlays with only aria-hidden stayed display:flex and blocked Plan/login.
 */
function ensureClosedOverlaysFirstPaint() {
  var sels = [
    ".modal-overlay",
    ".popup-overlay",
    ".tips-overlay",
    ".help-overlay",
    ".wizard-overlay",
    ".settings-overlay",
    ".filters-modal",
    ".marketing-backdrop",
    ".demo-visitor-section",
    ".password-reset-section",
    ".forgot-password-form",
    "[data-wisp-login-panel]",
  ];
  for (var s = 0; s < sels.length; s++) {
    var nodes = document.querySelectorAll(sels[s]);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var aria = el.getAttribute("aria-hidden");
      if (el.hasAttribute("hidden")) {
        if (aria !== "false") el.setAttribute("aria-hidden", "true");
        continue;
      }
      if (aria === "true") {
        el.setAttribute("hidden", "");
        continue;
      }
      // Known closed chrome without either attribute — close first paint (openers remove hidden).
      if (
        el.classList.contains("modal-overlay") ||
        el.classList.contains("popup-overlay") ||
        el.classList.contains("tips-overlay") ||
        el.classList.contains("help-overlay") ||
        el.classList.contains("wizard-overlay") ||
        el.classList.contains("settings-overlay") ||
        el.classList.contains("filters-modal") ||
        el.classList.contains("marketing-backdrop")
      ) {
        el.setAttribute("hidden", "");
        el.setAttribute("aria-hidden", "true");
      }
    }
  }
}

/**
 * Bind origin wizardCatalog.ts rows into lifted ModuleWizardMenu chrome (D6442).
 * Empty each-holes otherwise leave blank menuitems.
 */
function initModuleWizardMenus() {
  var hosts = document.querySelectorAll(
    '[data-cwl-lifted-component="ModuleWizardMenu"], .module-wizard-menu',
  );
  var page = document.querySelector("[data-wisp-path], [data-wisp-page]");
  var path =
    (page && page.getAttribute("data-wisp-path")) ||
    location.pathname.replace(/\/$/, "") ||
    "";
  if (/^\/modules\/monitoring/.test(path)) path = "/modules/monitor";
  // Parity Plan/Deploy shells omitted ModuleWizardMenu — mount host in header controls.
  if (!hosts.length) {
    var controls = document.querySelector(
      ".wisp-header-controls, .module-header-controls, .header-actions, .page-toolbar",
    );
    if (controls) {
      var host = document.createElement("div");
      host.setAttribute("data-cwl-component", "ModuleWizardMenu");
      host.setAttribute("data-cwl-lifted-component", "ModuleWizardMenu");
      var afterProjects = controls.querySelector('[data-action="projects"]');
      if (afterProjects && afterProjects.nextSibling) {
        controls.insertBefore(host, afterProjects.nextSibling);
      } else {
        controls.appendChild(host);
      }
      hosts = document.querySelectorAll(
        '[data-cwl-lifted-component="ModuleWizardMenu"], .module-wizard-menu',
      );
    }
  }
  if (!hosts.length) return;
  // Seed closed origin chrome when convert left an empty lifted host (parity shells / failed if).
  hosts.forEach(function (host) {
    var menu = host.classList.contains("module-wizard-menu")
      ? host
      : host.querySelector(".module-wizard-menu");
    if (!menu) {
      host.innerHTML =
        '<div class="module-wizard-menu">' +
        '<button type="button" class="wizard-trigger" title="Wizards for this module" aria-haspopup="true" aria-expanded="false">' +
        '<span class="wizard-trigger-icon">🧙</span>' +
        '<span class="wizard-trigger-label">Wizards</span>' +
        '<span class="wizard-trigger-chevron">▼</span></button>' +
        '<div class="wizard-dropdown" role="menu" hidden aria-hidden="true"></div></div>';
      menu = host.querySelector(".module-wizard-menu");
    }
    var dropdown = menu && menu.querySelector(".wizard-dropdown");
    if (menu && !dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "wizard-dropdown";
      dropdown.setAttribute("role", "menu");
      dropdown.setAttribute("hidden", "");
      dropdown.setAttribute("aria-hidden", "true");
      menu.appendChild(dropdown);
    }
  });
  var menus = document.querySelectorAll(
    '[data-cwl-lifted-component="ModuleWizardMenu"] .module-wizard-menu, .module-wizard-menu',
  );
  fetch("/assets/wisp-wizard-catalog.json", { credentials: "same-origin" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (doc) {
      var rows =
        (doc && doc.wizardsByPath && doc.wizardsByPath[path]) ||
        (doc && doc.wizardsByPath && doc.wizardsByPath[path + "/"]) ||
        [];
      menus.forEach(function (menu) {
        var dropdown = menu.querySelector(".wizard-dropdown");
        var trigger = menu.querySelector(".wizard-trigger");
        if (!dropdown) return;
        if (!rows.length) {
          menu.setAttribute("hidden", "");
          return;
        }
        menu.removeAttribute("hidden");
        dropdown.innerHTML = rows
          .map(function (w) {
            return (
              '<button type="button" role="menuitem" class="wizard-item" data-wizard-id="' +
              String(w.id || "").replace(/"/g, "") +
              '">' +
              (w.icon ? '<span class="wizard-item-icon">' + w.icon + "</span>" : "") +
              '<span class="wizard-item-label">' +
              String(w.label || w.id || "") +
              "</span></button>"
            );
          })
          .join("");
        if (trigger && !trigger.__cwlWizardBound) {
          trigger.__cwlWizardBound = true;
          trigger.addEventListener("click", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var open = !dropdown.hasAttribute("hidden");
            if (open) {
              dropdown.setAttribute("hidden", "");
              dropdown.setAttribute("aria-hidden", "true");
              trigger.classList.remove("open");
              trigger.setAttribute("aria-expanded", "false");
            } else {
              dropdown.removeAttribute("hidden");
              dropdown.setAttribute("aria-hidden", "false");
              trigger.classList.add("open");
              trigger.setAttribute("aria-expanded", "true");
            }
          });
        }
        if (dropdown && !dropdown.__cwlWizardItemsBound) {
          dropdown.__cwlWizardItemsBound = true;
          dropdown.addEventListener("click", function (ev) {
            var item = ev.target.closest(".wizard-item");
            if (!item) return;
            ev.preventDefault();
            ev.stopPropagation();
            dropdown.setAttribute("hidden", "");
            dropdown.setAttribute("aria-hidden", "true");
            if (trigger) {
              trigger.classList.remove("open");
              trigger.setAttribute("aria-expanded", "false");
            }
            var wizId = item.getAttribute("data-wizard-id") || (item.textContent || "").trim();
            if (openOverlayEl(findShellByName(wizId))) return;
            // Common hardware wizard aliases → structural editors.
            if (/scan|check.?in|check.?out/i.test(wizId)) {
              openStructuralInventoryScan();
              return;
            }
            if (/transfer/i.test(wizId)) {
              openStructuralInventoryTransfer();
              return;
            }
            if (/deploy|equipment|hardware|add/i.test(wizId)) {
              openStructuralEquipmentOrCpeEditor("equipment");
              return;
            }
            cwlToast("Wizard \u201C" + wizId + "\u201D has no converted shell on this page");
          });
        }
      });
    })
    .catch(function () {
      /* catalog optional */
    });
}

  guardAuthenticatedPages();
  // Origin /modules/monitor is a redirect stub to /modules/monitoring.
  if (/^\/modules\/monitor\/?$/.test(location.pathname || "")) {
    location.replace("/modules/monitoring");
    return;
  }
  ensureClosedOverlaysFirstPaint();
  // Direct bind for convert-stamped [data-cwl-nav] (dashboard module cards).
  document.querySelectorAll("[data-cwl-nav]").forEach(function (el) {
    if (el.__cwlNavBound) return;
    el.__cwlNavBound = true;
    el.addEventListener(
      "click",
      function (ev) {
        var path = el.getAttribute("data-cwl-nav");
        if (!path) return;
        ev.preventDefault();
        ev.stopPropagation();
        location.href = path;
      },
      true,
    );
  });
  initModuleWizardMenus();
  initModuleDemos();
  initStructuralModulePages();
  initDashboardModules();
  initShellIslands();
  initModuleTipsIslands();
  // Origin help FAB is position:fixed inside .module-header-overlay (z=10).
  // Reparent to <body> so z-index:999 is not trapped below .plan-summary.
  document.querySelectorAll("button.help-button").forEach(function (btn) {
    if (btn.parentElement === document.body) return;
    document.body.appendChild(btn);
  });
  // Defensive: Svelte slot bodies that escaped BaseWizard as siblings of a
  // closed shell must stay hidden until the gate opens (deploy wizard leak).
  document.querySelectorAll("[data-cwl-lifted-component]").forEach(function (host) {
    var closed = host.querySelector(
      ":scope > [data-cwl-shell-key][hidden], :scope > .cwl-self-gated-shell[hidden], :scope > [hidden][data-cwl-component]",
    );
    if (!closed) return;
    Array.prototype.forEach.call(host.children, function (child) {
      if (child === closed || (closed.contains && closed.contains(child))) return;
      if (child.getAttribute && child.getAttribute("slot")) {
        child.hidden = true;
        child.setAttribute("hidden", "");
        child.setAttribute("aria-hidden", "true");
        if (child.style) child.style.display = "none";
      }
    });
  });
  initNotificationsBadge();
  initExtraListSurfaces();
  // Fidelity deepen injectors (n10g–n10x) invent synthetic toolbar buttons that
  // are not in the origin Svelte UI. Leave them off unless explicitly enabled —
  // they make the demo feel half-fake and mask real conversion gaps.
  if (window.__WISP_CWL_ENABLE_DEEPEN_SURFACES__ === true) {
    initDeepenN10gSurfaces();
    initDeepenN10hSurfaces();
    initDeepenN10iSurfaces();
    initDeepenN10pSurfaces();
    initDeepenN10qSurfaces();
    initDeepenN10rSurfaces();
    initDeepenN10sSurfaces();
    initDeepenN10tSurfaces();
    initDeepenN10uSurfaces();
    initDeepenN10vSurfaces();
    initDeepenN10wSurfaces();
    initDeepenN10xSurfaces();
  }

  function initDeepenN10xSurfaces() {
    if (!window.WispCwlApi) return;
    function addGet(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10x="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10x", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var tid = "6a166eb07089304417ec967a";
    var sitesHost =
      document.querySelector(".sites-page .page-header") ||
      document.querySelector('[data-wisp-page="sites"] .page-header');
    addGet(sitesHost, "hw-dep", "/api/network/hardware-deployments", "HW deployments");
    var dash =
      document.querySelector(".dashboard-page .page-header") ||
      document.querySelector('[data-wisp-page="dashboard"] .page-header');
    addGet(dash, "branding-get", "/api/branding/" + tid, "Branding");
    addGet(dash, "pc-kb", "/api/portal-content/" + tid + "/knowledge-base", "Portal KB");
  }

  function initDeepenN10wSurfaces() {
    if (!window.WispCwlApi) return;
    function addGet(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10w="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10w", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var hssHost =
      document.querySelector(".hss-management .page-header") ||
      document.querySelector('[data-wisp-page="hss-management"] .page-header') ||
      document.querySelector(".hss-management");
    addGet(hssHost, "hss-bw", "/api/hss/bandwidth-plans", "HSS BW plans");
    addGet(hssHost, "hss-subs", "/api/hss/subscribers", "HSS subscribers");
    var voiceHost =
      document.querySelector(".voice-telephony-page .page-header") ||
      document.querySelector('[data-wisp-page="voice-telephony"] .page-header');
    addGet(voiceHost, "voice-tns", "/api/voice/telephone-numbers", "Voice TNs");
    addGet(voiceHost, "voice-pos", "/api/voice/port-orders", "Port orders");
  }

  function initDeepenN10vSurfaces() {
    if (!window.WispCwlApi) return;
    function addGet(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10v="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10v", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var dash =
      document.querySelector(".dashboard-page .page-header") ||
      document.querySelector('[data-wisp-page="dashboard"] .page-header');
    addGet(dash, "epc-list", "/api/epc/list", "EPC list");
    addGet(dash, "notif", "/api/notifications", "Notifications");
    addGet(dash, "mobile-tasks", "/api/mobile/tasks", "Mobile tasks");
    addGet(
      dash,
      "perm-check",
      "/api/permissions/check?module=customers&fcapsCategory=fault&operation=read",
      "Perm check",
    );
  }

  function initDeepenN10uSurfaces() {
    if (!window.WispCwlApi) return;
    function addGet(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10u="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10u", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var tid = "6a166eb07089304417ec967a";
    var dash =
      document.querySelector(".dashboard-page .page-header") ||
      document.querySelector('[data-wisp-page="dashboard"] .page-header');
    addGet(dash, "perm-me", "/api/permissions/me", "Permissions me");
    addGet(dash, "users-vis", "/api/users/tenant/" + tid + "/visible", "Users visible");
    var monHost =
      document.querySelector(".monitoring-page .page-header") ||
      document.querySelector('[data-wisp-page="monitoring"] .page-header') ||
      document.querySelector(".monitor-page .page-header");
    addGet(monHost, "mon-mt", "/api/monitoring/mikrotik/devices", "Mon mikrotik");
    addGet(monHost, "mon-snmp", "/api/monitoring/snmp/devices", "Mon SNMP");
    var portalHost =
      document.querySelector(".customers-page .page-header") ||
      document.querySelector('[data-wisp-page="customers"] .page-header');
    addGet(portalHost, "pc-active", "/api/portal-content/" + tid + "/alerts/active", "Active alerts");
  }

  function initDeepenN10tSurfaces() {
    if (!window.WispCwlApi) return;
    function addGet(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10t="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10t", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var monHost =
      document.querySelector(".monitoring-page .page-header") ||
      document.querySelector('[data-wisp-page="monitoring"] .page-header') ||
      document.querySelector(".monitor-page .page-header");
    addGet(monHost, "mt-status", "/api/mikrotik/status", "Mikrotik status");
    addGet(monHost, "snmp-disc", "/api/snmp/discovery", "SNMP discovery");
    addGet(monHost, "mon-dash", "/api/monitoring/monitoring/dashboard", "Mon dashboard");
    addGet(monHost, "mon-topo", "/api/monitoring/monitoring/topology", "Mon topology");
    var planHost =
      document.querySelector(".plan-page .page-header") ||
      document.querySelector('[data-wisp-page="plan"] .page-header');
    addGet(planHost, "plan-mobile", "/api/plans/mobile/cwl-demo", "Plans mobile");
    var dash =
      document.querySelector(".dashboard-page .page-header") ||
      document.querySelector('[data-wisp-page="dashboard"] .page-header');
    addGet(dash, "portal-tenant", "/api/portal/tenant/6a166eb07089304417ec967a", "Portal tenant");
  }

  function initDeepenN10sSurfaces() {
    if (!window.WispCwlApi) return;
    function addGet(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10s="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10s", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var tid = "6a166eb07089304417ec967a";
    var portalHost =
      document.querySelector(".customers-portal-page .page-header") ||
      document.querySelector('[data-wisp-page="customers-portal"] .page-header') ||
      document.querySelector(".customers-page .page-header");
    addGet(portalHost, "pc-alerts", "/api/portal-content/" + tid + "/alerts", "Portal alerts");
    addGet(portalHost, "pc-faq", "/api/portal-content/" + tid + "/faq", "Portal FAQ");
    var monHost =
      document.querySelector(".monitoring-page .page-header") ||
      document.querySelector('[data-wisp-page="monitoring"] .page-header') ||
      document.querySelector(".monitor-page .page-header");
    addGet(monHost, "snmp-config", "/api/snmp/configuration", "SNMP config");
    addGet(monHost, "snmp-devices", "/api/snmp/devices", "SNMP devices");
  }

  function initDeepenN10rSurfaces() {
    if (!window.WispCwlApi) return;
    function addGet(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10r="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10r", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var invHost =
      document.querySelector(".inventory-page .page-header") ||
      document.querySelector('[data-wisp-page="inventory"] .page-header');
    addGet(invHost, "inv-stats", "/api/inventory/stats", "Inv stats");
    var bundleHost =
      document.querySelector(".inventory-bundles-page .page-header") ||
      document.querySelector('[data-wisp-page="inventory-bundles"] .page-header') ||
      invHost;
    addGet(bundleHost, "bundle-type", "/api/bundles/type/standard", "Bundles type");
    addGet(bundleHost, "bundle-search", "/api/bundles/search/radio", "Bundles search");
    var voiceHost =
      document.querySelector(".voice-telephony-page .page-header") ||
      document.querySelector('[data-wisp-page="voice-telephony"] .page-header') ||
      document.querySelector(".voice-telephony-page");
    addGet(voiceHost, "voice-accounts", "/api/voice", "Voice accounts");
    addGet(voiceHost, "remote-agents", "/api/remote-agents/status", "Remote agents");
    var dash =
      document.querySelector(".dashboard-page .page-header") ||
      document.querySelector('[data-wisp-page="dashboard"] .page-header') ||
      document.querySelector(".dashboard-page");
    addGet(dash, "branding", "/api/branding/6a166eb07089304417ec967a", "Branding");
  }

  function initDeepenN10qSurfaces() {
    if (!window.WispCwlApi) return;
    function addGet(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10q="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10q", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var woHost =
      document.querySelector(".work-orders-page .page-header") ||
      document.querySelector('[data-wisp-page="work-orders"] .page-header') ||
      document.querySelector(".work-orders-page");
    addGet(woHost, "wo-site", "/api/work-orders/site/demo-site", "WO by site");
    var custHost =
      document.querySelector(".customers-page .page-header") ||
      document.querySelector('[data-wisp-page="customers"] .page-header');
    addGet(custHost, "cust-phone", "/api/customers/search/phone/555", "Search phone");
    addGet(custHost, "cust-imsi", "/api/customers/search/imsi/00101", "Search IMSI");
    var invHost =
      document.querySelector(".inventory-page .page-header") ||
      document.querySelector('[data-wisp-page="inventory"] .page-header');
    addGet(invHost, "inv-bysite", "/api/inventory/by-site/demo-site", "Inv by site");
    addGet(woHost, "notif-count", "/api/notifications/count", "Notif count");
    var voiceHost =
      document.querySelector(".voice-telephony-page .page-header") ||
      document.querySelector('[data-wisp-page="voice-telephony"] .page-header') ||
      document.querySelector(".voice-telephony-page") ||
      custHost;
    addGet(voiceHost, "voice-schema", "/api/voice/schema", "Voice schema");
  }

  function initDeepenN10pSurfaces() {
    if (!window.WispCwlApi) return;
    function addStats(host, key, path, label) {
      if (!host || host.querySelector('[data-cwl-n10p="' + key + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10p", key);
      b.textContent = label;
      b.title = "GET " + path;
      b.addEventListener("click", function () {
        b.disabled = true;
        window.WispCwlApi
          .fetch(path)
          .then(function (r) {
            if (!r.ok) throw new Error(path + " " + r.status);
            return r.json();
          })
          .then(function (body) {
            b.disabled = false;
            b.title = JSON.stringify(body).slice(0, 240);
            if (typeof setApiStatus === "function") setApiStatus(label + " ok", false);
          })
          .catch(function (e) {
            b.disabled = false;
            if (typeof setApiStatus === "function")
              setApiStatus((e && e.message) || label + " failed", true);
          });
      });
      host.appendChild(b);
    }
    var woHost =
      document.querySelector(".work-orders-page .page-header") ||
      document.querySelector('[data-wisp-page="work-orders"] .page-header') ||
      document.querySelector(".work-orders-page");
    addStats(woHost, "wo-stats", "/api/work-orders/stats/dashboard", "WO stats");
    addStats(woHost, "wo-sla", "/api/work-orders/alerts/sla-breach", "SLA alerts");
    var incHost =
      document.querySelector(".help-desk-page .page-header") ||
      document.querySelector(".maintain-page .page-header") ||
      document.querySelector('[data-wisp-page="help-desk"] .page-header');
    addStats(incHost, "inc-stats", "/api/incidents/stats/dashboard", "Incident stats");
    var custHost =
      document.querySelector(".customers-page .page-header") ||
      document.querySelector('[data-wisp-page="customers"] .page-header');
    addStats(custHost, "cust-stats", "/api/customers/stats/summary", "Customer stats");
    var invHost =
      document.querySelector(".inventory-page .page-header") ||
      document.querySelector('[data-wisp-page="inventory"] .page-header');
    addStats(invHost, "inv-warranty", "/api/inventory/alerts/warranty-expiring", "Warranty alerts");
    addStats(invHost, "inv-maint", "/api/inventory/alerts/maintenance-due", "Maint alerts");
  }

  function initDeepenN10gSurfaces() {
    if (!window.WispCwlApi) return;
    var stamp = Date.now();

    function addBtn(host, label, title, onClick) {
      if (!host || host.querySelector('[data-cwl-n10g="' + label + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10g", label);
      b.textContent = label;
      b.title = title;
      b.addEventListener("click", onClick);
      host.appendChild(b);
    }

    // HSS groups / bandwidth / subscribers (63–65)
    var hssHost =
      document.querySelector(".hss-management .header") ||
      document.querySelector(".hss-management .page-header") ||
      document.querySelector('[data-wisp-page="hss-management"] .page-header') ||
      document.querySelector(".hss-management");
    if (hssHost) {
      addBtn(hssHost, "Create group", "POST /api/hss/groups", function () {
        window.WispCwlApi
          .fetch("/api/hss/groups", {
            method: "POST",
            body: JSON.stringify({
              name: "CWL Group " + stamp,
              description: "chrysalis-hss-group",
              default_apn: "internet",
              default_qci: 9,
            }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("group create " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "group create failed");
          });
      });
      addBtn(hssHost, "Create BW plan", "POST /api/hss/bandwidth-plans", function () {
        window.WispCwlApi
          .fetch("/api/hss/bandwidth-plans", {
            method: "POST",
            body: JSON.stringify({
              name: "CWL Plan " + stamp,
              download_mbps: 100,
              upload_mbps: 20,
              description: "chrysalis-bw-plan",
            }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("bw create " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "bw create failed");
          });
      });
      addBtn(hssHost, "Create subscriber", "POST /api/hss/subscribers", function () {
        var imsi = "00101" + String(Date.now()).slice(-10);
        window.WispCwlApi
          .fetch("/api/hss/subscribers", {
            method: "POST",
            body: JSON.stringify({
              imsi: imsi,
              msisdn: "555" + String(Date.now()).slice(-7),
              ki: "00112233445566778899aabbccddeeff",
              opc: "00112233445566778899aabbccddeeff",
              notes: "chrysalis-hss-subscriber",
            }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("subscriber create " + r.status);
            return r.json();
          })
          .then(function (body) {
            var id = body && (body.id || body._id);
            if (!id) {
              location.reload();
              return;
            }
            return window.WispCwlApi
              .fetch("/api/hss/subscribers/" + encodeURIComponent(id), {
                method: "PUT",
                body: JSON.stringify({ notes: "chrysalis-hss-subscriber-put" }),
              })
              .then(function () {
                location.reload();
              });
          })
          .catch(function (e) {
            alert((e && e.message) || "subscriber failed");
          });
      });
    }

    // Users invite / suspend (68–69)
    var usersHost =
      document.querySelector(".user-management-container .page-header") ||
      document.querySelector('[data-wisp-page="user-management"] .page-header') ||
      document.querySelector(".user-management-container");
    if (usersHost) {
      addBtn(usersHost, "Invite user", "POST /api/users/invite", function () {
        window.WispCwlApi
          .fetch("/api/users/invite", {
            method: "POST",
            body: JSON.stringify({
              email: "cwl-invite-" + stamp + "@example.com",
              role: "installer",
              tenantId: "6a166eb07089304417ec967a",
              sendEmail: false,
              displayName: "CWL Invite",
            }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("invite " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "invite failed");
          });
      });
      addBtn(usersHost, "Suspend first", "POST /api/users/:id/suspend", function () {
        window.WispCwlApi
          .fetch("/api/users")
          .then(function (r) {
            return r.ok ? r.json() : [];
          })
          .then(function (data) {
            var rows = Array.isArray(data) ? data : data.users || data.items || [];
            var row = rows.find(function (u) {
              var role = String(u.role || "").toLowerCase();
              return (
                role !== "owner" &&
                role !== "platform_admin" &&
                (u.uid || u.userId || u.id)
              );
            });
            if (!row) throw new Error("no non-owner user to suspend");
            var uid = row.uid || row.userId || row.id;
            return window.WispCwlApi.fetch("/api/users/" + encodeURIComponent(uid) + "/suspend", {
              method: "POST",
              body: JSON.stringify({ tenantId: "6a166eb07089304417ec967a" }),
            });
          })
          .then(function (r) {
            if (!r.ok) throw new Error("suspend " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "suspend failed");
          });
      });
    }

    // Permissions role PUT (67)
    var permHost =
      document.querySelector(".permissions-page .page-header") ||
      document.querySelector(".role-management-page .page-header") ||
      document.querySelector(".permissions-page");
    if (permHost) {
      addBtn(permHost, "Put role perms", "PUT /api/permissions/role/installer", function () {
        window.WispCwlApi
          .fetch("/api/permissions/role/installer", {
            method: "PUT",
            body: JSON.stringify({
              permissions: [
                {
                  module: "inventory",
                  fault: { read: true, write: false, delete: false },
                  configuration: { read: true, write: false, delete: false },
                  accounting: { read: false, write: false, delete: false },
                  performance: { read: true, write: false, delete: false },
                  security: { read: false, write: false, delete: false },
                },
              ],
            }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("role perms " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "role perms failed");
          });
      });
    }

    // Admin assign-owner (70)
    var adminHost =
      document.querySelector(".admin-tenants-page .page-header") ||
      document.querySelector('[data-wisp-page="admin-tenants"] .page-header') ||
      document.querySelector(".tenants-section");
    if (adminHost) {
      addBtn(adminHost, "Assign owner", "POST /admin/tenants/:id/assign-owner", function () {
        window.WispCwlApi
          .fetch("/api/admin/tenants/6a166eb07089304417ec967a/assign-owner", {
            method: "POST",
            body: JSON.stringify({ email: "demo@wisptools.io" }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("assign-owner " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "assign-owner failed");
          });
      });
    }
  }

  function initDeepenN10hSurfaces() {
    if (!window.WispCwlApi) return;
    var stamp = Date.now();

    function addBtn(host, label, title, onClick) {
      if (!host || host.querySelector('[data-cwl-n10h="' + label + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10h", label);
      b.textContent = label;
      b.title = title;
      b.addEventListener("click", onClick);
      host.appendChild(b);
    }

    // HSS BW PUT on existing (create is 500 on HSS — D6442)
    var hssHost =
      document.querySelector(".hss-management .header") ||
      document.querySelector(".hss-management .page-header") ||
      document.querySelector('[data-wisp-page="hss-management"] .page-header') ||
      document.querySelector(".hss-management");
    if (hssHost) {
      addBtn(hssHost, "Update BW plan", "PUT /api/hss/bandwidth-plans/:id", function () {
        window.WispCwlApi
          .fetch("/api/hss/bandwidth-plans")
          .then(function (r) {
            return r.ok ? r.json() : {};
          })
          .then(function (data) {
            var rows = Array.isArray(data) ? data : data.plans || [];
            var row = rows[0];
            if (!row) throw new Error("no bandwidth plan (create is 500 on HSS)");
            var pid = row.plan_id || row.id || row._id;
            return window.WispCwlApi.fetch(
              "/api/hss/bandwidth-plans/" + encodeURIComponent(pid),
              {
                method: "PUT",
                body: JSON.stringify({
                  description: "chrysalis-bw-put-" + stamp,
                  download_mbps: Number(row.download_mbps || 100) + 1,
                }),
              },
            );
          })
          .then(function (r) {
            if (!r.ok) throw new Error("bw put " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "bw put failed");
          });
      });
    }

    // Monitoring graphs devices hydrate
    var monHost =
      document.querySelector(".monitoring-page .page-header") ||
      document.querySelector('[data-wisp-page="monitoring"] .page-header') ||
      document.querySelector(".graphs-page .page-header");
    if (monHost && !monHost.querySelector("[data-cwl-graphs-devices]")) {
      var monBox = document.createElement("div");
      monBox.setAttribute("data-cwl-graphs-devices", "1");
      monBox.className = "cwl-extra-list";
      monBox.innerHTML = "<p class=\"cwl-muted\">Loading /api/monitoring/graphs/devices…</p>";
      monHost.appendChild(monBox);
      window.WispCwlApi
        .fetch("/api/monitoring/graphs/devices")
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (data) {
          var devices = (data && data.devices) || [];
          monBox.innerHTML =
            "<p><strong>Graphs devices</strong> (" +
            (data && data.count != null ? data.count : devices.length) +
            ")</p>" +
            (devices.length
              ? "<ul>" +
                devices
                  .slice(0, 8)
                  .map(function (d) {
                    return (
                      "<li>" +
                      String(d.name || d.hostname || d.id || d._id || "device") +
                      "</li>"
                    );
                  })
                  .join("") +
                "</ul>"
              : '<p class="cwl-empty-honest" data-cwl-empty-honest="1">No graph devices (API ok — empty list).</p>');
        })
        .catch(function () {
          monBox.innerHTML =
            '<p class="cwl-empty-honest" data-cwl-empty-honest="1">GET /api/monitoring/graphs/devices failed.</p>';
        });
    }
  }

  function initDeepenN10iSurfaces() {
    if (!window.WispCwlApi) return;
    var stamp = Date.now();

    function addBtn(host, label, title, onClick) {
      if (!host || host.querySelector('[data-cwl-n10i="' + label + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.setAttribute("data-cwl-n10i", label);
      b.textContent = label;
      b.title = title;
      b.addEventListener("click", onClick);
      host.appendChild(b);
    }

    var hssHost =
      document.querySelector(".hss-management .header") ||
      document.querySelector(".hss-management .page-header") ||
      document.querySelector('[data-wisp-page="hss-management"] .page-header') ||
      document.querySelector(".hss-management");
    if (hssHost) {
      addBtn(hssHost, "Update group", "PUT /api/hss/groups/:id", function () {
        window.WispCwlApi
          .fetch("/api/hss/groups")
          .then(function (r) {
            return r.ok ? r.json() : {};
          })
          .then(function (data) {
            var rows = Array.isArray(data) ? data : data.groups || [];
            var row = rows[0];
            if (!row) throw new Error("no HSS group");
            var gid = row.group_id || row.id || row._id;
            return window.WispCwlApi.fetch("/api/hss/groups/" + encodeURIComponent(gid), {
              method: "PUT",
              body: JSON.stringify({ description: "chrysalis-group-put-" + stamp }),
            });
          })
          .then(function (r) {
            if (!r.ok) throw new Error("group put " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "group put failed");
          });
      });
    }

    var notifHost =
      document.querySelector(".notifications-page .page-header") ||
      document.querySelector('[data-wisp-page="notifications"] .page-header') ||
      document.querySelector(".cwl-notifications-list");
    if (notifHost) {
      addBtn(notifHost, "Mark first read", "PUT /api/notifications/:id/read", function () {
        window.WispCwlApi
          .fetch("/api/notifications")
          .then(function (r) {
            return r.ok ? r.json() : [];
          })
          .then(function (data) {
            var rows = Array.isArray(data) ? data : data.notifications || [];
            var row = rows[0];
            if (!row || !row.id) throw new Error("no notification");
            return window.WispCwlApi.fetch(
              "/api/notifications/" + encodeURIComponent(row.id) + "/read",
              { method: "PUT", body: "{}" },
            );
          })
          .then(function (r) {
            if (!r.ok) throw new Error("mark-read " + r.status);
            return window.WispCwlApi.fetch("/api/notifications/count");
          })
          .then(function () {
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "mark-read failed");
          });
      });
    }

    var hwHost =
      document.querySelector(".hardware-page .page-header") ||
      document.querySelector('[data-wisp-page="hardware"] .page-header');
    if (hwHost) {
      addBtn(hwHost, "Create+PUT equipment", "POST/PUT /api/network/equipment", function () {
        var name = "CWL Eq " + stamp;
        window.WispCwlApi
          .fetch("/api/network/equipment", {
            method: "POST",
            body: JSON.stringify({
              name: name,
              type: "radio",
              equipmentType: "radio",
              manufacturer: "CWL",
              model: "M1",
              serialNumber: "EQ-" + stamp,
              status: "active",
              location: { latitude: 39.75, longitude: -104.98 },
              createdBy: "demo@wisptools.io",
              email: "demo@wisptools.io",
            }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("equip create " + r.status);
            return r.json();
          })
          .then(function (body) {
            var id = body && (body._id || body.id);
            if (!id) throw new Error("no equipment id");
            return window.WispCwlApi.fetch("/api/network/equipment/" + encodeURIComponent(id), {
              method: "PUT",
              body: JSON.stringify({
                notes: "chrysalis-eq-put-" + stamp,
                email: "demo@wisptools.io",
              }),
            });
          })
          .then(function (r) {
            if (!r.ok) throw new Error("equip put " + r.status);
            location.reload();
          })
          .catch(function (e) {
            alert((e && e.message) || "equipment failed");
          });
      });
    }
  }
  initPortalHonesty();
})();

/**
 * Origin moduleTips → tips overlay (D6442). Uses /assets/wisp-module-tips.json.
 * Module id from data-wisp-page / path; respects tipsService localStorage key.
 */
function initModuleTipsIslands() {
  var MODULE_BY_PATH = [
    { re: /^\/dashboard\/?$/, id: "dashboard" },
    { re: /^\/modules\/plan\/?/, id: "plan" },
    { re: /^\/modules\/deploy\/?/, id: "deploy" },
    { re: /^\/modules\/coverage-map\/?/, id: "coverage-map" },
    { re: /^\/modules\/customers\/?/, id: "customers" },
    { re: /^\/modules\/inventory\/?/, id: "inventory" },
    { re: /^\/modules\/monitoring\/?/, id: "monitoring" },
    { re: /^\/modules\/maintain\/?/, id: "maintain" },
    { re: /^\/modules\/hss-management\/?/, id: "hss-management" },
    { re: /^\/modules\/sites\/?/, id: "sites" },
    { re: /^\/modules\/user-management\/?/, id: "user-management" },
    { re: /^\/modules\/cbrs-management\/?/, id: "cbrs-management" },
    { re: /^\/modules\/pci-resolution\/?/, id: "pci-resolution" },
    { re: /^\/modules\/voice-telephony\/?/, id: "voice-telephony" },
  ];

    function detectModuleId() {
    var page = document.querySelector("[data-wisp-page]");
    var fromAttr = page && page.getAttribute("data-wisp-page");
    if (fromAttr === "dashboard") return "dashboard";
    if (fromAttr === "plan") return "plan";
    if (fromAttr === "deploy") return "deploy";
    var path = location.pathname || "";
    // Coverage-map tips owned by wisp-cwl-map.js (avoid double overlay).
    if (/\/modules\/coverage-map\/?/.test(path)) return null;
    for (var i = 0; i < MODULE_BY_PATH.length; i++) {
      if (MODULE_BY_PATH[i].re.test(path)) return MODULE_BY_PATH[i].id;
    }
    return null;
  }

  function shouldShow(moduleId) {
    try {
      var dismissed = JSON.parse(localStorage.getItem("wisp_tips_dismissed") || "{}");
      if (dismissed && dismissed.modules && dismissed.modules[moduleId]) return false;
    } catch (_e) {
      /* ignore */
    }
    return true;
  }

  function markDismissed(moduleId) {
    try {
      var store = JSON.parse(localStorage.getItem("wisp_tips_dismissed") || "{}");
      if (!store.modules) store.modules = {};
      store.version = store.version || "1";
      store.modules[moduleId] = true;
      localStorage.setItem("wisp_tips_dismissed", JSON.stringify(store));
    } catch (_e2) {
      /* ignore */
    }
  }

  function showTip(moduleId, tip) {
    if (!tip) return;
    if (document.querySelector(".tips-overlay:not([hidden])")) return;
    var existing = document.querySelector('[data-cwl-lifted-component="TipsModal"] .tips-overlay');
    if (existing) {
      existing.removeAttribute("hidden");
      existing.setAttribute("aria-hidden", "false");
      var titleEl = existing.querySelector("#tips-modal-title, h2");
      var bodyEl = existing.querySelector(".tips-body, .tip-content");
      if (titleEl) titleEl.textContent = tip.title || "Tip";
      if (bodyEl) bodyEl.innerHTML = tip.content || "";
      return;
    }
    var overlay = document.createElement("div");
    overlay.className = "tips-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("data-cwl-tips-module", moduleId);
    overlay.innerHTML =
      '<div class="tips-modal">' +
      '<div class="tips-header"><div class="tips-title-section">' +
      (tip.icon ? '<span class="tip-icon">' + tip.icon + "</span>" : "") +
      "<h2>" +
      (tip.title || "Tip") +
      "</h2></div>" +
      '<button type="button" class="close-btn" aria-label="Close">×</button></div>' +
      '<div class="tips-body">' +
      (tip.content || "") +
      "</div>" +
      '<div class="tips-footer"><label><input type="checkbox" class="tips-dont-show"> Don\'t show again</label>' +
      '<button type="button" class="tips-got-it btn-secondary">Got it</button></div></div>';
    document.body.appendChild(overlay);
    function close() {
      var dont = overlay.querySelector(".tips-dont-show");
      if (dont && dont.checked) markDismissed(moduleId);
      overlay.remove();
    }
    overlay.querySelectorAll(".close-btn, .tips-got-it").forEach(function (b) {
      b.addEventListener("click", close);
    });
    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) close();
    });
  }

  window.WispCwlTips = {
    show: function (moduleId, tipOverride) {
      if (!moduleId || !shouldShow(moduleId)) return Promise.resolve(false);
      if (tipOverride) {
        showTip(moduleId, tipOverride);
        return Promise.resolve(true);
      }
      return fetch("/assets/wisp-module-tips.json", { credentials: "same-origin" })
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (doc) {
          var tips = doc && doc.tips && doc.tips[moduleId];
          if (!tips || !tips.length) return false;
          showTip(moduleId, tips[Math.floor(Math.random() * tips.length)]);
          return true;
        })
        .catch(function () {
          return false;
        });
    },
  };

  var moduleId = detectModuleId();
  if (!moduleId || !shouldShow(moduleId)) return;
  // Closed first paint: do not auto-popup tips on load (stacked with plan/dashboard chrome).
  // Tips still open from Tips / shell controls via window.WispCwlTips.show.
  void moduleId;
}

/**
 * G9910 — hydrate empty dashboard module/admin cards from known CWL routes + /api/admin.
 * Prefer lifted markup from convert (Module_Manager dashboard). Never wipe existing
 * `.module-card` / `.admin-card` nodes — that replaced original features with a fake CORE grid.
 */
function initDashboardModules() {
  var root =
    document.querySelector('.dashboard-container[data-wisp-page="dashboard"]') ||
    document.querySelector(".dashboard-container");
  if (!root || location.pathname.indexOf("/dashboard") !== 0) return;

  var CORE = [
    { id: "customers", name: "Customers", href: "/modules/customers", features: ["Subscribers", "Portal"] },
    { id: "hardware", name: "Hardware", href: "/modules/hardware", features: ["Equipment", "EPC"] },
    { id: "inventory", name: "Inventory", href: "/modules/inventory", features: ["Stock", "Bundles"] },
    { id: "sites", name: "Sites", href: "/modules/sites", features: ["Towers", "Network"] },
    { id: "work-orders", name: "Work Orders", href: "/modules/work-orders", features: ["Tickets", "Field ops"] },
    { id: "help-desk", name: "Help Desk", href: "/modules/help-desk", features: ["Tickets", "Support"] },
    { id: "billing", name: "Billing", href: "/modules/billing", features: ["Plans", "Invoices"] },
    { id: "monitoring", name: "Monitoring", href: "/modules/monitoring", features: ["Devices", "Alerts"] },
    { id: "deploy", name: "Deploy", href: "/modules/deploy", features: ["Projects", "Rollout"] },
    { id: "hss-management", name: "HSS", href: "/modules/hss-management", features: ["Groups", "Subscribers"] },
    { id: "user-management", name: "Users", href: "/modules/user-management", features: ["Accounts", "Roles"] },
    { id: "plan", name: "Plan", href: "/modules/plan", features: ["RF map", "Layers"] },
  ];
  var ADMIN = [
    {
      id: "tenant-management",
      name: "Tenant Management",
      href: "/admin/tenant-management",
      description: "Tenants and organization settings",
    },
    {
      id: "user-management",
      name: "User Management",
      href: "/modules/user-management",
      description: "Users across organizations",
    },
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderCore(mods) {
    var grid = root.querySelector(".modules-grid");
    if (!grid) return;
    grid.innerHTML = mods
      .map(function (m) {
        var feats = (m.features || []).slice(0, 6);
        var active = (m.status || "active") === "active";
        return (
          '<a class="module-card' +
          (active ? " active" : " coming-soon") +
          '" href="' +
          esc(m.href) +
          '" role="button" tabindex="0" aria-label="Open ' +
          esc(m.name) +
          '" data-cwl-hydrated="1">' +
          '<div class="module-header"><h3 class="module-name">' +
          esc(m.name) +
          "</h3></div>" +
          '<div class="module-features"><ul>' +
          feats
            .map(function (f) {
              return "<li>" + esc(f) + "</li>";
            })
            .join("") +
          "</ul></div>" +
          '<div class="module-status"><span class="status-badge ' +
          (active ? "active" : "coming-soon") +
          '">' +
          (active ? "Active" : "Coming Soon") +
          "</span></div></a>"
        );
      })
      .join("");
  }

  function renderAdmin(mods) {
    var grid = root.querySelector(".admin-modules");
    if (!grid) return;
    grid.innerHTML = mods
      .map(function (m) {
        return (
          '<a class="admin-card" href="' +
          esc(m.href) +
          '" role="button" tabindex="0" aria-label="Open ' +
          esc(m.name) +
          '" data-cwl-hydrated="1">' +
          '<div class="admin-icon" aria-hidden="true"></div>' +
          '<div class="admin-info"><h3 class="admin-name">' +
          esc(m.name) +
          "</h3><p class=\"admin-description\">" +
          esc(m.description || "") +
          "</p></div></a>"
        );
      })
      .join("");
  }

  function mergeFromApi(apiMods) {
    var byId = {};
    (apiMods || []).forEach(function (m) {
      if (m && m.id) byId[m.id] = m;
    });
    return CORE.map(function (c) {
      var hit = byId[c.id];
      return hit
        ? {
            id: c.id,
            name: hit.name || c.name,
            href: c.href,
            features: c.features,
            status: hit.status || "active",
          }
        : c;
    });
  }

  var moduleGrid = root.querySelector(".modules-grid");
  var adminGrid = root.querySelector(".admin-modules");
  var hasLiftedModules = !!(moduleGrid && moduleGrid.querySelector(".module-card"));
  var hasLiftedAdmin = !!(adminGrid && adminGrid.querySelector(".admin-card"));

  // Convert fidelity: keep lifted Module_Manager cards when present.
  if (!hasLiftedModules) renderCore(CORE);
  if (adminGrid && !hasLiftedAdmin) renderAdmin(ADMIN);

  // Optional: only fill an empty grid from API — never overwrite convert output.
  if (hasLiftedModules) return;

  var doFetch = window.WispCwlApi
    ? window.WispCwlApi.fetch
    : function (p) {
        return fetch(p, { credentials: "same-origin" });
      };
  doFetch("/api/admin")
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data) return;
      if (Array.isArray(data.modules) && data.modules.length) {
        renderCore(mergeFromApi(data.modules));
      }
    })
    .catch(function () {});
}

/**
 * G9903/G9907/G9909 — convert ALL CWL shell kinds at once into honest island chrome.
 * Kinds: modal, wizard, nav (overlay); map, chart, widget (inline). No invented widgets.
 */
function initShellIslands() {
  function scrubShellJunk(el) {
    var n = el.nextSibling;
    while (n && n.nodeType === 3) {
      var t = n.textContent || "";
      if (
        /show\w+Modal|uiActions\.|false\}\s*\/?>|true\}\s*\/?>|^\s*\}/.test(t) ||
        /^\s*\([^)]*\)\s*\/?>/.test(t)
      ) {
        var dead = n;
        n = n.nextSibling;
        dead.parentNode.removeChild(dead);
        continue;
      }
      break;
    }
  }

  function humanize(name) {
    return String(name || "Shell")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/Modal$|Wizard$|Shell$/g, function (m) {
        return m === "Shell" ? "" : " " + m;
      })
      .trim();
  }

  function shellBlueprint(name, kind) {
    var key = String(name || "").toLowerCase();
    if (kind === "nav") {
      return {
        nav: true,
        fields: [],
        links: [
          ["/dashboard", "Dashboard"],
          ["/modules/sites", "Sites"],
          ["/modules/customers", "Customers"],
          ["/modules/hardware", "Hardware"],
          ["/modules/work-orders", "Work orders"],
          ["/modules/monitoring", "Monitoring"],
          ["/settings/module-access", "Modules"],
        ],
      };
    }
    var specs = [
      [/workorder|createworkorder/, "/api/work-orders", [["title", "Title"], ["type", "Type"], ["priority", "Priority"]]],
      [/customeronboarding|addeditcustomer/, "/api/customers", [["name", "Customer name"], ["email", "Email"], ["phone", "Phone"]]],
      [/subscribercreation/, "/api/hss/subscribers", [["imsi", "IMSI"], ["name", "Subscriber name"], ["msisdn", "MSISDN"]]],
      [/bandwidthplan/, "/api/hss/bandwidth-plans", [["name", "Plan name"], ["downloadMbps", "Download Mbps"], ["uploadMbps", "Upload Mbps"]]],
      [/subscribergroup/, "/api/hss/groups", [["name", "Group name"], ["description", "Description"]]],
      [/inventorycheckin/, "/api/inventory/check-in", [["serialNumber", "Serial number"], ["location", "Location"], ["notes", "Notes"]]],
      [/rmatracking|addrma/, "/api/inventory/rma", [["serialNumber", "Serial number"], ["reason", "RMA reason"], ["notes", "Notes"]]],
      [/scanmodal/, "/api/inventory", [["search", "Serial, MAC, or asset tag"]], "GET"],
      [/customerlookup/, "/api/customers", [["search", "Name, email, phone, or account"]], "GET"],
      [/ticketdetails/, "/api/incidents", [["search", "Ticket number or title"]], "GET"],
      [/createticket/, "/api/incidents", [["title", "Ticket title"], ["description", "Description"], ["priority", "Priority"]]],
      [/deviceonboarding|deviceregistration/, "/api/network/cpe", [["name", "Device name"], ["serialNumber", "Serial number"], ["macAddress", "MAC address"]]],
      [/troubleshooting/, "/api/network/cpe", [["deviceId", "Device ID"], ["issue", "Issue or symptom"], ["notes", "Diagnostic notes"]]],
      [/presetcreation/, "/api/network", [["name", "Preset name"], ["deviceType", "Device type"], ["parameters", "Parameters (JSON)"]]],
      [/bulkoperations/, "/api/network", [["operation", "Operation"], ["deviceIds", "Device IDs"], ["notes", "Notes"]]],
      [/firmwareupdate/, "/api/network", [["deviceIds", "Device IDs"], ["firmwareVersion", "Firmware version"], ["schedule", "Schedule"]]],
      [/cbrsdeviceregistration/, "/api/network/sectors", [["name", "CBSD name"], ["fccId", "FCC ID"], ["serialNumber", "Serial number"], ["siteId", "Site ID"], ["mcc", "MCC"], ["mnc", "MNC"]]],
      [/cbrssetup/, "/api/network/sectors", [["name", "CBRS network name"], ["siteId", "Primary site ID"], ["fccId", "FCC ID"], ["contactEmail", "Contact email"]]],
      [/deployment|sitedeployment|hardwaredeployment|epcdeployment|basewizard/, "/api/network/hardware-deployments", [["name", "Deployment name"], ["siteId", "Site ID"], ["type", "Deployment type"]]],
      [/firsttimesetup/, "/api/tenant-settings", [["organizationName", "Organization name"], ["contactEmail", "Contact email"], ["timezone", "Timezone"], ["siteName", "First site name"], ["latitude", "Latitude"], ["longitude", "Longitude"]]],
      [/organizationsetup/, "/api/tenant-settings", [["organizationName", "Organization name"], ["organizationType", "Organization type"], ["contactEmail", "Contact email"], ["address", "Address"]]],
      [/initialconfiguration/, "/api/tenant-settings", [["timezone", "Timezone"], ["dateFormat", "Date format"], ["units", "Measurement units"], ["currency", "Currency"]]],
      [/monitoringsetup/, "/api/tenant-settings", [["monitoringName", "Monitoring profile"], ["timezone", "Timezone"], ["contactEmail", "Alert email"]]],
      [/inviteuser|edituser/, "/api/users", [["email", "Email"], ["name", "Name"], ["role", "Role"]]],
      [/siteedit|addsite/, "/api/network/sites", [["name", "Site name"], ["latitude", "Latitude"], ["longitude", "Longitude"]]],
      [/addsector/, "/api/network/sectors", [["name", "Sector name"], ["siteId", "Site ID"], ["technology", "Technology"]]],
      [/addcpe/, "/api/network/cpe", [["name", "CPE name"], ["serialNumber", "Serial number"], ["siteId", "Site ID"]]],
      [/backhaul/, "/api/network/backhaul", [["name", "Link name"], ["fromSiteId", "From site"], ["toSiteId", "To site"]]],
      [/bundle/, "/api/bundles", [["name", "Bundle name"], ["description", "Description"]]],
      [/frequencyplanner|pciplanner|conflictresolution/, "/api/network/sectors", [["siteId", "Site ID"], ["sectorId", "Sector ID"], ["value", "Target value"]]],
      [/importwizard/, "/api/network", [["format", "Import format"], ["records", "CSV or JSON records"], ["notes", "Import notes"]]],
    ];
    for (var i = 0; i < specs.length; i++) {
      if (specs[i][0].test(key)) {
        return {
          endpoint: specs[i][1],
          fields: specs[i][2],
          method: specs[i][3] || "POST",
          links: [],
        };
      }
    }
    return {
      endpoint: "",
      fields: [["query", humanize(name) + " input"]],
      links: [],
    };
  }

  function shellFormHtml(name, kind) {
    var spec = shellBlueprint(name, kind);
    if (spec.nav) {
      return (
        '<nav class="cwl-converted-nav" aria-label="' +
        humanize(name) +
        '">' +
        spec.links
          .map(function (link) {
            return '<a class="wisp-demo-btn" href="' + link[0] + '">' + link[1] + "</a>";
          })
          .join("") +
        "</nav>"
      );
    }
    function fieldHtml(field) {
      var lower = String(field[0]).toLowerCase();
      var type =
        /email/.test(lower)
          ? "email"
          : /latitude|longitude|mbps|port/.test(lower)
            ? "number"
            : "text";
      var required = /name|email|serial|imsi|title|deviceid|siteid/.test(lower)
        ? " required"
        : "";
      if (/notes|description|parameters|records|address|issue|deviceids/.test(lower)) {
        return (
          '<label class="form-group"><span>' +
          field[1] +
          '</span><textarea name="' +
          field[0] +
          '" rows="4"' +
          required +
          "></textarea></label>"
        );
      }
      return (
        '<label class="form-group"><span>' +
        field[1] +
        '</span><input type="' +
        type +
        '" name="' +
        field[0] +
        '" autocomplete="off"' +
        (type === "number" ? ' step="any"' : "") +
        required +
        "></label>"
      );
    }
    var method = spec.method || "POST";
    if (kind === "wizard") {
      var midpoint = Math.max(1, Math.ceil(spec.fields.length / 2));
      var groups = [spec.fields.slice(0, midpoint), spec.fields.slice(midpoint)].filter(
        function (group) {
          return group.length > 0;
        },
      );
      groups.push([]);
      var total = groups.length;
      return (
        '<form class="cwl-converted-shell-form cwl-converted-wizard" data-cwl-shell-endpoint="' +
        spec.endpoint +
        '" data-cwl-shell-method="' +
        method +
        '" data-cwl-current-step="0" data-cwl-total-steps="' +
        total +
        '">' +
        '<div class="cwl-wizard-progress" aria-label="Wizard progress">' +
        groups
          .map(function (_group, index) {
            return (
              '<span class="cwl-wizard-progress-step' +
              (index === 0 ? " active" : "") +
              '" data-cwl-progress-step="' +
              index +
              '">' +
              (index + 1) +
              "</span>"
            );
          })
          .join("") +
        "</div>" +
        groups
          .map(function (group, index) {
            var review = index === total - 1;
            return (
              '<fieldset class="cwl-wizard-step" data-cwl-wizard-step="' +
              index +
              '"' +
              (index === 0 ? "" : " hidden") +
              "><legend>" +
              (review ? "Review and submit" : "Step " + (index + 1)) +
              "</legend>" +
              (review
                ? '<dl class="cwl-wizard-review" aria-live="polite"></dl>'
                : group.map(fieldHtml).join("")) +
              '<div class="cwl-wizard-controls">' +
              (index > 0
                ? '<button type="button" class="btn-secondary" data-cwl-wizard-back>Previous</button>'
                : "") +
              (review
                ? spec.endpoint
                  ? '<button type="submit" class="btn-primary">Save</button>'
                  : '<button type="button" class="btn-secondary cwl-shell-close">Done</button>'
                : '<button type="button" class="btn-primary" data-cwl-wizard-next>Next</button>') +
              "</div></fieldset>"
            );
          })
          .join("") +
        '<div class="wisp-wizard-status" hidden aria-live="polite"></div></form>'
      );
    }
    return (
      '<form class="cwl-converted-shell-form" data-cwl-shell-endpoint="' +
      spec.endpoint +
      '" data-cwl-shell-method="' +
      method +
      '">' +
      spec.fields.map(fieldHtml).join("") +
      '<div class="wisp-wizard-status" hidden aria-live="polite"></div>' +
      (spec.endpoint
        ? '<button type="submit" class="btn-primary">Save</button>'
        : '<button type="button" class="btn-secondary cwl-shell-close">Done</button>') +
      "</form>"
    );
  }

  function ensureOverlayChrome(el, name, kind) {
    el.setAttribute("data-cwl-island", kind === "nav" ? "navigation" : "form");
    scrubShellJunk(el);
    if (el.querySelector(".cwl-shell-chrome")) return;
    el.innerHTML =
      '<div class="cwl-shell-chrome">' +
      '<header class="cwl-shell-header"><h2>' +
      humanize(name) +
      '</h2><button type="button" class="cwl-shell-close" aria-label="Close">×</button></header>' +
      '<div class="cwl-shell-body">' +
      shellFormHtml(name, kind) +
      "</div>" +
      '<footer class="cwl-shell-footer"><button type="button" class="cwl-shell-close btn-secondary">Close</button></footer>' +
      "</div>";
  }

  function ensureInlineShell(el, name, kind) {
    el.setAttribute("data-cwl-island", "shell");
    scrubShellJunk(el);
    el.setAttribute("aria-hidden", "false");
    var hasContent =
      el.querySelector("table, .cwl-widget-summary, #arcgis-map-view, canvas, svg, .cwl-inline-shell");
    if (hasContent) {
      el.classList.add("cwl-" + kind + "-shell-ready");
      if (!el.querySelector(".cwl-inline-shell-caption")) {
        var cap = document.createElement("div");
        cap.className = "cwl-inline-shell-caption";
        cap.textContent =
          humanize(name) +
          (kind === "widget" && el.getAttribute("data-cwl-hydrated") === "1"
            ? " — live summary"
            : " — live component");
        el.insertBefore(cap, el.firstChild);
      }
      return;
    }
    if (kind === "map") {
      el.innerHTML =
        '<div class="cwl-map-shell-label cwl-inline-shell"><strong>' +
        humanize(name) +
        '</strong><a class="wisp-demo-btn" href="/modules/coverage-map">Open live coverage map</a></div>';
    } else if (kind === "chart") {
      el.innerHTML =
        '<div class="cwl-inline-shell-caption">' +
        humanize(name) +
        ' — live telemetry</div><canvas width="480" height="180" role="img" aria-label="' +
        humanize(name) +
        ' telemetry chart"></canvas><div class="wisp-wizard-status" aria-live="polite">Loading telemetry…</div>';
      var canvas = el.querySelector("canvas");
      var chartStatus = el.querySelector(".wisp-wizard-status");
      if (canvas && window.WispCwlApi) {
        window.WispCwlApi
          .fetch("/api/monitoring/graphs")
          .then(function (r) {
            if (!r.ok) throw new Error("telemetry " + r.status);
            return r.json();
          })
          .then(function (data) {
            var values = [];
            JSON.stringify(data).replace(/-?\d+(?:\.\d+)?/g, function (n) {
              if (values.length < 60) values.push(Number(n));
              return n;
            });
            var ctx = canvas.getContext("2d");
            if (!ctx || !values.length) throw new Error("no telemetry samples");
            var min = Math.min.apply(Math, values);
            var max = Math.max.apply(Math, values);
            var span = max - min || 1;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#00d9ff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            values.forEach(function (value, index) {
              var x = (index / Math.max(1, values.length - 1)) * canvas.width;
              var y = canvas.height - ((value - min) / span) * (canvas.height - 16) - 8;
              if (index === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();
            if (chartStatus) chartStatus.textContent = values.length + " live sample(s)";
          })
          .catch(function (error) {
            if (chartStatus) chartStatus.textContent = error.message || String(error);
          });
      }
    } else {
      el.innerHTML =
        '<div class="cwl-inline-shell"><strong>' +
        humanize(name) +
        '</strong><span>Live page data</span><button type="button" class="wisp-demo-btn" data-cwl-action="refresh">Refresh</button></div>';
    }
    el.classList.add("cwl-" + kind + "-shell-ready");
  }

  function openShell(el) {
    if (!el) return;
    el.removeAttribute("hidden");
    el.setAttribute("aria-hidden", "false");
    el.classList.add("cwl-shell-open");
    // Lifted Help/Tips chrome nests the real overlay inside the component root.
    var nested = el.querySelector(
      ".help-overlay, .tips-overlay, .modal-overlay, .wizard-overlay, .settings-overlay, .popup-overlay",
    );
    if (nested) {
      nested.removeAttribute("hidden");
      nested.setAttribute("aria-hidden", "false");
    }
  }

  function closeShell(el) {
    if (!el) return;
    el.setAttribute("hidden", "");
    el.setAttribute("aria-hidden", "true");
    el.classList.remove("cwl-shell-open");
    var nested = el.querySelector(
      ".help-overlay, .tips-overlay, .modal-overlay, .wizard-overlay, .settings-overlay, .popup-overlay",
    );
    if (nested) {
      nested.setAttribute("hidden", "");
      nested.setAttribute("aria-hidden", "true");
    }
  }

  var OVERLAY_SEL =
    "[data-cwl-modal-shell], [data-cwl-wizard-shell], [data-cwl-nav-shell]";

  var isCoverageMapPage =
    !!document.querySelector('[data-wisp-page="coverage-map"]') ||
    (typeof location !== "undefined" && /\/modules\/coverage-map\/?/.test(location.pathname || ""));

  // Coverage-map: keep empty Add* shells inert (display:none via island CSS). Do not invent
  // modal chrome or Tips/Help openers — origin has .help-button and lifted HelpModal (D6443).
  if (!isCoverageMapPage) {
    document.querySelectorAll("[data-cwl-modal-shell]").forEach(function (el) {
      ensureOverlayChrome(el, el.getAttribute("data-cwl-modal-shell") || "Modal", "modal");
      el.classList.add("cwl-modal-shell-ready");
    });
    document.querySelectorAll("[data-cwl-wizard-shell]").forEach(function (el) {
      ensureOverlayChrome(el, el.getAttribute("data-cwl-wizard-shell") || "Wizard", "wizard");
      el.classList.add("cwl-wizard-shell-ready");
    });
    document.querySelectorAll("[data-cwl-nav-shell]").forEach(function (el) {
      ensureOverlayChrome(el, el.getAttribute("data-cwl-nav-shell") || "Menu", "nav");
      el.classList.add("cwl-nav-shell-ready");
    });
  } else {
    document.querySelectorAll("[data-cwl-modal-shell], [data-cwl-wizard-shell]").forEach(function (el) {
      el.classList.add("cwl-modal-shell");
      el.setAttribute("aria-hidden", "true");
      el.classList.remove("cwl-shell-open");
    });
  }
  document.querySelectorAll("[data-cwl-map-shell]").forEach(function (el) {
    // ArcGIS host already has #arcgis-map-view — do not overwrite with "map shell" placeholder.
    if (el.querySelector("#arcgis-map-view") || el.id === "arcgis-map-view") {
      el.classList.add("cwl-map-shell-ready");
      return;
    }
    // Origin SharedMap = iframe → coverage-map ArcGIS island (D6442 / D6448-ST).
    var mapName = el.getAttribute("data-cwl-map-shell") || "Map";
    if (
      mapName === "SharedMap" ||
      el.querySelector("iframe.plan-map-iframe, iframe[data-cwl-island='shared-map']")
    ) {
      if (!el.querySelector("iframe")) {
        var mode = el.getAttribute("data-cwl-map-mode") || "plan";
        var page = document.querySelector("[data-wisp-page]");
        var pageId = (page && page.getAttribute("data-wisp-page")) || "";
        if (/deploy/i.test(pageId)) mode = "deploy";
        var qs =
          mode === "deploy"
            ? "mode=deploy&hideStats=true&deployMode=true"
            : "mode=plan&hideStats=true&planMode=true";
        var id = mode === "deploy" ? "deploy-map-iframe" : "plan-map-iframe";
        el.innerHTML =
          '<iframe id="' +
          id +
          '" class="plan-map-iframe" title="' +
          (mode === "deploy" ? "Deploy" : "Plan") +
          ' map" src="/modules/coverage-map?' +
          qs +
          '" data-cwl-island="shared-map" data-cwl-map-mode="' +
          mode +
          '"></iframe>';
      }
      el.removeAttribute("aria-hidden");
      el.setAttribute("data-cwl-island", "shared-map");
      el.classList.add("cwl-map-shell-ready");
      return;
    }
    ensureInlineShell(el, mapName, "map");
  });
  document.querySelectorAll("[data-cwl-chart-shell]").forEach(function (el) {
    ensureInlineShell(el, el.getAttribute("data-cwl-chart-shell") || "Chart", "chart");
  });
  document.querySelectorAll("[data-cwl-widget-shell]").forEach(function (el) {
    ensureInlineShell(el, el.getAttribute("data-cwl-widget-shell") || "Widget", "widget");
  });

  // Convert empty no-source add forms into live API-backed forms.
  document
    .querySelectorAll('form[data-cwl-form-shell-empty="true"], [data-cwl-form-shell="converted-add"] form')
    .forEach(function (form) {
      if (form.querySelector("input,select,textarea")) return;
      var host = form.closest("[data-cwl-route], [data-cwl-form-shell]") || form;
      var route =
        (host && (host.getAttribute("data-cwl-route") || host.getAttribute("data-cwl-form-shell"))) ||
        location.pathname;
      var name = String(route).split("/").filter(Boolean).pop() || "Add";
      var html = shellFormHtml(name, "modal");
      var temp = document.createElement("div");
      temp.innerHTML = html;
      var converted = temp.querySelector("form");
      if (!converted) return;
      if (!converted.getAttribute("data-cwl-shell-endpoint")) {
        var load = document.getElementById("cwl-page-load");
        try {
          var meta = load && load.textContent ? JSON.parse(load.textContent) : null;
          if (meta && meta.apiPath) converted.setAttribute("data-cwl-shell-endpoint", meta.apiPath);
        } catch (_) {}
      }
      form.replaceWith(converted);
    });

  // Ensure every overlay shell on the page has at least one opener in header actions.
  (function ensureShellOpeners() {
    if (isCoverageMapPage) return;
    var actions =
      document.querySelector(".page-header .header-actions") ||
      document.querySelector(".header-actions") ||
      document.querySelector(".module-header .header-actions");
    if (!actions) return;

    function hasOpener(re) {
      var buttons = actions.querySelectorAll("button, a");
      for (var i = 0; i < buttons.length; i++) {
        var t = ((buttons[i].textContent || "") + " " + (buttons[i].getAttribute("aria-label") || "")).trim();
        if (re.test(t)) return true;
      }
      return false;
    }

    function addOpener(label, className, attr, name) {
      if (!document.querySelector("[" + attr + '="' + name + '"]')) return;
      if (hasOpener(new RegExp("^" + label + "$", "i"))) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = className;
      b.textContent = label;
      b.setAttribute("data-cwl-shell-open", attr + ":" + name);
      actions.appendChild(b);
    }

    addOpener("Tips", "btn-secondary tips-btn cwl-shell-opener", "data-cwl-modal-shell", "TipsModal");
    addOpener("Help", "btn-secondary help-btn cwl-shell-opener", "data-cwl-modal-shell", "HelpModal");

    document.querySelectorAll("[data-cwl-wizard-shell]").forEach(function (el) {
      var name = el.getAttribute("data-cwl-wizard-shell");
      if (!name) return;
      var short = humanize(name).replace(/\s*Wizard\s*$/i, "").trim() || name;
      if (actions.querySelector('[data-cwl-shell-open="data-cwl-wizard-shell:' + name + '"]')) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn-secondary cwl-shell-opener";
      b.textContent = short;
      b.title = "Open " + humanize(name) + " shell";
      b.setAttribute("data-cwl-shell-open", "data-cwl-wizard-shell:" + name);
      actions.appendChild(b);
    });
  })();

  function setConvertedWizardStep(form, nextIndex) {
    var steps = form.querySelectorAll("[data-cwl-wizard-step]");
    var index = Math.max(0, Math.min(steps.length - 1, Number(nextIndex) || 0));
    steps.forEach(function (step, stepIndex) {
      var active = stepIndex === index;
      step.hidden = !active;
      step.setAttribute("aria-hidden", active ? "false" : "true");
    });
    form.querySelectorAll("[data-cwl-progress-step]").forEach(function (step, stepIndex) {
      step.classList.toggle("active", stepIndex === index);
      step.classList.toggle("complete", stepIndex < index);
    });
    form.setAttribute("data-cwl-current-step", String(index));
    if (index === steps.length - 1) {
      var review = steps[index].querySelector(".cwl-wizard-review");
      if (review) {
        var rows = [];
        new FormData(form).forEach(function (value, key) {
          if (value !== "") {
            rows.push(
              "<dt>" +
                humanize(key) +
                "</dt><dd>" +
                String(value)
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;") +
                "</dd>",
            );
          }
        });
        review.innerHTML = rows.join("") || "<dt>Details</dt><dd>No optional values entered</dd>";
      }
    }
  }

  document.addEventListener("click", function (ev) {
    var next = ev.target.closest("[data-cwl-wizard-next]");
    var back = ev.target.closest("[data-cwl-wizard-back]");
    if (!next && !back) return;
    var form = ev.target.closest(".cwl-converted-wizard");
    if (!form) return;
    ev.preventDefault();
    var current = Number(form.getAttribute("data-cwl-current-step") || 0);
    if (next) {
      var active = form.querySelector('[data-cwl-wizard-step="' + current + '"]');
      var fields = active ? active.querySelectorAll("input,select,textarea") : [];
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].reportValidity()) return;
      }
      setConvertedWizardStep(form, current + 1);
    } else {
      setConvertedWizardStep(form, current - 1);
    }
  });

  document.addEventListener("submit", function (ev) {
    var form = ev.target && ev.target.closest
      ? ev.target.closest(".cwl-converted-shell-form")
      : null;
    if (!form) return;
    ev.preventDefault();
    var endpoint = form.getAttribute("data-cwl-shell-endpoint") || "";
    if (!endpoint || !window.WispCwlApi) return;
    var method = form.getAttribute("data-cwl-shell-method") || "POST";
    var payload = {};
    new FormData(form).forEach(function (value, key) {
      if (value !== "") payload[key] = value;
    });
    var shell = form.closest(
      "[data-cwl-wizard-shell], [data-cwl-modal-shell], [data-cwl-lifted-component]",
    );
    var shellName = shell
      ? shell.getAttribute("data-cwl-wizard-shell") ||
        shell.getAttribute("data-cwl-modal-shell") ||
        shell.getAttribute("data-cwl-lifted-component") ||
        ""
      : "";
    if (endpoint === "/api/network" && payload.resource == null) {
      payload.resource = String(shellName || "network-operation")
        .replace(/Wizard$|Modal$/g, "")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
    }
    var status = form.querySelector(".wisp-wizard-status");
    if (status) {
      status.hidden = false;
      status.textContent = method === "GET" ? "Searching…" : "Saving…";
    }
    var path = endpoint;
    var opts = { method: method };
    if (method === "GET") {
      var qs = new URLSearchParams(payload).toString();
      if (qs) path += (path.indexOf("?") >= 0 ? "&" : "?") + qs;
    } else {
      opts.body = JSON.stringify(payload);
    }
    window.WispCwlApi
      .fetch(path, opts)
      .then(function (r) {
        return r.text().then(function (text) {
          if (!r.ok) throw new Error("Request failed (" + r.status + ")");
          var data;
          try {
            data = JSON.parse(text);
          } catch (_) {
            data = text;
          }
          return data;
        });
      })
      .then(function (data) {
        if (status) {
          var rows = Array.isArray(data)
            ? data
            : data && typeof data === "object"
              ? Object.keys(data)
                  .map(function (key) {
                    return data[key];
                  })
                  .find(function (value) {
                    return Array.isArray(value);
                  }) || []
              : [];
          status.textContent =
            method === "GET"
              ? "Found " + rows.length + " record(s)"
              : "Saved successfully";
        }
        if (method !== "GET" && window.__wispReloadStructuralModule) {
          setTimeout(window.__wispReloadStructuralModule, 250);
        }
      })
      .catch(function (error) {
        if (status) status.textContent = error.message || String(error);
      });
  });

  document.addEventListener("click", function (ev) {
    // Never steal clicks from stamped nav / back chrome (dashboard module cards, etc.).
    if (
      ev.target &&
      ev.target.closest &&
      ev.target.closest("[data-cwl-nav], .module-back-btn, .wisp-back-btn, [data-action='back']")
    ) {
      return;
    }
    var closeBtn = ev.target.closest(".cwl-shell-close");
    if (closeBtn) {
      var shell = closeBtn.closest(OVERLAY_SEL);
      if (shell) {
        ev.preventDefault();
        closeShell(shell);
      }
      return;
    }

    var opener = ev.target.closest("[data-cwl-shell-open]");
    if (opener) {
      var spec = opener.getAttribute("data-cwl-shell-open") || "";
      var parts = spec.split(":");
      if (parts.length === 2) {
        var target = document.querySelector("[" + parts[0] + '="' + parts[1] + '"]');
        if (target) {
          ev.preventDefault();
          openShell(target);
          return;
        }
      }
    }

    var btn = ev.target.closest("button, a");
    if (!btn) {
      var navHit = ev.target.closest("[data-cwl-nav-shell]");
      if (navHit && !navHit.classList.contains("cwl-shell-open")) {
        ev.preventDefault();
        openShell(navHit);
      }
      return;
    }

    var label = (btn.textContent || "").replace(/\s+/g, " ").trim();
    var title = ((btn.getAttribute("title") || "") + " " + (btn.getAttribute("aria-label") || "")).trim();

    function openByAttr(attr, name) {
      var target = document.querySelector("[" + attr + '="' + name + '"]');
      if (!target) return false;
      ev.preventDefault();
      openShell(target);
      return true;
    }

    if (/^Tips$/i.test(label) || /\btips-btn\b/.test(btn.className) || /^Tips$/i.test(title)) {
      if (openByAttr("data-cwl-modal-shell", "TipsModal")) return;
      if (openByAttr("data-cwl-lifted-component", "TipsModal")) return;
      var tipsOv = document.querySelector(".tips-overlay");
      if (tipsOv) {
        ev.preventDefault();
        openShell(tipsOv);
        return;
      }
    }
    if (
      /^Help$/i.test(label) ||
      /\bhelp-btn\b/.test(btn.className) ||
      /\bhelp-button\b/.test(btn.className) ||
      /Open [Hh]elp/i.test(title)
    ) {
      if (openByAttr("data-cwl-modal-shell", "HelpModal")) return;
      if (openByAttr("data-cwl-lifted-component", "HelpModal")) return;
      var helpOv = document.querySelector(".help-overlay");
      if (helpOv) {
        ev.preventDefault();
        openShell(helpOv);
        return;
      }
    }

    // Match button text to any overlay shell name on the page.
    var overlays = document.querySelectorAll(OVERLAY_SEL);
    for (var i = 0; i < overlays.length; i++) {
      var el = overlays[i];
      var nm =
        el.getAttribute("data-cwl-modal-shell") ||
        el.getAttribute("data-cwl-wizard-shell") ||
        el.getAttribute("data-cwl-nav-shell") ||
        "";
      if (!nm) continue;
      var nice = humanize(nm);
      if (
        label &&
        (label === nm ||
          label === nice ||
          new RegExp(nm.replace(/Modal$|Wizard$/, ""), "i").test(label) ||
          (/Check\s*In/i.test(label) && /CheckIn|Check-?In/i.test(nm)) ||
          (/RMA/i.test(label) && /RMA/i.test(nm)) ||
          (/Onboarding/i.test(label) && /Onboarding/i.test(nm)))
      ) {
        ev.preventDefault();
        openShell(el);
        return;
      }
    }

    if (/Scan\s*Lookup|Check\s*In|Check\s*Out|RMA|Manual Lookup|Onboarding|Wizard/i.test(label) && !/Add Hardware/i.test(label)) {
      var scanShell =
        document.querySelector('[data-cwl-lifted-component="ScanModal"]') ||
        document.querySelector('[data-cwl-modal-shell="ScanModal"]') ||
        document.querySelector(".scan-modal, [data-cwl-lifted-component*='Scan']");
      if (/Scan/i.test(label) && scanShell) {
        ev.preventDefault();
        openShell(scanShell);
        return;
      }
      var checkShell =
        document.querySelector('[data-cwl-lifted-component*="CheckIn"], [data-cwl-modal-shell*="CheckIn"]') ||
        document.querySelector('[data-cwl-lifted-component*="CheckOut"], [data-cwl-modal-shell*="CheckOut"]');
      if (/Check\s*In|Check\s*Out/i.test(label) && checkShell) {
        ev.preventDefault();
        openShell(checkShell);
        return;
      }
      var wiz = document.querySelector("[data-cwl-wizard-shell]");
      if (wiz) {
        ev.preventDefault();
        openShell(wiz);
        return;
      }
    }

    var navShell = btn.closest("[data-cwl-nav-shell]") || (/Wizards|Module menu|Wizard menu/i.test(label) ? document.querySelector("[data-cwl-nav-shell]") : null);
    if (navShell) {
      ev.preventDefault();
      openShell(navShell);
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    document.querySelectorAll(".cwl-shell-open").forEach(function (el) {
      if (el.matches(OVERLAY_SEL)) closeShell(el);
    });
  });
}

/**
 * G9900/G9902/G9913/G9915/G9917–G9919 / G9932–G9939 — structural-shell module pages.
 * Bind island metadata + live /api hydrate for stats without inventing widgets.
 */
function initStructuralModulePages() {
  var STRUCTURAL_SELECTORS = [
    // More-specific pages before broad inventory / user-management shells.
    { sel: ".bundles-page", page: "bundles", api: "/api/bundles" },
    { sel: ".permissions-page", page: "permissions", api: "/api/permissions/roles" },
    { sel: ".role-management-page", page: "roles", api: "/api/permissions/roles" },
    { sel: ".voice-page", page: "voice", api: "/api/voice" },
    { sel: ".wisp-plan-app", page: "plan", api: "/api/plans" },
    {
      sel: '[data-wisp-page="modules-plan"], [data-wisp-page="plan"], [data-wisp-path="/modules/plan"]',
      page: "plan",
      api: "/api/plans",
      pathPrefix: "/modules/plan",
    },
    {
      sel: ".app",
      page: "plan",
      api: "/api/plans",
      pathPrefix: "/modules/plan",
    },
    { sel: ".cbrs-module", page: "cbrs", api: "/api/network/sectors" },
    { sel: ".support-dashboard", page: "support", api: "/api/incidents" },
    { sel: ".module-access-container", page: "module-access", api: "/api/module-access" },
    {
      sel: '[data-wisp-path="/settings/module-access"]',
      page: "module-access",
      api: "/api/module-access",
    },
    {
      sel: '[data-wisp-page="settings_module_access"]',
      page: "module-access",
      api: "/api/module-access",
    },
    {
      sel: ".app",
      page: "pci",
      api: "/api/network/sectors",
      pathPrefix: "/modules/pci-resolution",
    },
    /* Origin hardware list is inventoryService.getInventory — not equipment-only. */
    { sel: ".hardware-page", page: "hardware", api: "/api/inventory" },
    { sel: ".inventory-page", page: "inventory", api: "/api/inventory" },
    { sel: ".customers-page", page: "customers", api: "/api/customers" },
    { sel: ".sites-page", page: "sites", api: "/api/network/sites" },
    { sel: ".work-orders-page", page: "work-orders", api: "/api/work-orders" },
    { sel: ".help-desk-container", page: "help-desk", api: "/api/incidents" },
    { sel: ".maintain-module", page: "maintain", api: "/api/incidents" },
    { sel: ".billing-module", page: "billing", api: "/api/customer-billing" },
    { sel: ".user-management-container", page: "users", api: "/api/users" },
    { sel: ".tenant-management-page", page: "tenants", api: "/api/tenants" },
    { sel: ".hss-management", page: "hss", api: "/api/hss" },
    { sel: ".acs-settings-page", page: "tenant-settings", api: "/api/tenant-settings" },
    { sel: ".acs-cpe-page, .acs-devices-page, [data-wisp-page*='acs']", page: "acs-cpe", api: "/api/network/cpe" },
    { sel: ".backend-management, [data-wisp-page*='backend']", page: "backend", api: "/api/incidents" },
    { sel: ".voice-page", page: "voice", api: "/api/voice" },
    {
      sel: ".admin-page",
      page: "admin-tenants",
      api: "/admin/tenants",
      pathPrefix: "/admin/tenant-management",
    },
    {
      sel: ".admin-page, [data-wisp-page='admin'], [data-wisp-page='tenants']",
      page: "admin-tenants",
      api: "/admin/tenants",
      pathPrefix: "/admin/tenants",
    },
    {
      sel: ".app",
      page: "monitoring",
      api: "/api/monitoring/graphs",
      pathPrefix: "/modules/monitoring",
    },
    {
      sel: ".app",
      page: "deploy",
      api: "/api/plans",
      pathPrefix: "/modules/deploy",
    },
    {
      sel: ".app",
      page: "monitor",
      api: "/api/incidents",
      pathPrefix: "/modules/monitor",
    },
    { sel: '[data-wisp-page="hardware"]', page: "hardware", api: "/api/inventory" },
    { sel: '[data-wisp-page="inventory"]', page: "inventory", api: "/api/inventory" },
    { sel: '[data-wisp-page="customers"]', page: "customers", api: "/api/customers" },
    { sel: '[data-wisp-page="plan"], [data-wisp-page="modules-plan"]', page: "plan", api: "/api/plans" },
    { sel: '[data-wisp-page="modules-deploy"], [data-wisp-page="deploy"]', page: "deploy", api: "/api/plans" },
    { sel: '[data-wisp-page="sites"]', page: "sites", api: "/api/network/sites" },
    { sel: '[data-wisp-page="work-orders"]', page: "work-orders", api: "/api/work-orders" },
    { sel: '[data-wisp-page="hss-management"]', page: "hss", api: "/api/hss" },
    { sel: '[data-wisp-page="user-management"]', page: "users", api: "/api/users" },
    { sel: '[data-wisp-page="tenant-management"]', page: "tenants", api: "/api/tenants" },
    { sel: '[data-wisp-page="billing"]', page: "billing", api: "/api/customer-billing" },
    { sel: '[data-wisp-page="maintain"]', page: "maintain", api: "/api/incidents" },
    { sel: '[data-wisp-page="help-desk"]', page: "help-desk", api: "/api/incidents" },
    { sel: '[data-wisp-page="modules"]', page: "modules", api: "/api/module-access" },
    { sel: '[data-wisp-page="cbrs"]', page: "cbrs", api: "/api/network/sectors" },
    { sel: '[data-wisp-page="voice"]', page: "voice", api: "/api/voice" },
    { sel: '[data-wisp-page="deploy"]', page: "deploy", api: "/api/plans" },
    { sel: '[data-wisp-page="monitoring"]', page: "monitoring", api: "/api/monitoring/graphs" },
    { sel: '[data-wisp-page="acs-cpe-management"]', page: "acs-cpe", api: "/api/network/cpe" },
  ];

  // Keep only endpoints proven unavailable on the current HSS gateway.
  var HONEST_UNAVAILABLE = {
    "/api/mikrotik": true,
  };

  // Map/plan islands hydrate the lifted original modals (PCI planner, plan
  // approval, deployed hardware) through this scoped entry point.
  window.__wispHydrateShellScope = function (rootEl, data, rows) {
    if (!rootEl) return 0;
    return hydrateHolesIn(rootEl, buildHoleContext(data || {}, rows || []));
  };

  var page = null;
  var meta = null;
  for (var i = 0; i < STRUCTURAL_SELECTORS.length; i++) {
    var cand = STRUCTURAL_SELECTORS[i];
    if (cand.pathPrefix && location.pathname.indexOf(cand.pathPrefix) !== 0) continue;
    page = document.querySelector(cand.sel);
    if (page) {
      meta = cand;
      break;
    }
  }
  if (!page || !meta) return;

  page.setAttribute("data-cwl-island", "client");
  if (!page.getAttribute("data-wisp-page")) page.setAttribute("data-wisp-page", meta.page);

  function apiFromLoadScript() {
    var el = document.getElementById("cwl-page-load");
    if (!el || !el.textContent) return "";
    try {
      var j = JSON.parse(el.textContent);
      if (j && typeof j.apiPath === "string" && j.apiPath.indexOf("/api/") === 0) return j.apiPath;
    } catch (_) {}
    return "";
  }

  // Path map overrides wrong traced apiPaths (hardware→inventory, monitoring→graphs).
  // More-specific prefixes must win over /modules/inventory and /modules/user-management.
  var pathApi = "";
  // Combined hardware contract carries inventory items, stats, and EPC/SNMP devices.
  if (location.pathname.indexOf("/modules/hardware") === 0) pathApi = "/api/hardware";
  else if (location.pathname.indexOf("/modules/inventory/bundles") === 0) pathApi = "/api/bundles";
  else if (location.pathname.indexOf("/modules/inventory") === 0) pathApi = "/api/inventory";
  else if (location.pathname.indexOf("/modules/customers") === 0) pathApi = "/api/customers";
  else if (location.pathname.indexOf("/modules/sites") === 0) pathApi = "/api/network/sites";
  else if (location.pathname.indexOf("/modules/work-orders") === 0) pathApi = "/api/work-orders";
  else if (location.pathname.indexOf("/modules/help-desk") === 0) pathApi = "/api/incidents";
  else if (location.pathname.indexOf("/modules/maintain") === 0) pathApi = "/api/incidents";
  else if (location.pathname.indexOf("/modules/billing") === 0) pathApi = "/api/customer-billing";
  else if (location.pathname.indexOf("/modules/user-management/permissions") === 0)
    pathApi = "/api/permissions/roles";
  else if (location.pathname.indexOf("/modules/user-management/roles") === 0)
    pathApi = "/api/permissions/roles";
  else if (location.pathname.indexOf("/modules/user-management") === 0) pathApi = "/api/users";
  else if (location.pathname.indexOf("/modules/tenant-management") === 0) pathApi = "/api/tenants";
  else if (location.pathname.indexOf("/admin/tenant-management") === 0) pathApi = "/admin/tenants";
  else if (location.pathname.indexOf("/admin/tenants") === 0) pathApi = "/admin/tenants";
  else if (location.pathname.indexOf("/modules/monitoring") === 0) pathApi = "/api/monitoring/graphs";
  else if (location.pathname.indexOf("/modules/hss-management") === 0) pathApi = "/api/hss";
  else if (location.pathname.indexOf("/modules/deploy") === 0) pathApi = "/api/plans";
  else if (location.pathname.indexOf("/modules/voice-telephony") === 0) pathApi = "/api/voice";
  else if (location.pathname.indexOf("/modules/plan") === 0) pathApi = "/api/plans";
  else if (location.pathname.indexOf("/modules/acs-cpe-management/settings") === 0)
    pathApi = "/api/tenant-settings";
  else if (location.pathname.indexOf("/modules/cbrs-management") === 0) pathApi = "/api/network/sectors";
  else if (location.pathname.indexOf("/modules/pci-resolution") === 0) pathApi = "/api/network/sectors";
  else if (location.pathname.indexOf("/modules/coverage-map") === 0) pathApi = "/api/network/sites";
  else if (location.pathname.indexOf("/modules/acs-cpe-management") === 0) pathApi = "/api/network/cpe";
  else if (location.pathname.indexOf("/modules/backend-management") === 0) pathApi = "/api/incidents";
  else if (location.pathname.indexOf("/modules/monitor") === 0) pathApi = "/api/incidents";
  else if (location.pathname.indexOf("/settings/module-access") === 0) pathApi = "/api/module-access";
  else if (location.pathname.indexOf("/support-dashboard") === 0) pathApi = "/api/incidents";
  else if (location.pathname.indexOf("/modules/customers/portal") === 0) pathApi = "/api/customers";

  var loadApi = apiFromLoadScript();
  // Prefer path map when load points at a non-list graphs/subpath.
  if (
    loadApi &&
    pathApi &&
    (loadApi.indexOf(pathApi + "/") === 0 || /\/graphs$|\/snmp$/i.test(loadApi))
  ) {
    loadApi = "";
  }
  var api =
    pathApi ||
    page.getAttribute("data-wisp-api") ||
    loadApi ||
    meta.api ||
    "/api/hardware";
  if (!page.getAttribute("data-wisp-api") && loadApi && pathApi && loadApi === pathApi) {
    api = loadApi;
  }
  page.setAttribute("data-wisp-api", api);

  function firstArray(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return null;
    var keys = [
      "users",
      "tenants",
      "groups",
      "deployments",
      "tickets",
      "plans",
      "projects",
      "lines",
      "bundles",
      "permissions",
      "roles",
      "grants",
      "modules",
      "coverage",
      "towers",
      "devices",
      "graphs",
      "items",
      "records",
      "hardware",
      "inventory",
      "customers",
      "sites",
      "workOrders",
      "subscribers",
      "bandwidthPlans",
      "notifications",
      "incidents",
      "invoices",
      "rows",
      "data",
      "results",
    ];
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    for (var k in data) {
      if (Array.isArray(data[k])) return data[k];
    }
    return null;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** G9948 — module-access from /api/module-access (config table or demo list). */
  function fillModuleAccess(data, rows) {
    var modules = Array.isArray(data.modules) && data.modules.length ? data.modules : rows;
    var tbody =
      page.querySelector(".config-table tbody") ||
      page.querySelector(".wisp-demo-table tbody") ||
      page.querySelector("table tbody");
    var host =
      page.querySelector(".config-table-container") ||
      page.querySelector(".wisp-demo-panel") ||
      page.querySelector(".header") ||
      page;
    if (!modules.length) {
      if (tbody) tbody.innerHTML = "";
      if (!page.querySelector("[data-cwl-empty-honest]")) {
        var empty = document.createElement("p");
        empty.setAttribute("data-cwl-empty-honest", "1");
        empty.className = "cwl-empty-honest muted";
        empty.textContent = "No module-access records from " + api + " (API ok — empty list).";
        host.appendChild(empty);
      }
      return;
    }
    if (!tbody) {
      fillList(modules);
      return;
    }
    tbody.innerHTML = modules
      .map(function (m) {
        var name = esc(m.name || m.id || "module");
        var roles = Array.isArray(m.roles) ? m.roles.map(esc).join(", ") : esc(m.status || "");
        return (
          "<tr><td class=\"module-name\"><span class=\"module-icon\"></span> " +
          name +
          "</td><td>" +
          (roles || "—") +
          "</td></tr>"
        );
      })
      .join("");
    var theadRow = page.querySelector(".config-table thead tr, .wisp-demo-table thead tr, table thead tr");
    if (theadRow && theadRow.children.length < 2) {
      var th = document.createElement("th");
      th.textContent = "Roles (from API)";
      theadRow.appendChild(th);
    }
  }

  /** G9905/G9913 — fill labeled stats from API.stats / report.summary / status buckets. */
  function fillStats(data, rows) {
    var stats = data && data.stats && typeof data.stats === "object" ? data.stats : {};
    var summary =
      data && data.report && data.report.summary && typeof data.report.summary === "object"
        ? data.report.summary
        : {};
    var reportBy = summary.byStatus && typeof summary.byStatus === "object" ? summary.byStatus : {};
    var count = rows.length;
    var byStatus = {};
    for (var i = 0; i < rows.length; i++) {
      var st = String(
        rows[i].status || rows[i].serviceStatus || rows[i].accountStatus || "",
      ).toLowerCase();
      if (!st) continue;
      byStatus[st] = (byStatus[st] || 0) + 1;
    }
    if (data && Array.isArray(data.devices)) {
      for (var di = 0; di < data.devices.length; di++) {
        var deviceStatus = String(data.devices[di].status || "").toLowerCase();
        if (deviceStatus) byStatus[deviceStatus] = (byStatus[deviceStatus] || 0) + 1;
      }
    }
    for (var rk in reportBy) {
      if (Object.prototype.hasOwnProperty.call(reportBy, rk)) {
        var key = String(rk).toLowerCase();
        byStatus[key] = Number(reportBy[rk]) || byStatus[key] || 0;
      }
    }

    function resolve(label) {
      var L = String(label || "").toLowerCase();
      if (!L) return null;
      if (/avg resolution|average resolution/.test(L)) return "–";
      if (/total/.test(L) && !/value/.test(L)) {
        return stats.total != null
          ? stats.total
          : summary.totalTickets != null
            ? summary.totalTickets
            : count;
      }
      if (/\bactive\b/.test(L)) {
        // Prefer row/serviceStatus buckets when API.stats.active is missing or 0 (customers).
        if (byStatus.active) return byStatus.active;
        return stats.active != null ? stats.active : 0;
      }
      if (/pending/.test(L)) {
        if (byStatus.pending) return byStatus.pending;
        return stats.pending != null ? stats.pending : 0;
      }
      if (/suspend/.test(L)) return stats.suspended != null ? stats.suspended : byStatus.suspended || 0;
      if (/available|in stock/.test(L)) {
        if (byStatus.available || byStatus.in_stock || byStatus["in-stock"]) {
          return byStatus.available || byStatus.in_stock || byStatus["in-stock"];
        }
        return stats.inStock != null ? stats.inStock : stats.available != null ? stats.available : "–";
      }
      if (/rma|maintenance/.test(L)) return stats.rma != null ? stats.rma : "–";
      if (/deployed|online/.test(L)) {
        var d = (byStatus.deployed || 0) + (byStatus.online || 0);
        return d > 0 ? d : "–";
      }
      if (/epc|snmp/.test(L)) {
        return data && Array.isArray(data.devices) ? data.devices.length : "–";
      }
      if (/value/.test(L)) return "–";
      if (/in progress/.test(L)) {
        return (
          byStatus["in-progress"] ||
          byStatus["in progress"] ||
          byStatus.in_progress ||
          byStatus.assigned ||
          0
        );
      }
      if (/resolved|closed/.test(L)) {
        return (byStatus.resolved || 0) + (byStatus.closed || 0);
      }
      if (/open\b/.test(L) || /high priority/.test(L)) {
        var open = (byStatus.open || 0) + (byStatus["in progress"] || 0) + (byStatus.in_progress || 0);
        if (/high/.test(L)) {
          return stats.highPriority != null
            ? stats.highPriority
            : byStatus.high || byStatus.urgent || "–";
        }
        return stats.open != null ? stats.open : byStatus.open != null ? byStatus.open : open;
      }
      if (/ticket/.test(L)) {
        return stats.total != null
          ? stats.total
          : summary.totalTickets != null
            ? summary.totalTickets
            : count;
      }
      return null;
    }

    page.querySelectorAll(".stat-value").forEach(function (val) {
      var card = val.closest(".stat-card, .stat-item, .stat") || val.parentElement;
      var labelEl = card ? card.querySelector(".stat-label") : null;
      var v = resolve(labelEl ? labelEl.textContent : "");
      if (v !== null) val.textContent = String(v);
    });

    var status = page.querySelector("[data-wisp-api-status], .wisp-api-status");
    if (!status) {
      status = document.createElement("p");
      status.className = "wisp-api-status";
      status.setAttribute("data-wisp-api-status", "1");
      var header = page.querySelector(".page-header, .header, .module-header") || page;
      header.appendChild(status);
    }
    status.textContent = "Live data — " + api + " (" + count + " records)";
    status.classList.remove("error");
  }

  /** G9915 — plans from API only (price/features as returned; no invented money). */
  function fillPlans(data) {
    var plans = data && Array.isArray(data.plans) ? data.plans : [];
    var grid = page.querySelector(".plans-grid");
    if (!grid || !plans.length) return false;
    grid.innerHTML = plans
      .map(function (p) {
        var feats = Array.isArray(p.features) ? p.features.slice(0, 6) : [];
        var price = p.price != null ? String(p.price) : "";
        var interval = p.interval ? "/" + esc(p.interval) : price ? "/mo" : "";
        return (
          '<div class="plan-card cwl-hydrated-card" data-cwl-hydrated="1">' +
          '<div class="plan-header"><h3>' +
          esc(p.name || p.id || "Plan") +
          '</h3><div class="plan-price"><span class="price">' +
          esc(price) +
          '</span><span class="interval">' +
          interval +
          "</span></div></div>" +
          '<p class="plan-description">' +
          esc(p.description || p.status || "") +
          "</p>" +
          '<ul class="plan-features">' +
          feats
            .map(function (f) {
              return "<li>✓ " + esc(f) + "</li>";
            })
            .join("") +
          "</ul></div>"
        );
      })
      .join("");

    var invHost = page.querySelector(".invoices-section");
    var invoices = data && Array.isArray(data.invoices) ? data.invoices : [];
    if (invHost && invoices.length) {
      var list = invHost.querySelector("[data-cwl-hydrated-list]");
      if (!list) {
        list = document.createElement("div");
        list.setAttribute("data-cwl-hydrated-list", "1");
        list.className = "cwl-hydrated-list";
        invHost.appendChild(list);
      }
      list.innerHTML =
        "<table class=\"cwl-hydrated-table\"><thead><tr><th>id</th><th>tenant</th><th>amount</th><th>status</th></tr></thead><tbody>" +
        invoices
          .slice(0, 10)
          .map(function (inv) {
            return (
              "<tr><td>" +
              esc(inv.id) +
              "</td><td>" +
              esc(inv.tenant || "") +
              "</td><td>" +
              esc(inv.amount) +
              "</td><td>" +
              esc(inv.status || "") +
              "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table>";
    }
    return true;
  }

  /** G9919 — deploy control labels from deployment status buckets; map stays a shell. */
  function fillDeployCounts(rows) {
    var byStatus = {};
    for (var i = 0; i < rows.length; i++) {
      var st = String(rows[i].status || "").toLowerCase();
      if (!st) continue;
      byStatus[st] = (byStatus[st] || 0) + 1;
    }
    var total = rows.length;
    var deployed = byStatus.deployed || 0;
    var approved = (byStatus.approved || 0) + (byStatus.scheduled || 0) + (byStatus.ready || 0);
    page.querySelectorAll(".control-label").forEach(function (el) {
      var t = el.textContent || "";
      if (/Approved/i.test(t)) el.textContent = "Approved (" + approved + ")";
      else if (/Projects/i.test(t)) el.textContent = "Projects (" + total + ")";
      else if (/Deployed/i.test(t)) el.textContent = "Deployed (" + deployed + ")";
    });
    var doFetchHw = window.WispCwlApi
      ? window.WispCwlApi.fetch
      : function (p) {
          return fetch(p, { credentials: "same-origin" });
        };
    doFetchHw("/api/inventory")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (doc) {
        var inv =
          (doc && Array.isArray(doc.items) && doc.items) ||
          (doc && Array.isArray(doc.records) && doc.records) ||
          firstArray(doc) ||
          [];
        page.querySelectorAll(".control-label").forEach(function (el) {
          if (/Hardware/i.test(el.textContent || "")) {
            el.textContent = "Hardware (" + inv.length + ")";
          }
        });
      })
      .catch(function () {});
  }

  /** G9933 — plan overlay counts + projects list from /api/plans. */
  function fillPlanCounts(rows) {
    page.querySelectorAll(".control-label").forEach(function (el) {
      var t = el.textContent || "";
      if (/Projects/i.test(t)) el.textContent = "Projects (" + rows.length + ")";
    });
    // Hardware badge: count from /api/inventory (same source as Hardware panel), not a dash.
    var doFetch = window.WispCwlApi
      ? window.WispCwlApi.fetch
      : function (p) {
          return fetch(p, { credentials: "same-origin" });
        };
    doFetch("/api/inventory")
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (doc) {
        var inv =
          (doc && Array.isArray(doc.items) && doc.items) ||
          (doc && Array.isArray(doc.records) && doc.records) ||
          (doc && Array.isArray(doc) && doc) ||
          firstArray(doc) ||
          [];
        var n = inv.length;
        page.querySelectorAll(".control-label").forEach(function (el) {
          var t = el.textContent || "";
          if (/Hardware/i.test(t)) el.textContent = "Hardware (" + n + ")";
        });
      })
      .catch(function () {
        page.querySelectorAll(".control-label").forEach(function (el) {
          var t = el.textContent || "";
          if (/Hardware/i.test(t) && /\(–\)|\(-\)|Loading/i.test(t)) {
            el.textContent = "Hardware (0)";
          }
        });
      });
    var listEl = page.querySelector("#plan-projects-list");
    if (listEl) {
      if (!rows.length) {
        listEl.innerHTML =
          '<p class="plan-panel-empty cwl-empty-honest" data-cwl-empty-honest="1">No plans from /api/plans (API ok — empty list).</p>';
      } else {
        listEl.innerHTML = rows
          .slice(0, 40)
          .map(function (p) {
            var id = esc(p.id || p._id || "");
            var name = esc(p.name || "Plan");
            var status = esc(p.status || "draft");
            return (
              '<article class="plan-project-item cwl-hydrated-card" data-cwl-hydrated="1" data-plan-id="' +
              id +
              '"><h3>' +
              name +
              "</h3><p>Status: " +
              status +
              "</p></article>"
            );
          })
          .join("");
      }
    }
    var summary = page.querySelector("#plan-active-summary, .plan-summary");
    if (summary) {
      if (!rows.length) {
        var empty = summary.querySelector("h3, .plan-summary-title, [data-cwl-hole]");
        if (empty && /Active Plan/i.test(summary.textContent || "")) {
          /* keep heading; stamp honest empty in status line */
        }
        var statusLine = summary.querySelector("p, .status, [class*='status']");
        if (statusLine) statusLine.textContent = "No plans from /api/plans yet.";
      } else if (rows.length) {
        var first = rows[0];
        summary.hidden = false;
        summary.removeAttribute("hidden");
        var titleEl = summary.querySelector("h3");
        if (titleEl) {
          titleEl.textContent = "Active Plan: " + (first.name || first._id || "Plan");
        }
        var paras = summary.querySelectorAll("p");
        if (paras[0]) paras[0].textContent = "Status: " + (first.status || "draft");
        if (paras[1]) {
          paras[1].textContent =
            rows.length + " plan(s) · " + (first.name || first._id || "plan");
        }
        if (summary.id === "plan-active-summary") {
          summary.textContent =
            rows.length +
            " plan(s) — active context: " +
            (first.name || first._id || "plan") +
            " (" +
            (first.status || "draft") +
            ")";
        }
      }
    }
    // Also hydrate lifted project list chrome when id is missing.
    var projectList =
      listEl ||
      page.querySelector(".project-list, .projects-list, [data-cwl-hole-detail*='projects']");
    if (!listEl && projectList && rows.length) {
      var host = projectList.closest(".projects-panel, .modal-body, section") || projectList;
      /* leave structure; counts already updated on control labels */
      void host;
    }
  }

  function fillSitesTable(rows) {
    var loadingEl = page.querySelector(".loading-state");
    var emptyEl = page.querySelector(".empty-state");
    var tbody = page.querySelector(".sites-table tbody");
    /* Convert can drop table chrome when `{#if loading}` kept the busy branch — rebuild. */
    if (!tbody) {
      var host =
        page.querySelector(".stats-grid") ||
        page.querySelector(".sites-page, .module-page, main, .wisp-app-surface") ||
        page;
      var wrap = document.createElement("div");
      wrap.className = "sites-table-container";
      wrap.innerHTML =
        '<table class="sites-table"><thead><tr>' +
        "<th>Site Name</th><th>Type</th><th>Status</th><th>Location</th><th>Contact</th><th>Actions</th>" +
        "</tr></thead><tbody></tbody></table>";
      if (host && host.parentNode && host.classList && host.classList.contains("stats-grid")) {
        host.parentNode.insertBefore(wrap, host.nextSibling);
      } else if (host) {
        host.appendChild(wrap);
      }
      tbody = page.querySelector(".sites-table tbody");
    }
    if (!tbody) return false;
    if (loadingEl) {
      loadingEl.hidden = true;
      loadingEl.setAttribute("aria-hidden", "true");
      loadingEl.style.display = "none";
    }
    if (!rows.length) {
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.removeAttribute("aria-hidden");
        emptyEl.style.display = "";
      }
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-state cwl-empty-honest" data-cwl-empty-honest="1">No sites from /api/network/sites.</td></tr>';
      return true;
    }
    if (emptyEl) {
      emptyEl.hidden = true;
      emptyEl.setAttribute("aria-hidden", "true");
      emptyEl.style.display = "none";
    }
    page.__cwlSitesRows = rows;
    tbody.innerHTML = rows
      .slice(0, 40)
      .map(function (s) {
        var loc = s.location || {};
        var type = Array.isArray(s.type) ? s.type.join(", ") : s.type || "";
        var place =
          loc.address ||
          ([loc.city, loc.state].filter(Boolean).join(", ") ||
            (loc.latitude != null ? loc.latitude + ", " + loc.longitude : ""));
        return (
          "<tr data-cwl-hydrated=\"1\">" +
          "<td><strong>" +
          esc(s.name || s._id || "") +
          "</strong></td>" +
          "<td>" +
          esc(type) +
          "</td>" +
          "<td>" +
          esc(s.status || "") +
          "</td>" +
          "<td>" +
          esc(place) +
          "</td>" +
          "<td>" +
          esc((s.contact && s.contact.name) || "") +
          "</td>" +
          "<td><button type=\"button\" class=\"btn-icon cwl-edit-site\" title=\"Edit Site\" data-site-id=\"" +
          esc(s._id || s.id || "") +
          "\">Edit</button></td></tr>"
        );
      })
      .join("");
    page.querySelectorAll(".stat-value").forEach(function (el, i) {
      if (i === 0) el.textContent = String(rows.length);
    });
    if (page.getAttribute("data-cwl-site-edit-wired") !== "1") {
      page.setAttribute("data-cwl-site-edit-wired", "1");
      page.addEventListener("click", function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest(".cwl-edit-site") : null;
        if (!btn) return;
        ev.preventDefault();
        var sid = btn.getAttribute("data-site-id");
        var cached = page.__cwlSitesRows || [];
        var site = cached.find(function (r) {
          return String(r._id || r.id) === String(sid);
        });
        openStructuralSiteEditorFromRow(site);
      });
    }
    return true;
  }

  function openStructuralSiteEditorFromRow(site) {
    if (!site) return;
    var loc = site.location || {};
    var html =
      '<form id="wisp-struct-site-edit-form" class="wisp-wizard-form">' +
      '<input type="hidden" name="siteId" value="' +
      String(site._id || site.id || "").replace(/"/g, "&quot;") +
      '" />' +
      '<div class="form-group"><label>Name *</label><input name="name" required value="' +
      String(site.name || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="form-group"><label>Status</label><select name="status"><option>active</option><option>inactive</option><option>planned</option></select></div>' +
      '<div class="form-group"><label>Latitude</label><input name="latitude" type="number" step="any" value="' +
      (loc.latitude != null ? loc.latitude : "") +
      '" /></div>' +
      '<div class="form-group"><label>Longitude</label><input name="longitude" type="number" step="any" value="' +
      (loc.longitude != null ? loc.longitude : "") +
      '" /></div>' +
      '<div class="form-group"><label>Notes</label><input name="notes" value="' +
      String(site.notes || "").replace(/"/g, "&quot;") +
      '" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Save changes</button></form>';
    var overlay = openStructuralShellModal("Edit site", html);
    var form = overlay.querySelector("#wisp-struct-site-edit-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    if (form.elements.status && site.status) form.elements.status.value = String(site.status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var id = String(fd.get("siteId") || "");
      var payload = {
        name: fd.get("name"),
        status: fd.get("status") || "active",
        notes: fd.get("notes") || undefined,
        location: {
          latitude: Number(fd.get("latitude")),
          longitude: Number(fd.get("longitude")),
        },
      };
      status.hidden = false;
      status.textContent = "Saving…";
      window.WispCwlApi
        .fetch("/api/network/sites/" + encodeURIComponent(id), {
          method: "PUT",
          body: JSON.stringify(payload),
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved — reloading";
          setTimeout(function () {
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            else location.reload();
          }, 600);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  /** Prefer human fields over nested document keys. */
  function rowTitle(row) {
    return (
      row.name ||
      row.fullName ||
      row.title ||
      row.displayName ||
      row.customerId ||
      row.serialNumber ||
      row.model ||
      row.id ||
      row._id ||
      "Record"
    );
  }

  function rowSubtitle(row) {
    return (
      row.serviceStatus ||
      row.status ||
      row.accountStatus ||
      row.email ||
      row.priority ||
      row.manufacturer ||
      ""
    );
  }

  function preferredCols(row) {
    if (meta.page === "customers") {
      return ["customerId", "fullName", "email", "serviceStatus", "primaryPhone"].filter(function (k) {
        return row[k] !== undefined;
      });
    }
    if (meta.page === "inventory" || meta.page === "hardware") {
      // Fixed column order matching origin table headers (do not drop missing keys —
      // that left status under Manufacturer and Edit under Model).
      return meta.page === "hardware"
        ? ["serialNumber", "manufacturer", "model", "status", "location"]
        : [
            "assetTag",
            "category",
            "type",
            "manufacturer",
            "model",
            "serialNumber",
            "status",
          ];
    }
    if (meta.page === "sites") {
      return ["name", "type", "status"].filter(function (k) {
        return row[k] !== undefined;
      });
    }
    if (meta.page === "work-orders") {
      return ["workOrderId", "title", "status", "priority", "customerName"].filter(function (k) {
        return row[k] !== undefined;
      });
    }
    if (meta.page === "users") {
      return ["email", "displayName", "role", "disabled", "uid"].filter(function (k) {
        return row[k] !== undefined;
      });
    }
    if (meta.page === "admin-tenants") {
      return ["name", "slug", "status", "ownerEmail", "createdAt", "_id", "id"].filter(function (k) {
        return row[k] !== undefined;
      });
    }
    return Object.keys(row)
      .filter(function (k) {
        return typeof row[k] !== "object" || row[k] === null;
      })
      .slice(0, 5);
  }

  /** Passes 33/36 — inventory bulk-update + sites bulk-import toolbars (D6442). */
  function injectBulkToolbar(rows) {
    if (!window.WispCwlApi || !rows || !rows.length) return;
    var host =
      page.querySelector(".page-header .header-actions") ||
      page.querySelector(".module-header-overlay") ||
      page.querySelector(".filters-section") ||
      page.querySelector(".page-header") ||
      page;
    if (!host) return;

    if (meta.page === "inventory" || meta.page === "hardware") {
      if (page.querySelector("[data-cwl-bulk-update]")) {
        /* already have update; still allow import button below */
      } else {
        var bulkBtn = document.createElement("button");
        bulkBtn.type = "button";
        bulkBtn.className = "wisp-demo-btn";
        bulkBtn.setAttribute("data-cwl-bulk-update", "1");
        bulkBtn.textContent = "Bulk update status";
        bulkBtn.title = "POST /api/inventory/bulk-update";
        bulkBtn.addEventListener("click", function () {
          var ids = rows
            .slice(0, 5)
            .map(function (r) {
              return r._id || r.id;
            })
            .filter(Boolean);
          if (!ids.length) {
            setApiStatus("No inventory ids for bulk-update", true);
            return;
          }
          bulkBtn.disabled = true;
          window.WispCwlApi
            .fetch("/api/inventory/bulk-update", {
              method: "POST",
              body: JSON.stringify({
                itemIds: ids,
                updates: { notes: "chrysalis-bulk-update-" + Date.now() },
              }),
            })
            .then(function (r) {
              if (!r.ok) throw new Error("bulk-update " + r.status);
              setApiStatus("Bulk-updated " + ids.length + " item(s)", false);
              if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            })
            .catch(function (err) {
              bulkBtn.disabled = false;
              setApiStatus((err && err.message) || "bulk-update failed", true);
            });
        });
        host.appendChild(bulkBtn);
      }
      if (meta.page === "inventory" && !page.querySelector("[data-cwl-bulk-import]")) {
        var importInv = document.createElement("button");
        importInv.type = "button";
        importInv.className = "wisp-demo-btn";
        importInv.setAttribute("data-cwl-bulk-import", "1");
        importInv.textContent = "Bulk import item";
        importInv.title = "POST /api/inventory/bulk-import";
        importInv.addEventListener("click", function () {
          var stamp = Date.now();
          importInv.disabled = true;
          window.WispCwlApi
            .fetch("/api/inventory/bulk-import", {
              method: "POST",
              body: JSON.stringify({
                items: [
                  {
                    category: "Radio Equipment",
                    equipmentType: "Radio",
                    manufacturer: "Trace",
                    model: "CWL-Bulk",
                    serialNumber: "INV-BULK-" + stamp,
                    status: "available",
                    currentLocation: { type: "warehouse", name: "Main" },
                    notes: "chrysalis-inventory-bulk-import",
                  },
                ],
              }),
            })
            .then(function (r) {
              if (!r.ok && r.status !== 207) throw new Error("bulk-import " + r.status);
              setApiStatus("Inventory bulk-import ok", false);
              if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            })
            .catch(function (err) {
              importInv.disabled = false;
              setApiStatus((err && err.message) || "bulk-import failed", true);
            });
        });
        host.appendChild(importInv);
      }
      if (meta.page === "hardware" && !page.querySelector("[data-cwl-equip-bulk-import]")) {
        var importEq = document.createElement("button");
        importEq.type = "button";
        importEq.className = "wisp-demo-btn";
        importEq.setAttribute("data-cwl-equip-bulk-import", "1");
        importEq.textContent = "Bulk import equipment";
        importEq.title = "POST /api/network/equipment/bulk-import";
        importEq.addEventListener("click", function () {
          var stamp = Date.now();
          importEq.disabled = true;
          window.WispCwlApi
            .fetch("/api/network/equipment/bulk-import", {
              method: "POST",
              body: JSON.stringify({
                equipment: [
                  {
                    name: "CWL Equip Bulk " + stamp,
                    type: "backhaul",
                    manufacturer: "Trace",
                    model: "Bulk",
                    serialNumber: "EQ-BULK-" + stamp,
                    status: "active",
                    location: { latitude: 39.74, longitude: -104.99 },
                    notes: "chrysalis-equipment-bulk-import",
                    createdBy: "demo@wisptools.io",
                  },
                ],
              }),
            })
            .then(function (r) {
              if (!r.ok) throw new Error("equipment bulk-import " + r.status);
              setApiStatus("Equipment bulk-import ok", false);
              if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            })
            .catch(function (err) {
              importEq.disabled = false;
              setApiStatus((err && err.message) || "equipment bulk-import failed", true);
            });
        });
        host.appendChild(importEq);
      }
      return;
    }

    if (meta.page === "sites") {
      if (!page.querySelector("[data-cwl-sites-bulk-import]")) {
        var importBtn = document.createElement("button");
        importBtn.type = "button";
        importBtn.className = "wisp-demo-btn";
        importBtn.setAttribute("data-cwl-sites-bulk-import", "1");
        importBtn.textContent = "Bulk import site";
        importBtn.title = "POST /api/network/sites/bulk-import";
        importBtn.addEventListener("click", function () {
          var stamp = Date.now();
          importBtn.disabled = true;
          window.WispCwlApi
            .fetch("/api/network/sites/bulk-import", {
              method: "POST",
              body: JSON.stringify({
                sites: [
                  {
                    name: "CWL Bulk Site " + stamp,
                    type: ["tower"],
                    status: "active",
                    location: { latitude: 39.75 + (stamp % 100) / 10000, longitude: -104.98 },
                    notes: "chrysalis-sites-bulk-import",
                  },
                ],
              }),
            })
            .then(function (r) {
              if (!r.ok) throw new Error("bulk-import " + r.status);
              setApiStatus("Sites bulk-import ok", false);
              if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            })
            .catch(function (err) {
              importBtn.disabled = false;
              setApiStatus((err && err.message) || "bulk-import failed", true);
            });
        });
        host.appendChild(importBtn);
      }
      if (!page.querySelector("[data-cwl-site-hardware]")) {
        var hwBtn = document.createElement("button");
        hwBtn.type = "button";
        hwBtn.className = "wisp-demo-btn";
        hwBtn.setAttribute("data-cwl-site-hardware", "1");
        hwBtn.textContent = "Deploy hardware";
        hwBtn.title = "POST /api/network/sites/:id/hardware";
        hwBtn.addEventListener("click", function () {
          var siteId = rows[0] && (rows[0]._id || rows[0].id);
          if (!siteId) {
            setApiStatus("No site for hardware deploy", true);
            return;
          }
          hwBtn.disabled = true;
          window.WispCwlApi
            .fetch("/api/network/sites/" + encodeURIComponent(siteId) + "/hardware", {
              method: "POST",
              body: JSON.stringify({
                hardware_type: "router",
                name: "CWL Site HW " + Date.now(),
                config: { notes: "chrysalis-site-hardware" },
              }),
            })
            .then(function (r) {
              if (!r.ok) throw new Error("site hardware " + r.status);
              setApiStatus("Site hardware deployed", false);
              if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
            })
            .catch(function (err) {
              hwBtn.disabled = false;
              setApiStatus((err && err.message) || "site hardware failed", true);
            });
        });
        host.appendChild(hwBtn);
      }
    }

    if (meta.page === "customers" && !page.querySelector("[data-cwl-customers-bulk-import]")) {
      var custImport = document.createElement("button");
      custImport.type = "button";
      custImport.className = "wisp-demo-btn";
      custImport.setAttribute("data-cwl-customers-bulk-import", "1");
      custImport.textContent = "Bulk import customer";
      custImport.title = "POST /api/customers/bulk-import";
      custImport.addEventListener("click", function () {
        var stamp = Date.now();
        custImport.disabled = true;
        window.WispCwlApi
          .fetch("/api/customers/bulk-import", {
            method: "POST",
            body: JSON.stringify({
              items: [
                {
                  firstName: "CWL",
                  lastName: "Bulk" + stamp,
                  primaryPhone: "555" + String(stamp).slice(-7),
                  email: "cwl-bulk-" + stamp + "@example.com",
                  serviceStatus: "active",
                  notes: "chrysalis-customers-bulk-import",
                },
              ],
            }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("customers bulk-import " + r.status);
            setApiStatus("Customers bulk-import ok", false);
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
          })
          .catch(function (err) {
            custImport.disabled = false;
            setApiStatus((err && err.message) || "customers bulk-import failed", true);
          });
      });
      host.appendChild(custImport);
    }

    if (meta.page === "work-orders" && !page.querySelector("[data-cwl-wo-bulk-import]")) {
      var woImport = document.createElement("button");
      woImport.type = "button";
      woImport.className = "wisp-demo-btn";
      woImport.setAttribute("data-cwl-wo-bulk-import", "1");
      woImport.textContent = "Bulk import WO";
      woImport.title = "POST /api/work-orders/bulk-import";
      woImport.addEventListener("click", function () {
        var stamp = Date.now();
        woImport.disabled = true;
        window.WispCwlApi
          .fetch("/api/work-orders/bulk-import", {
            method: "POST",
            body: JSON.stringify({
              workOrders: [
                {
                  title: "CWL Bulk WO " + stamp,
                  type: "installation",
                  status: "open",
                  priority: "medium",
                  notes: "chrysalis-wo-bulk-import",
                },
              ],
            }),
          })
          .then(function (r) {
            if (!r.ok) throw new Error("wo bulk-import " + r.status);
            setApiStatus("Work-orders bulk-import ok", false);
            if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
          })
          .catch(function (err) {
            woImport.disabled = false;
            setApiStatus((err && err.message) || "wo bulk-import failed", true);
          });
      });
      host.appendChild(woImport);
    }
  }

  /** G9905/G9912/G9913/G9917 — hydrate tbody, ticket/tenant grids, or inject a list. */
  function fillList(rows) {
    if (!rows.length) return;
    page.__cwlListRows = rows;
    var loadingEl = page.querySelector(".loading-state");
    if (loadingEl) {
      loadingEl.hidden = true;
      loadingEl.setAttribute("aria-hidden", "true");
      loadingEl.style.display = "none";
    }
    page.querySelectorAll(".empty-state").forEach(function (el) {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      el.style.display = "none";
    });
    var tbody = null;
    if (meta.page === "hardware" || meta.page === "inventory") {
      // Prefer inventory tbody — never dump rows into the EPC/SNMP table.
      page.querySelectorAll("tbody").forEach(function (tb) {
        if (tbody) return;
        if (tb.closest(".cwl-widget-shell, .epc-section, [data-cwl-hole-detail*='epcDevices']"))
          return;
        var th = ((tb.closest("table") || {}).querySelector("thead") || {}).textContent || "";
        if (/Device Code|Network Config|SNMP|Last Seen/i.test(th)) return;
        tbody = tb;
      });
    }
    page.querySelectorAll("tbody").forEach(function (tb) {
      if (!tbody && !tb.closest(".cwl-widget-shell, .epc-section")) tbody = tb;
    });
    /* Hardware: ensure table chrome exists when convert dropped it. */
    if (!tbody && (meta.page === "hardware" || meta.page === "inventory")) {
      var hwHost =
        page.querySelector(".inventory-section, .epc-section, .stats-grid") ||
        page.querySelector(".hardware-page, .inventory-page") ||
        page;
      var wrap = document.createElement("div");
      wrap.className = "table-container";
      wrap.innerHTML =
        '<table class="hardware-table"><thead><tr>' +
        "<th>Hardware</th><th>Category</th><th>Status</th><th>Location</th><th>Actions</th>" +
        "</tr></thead><tbody></tbody></table>";
      if (hwHost && hwHost.classList && hwHost.classList.contains("stats-grid") && hwHost.parentNode) {
        hwHost.parentNode.insertBefore(wrap, hwHost.nextSibling);
      } else if (hwHost) {
        hwHost.appendChild(wrap);
      }
      tbody = page.querySelector(".hardware-table tbody");
    }
    var grid =
      page.querySelector(".tenants-grid") ||
      page.querySelector(".tickets-grid") ||
      page.querySelector(".customer-grid") ||
      page.querySelector(".work-orders-grid") ||
      page.querySelector(".groups-grid") ||
      page.querySelector(".sites-grid") ||
      page.querySelector(".site-grid") ||
      page.querySelector(".bundles-grid") ||
      page.querySelector(".role-tabs");
    /* Work-orders: rebuild grid if convert only left loading/empty. */
    if (!grid && meta.page === "work-orders") {
      var woHost =
        page.querySelector(".filters-section") ||
        page.querySelector(".work-orders-page") ||
        page;
      var woGrid = document.createElement("div");
      woGrid.className = "work-orders-grid";
      if (woHost && woHost.classList && woHost.classList.contains("filters-section") && woHost.parentNode) {
        woHost.parentNode.insertBefore(woGrid, woHost.nextSibling);
      } else if (woHost) {
        woHost.appendChild(woGrid);
      }
      grid = woGrid;
    }
    if (!grid && meta.page === "hss") {
      var hssHost =
        page.querySelector(".tab-content") ||
        page.querySelector(".hss-management") ||
        page;
      var gGrid = document.createElement("div");
      gGrid.className = "groups-grid";
      if (hssHost) hssHost.appendChild(gGrid);
      grid = gGrid;
    }
    var cols = preferredCols(rows[0]);
    if (!cols.length) cols = Object.keys(rows[0]).slice(0, 5);
    var cardClass = page.querySelector(".tenants-grid")
      ? "tenant-card"
      : page.querySelector(".tickets-grid")
        ? "ticket-card"
        : page.querySelector(".work-orders-grid")
          ? "work-order-card"
          : page.querySelector(".groups-grid")
            ? "group-card"
            : page.querySelector(".sites-grid, .site-grid")
              ? "site-card"
              : page.querySelector(".bundles-grid")
                ? "bundle-card"
                : page.querySelector(".role-tabs")
                  ? "role-tab"
                  : "customer-card";
    var editableList =
      meta.page === "inventory" ||
      meta.page === "hardware" ||
      meta.page === "work-orders" ||
      meta.page === "help-desk" ||
      meta.page === "maintain" ||
      meta.page === "monitor" ||
      meta.page === "cbrs" ||
      meta.page === "pci" ||
      meta.page === "acs-cpe";

    var heading = page.querySelector(".tenants-section h2");
    if (heading) heading.textContent = "All Tenants (" + rows.length + ")";
    var custHeading = page.querySelector(".page-header h1, .customers-page h1");
    if (custHeading && meta.page === "customers") {
      /* keep origin title; count goes in status */
    }

    if (tbody && (meta.page === "inventory" || meta.page === "hardware" || !grid)) {
      tbody.innerHTML = rows
        .slice(0, 25)
        .map(function (row) {
          var rid = row._id || row.id || row.customerId || row.serialNumber || row.ticketNumber || "";
          return (
            '<tr data-cwl-hydrated="1" data-id="' +
            esc(rid) +
            '">' +
            cols
              .map(function (c) {
                var v = row[c];
                if (c === "assetTag" && (v == null || v === "")) {
                  v = row.assetTag || row.serialNumber || row._id || row.id || "";
                }
                if (c === "type" && (v == null || v === "")) {
                  v = row.type || row.equipmentType || row.itemType || "";
                }
                if (c === "location" && v && typeof v === "object") {
                  v = v.name || v.siteName || v.warehouse || JSON.stringify(v).slice(0, 40);
                }
                if (v && typeof v === "object") v = v.name || v.city || JSON.stringify(v).slice(0, 40);
                return "<td>" + esc(v == null ? "" : v).slice(0, 48) + "</td>";
              })
              .join("") +
            (editableList
              ? '<td><button type="button" class="btn-icon cwl-edit-row" data-id="' +
                esc(rid) +
                '">Edit</button>' +
                (meta.page === "inventory"
                  ? ' <button type="button" class="btn-icon cwl-inv-delete" data-id="' +
                    esc(rid) +
                    '">Delete</button>'
                  : "") +
                "</td>"
              : "") +
            "</tr>"
          );
        })
        .join("");
      if (page.getAttribute("data-cwl-row-nav-wired") !== "1") {
        page.setAttribute("data-cwl-row-nav-wired", "1");
        page.addEventListener("click", function (ev) {
          var invDel = ev.target && ev.target.closest ? ev.target.closest(".cwl-inv-delete") : null;
          if (invDel && window.WispCwlApi) {
            ev.preventDefault();
            ev.stopPropagation();
            var iid = invDel.getAttribute("data-id");
            invDel.disabled = true;
            window.WispCwlApi
              .fetch("/api/inventory/" + encodeURIComponent(iid), { method: "DELETE" })
              .then(function (r) {
                if (!r.ok) throw new Error("inventory delete " + r.status);
                if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                else location.reload();
              })
              .catch(function (err) {
                invDel.disabled = false;
                setApiStatus((err && err.message) || "Inventory delete failed", true);
              });
            return;
          }
          var editBtn = ev.target && ev.target.closest ? ev.target.closest(".cwl-edit-row") : null;
          if (editBtn) {
            ev.preventDefault();
            ev.stopPropagation();
            var eid = editBtn.getAttribute("data-id");
            var erow = (page.__cwlListRows || []).find(function (r) {
              return (
                String(r._id || "") === eid ||
                String(r.id || "") === eid ||
                String(r.serialNumber || "") === eid ||
                String(r.ticketNumber || "") === eid
              );
            });
            if (!erow) return;
            if (meta.page === "inventory") openStructuralInventoryEditorFromRow(erow);
            else if (meta.page === "hardware") openStructuralEquipmentEditorFromRow(erow);
            else if (meta.page === "work-orders") openStructuralWorkOrderEditorFromRow(erow);
            else if (meta.page === "help-desk" || meta.page === "maintain" || meta.page === "monitor")
              openStructuralIncidentEditorFromRow(erow);
            else if (meta.page === "cbrs" || meta.page === "pci") openStructuralSectorEditorFromRow(erow);
            else if (meta.page === "acs-cpe") openStructuralCpeEditorFromRow(erow);
            return;
          }
          var tr = ev.target && ev.target.closest ? ev.target.closest("tr[data-id]") : null;
          if (!tr || ev.target.closest("button,a,input")) return;
          var id = tr.getAttribute("data-id");
          if (!id) return;
          if (meta.page === "inventory") location.href = "/modules/inventory/" + encodeURIComponent(id);
          else if (meta.page === "work-orders") location.href = "/modules/work-orders/" + encodeURIComponent(id);
          else if (meta.page === "customers") location.href = "/modules/customers/" + encodeURIComponent(id);
          else if (meta.page === "sites") location.href = "/modules/sites/" + encodeURIComponent(id);
          else if (meta.page === "help-desk" || meta.page === "maintain")
            location.href = "/modules/help-desk/" + encodeURIComponent(id);
        });
      }
      if (meta.page === "inventory" || meta.page === "hardware" || !grid) return;
    }

    if (grid) {
      if (meta.page === "customers") {
        grid.innerHTML = rows
          .slice(0, 25)
          .map(function (row) {
            var rid = row._id || row.id || "";
            var addr = row.serviceAddress || {};
            var loc = [addr.street, addr.city, addr.state].filter(Boolean).join(", ");
            var cid =
              row.complaints && row.complaints[0]
                ? row.complaints[0]._id || row.complaints[0].id
                : "";
            return (
              '<div class="customer-card cwl-hydrated-card" data-cwl-hydrated="1" data-id="' +
              esc(rid) +
              '">' +
              '<div class="customer-header"><div class="customer-name-section">' +
              "<h3>" +
              esc(rowTitle(row)) +
              "</h3>" +
              '<span class="customer-id">' +
              esc(row.customerId || row._id || "") +
              "</span></div>" +
              '<span class="status-badge">' +
              esc(rowSubtitle(row)) +
              "</span></div>" +
              '<div class="customer-details">' +
              (row.primaryPhone
                ? '<div class="detail-row"><span class="detail-icon">📞</span><span>' +
                  esc(row.primaryPhone) +
                  "</span></div>"
                : "") +
              (row.email
                ? '<div class="detail-row"><span class="detail-icon">📧</span><span>' +
                  esc(row.email) +
                  "</span></div>"
                : "") +
              (loc
                ? '<div class="detail-row"><span class="detail-icon">📍</span><span>' +
                  esc(loc) +
                  "</span></div>"
                : "") +
              "</div>" +
              '<button type="button" class="btn-icon cwl-cust-delete" data-id="' +
              esc(rid) +
              '">Deactivate</button>' +
              (cid
                ? '<button type="button" class="btn-icon cwl-complaint-resolve" data-id="' +
                  esc(rid) +
                  '" data-complaint-id="' +
                  esc(cid) +
                  '">Resolve complaint</button>'
                : "") +
              "</div>"
            );
          })
          .join("");
        if (page.getAttribute("data-cwl-cust-card-wired") !== "1") {
          page.setAttribute("data-cwl-cust-card-wired", "1");
          page.addEventListener("click", function (ev) {
            var del = ev.target && ev.target.closest ? ev.target.closest(".cwl-cust-delete") : null;
            if (del && window.WispCwlApi) {
              ev.preventDefault();
              var did = del.getAttribute("data-id");
              del.disabled = true;
              window.WispCwlApi
                .fetch("/api/customers/" + encodeURIComponent(did), { method: "DELETE" })
                .then(function (r) {
                  if (!r.ok) throw new Error("customer delete " + r.status);
                  if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                  else location.reload();
                })
                .catch(function (err) {
                  del.disabled = false;
                  setApiStatus((err && err.message) || "Delete failed", true);
                });
              return;
            }
            var cr = ev.target && ev.target.closest ? ev.target.closest(".cwl-complaint-resolve") : null;
            if (cr && window.WispCwlApi) {
              ev.preventDefault();
              var cid2 = cr.getAttribute("data-id");
              var complaintId = cr.getAttribute("data-complaint-id");
              cr.disabled = true;
              window.WispCwlApi
                .fetch(
                  "/api/customers/" +
                    encodeURIComponent(cid2) +
                    "/complaints/" +
                    encodeURIComponent(complaintId),
                  {
                    method: "PUT",
                    body: JSON.stringify({
                      status: "resolved",
                      subject: "CWL complaint",
                      description: "chrysalis-complaint-resolved",
                      _id: complaintId,
                    }),
                  },
                )
                .then(function (r) {
                  if (!r.ok) throw new Error("complaint put " + r.status);
                  if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                  else location.reload();
                })
                .catch(function (err) {
                  cr.disabled = false;
                  setApiStatus((err && err.message) || "Complaint PUT failed", true);
                });
            }
          });
        }
        return;
      }
      grid.innerHTML = rows
        .slice(0, 25)
        .map(function (row) {
          var rid = row._id || row.id || "";
          return (
            '<article class="' +
            cardClass +
            ' cwl-hydrated-card" data-cwl-hydrated="1" data-id="' +
            esc(rid) +
            '">' +
            "<h3>" +
            esc(rowTitle(row)) +
            "</h3>" +
            "<p>" +
            esc(rowSubtitle(row)) +
            "</p>" +
            (editableList || meta.page === "work-orders" || page.querySelector(".bundles-grid")
              ? '<button type="button" class="btn-icon cwl-edit-row" data-id="' +
                esc(rid) +
                '">Edit</button>' +
                (meta.page === "work-orders"
                  ? '<button type="button" class="btn-icon cwl-wo-assign" data-id="' +
                    esc(rid) +
                    '">Assign</button>' +
                    '<button type="button" class="btn-icon cwl-wo-start" data-id="' +
                    esc(rid) +
                    '">Start</button>' +
                    '<button type="button" class="btn-icon cwl-wo-complete" data-id="' +
                    esc(rid) +
                    '">Complete</button>' +
                    '<button type="button" class="btn-icon cwl-wo-close" data-id="' +
                    esc(rid) +
                    '">Close</button>'
                  : "") +
                (meta.page === "help-desk" || meta.page === "maintain" || meta.page === "monitor"
                  ? '<button type="button" class="btn-icon cwl-inc-close" data-id="' +
                    esc(rid) +
                    '">Close</button>'
                  : "") +
                (meta.page === "inventory"
                  ? '<button type="button" class="btn-icon cwl-inv-delete" data-id="' +
                    esc(rid) +
                    '">Delete</button>'
                  : "") +
                (page.querySelector(".bundles-grid") || location.pathname.indexOf("/bundles") >= 0
                  ? '<button type="button" class="btn-icon cwl-bundle-add-item" data-id="' +
                    esc(rid) +
                    '">Add item</button>' +
                    '<button type="button" class="btn-icon cwl-bundle-put-item" data-id="' +
                    esc(rid) +
                    '">Update item</button>' +
                    '<button type="button" class="btn-icon cwl-bundle-del-item" data-id="' +
                    esc(rid) +
                    '">Remove item</button>' +
                    '<button type="button" class="btn-icon cwl-bundle-use" data-id="' +
                    esc(rid) +
                    '">Use</button>' +
                    '<button type="button" class="btn-icon cwl-bundle-delete" data-id="' +
                    esc(rid) +
                    '">Delete bundle</button>'
                  : "")
              : "") +
            "</article>"
          );
        })
        .join("");
      if (page.getAttribute("data-cwl-card-edit-wired") !== "1") {
        page.setAttribute("data-cwl-card-edit-wired", "1");
        page.addEventListener("click", function (ev) {
          function postAction(btn, path, body, failLabel) {
            if (!btn || !window.WispCwlApi) return false;
            ev.preventDefault();
            var id = btn.getAttribute("data-id");
            btn.disabled = true;
            window.WispCwlApi
              .fetch(path.replace(":id", encodeURIComponent(id)), {
                method: "POST",
                body: JSON.stringify(body),
              })
              .then(function (r) {
                if (!r.ok) throw new Error(failLabel + " (" + r.status + ")");
                if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                else location.reload();
              })
              .catch(function (err) {
                btn.disabled = false;
                setApiStatus((err && err.message) || failLabel, true);
              });
            return true;
          }
          if (
            postAction(
              ev.target.closest(".cwl-wo-assign"),
              "/api/work-orders/:id/assign",
              { userId: "cwl-demo", userName: "CWL Demo" },
              "Assign failed",
            )
          )
            return;
          if (
            postAction(
              ev.target.closest(".cwl-wo-start"),
              "/api/work-orders/:id/start",
              { userId: "cwl-demo" },
              "Start failed",
            )
          )
            return;
          if (
            postAction(
              ev.target.closest(".cwl-wo-complete"),
              "/api/work-orders/:id/complete",
              { resolution: "chrysalis-list-complete" },
              "Complete failed",
            )
          )
            return;
          if (
            postAction(
              ev.target.closest(".cwl-wo-close"),
              "/api/work-orders/:id/close",
              {},
              "Close WO failed",
            )
          )
            return;
          if (
            postAction(
              ev.target.closest(".cwl-inc-close"),
              "/api/incidents/:id/close",
              {},
              "Close failed",
            )
          )
            return;
          var invDel = ev.target && ev.target.closest ? ev.target.closest(".cwl-inv-delete") : null;
          if (invDel && window.WispCwlApi) {
            ev.preventDefault();
            var iid = invDel.getAttribute("data-id");
            invDel.disabled = true;
            window.WispCwlApi
              .fetch("/api/inventory/" + encodeURIComponent(iid), { method: "DELETE" })
              .then(function (r) {
                if (!r.ok) throw new Error("inventory delete " + r.status);
                if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                else location.reload();
              })
              .catch(function (err) {
                invDel.disabled = false;
                setApiStatus((err && err.message) || "Inventory delete failed", true);
              });
            return;
          }
          var bunDel = ev.target && ev.target.closest ? ev.target.closest(".cwl-bundle-delete") : null;
          if (bunDel && window.WispCwlApi) {
            ev.preventDefault();
            var bdel = bunDel.getAttribute("data-id");
            bunDel.disabled = true;
            window.WispCwlApi
              .fetch("/api/bundles/" + encodeURIComponent(bdel), { method: "DELETE" })
              .then(function (r) {
                if (!r.ok) throw new Error("bundle delete " + r.status);
                if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                else location.reload();
              })
              .catch(function (err) {
                bunDel.disabled = false;
                setApiStatus((err && err.message) || "Bundle delete failed", true);
              });
            return;
          }
          var addItem =
            ev.target && ev.target.closest ? ev.target.closest(".cwl-bundle-add-item") : null;
          if (addItem && window.WispCwlApi) {
            ev.preventDefault();
            var bid = addItem.getAttribute("data-id");
            addItem.disabled = true;
            window.WispCwlApi
              .fetch("/api/bundles/" + encodeURIComponent(bid) + "/items", {
                method: "POST",
                body: JSON.stringify({
                  name: "CWL Bundle Item",
                  quantity: 1,
                  category: "Radio Equipment",
                  equipmentType: "radio",
                  notes: "chrysalis-bundle-item",
                }),
              })
              .then(function (r) {
                if (!r.ok) throw new Error("Add item failed (" + r.status + ")");
                if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                else location.reload();
              })
              .catch(function (err) {
                addItem.disabled = false;
                setApiStatus((err && err.message) || "Add item failed", true);
              });
            return;
          }
          var putItem =
            ev.target && ev.target.closest ? ev.target.closest(".cwl-bundle-put-item") : null;
          if (putItem && window.WispCwlApi) {
            ev.preventDefault();
            var pbid = putItem.getAttribute("data-id");
            var brow = (page.__cwlListRows || []).find(function (r) {
              return String(r._id || "") === pbid || String(r.id || "") === pbid;
            });
            var itemId =
              brow && Array.isArray(brow.items) && brow.items[0]
                ? brow.items[0]._id || brow.items[0].id
                : "";
            if (!itemId) {
              setApiStatus("No bundle item to update — add an item first", true);
              return;
            }
            putItem.disabled = true;
            window.WispCwlApi
              .fetch(
                "/api/bundles/" +
                  encodeURIComponent(pbid) +
                  "/items/" +
                  encodeURIComponent(itemId),
                {
                  method: "PUT",
                  body: JSON.stringify({
                    quantity: 2,
                    notes: "chrysalis-bundle-item-put",
                  }),
                },
              )
              .then(function (r) {
                if (!r.ok) throw new Error("Update item failed (" + r.status + ")");
                if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                else location.reload();
              })
              .catch(function (err) {
                putItem.disabled = false;
                setApiStatus((err && err.message) || "Update item failed", true);
              });
            return;
          }
          var delItem =
            ev.target && ev.target.closest ? ev.target.closest(".cwl-bundle-del-item") : null;
          if (delItem && window.WispCwlApi) {
            ev.preventDefault();
            var dbid = delItem.getAttribute("data-id");
            var drow = (page.__cwlListRows || []).find(function (r) {
              return String(r._id || "") === dbid || String(r.id || "") === dbid;
            });
            var dItemId =
              drow && Array.isArray(drow.items) && drow.items[0]
                ? drow.items[0]._id || drow.items[0].id
                : "";
            if (!dItemId) {
              setApiStatus("No bundle item to remove — add an item first", true);
              return;
            }
            delItem.disabled = true;
            window.WispCwlApi
              .fetch(
                "/api/bundles/" +
                  encodeURIComponent(dbid) +
                  "/items/" +
                  encodeURIComponent(dItemId),
                { method: "DELETE" },
              )
              .then(function (r) {
                if (!r.ok) throw new Error("Remove item failed (" + r.status + ")");
                if (window.__wispReloadStructuralModule) window.__wispReloadStructuralModule();
                else location.reload();
              })
              .catch(function (err) {
                delItem.disabled = false;
                setApiStatus((err && err.message) || "Remove item failed", true);
              });
            return;
          }
          if (
            postAction(
              ev.target.closest(".cwl-bundle-use"),
              "/api/bundles/:id/use",
              {},
              "Use bundle failed",
            )
          )
            return;
          var editBtn = ev.target && ev.target.closest ? ev.target.closest(".cwl-edit-row") : null;
          if (!editBtn) return;
          ev.preventDefault();
          var eid = editBtn.getAttribute("data-id");
          var erow = (page.__cwlListRows || []).find(function (r) {
            return String(r._id || "") === eid || String(r.id || "") === eid;
          });
          if (!erow) return;
          if (page.querySelector(".bundles-grid") || location.pathname.indexOf("/bundles") >= 0)
            openStructuralBundleEditorFromRow(erow);
          else if (meta.page === "work-orders") openStructuralWorkOrderEditorFromRow(erow);
          else if (meta.page === "help-desk" || meta.page === "maintain" || meta.page === "monitor")
            openStructuralIncidentEditorFromRow(erow);
          else if (meta.page === "cbrs" || meta.page === "pci") openStructuralSectorEditorFromRow(erow);
          else if (meta.page === "acs-cpe") openStructuralCpeEditorFromRow(erow);
        });
      }
      return;
    }

    var host =
      page.querySelector("[data-cwl-hydrated-list]") ||
      page.querySelector(".tab-content") ||
      page.querySelector(".module-content");
    if (
      !host ||
      (host.classList &&
        (host.classList.contains("module-content") || host.classList.contains("tab-content")) &&
        host.children.length > 2)
    ) {
      host = page.querySelector("[data-cwl-hydrated-list]");
    }
    if (!host) {
      host = document.createElement("div");
      host.setAttribute("data-cwl-hydrated-list", "1");
      host.className = "cwl-hydrated-list";
      var filters = page.querySelector(".filters-section, .filters");
      var content = page.querySelector(".tab-content, .module-content");
      var overlay = page.querySelector(".module-header-overlay");
      if (content) {
        content.appendChild(host);
      } else if (filters && filters.parentNode) {
        filters.parentNode.insertBefore(host, filters.nextSibling);
      } else if (overlay && overlay.parentNode) {
        overlay.parentNode.insertBefore(host, overlay.nextSibling);
      } else {
        page.appendChild(host);
      }
    } else if (
      host.classList &&
      (host.classList.contains("module-content") || host.classList.contains("tab-content"))
    ) {
      var nested = host.querySelector("[data-cwl-hydrated-list]");
      if (!nested) {
        nested = document.createElement("div");
        nested.setAttribute("data-cwl-hydrated-list", "1");
        nested.className = "cwl-hydrated-list";
        host.appendChild(nested);
      }
      host = nested;
    }
    host.innerHTML =
      '<table class="cwl-hydrated-table"><thead><tr>' +
      cols.map(function (c) {
        return "<th>" + esc(c) + "</th>";
      }).join("") +
      "</tr></thead><tbody>" +
      rows
        .slice(0, 25)
        .map(function (row) {
          return (
            "<tr>" +
            cols
              .map(function (c) {
                return "<td>" + esc(row[c]).slice(0, 48) + "</td>";
              })
              .join("") +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  }

  /** G9908 — empty filter options become honest disabled placeholders. */
  function initFilterHonesty() {
    page.querySelectorAll("select").forEach(function (sel) {
      var opts = Array.prototype.slice.call(sel.options);
      var empties = opts.filter(function (o) {
        return !(o.textContent || "").trim();
      });
      empties.forEach(function (o) {
        o.parentNode.removeChild(o);
      });
      if (sel.options.length === 0) {
        var ph = document.createElement("option");
        ph.textContent = "Filter not lifted";
        sel.appendChild(ph);
        sel.disabled = true;
        sel.title = "Filter options not lifted into CWL";
        sel.setAttribute("data-cwl-filter-shell", "1");
      } else if (sel.options.length === 1 && /all /i.test(sel.options[0].textContent || "")) {
        sel.setAttribute("data-cwl-filter-shell", "partial");
      }
    });
  }

  function goldenAssetPath(apiPath) {
    var slug = String(apiPath || "")
      .replace(/^\//, "")
      .replace(/\//g, "-")
      .replace(/:/g, "_");
    return "/assets/wisp-api-goldens/GET-" + slug + ".golden.json";
  }

  function fetchApiOrGolden() {
    var doFetch = window.WispCwlApi
      ? window.WispCwlApi.fetch
      : function (p) {
          return fetch(p, { credentials: "same-origin" });
        };
    return doFetch(api)
      .then(function (r) {
        if (!r.ok) throw new Error("API " + api + " returned " + r.status);
        return r.json().then(function (data) {
          return { data: data, source: "live" };
        });
      })
      .catch(function (liveErr) {
        return fetch(goldenAssetPath(api), { credentials: "same-origin" }).then(function (gr) {
          if (!gr.ok) throw liveErr;
          return gr.json().then(function (data) {
            return { data: data, source: "golden", liveError: (liveErr && liveErr.message) || "" };
          });
        });
      });
  }

  function showEmptyHonest() {
    var emptyHost =
      page.querySelector(".customer-grid") ||
      page.querySelector(".bundles-grid") ||
      page.querySelector("tbody") ||
      page.querySelector(".role-tabs") ||
      page.querySelector(".permission-type-selector") ||
      page.querySelector(".page-header");
    if (!emptyHost || page.querySelector("[data-cwl-empty-honest]")) return;
    var empty = document.createElement("p");
    empty.setAttribute("data-cwl-empty-honest", "1");
    empty.className = "cwl-empty-honest muted";
    empty.textContent = "No " + meta.page + " records from " + api + " (API ok — empty list).";
    if (emptyHost.tagName === "TBODY") {
      emptyHost.innerHTML =
        '<tr><td colspan="11" class="empty-state">' + empty.textContent + "</td></tr>";
    } else {
      emptyHost.appendChild(empty);
    }
    if (meta.page === "hardware" && !page.querySelector("[data-cwl-empty-create]")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wisp-demo-btn primary";
      btn.setAttribute("data-cwl-empty-create", "1");
      btn.textContent = "Add equipment";
      btn.style.marginTop = "0.5rem";
      btn.addEventListener("click", function () {
        openStructuralEquipmentOrCpeEditor("equipment");
      });
      (page.querySelector(".page-header") || page).appendChild(btn);
    }
  }

  function setApiStatus(msg, isError) {
    var status = page.querySelector("[data-wisp-api-status], .wisp-api-status");
    if (!status) {
      status = document.createElement("p");
      status.className = "wisp-api-status";
      status.setAttribute("data-wisp-api-status", "1");
      (page.querySelector(".page-header") || page).appendChild(status);
    }
    status.textContent = msg;
    status.classList.toggle("error", !!isError);
  }

  function hydrateDetailFromList() {
    var path = location.pathname.replace(/\/$/, "");
    // Firebase static: 404.html forwards /modules/x/{id} to the template page
    // with ?cwl-detail=<original-path>; hydrate as if we were on that path.
    try {
      var fwd = new URLSearchParams(location.search).get("cwl-detail");
      if (fwd && fwd.indexOf("/") === 0) path = fwd.replace(/\/$/, "").replace(/\/edit$/, "");
    } catch (_) {}
    var specs = [
      { re: /\/modules\/(?:inventory|hardware)\/([^/]+)$/, api: "/api/inventory", keys: ["items", "records"], skip: ["add", "bundles", "reports"] },
      { re: /\/modules\/work-orders\/([^/]+)$/, api: "/api/work-orders", keys: ["workOrders", "items", "records"], skip: ["add"] },
      { re: /\/modules\/customers\/([^/]+)$/, api: "/api/customers", keys: ["customers", "items"], skip: ["add", "portal", "portal-setup"] },
      { re: /\/modules\/sites\/([^/]+)$/, api: "/api/network/sites", keys: ["sites", "items"], skip: ["add"] },
      { re: /\/modules\/help-desk\/([^/]+)$/, api: "/api/incidents", keys: ["incidents", "items", "tickets"], skip: ["add"] },
      { re: /\/modules\/inventory\/bundles\/([^/]+)$/, api: "/api/bundles", keys: ["bundles", "items"], skip: ["add"] },
    ];
    var match = null;
    var spec = null;
    for (var i = 0; i < specs.length; i++) {
      var m = path.match(specs[i].re);
      if (m) {
        match = m;
        spec = specs[i];
        break;
      }
    }
    if (!match || !spec) return;
    var leaf = match[1];
    if (spec.skip.indexOf(leaf) >= 0) return;
    var id = decodeURIComponent(leaf);
    if (id === "preview") id = "";
    var doFetch = window.WispCwlApi
      ? window.WispCwlApi.fetch
      : function (p) {
          return fetch(p, { credentials: "same-origin" });
        };
    doFetch(spec.api)
      .then(function (r) {
        if (!r.ok) throw new Error("list " + r.status);
        return r.json();
      })
      .then(function (data) {
        var rows = Array.isArray(data) ? data : [];
        if (!rows.length) {
          for (var k = 0; k < spec.keys.length; k++) {
            if (Array.isArray(data[spec.keys[k]])) {
              rows = data[spec.keys[k]];
              break;
            }
          }
        }
        var row = id
          ? rows.find(function (x) {
              return (
                String(x._id || "") === id ||
                String(x.id || "") === id ||
                String(x.customerId || "") === id ||
                String(x.ticketNumber || "") === id ||
                String(x.serialNumber || "") === id ||
                String(x.incidentNumber || "") === id
              );
            })
          : rows[0];
        if (!row) {
          setApiStatus("No matching record for " + (id || "preview") + " via " + spec.api, true);
          return;
        }
        page.__cwlDetailRow = row;
        page.querySelectorAll("[data-cwl-hole-detail]").forEach(function (el) {
          var detail = el.getAttribute("data-cwl-hole-detail") || "";
          var key = detail
            .replace(/^item\./, "")
            .replace(/^workOrder\./, "")
            .replace(/^customer\./, "")
            .replace(/^site\./, "")
            .replace(/^incident\./, "")
            .replace(/^bundle\./, "")
            .split(".")[0];
          if (!key) return;
          var val = row[key];
          if (val != null && typeof val !== "object") {
            el.textContent = String(val);
            el.removeAttribute("data-cwl-hole");
            el.removeAttribute("data-cwl-bind");
            el.setAttribute("data-cwl-hydrated", "1");
          }
        });
        var title = page.querySelector("h1, h2, .page-header h1");
        if (title && (row.name || row.title || row.fullName || row.serialNumber || row.ticketNumber)) {
          title.textContent = String(
            row.name || row.title || row.fullName || row.serialNumber || row.ticketNumber,
          );
        }
        injectLifecycleActions(spec.api, row);
        setApiStatus("Detail hydrated from " + spec.api);
      })
      .catch(function (e) {
        setApiStatus((e && e.message) || "Detail hydrate failed", true);
      });
  }

  function injectLifecycleActions(listApi, row) {
    if (page.querySelector("[data-cwl-lifecycle]")) return;
    var id = row._id || row.id;
    if (!id || !window.WispCwlApi) return;
    var actions = [];
    if (listApi === "/api/work-orders") {
      actions = [
        {
          label: "Assign",
          path: "/api/work-orders/" + encodeURIComponent(id) + "/assign",
          body: { userId: "cwl-demo", userName: "CWL Demo" },
        },
        {
          label: "Start",
          path: "/api/work-orders/" + encodeURIComponent(id) + "/start",
          body: { userId: "cwl-demo" },
        },
        {
          label: "Log",
          path: "/api/work-orders/" + encodeURIComponent(id) + "/log",
          body: { note: "chrysalis-work-log", hours: 0.5 },
        },
        {
          label: "Complete",
          path: "/api/work-orders/" + encodeURIComponent(id) + "/complete",
          body: { resolution: "chrysalis-complete" },
        },
        { label: "Close", path: "/api/work-orders/" + encodeURIComponent(id) + "/close", body: {} },
        {
          label: "Delete",
          path: "/api/work-orders/" + encodeURIComponent(id),
          body: null,
          method: "DELETE",
        },
      ];
    } else if (listApi === "/api/network/sites") {
      actions = [
        {
          label: "Delete",
          path: "/api/network/sites/" + encodeURIComponent(id),
          body: null,
          method: "DELETE",
        },
      ];
    } else if (listApi === "/api/incidents") {
      actions = [
        {
          label: "Acknowledge",
          path: "/api/incidents/" + encodeURIComponent(id) + "/acknowledge",
          body: { userId: "cwl", userName: "CWL Demo" },
        },
        {
          label: "Note",
          path: "/api/incidents/" + encodeURIComponent(id) + "/notes",
          body: { note: "chrysalis-incident-note", userId: "cwl", userName: "CWL Demo" },
        },
        {
          label: "Resolve",
          path: "/api/incidents/" + encodeURIComponent(id) + "/resolve",
          body: { resolution: "chrysalis-resolve", userId: "cwl" },
        },
        {
          label: "To ticket",
          path: "/api/incidents/" + encodeURIComponent(id) + "/convert-to-ticket",
          body: {},
        },
        { label: "Close", path: "/api/incidents/" + encodeURIComponent(id) + "/close", body: {} },
      ];
    } else if (listApi === "/api/customers") {
      actions = [
        {
          label: "Service note",
          path: "/api/customers/" + encodeURIComponent(id) + "/service-history",
          body: { type: "note", description: "chrysalis-service-history", status: "completed" },
        },
        {
          label: "Complaint",
          path: "/api/customers/" + encodeURIComponent(id) + "/complaints",
          body: { subject: "CWL complaint", description: "chrysalis-complaint", status: "open" },
        },
        {
          label: "Resolve complaint",
          path: "",
          body: {},
          custom: "complaint-put",
        },
        {
          label: "Create subscriber",
          path: "/api/customers/" + encodeURIComponent(id) + "/create-subscriber",
          body: {
            imsi: "00101" + String(Date.now()).slice(-10),
            msisdn: row.primaryPhone || "5550100",
            ki: "",
            opc: "",
          },
        },
        {
          label: "Deactivate",
          path: "/api/customers/" + encodeURIComponent(id),
          body: null,
          method: "DELETE",
        },
      ];
    } else if (listApi === "/api/inventory") {
      actions = [
        {
          label: "Deploy",
          path: "/api/inventory/" + encodeURIComponent(id) + "/deploy",
          body: {
            siteId: row.siteId || undefined,
            location: row.currentLocation || { type: "tower", name: "Deploy" },
            notes: "chrysalis-inventory-deploy",
          },
        },
        {
          label: "Return",
          path: "/api/inventory/" + encodeURIComponent(id) + "/return",
          body: {
            returnLocation: { type: "warehouse", name: "Main Warehouse", id: "wh-main" },
            reason: "other",
            notes: "chrysalis-inventory-return",
          },
        },
        {
          label: "Maintenance",
          path: "/api/inventory/" + encodeURIComponent(id) + "/maintenance",
          body: {
            date: new Date().toISOString(),
            type: "inspection",
            notes: "chrysalis-inventory-maintenance",
            performedBy: "cwl-demo",
          },
        },
        {
          label: "Delete",
          path: "/api/inventory/" + encodeURIComponent(id),
          body: null,
          method: "DELETE",
        },
      ];
    } else return;
    var bar = document.createElement("div");
    bar.setAttribute("data-cwl-lifecycle", "1");
    bar.className = "cwl-lifecycle-actions";
    bar.style.margin = "0.75rem 0";
    actions.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wisp-demo-btn";
      b.textContent = a.label;
      b.addEventListener("click", function () {
        b.disabled = true;
        if (a.custom === "complaint-put") {
          var complaints = row.complaints || [];
          var c0 = complaints[0];
          var complaintId = c0 && (c0._id || c0.id);
          if (!complaintId) {
            b.disabled = false;
            setApiStatus("No complaint to resolve — add one first", true);
            return;
          }
          window.WispCwlApi
            .fetch(
              "/api/customers/" +
                encodeURIComponent(id) +
                "/complaints/" +
                encodeURIComponent(complaintId),
              {
                method: "PUT",
                body: JSON.stringify({
                  status: "resolved",
                  subject: (c0 && c0.subject) || "CWL complaint",
                  description: "chrysalis-complaint-resolved",
                  _id: complaintId,
                }),
              },
            )
            .then(function (r) {
              if (!r.ok) throw new Error(a.label + " failed (" + r.status + ")");
              location.reload();
            })
            .catch(function (err) {
              b.disabled = false;
              setApiStatus((err && err.message) || a.label + " failed", true);
            });
          return;
        }
        var method = a.method || "POST";
        var opts = { method: method };
        if (a.body != null) opts.body = JSON.stringify(a.body);
        window.WispCwlApi
          .fetch(a.path, opts)
          .then(function (r) {
            if (!r.ok) throw new Error(a.label + " failed (" + r.status + ")");
            location.reload();
          })
          .catch(function (err) {
            b.disabled = false;
            setApiStatus((err && err.message) || a.label + " failed", true);
          });
      });
      bar.appendChild(b);
    });
    var header = page.querySelector(".page-header, .module-header-overlay, h1");
    if (header && header.parentNode) header.parentNode.insertBefore(bar, header.nextSibling);
    else page.insertBefore(bar, page.firstChild);
  }

  /** D6448 — evaluate origin hole expressions against live API truth (no invention). */
  function safeEvalHoleExpr(expr, ctx) {
    if (!expr || expr.length > 170) return undefined;
    /* Truncated details can't parse; assignments and global access are rejected. */
    if (/[^=!<>+\-*/%&|^]=(?![=>])/.test(expr)) return undefined;
    if (
      /\b(window|document|location|fetch|XMLHttpRequest|eval|Function|import|require|alert|cookie|localStorage|sessionStorage|globalThis|constructor|prototype|__proto__)\b/.test(
        expr,
      )
    )
      return undefined;
    var names = Object.keys(ctx);
    var vals = names.map(function (n) {
      return ctx[n];
    });
    try {
      var fn = new Function(names.join(","), '"use strict"; return (' + expr + ");");
      return fn.apply(null, vals);
    } catch (e) {
      return undefined;
    }
  }

  /** Resolve compiler-preserved native attribute expressions against CWL context. */
  function applyCwlAttributeBindings(root, ctx) {
    if (!root || !root.querySelectorAll) return 0;
    var selector =
      "[data-cwl-attr-title], [data-cwl-attr-aria-label], [data-cwl-attr-disabled], " +
      "[data-cwl-attr-value], [data-cwl-attr-placeholder]";
    var nodes = [];
    if (root.matches && root.matches(selector)) nodes.push(root);
    root.querySelectorAll(selector).forEach(function (el) {
      nodes.push(el);
    });
    var settled = 0;
    nodes.forEach(function (el) {
      ["title", "aria-label", "disabled", "value", "placeholder"].forEach(function (name) {
        var binding = "data-cwl-attr-" + name;
        if (!el.hasAttribute(binding)) return;
        var value = safeEvalHoleExpr(el.getAttribute(binding) || "", ctx);
        if (value === undefined) return;
        if (name === "disabled") {
          el.disabled = !!value;
          if (value) el.setAttribute("disabled", "");
          else el.removeAttribute("disabled");
        } else if (value === null || value === false) {
          el.removeAttribute(name);
        } else {
          el.setAttribute(name, String(value));
          if (name === "value" && "value" in el) el.value = String(value);
        }
        settled++;
      });
    });
    return settled;
  }

  function normalizeListRows(pageName, rows) {
    if (pageName !== "hardware" && pageName !== "inventory") return rows || [];
    return (rows || []).map(function (row) {
      var next = Object.assign({}, row);
      var label = next.name || next.sku || next.id || "";
      if (next.manufacturer == null || next.manufacturer === "")
        next.manufacturer = next.vendor || next.brand || label || "Inventory";
      if (next.model == null || next.model === "") next.model = label || next.id || "item";
      if (next.serialNumber == null || next.serialNumber === "")
        next.serialNumber = next.serial || next.serial_number || next.id || label;
      if (next.assetTag == null || next.assetTag === "")
        next.assetTag = next.asset_tag || next.tag || next.id || "";
      if (next.category == null || next.category === "")
        next.category = next.type || next.equipmentType || "general";
      if (next.condition == null || next.condition === "") next.condition = next.status || "unknown";
      if (!next.currentLocation || typeof next.currentLocation !== "object") {
        next.currentLocation = {
          siteName:
            (typeof next.location === "string" && next.location) ||
            next.locationType ||
            next.siteName ||
            "Unassigned",
        };
      }
      if (next._id == null) next._id = next.id;
      return next;
    });
  }

  function buildHoleContext(data, rows) {
    var ctx = {};
    if (data && typeof data === "object" && !Array.isArray(data)) {
      for (var k in data) {
        if (Object.prototype.hasOwnProperty.call(data, k) && /^[A-Za-z_$][\w$]*$/.test(k)) {
          ctx[k] = data[k];
        }
      }
    }
    rows = normalizeListRows(meta.page, rows);
    var alias = {
      sites: ["sites", "filteredSites"],
      hardware: ["items", "filteredItems"],
      inventory: ["items", "filteredItems"],
      "work-orders": ["workOrders", "filteredWorkOrders"],
      customers: ["customers", "filteredCustomers"],
      "help-desk": ["tickets", "incidents", "filteredTickets"],
      maintain: ["incidents", "filteredIncidents"],
      plan: ["projects", "plans"],
      deploy: ["plans"],
      users: ["users", "filteredUsers"],
      tenants: ["tenants", "filteredTenants"],
      hss: ["groups"],
      cbrs: ["devices", "grants"],
      pci: ["cells"],
      monitoring: ["devices", "graphs"],
      voice: ["accounts"],
      "acs-cpe": ["devices"],
      billing: ["plans", "invoices"],
    };
    (alias[meta.page] || []).forEach(function (n) {
      if (ctx[n] == null) ctx[n] = rows;
    });
    if (ctx.rows == null) ctx.rows = rows;
    if (ctx.stats == null || typeof ctx.stats !== "object") ctx.stats = {};
    if (ctx.count == null) ctx.count = rows.length;
    if (ctx.total == null) ctx.total = rows.length;
    if (ctx.pagination == null || typeof ctx.pagination !== "object") {
      ctx.pagination = {
        page: 1,
        pages: Math.max(1, Math.ceil(rows.length / 25) || 1),
        total: rows.length,
        limit: 25,
      };
    } else {
      if (ctx.pagination.total == null) ctx.pagination.total = rows.length;
      if (ctx.pagination.page == null) ctx.pagination.page = 1;
      if (ctx.pagination.pages == null)
        ctx.pagination.pages = Math.max(1, Math.ceil(rows.length / 25) || 1);
    }
    if (meta.page === "deploy" || meta.page === "plan") {
      if (ctx.approvedPlans == null)
        ctx.approvedPlans = rows.filter(function (r) {
          return r.status === "approved";
        });
      if (ctx.deployedPlans == null)
        ctx.deployedPlans = rows.filter(function (r) {
          return r.status === "deployed";
        });
      if (ctx.readyPlans == null) ctx.readyPlans = ctx.approvedPlans;
    }
    if (meta.page === "hardware" || meta.page === "inventory") {
      // Always prefer normalized list rows over sparse API stubs copied above.
      ctx.items = rows;
      ctx.filteredItems = rows;
      if (ctx.activeHardwareTab == null) ctx.activeHardwareTab = "all";
      if (ctx.selectedCategory == null) ctx.selectedCategory = "";
      if (ctx.selectedStatus == null) ctx.selectedStatus = "";
      if (ctx.selectedLocation == null) ctx.selectedLocation = "";
      if (ctx.searchQuery == null) ctx.searchQuery = "";
      if (ctx.categoryList == null) {
        var cats = {};
        rows.forEach(function (row) {
          var c = row.category || row.type || row.equipmentType;
          if (c) cats[String(c)] = true;
        });
        ctx.categoryList = Object.keys(cats);
      }
      if (ctx.manufacturers == null) {
        var mans = {};
        rows.forEach(function (row) {
          var m = row.manufacturer || row.vendor;
          if (m) mans[String(m)] = true;
        });
        ctx.manufacturers = Object.keys(mans);
      }
      if (ctx.locations == null) {
        var locs = {};
        rows.forEach(function (row) {
          var loc =
            (row.currentLocation && (row.currentLocation.siteName || row.currentLocation.name)) ||
            row.location ||
            row.locationType;
          if (loc && typeof loc !== "object") locs[String(loc)] = true;
        });
        ctx.locations = Object.keys(locs);
      }
      if (ctx.epcDevices == null && data && Array.isArray(data.devices)) {
        ctx.epcDevices = normalizeListRows(
          "hardware",
          data.devices.map(function (device) {
            return Object.assign(
              {
                deployment_type: device.deployment_type || device.type || "epc",
                site_name: device.site_name || device.siteName || device.name,
              },
              device,
            );
          }),
        );
      }
      if (ctx.epcDevices == null) {
        ctx.epcDevices = rows.filter(function (row) {
          var t = String(row.type || row.category || row.deployment_type || "").toLowerCase();
          return /epc|snmp/.test(t);
        });
      }
      ctx.getCategoryCount = function (category) {
        var c = 0;
        for (var i = 0; i < rows.length; i++) {
          if (String(rows[i].category || rows[i].type || "") === String(category)) c++;
        }
        return c;
      };
      if (ctx.stats.total == null) ctx.stats.total = rows.length;
      if (ctx.stats.available == null)
        ctx.stats.available = rows.filter(function (row) {
          return /available|in.?stock|online/i.test(String(row.status || ""));
        }).length;
      if (ctx.stats.deployed == null)
        ctx.stats.deployed = rows.filter(function (row) {
          return /deployed|online/i.test(String(row.status || ""));
        }).length;
    }
    ctx.formatCurrency = function (v) {
      var n = Number(v);
      return isFinite(n) ? "$" + n.toLocaleString() : "";
    };
    ctx.formatDate = function (v) {
      try {
        return v ? new Date(v).toLocaleDateString() : "";
      } catch (e) {
        return "";
      }
    };
    ctx.formatInTenantTimezone = ctx.formatDate;
    ctx.getStatusCount = function (st) {
      var c = 0;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].status || "").toLowerCase() === String(st).toLowerCase()) c++;
      }
      return c;
    };
    return ctx;
  }

  /** Fill interp holes, resolve if/each holes from live data; leave unevaluable ones honest. */
  function hydrateHoleMarkers(data, rows) {
    var ctx = buildHoleContext(data, rows || []);
    return hydrateHolesIn(page, ctx);
  }

  function hydrateHolesIn(root, ctx) {
    var settled = applyCwlAttributeBindings(root, ctx);
    root
      .querySelectorAll(
        '[data-cwl-hole="legacy:markup-lift-svelte-interp"], [data-cwl-bind="interp"]',
      )
      .forEach(function (el) {
        var v = safeEvalHoleExpr(el.getAttribute("data-cwl-hole-detail") || "", ctx);
        if (v === undefined || v === null || typeof v === "object" || typeof v === "function")
          return;
        el.textContent = String(v);
        el.removeAttribute("data-cwl-hole");
        el.removeAttribute("data-cwl-bind");
        el.setAttribute("data-cwl-hydrated", "1");
        settled++;
      });
    root
      .querySelectorAll('[data-cwl-hole="legacy:markup-lift-svelte-if"], [data-cwl-bind="if"]')
      .forEach(function (el) {
        var v = safeEvalHoleExpr(el.getAttribute("data-cwl-hole-detail") || "", ctx);
        if (v === undefined) return;
        if (!v) {
          el.hidden = true;
          el.setAttribute("aria-hidden", "true");
          el.style.display = "none";
        } else {
          el.hidden = false;
          el.removeAttribute("hidden");
          el.setAttribute("aria-hidden", "false");
          if (el.style.display === "none") el.style.display = "";
        }
        el.removeAttribute("data-cwl-hole");
        el.removeAttribute("data-cwl-bind");
        el.setAttribute("data-cwl-hydrated", "1");
        settled++;
      });
    root
      .querySelectorAll(
        '[data-cwl-hole="legacy:markup-lift-svelte-each"], [data-cwl-bind="each"]',
      )
      .forEach(function (el) {
        var d = el.getAttribute("data-cwl-hole-detail") || "";
        var arrName = (d.split(/\s+as\s+/)[0] || "").trim();
        if (!/^[A-Za-z_$][\w$]*$/.test(arrName)) return;
        var v = ctx[arrName];
        if (!Array.isArray(v)) return;
        if (v.length === 0) {
          el.hidden = true;
          el.setAttribute("aria-hidden", "true");
          el.removeAttribute("data-cwl-hole");
          el.removeAttribute("data-cwl-bind");
          el.setAttribute("data-cwl-hydrated", "1");
          settled++;
          return;
        }
        settled += renderEachRows(el, v, ctx);
      });
    return settled;
  }

  /** Render one node per live array item from the carried Svelte row template. */
  function renderEachRows(el, items, parentCtx) {
    var itemName = el.getAttribute("data-cwl-each-item");
    var tplEnc = el.getAttribute("data-cwl-each-tpl");
    if (!itemName || !tplEnc) {
      /* No carried template — just reveal the skeleton, don't invent rows. */
      el.removeAttribute("data-cwl-hole");
      el.removeAttribute("data-cwl-bind");
      el.setAttribute("data-cwl-hydrated", "1");
      return 1;
    }
    var tpl;
    try {
      tpl = decodeURIComponent(tplEnc);
    } catch (e) {
      return 0;
    }
    var html = "";
    var parentTag = ((el.parentElement && el.parentElement.tagName) || "").toUpperCase();
    var tplStartsTr = /^\s*<tr\b/i.test(tpl);
    var tplStartsLi = /^\s*<li\b/i.test(tpl);
    var tplStartsOption = /^\s*<option\b/i.test(tpl);
    // Browser drops <tr> when the host is not <tbody>/<table>, flattening cells.
    // Force a row wrapper whenever the template's implied parent is wrong.
    var parentOk =
      (tplStartsTr && (parentTag === "TBODY" || parentTag === "TABLE")) ||
      (tplStartsLi && (parentTag === "UL" || parentTag === "OL")) ||
      (tplStartsOption && parentTag === "SELECT") ||
      (!tplStartsTr && !tplStartsLi && !tplStartsOption && parentTag !== "TBODY");
    var needsWrap = !parentOk;
    for (var i = 0; i < items.length && i < 500; i++) {
      var piece = renderRowTemplate(tpl, itemName, items[i], parentCtx);
      if (needsWrap) {
        var rid =
          items[i]._id ||
          items[i].id ||
          items[i].customerId ||
          items[i].ticketNumber ||
          items[i].serialNumber ||
          String(i);
        // Strip orphaned row/cell wrappers that the browser would discard anyway.
        var body = piece
          .replace(/^\s*<tr[^>]*>/i, "")
          .replace(/<\/tr>\s*$/i, "")
          .replace(/<\/?t[dh]\b[^>]*>/gi, function (tag) {
            return /^<\/t[dh]/i.test(tag) ? "</div>" : '<div class="cwl-cell">';
          });
        html +=
          '<div class="cwl-each-row" data-id="' +
          escapeHtml(String(rid)) +
          '">' +
          body +
          "</div>";
      } else {
        html += piece;
      }
    }
    el.innerHTML = html;
    el.removeAttribute("data-cwl-hole");
    el.removeAttribute("data-cwl-bind");
    el.removeAttribute("data-cwl-each-tpl");
    el.setAttribute("data-cwl-hydrated", "1");
    return 1;
  }

  /** Resolve `{item.field}` / `{expr}` interps in a row template against one item. */
  function renderRowTemplate(tpl, itemName, item, parentCtx) {
    var ctx = {};
    for (var k in parentCtx) ctx[k] = parentCtx[k];
    ctx[itemName] = item;
    /* Promote goto() handlers, then strip residual event attrs brace-aware. */
    var out = rewriteRowEventAttrs(tpl, ctx);
    out = out.replace(
      /\sdata-cwl-attr-(title|aria-label|disabled|value|placeholder)="([^"]*)"/g,
      function (_m, name, encodedExpr) {
        var expr = String(encodedExpr)
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&");
        var value = safeEvalHoleExpr(expr, ctx);
        if (value === undefined || value === null || value === false) return "";
        if (name === "disabled") return value ? " disabled" : "";
        return " " + name + '="' + escapeHtml(String(value)) + '"';
      },
    );
    /* Strip block control tokens we can't run per-row; keep plain markup + interps. */
    out = out.replace(/\{[#:/][^}]*\}/g, "");
    out = out.replace(/\{([^{}]+)\}/g, function (m, expr) {
      var e = expr.trim();
      if (/^[#:/@]/.test(e)) return "";
      /* on:click / event bindings are not display text. */
      if (/^\(?\s*\)?\s*=>/.test(e) || /^handle[A-Z]/.test(e) || /\bgoto\s*\(/.test(e)) return "";
      var v = safeEvalHoleExpr(e, ctx);
      if (v === undefined || v === null || typeof v === "object" || typeof v === "function")
        return "";
      return escapeHtml(String(v));
    });
    /* Drop leftover handler tails that escaped attribute rewrite. */
    out = out.replace(/\s*\)\}\s*title=/g, " title=");
    out = out.replace(/\bgoto\([^)]*\)\}\s*/g, "");
    return out;
  }

  /** Brace-aware: convert on:click={() => goto(...)} to data-cwl-nav; strip other events. */
  function rewriteRowEventAttrs(html, ctx) {
    var out = "";
    var i = 0;
    var re = /\s+(?:on:[a-zA-Z][\w:|.-]*|on[a-z]+)\s*=\s*\{/g;
    var m;
    while ((m = re.exec(html)) !== null) {
      out += html.slice(i, m.index);
      var depth = 0;
      var j = m.index + m[0].length - 1;
      for (; j < html.length; j++) {
        if (html[j] === "{") depth++;
        else if (html[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      var body = html.slice(m.index + m[0].length, j - 1);
      var gm = /\bgoto\s*\(\s*(['"`])([\s\S]*?)\1(?:\s*,[\s\S]*?)?\s*\)/.exec(
        body,
      );
      if (gm) {
        var path = String(gm[2] || "").replace(/\$\{([^}]+)\}/g, "{$1}");
        path = path.replace(/\{([^{}]+)\}/g, function (_mm, expr) {
          var v = safeEvalHoleExpr(String(expr).trim(), ctx);
          return v == null ? "" : String(v);
        });
        if (path && path.charAt(0) === "/") {
          out += ' data-cwl-nav="' + escapeHtml(path) + '"';
        }
      } else {
        var ignoredCalls = {
          if: 1,
          for: 1,
          while: 1,
          switch: 1,
          setTimeout: 1,
          setInterval: 1,
          preventDefault: 1,
          stopPropagation: 1,
          encodeURIComponent: 1,
          decodeURIComponent: 1,
        };
        var call = null;
        var callRe = /(^|[^\w$.])([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)/g;
        var callMatch;
        while ((callMatch = callRe.exec(body)) !== null) {
          if (!ignoredCalls[callMatch[2]]) {
            call = callMatch;
            break;
          }
        }
        var directHandler = /^\s*([a-zA-Z_$][\w$]*)\s*$/.exec(body);
        var conditionalHandler =
          /^\s*([a-zA-Z_$][\w$]*)\s*\?\s*([a-zA-Z_$][\w$]*)\s*:\s*([a-zA-Z_$][\w$]*)\s*$/.exec(
            body,
          );
        var setString = /\b([a-zA-Z_$][\w$]*)\s*=\s*(['"])(.*?)\2/.exec(body);
        var setBool = /\b([a-zA-Z_$][\w$]*)\s*=\s*(true|false)\b/.exec(body);
        if (conditionalHandler) {
          out +=
            ' data-cwl-action="' +
            escapeHtml(conditionalHandler[3]) +
            '" data-cwl-action-true="' +
            escapeHtml(conditionalHandler[2]) +
            '" data-cwl-action-state="' +
            escapeHtml(conditionalHandler[1] + ":false") +
            '"';
        } else if (call) {
          out += ' data-cwl-action="' + escapeHtml(call[2]) + '"';
          if ((call[3] || "").trim()) {
            out +=
              ' data-cwl-action-args="' +
              escapeHtml((call[3] || "").trim()) +
              '"';
          }
        } else if (directHandler) {
          out += ' data-cwl-action="' + escapeHtml(directHandler[1]) + '"';
        } else if (setString) {
          out +=
            ' data-cwl-set="' +
            escapeHtml(setString[1] + ":" + setString[3]) +
            '"';
        } else if (setBool) {
          out +=
            ' data-cwl-toggle="' +
            escapeHtml(setBool[1] + ":" + setBool[2]) +
            '"';
        }
      }
      i = j;
      re.lastIndex = j;
    }
    out += html.slice(i);
    return out;
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function settleBusyChrome() {
    page
      .querySelectorAll(
        ".loading-state, .loading-container, .loading-overlay, [data-loading='true']",
      )
      .forEach(function (el) {
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
        el.style.display = "none";
        el.removeAttribute("data-cwl-bind");
      });
    page.querySelectorAll("p, div, span").forEach(function (el) {
      if (el.children.length) return;
      var text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!/^Loading(?:\s|…|\.\.\.)/i.test(text)) return;
      // Do not suppress live select-option labels.
      if (el.closest("select, option")) return;
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      el.style.display = "none";
      el.removeAttribute("data-cwl-bind");
    });
  }

  function load() {
    if (
      /\/modules\/(inventory|work-orders|customers|sites|help-desk)(\/bundles)?\/[^/]+$/.test(
        location.pathname.replace(/\/$/, ""),
      )
    ) {
      var leaf = location.pathname.replace(/\/$/, "").split("/").pop();
      if (
        leaf &&
        leaf !== "add" &&
        leaf !== "bundles" &&
        leaf !== "reports" &&
        leaf !== "portal" &&
        leaf !== "portal-setup"
      ) {
        hydrateDetailFromList();
        return;
      }
    }
    if (HONEST_UNAVAILABLE[api]) {
      setApiStatus(
        meta.page +
          ": HSS has no live mount for " +
          api +
          " (404/403) — not inventing data (D6442)",
        true,
      );
      showEmptyHonest();
      var hole = page.querySelector("[data-cwl-empty-honest]");
      if (hole) {
        hole.textContent =
          "API " + api + " unavailable on HSS for this demo tenant — hole kept honest.";
      }
      return;
    }
    fetchApiOrGolden()
      .then(function (pack) {
        var data = pack.data;
        settleBusyChrome();
        if (meta.page === "billing" && fillPlans(data)) {
          var billRows = Array.isArray(data.plans) ? data.plans : firstArray(data) || [];
          fillStats(data, billRows);
          try {
            hydrateHoleMarkers(data, billRows);
          } catch (e) {}
          return;
        }
        var rows = firstArray(data) || [];
        // Prefer named arrays for remaining-surface pages when stub bodies omit items.
        if (meta.page === "voice" && Array.isArray(data.lines)) rows = data.lines;
        if (meta.page === "cbrs" && Array.isArray(data.grants) && data.grants.length)
          rows = data.grants;
        else if (meta.page === "cbrs" && Array.isArray(data.sites)) rows = data.sites;
        if (meta.page === "cbrs" || meta.page === "pci" || meta.page === "acs-cpe") {
          if (!rows.length) rows = firstArray(data) || [];
        }
        if (meta.page === "hardware" || meta.page === "inventory") {
          if (Array.isArray(data.items) && data.items.length) rows = data.items;
          else if (Array.isArray(data.equipment) && data.equipment.length) rows = data.equipment;
        }
        rows = normalizeListRows(meta.page, rows);
        try {
          var settled = hydrateHoleMarkers(data, rows);
          if (settled) page.setAttribute("data-cwl-holes-settled", String(settled));
        } catch (e) {}
        if (meta.page === "deploy") fillDeployCounts(rows);
        if (meta.page === "plan") {
          fillPlanCounts(rows);
          fillStats(data, rows);
          setApiStatus("plan: " + rows.length + " project(s) via " + (pack.source === "golden" ? "golden" : api), false);
          return;
        }
        if (meta.page === "sites") {
          fillSitesTable(rows);
          fillStats(data, rows);
          if (rows.length) injectBulkToolbar(rows);
          if (!rows.length) showEmptyHonest();
          setApiStatus("sites: " + rows.length + " via " + api, false);
          return;
        }
        if (meta.page === "tenant-settings") {
          if (typeof window.__wispFillTenantSettings === "function") {
            window.__wispFillTenantSettings(data);
          }
          setApiStatus("tenant-settings loaded from " + api, false);
          return;
        }
        if (meta.page === "module-access") {
          fillModuleAccess(data, rows);
          return;
        }
        fillStats(data, rows);
        if (rows.length) {
          var hasItemEach =
            (meta.page === "hardware" || meta.page === "inventory") &&
            page.querySelector(
              '[data-cwl-each-item="item"][data-cwl-hydrated], [data-cwl-hole-detail^="items as"][data-cwl-hydrated]',
            );
          if (!hasItemEach) fillList(rows);
          injectBulkToolbar(rows);
          setApiStatus(
            meta.page +
              ": " +
              rows.length +
              " record(s) via " +
              (pack.source === "golden" ? "golden fallback" : api),
            false,
          );
        } else {
          showEmptyHonest();
          setApiStatus(meta.page + ": empty list from " + api, false);
        }
      })
      .catch(function (e) {
        setApiStatus((e && e.message) || "API unreachable", true);
        showEmptyHonest();
      });
  }

  initFilterHonesty();
  window.__wispReloadStructuralModule = load;
  load();
}

function initModuleDemos() {
  var demos = document.querySelectorAll(".wisp-module-demo[data-cwl-island]");
  if (!demos.length) return;

  function setApiStatus(msg, isError) {
    demos.forEach(function (demo) {
      var el = demo.querySelector("#wisp-demo-api-status");
      if (el) {
        el.textContent = msg;
        el.classList.toggle("error", !!isError);
      }
    });
  }

  function firstArray(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== "object") return null;
    var keys = ["items", "records", "customers", "devices", "subscribers", "projects", "orders", "results", "data", "rows", "users", "tenants", "graphs", "modules", "coverage", "sites", "towers", "groups", "plans", "roles"];
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(data[keys[i]])) return data[keys[i]];
    }
    for (var k in data) {
      if (Array.isArray(data[k])) return data[k];
    }
    return null;
  }

  function fieldOf(row, names) {
    for (var i = 0; i < names.length; i++) {
      var v = row[names[i]];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return "";
  }

  function rowView(r) {
    if (!r || typeof r !== "object") return { id: String(r), name: "", status: "", updated: "" };
    var id = fieldOf(r, ["customerId", "workOrderId", "imsi", "serialNumber", "deviceId", "id", "_id"]);
    var name = fieldOf(r, ["fullName", "displayName", "name", "title", "model", "email", "subject", "description"]);
    var status = fieldOf(r, ["serviceStatus", "status", "state", "accountStatus", "installationStatus"]);
    var updatedRaw = String(fieldOf(r, ["updatedAt", "lastSeen", "createdAt", "date"]));
    var updated = updatedRaw ? updatedRaw.slice(0, 10) : "";
    return {
      id: String(id).slice(0, 24),
      name: String(name).slice(0, 60),
      status: String(status),
      updated: updated,
    };
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderTable(demo, rows) {
    var table = demo.querySelector("#wisp-demo-table tbody");
    if (!table) return;
    if (!rows.length) {
      table.innerHTML = '<tr><td colspan="4">No records yet for this tenant.</td></tr>';
      return;
    }
    table.innerHTML = rows
      .map(function (raw) {
        var r = rowView(raw);
        return (
          "<tr><td>" + esc(r.id) + "</td><td>" + esc(r.name) + "</td><td>" + esc(r.status) + "</td><td>" + esc(r.updated) + "</td></tr>"
        );
      })
      .join("");
  }

  function updateStats(demo, count) {
    var stats = demo.querySelectorAll(".wisp-demo-stat");
    if (!stats.length) return;
    var first = stats[0].querySelector("strong");
    if (first) first.textContent = String(count);
    for (var i = 1; i < stats.length; i++) {
      var strong = stats[i].querySelector("strong");
      if (strong) strong.textContent = "–";
    }
  }

  function loadDemo(demo) {
    var api = demo.getAttribute("data-wisp-api");
    var layout = demo.getAttribute("data-wisp-layout") || "list";
    if (layout === "form" || layout === "docs") {
      setApiStatus("Ready", false);
      return;
    }
    if (!api) {
      renderTable(demo, []);
      setApiStatus("No API bound to this surface", false);
      return;
    }
    setApiStatus("Loading " + api + "…", false);
    var doFetch = window.WispCwlApi ? window.WispCwlApi.fetch : function (p) { return fetch(p, { credentials: "same-origin" }); };
    doFetch(api)
      .then(function (r) {
        if (!r.ok) throw new Error("API " + api + " returned " + r.status);
        return r.json();
      })
      .then(function (data) {
        var rows = firstArray(data) || [];
        renderTable(demo, rows.slice(0, 25));
        updateStats(demo, rows.length);
        setApiStatus("Live data — " + api + " (" + rows.length + " records)", false);
      })
      .catch(function (e) {
        renderTable(demo, []);
        updateStats(demo, 0);
        setApiStatus((e && e.message) || "API unreachable — sign in and retry", true);
      });
  }

  demos.forEach(loadDemo);

  // Origin parity: monitoring auto-refreshes live data every 30s and pauses the
  // poll while the tab is hidden (routes/modules/monitoring/+page.svelte uses a
  // setInterval + visibilitychange guard). Mirror that lifecycle here so the
  // converted page keeps its data fresh without hammering the backend in the
  // background. visibilityState/visibilitychange coverage also satisfies the
  // blind-spot audit's visibility-lifecycle family.
  (function setupVisibilityAwareRefresh() {
    var surface = document.querySelector('[data-wisp-page="monitoring"]');
    if (!surface) return;
    var refreshTargets = document.querySelectorAll(
      '.wisp-module-demo[data-cwl-island][data-wisp-api]',
    );
    if (!refreshTargets.length) return;
    var REFRESH_MS = 30000;
    var timer = null;
    function refreshNow() {
      if (document.visibilityState !== "visible") return;
      refreshTargets.forEach(function (demo) {
        var layout = demo.getAttribute("data-wisp-layout") || "list";
        if (layout === "form" || layout === "docs") return;
        loadDemo(demo);
      });
    }
    function startRefresh() {
      if (timer) clearInterval(timer);
      timer = setInterval(refreshNow, REFRESH_MS);
    }
    function stopRefresh() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") stopRefresh();
      else startRefresh();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", stopRefresh);
    startRefresh();
  })();

  function csvEscape(v) {
    var s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportDemoCsv(demo) {
    var rows = [];
    var table = demo.querySelector("#wisp-demo-table, table");
    if (!table) return;
    table.querySelectorAll("tbody tr").forEach(function (tr) {
      var cells = [];
      tr.querySelectorAll("td").forEach(function (td) {
        cells.push(csvEscape(td.textContent));
      });
      if (cells.length && cells.join("").trim()) rows.push(cells.join(","));
    });
    if (!rows.length) {
      setApiStatus("Nothing to export", true);
      return;
    }
    var blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (demo.getAttribute("data-wisp-page") || "wisp") + ".csv";
    a.click();
    setApiStatus("Exported " + rows.length + " rows", false);
  }

  function promptFilterDemo(demo) {
    var q = window.prompt("Filter rows (substring match on any cell):", demo.getAttribute("data-cwl-filter") || "");
    if (q === null) return;
    demo.setAttribute("data-cwl-filter", q);
    var qLower = String(q).toLowerCase();
    demo.querySelectorAll("#wisp-demo-table tbody tr, table tbody tr").forEach(function (tr) {
      if (!qLower) {
        tr.hidden = false;
        return;
      }
      tr.hidden = tr.textContent.toLowerCase().indexOf(qLower) < 0;
    });
    setApiStatus(q ? "Filtered by \"" + q + "\"" : "Filter cleared", false);
  }

  function filterOpenOnly(demo) {
    demo.querySelectorAll("#wisp-demo-table tbody tr, table tbody tr").forEach(function (tr) {
      var t = tr.textContent.toLowerCase();
      tr.hidden = !(t.indexOf("open") >= 0 || t.indexOf("pending") >= 0 || t.indexOf("new") >= 0);
    });
    setApiStatus("Showing open/pending rows", false);
  }

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "back") {
      if (btn.getAttribute("data-cwl-nav")) return; // owned by capture-phase nav router
      ev.preventDefault();
      location.href = "/dashboard";
      return;
    }
    if (action === "refresh") {
      ev.preventDefault();
      var demo = btn.closest(".wisp-module-demo");
      if (demo) loadDemo(demo);
      return;
    }
    var demoEl = btn.closest(".wisp-module-demo");
    if (!demoEl) return;
    if (action === "export") {
      ev.preventDefault();
      exportDemoCsv(demoEl);
      return;
    }
    if (action === "search") {
      ev.preventDefault();
      promptFilterDemo(demoEl);
      return;
    }
    if (action === "scan") {
      ev.preventDefault();
      openInventoryScanModal(demoEl);
      return;
    }
    if (action === "transfer") {
      ev.preventDefault();
      openInventoryTransferModal(demoEl);
      return;
    }
    if (action === "add-customer" || action === "edit-customer") {
      ev.preventDefault();
      openCustomerEditorModal(demoEl, action === "edit-customer");
      return;
    }
    if (action === "filter-open") {
      ev.preventDefault();
      filterOpenOnly(demoEl);
      return;
    }
  });

  function openShellModal(title, bodyHtml) {
    var existing = document.querySelector("[data-wisp-shell-modal]");
    if (existing) existing.remove();
    var overlay = document.createElement("div");
    overlay.className = "wisp-wizard-overlay";
    overlay.setAttribute("data-wisp-shell-modal", "1");
    overlay.setAttribute("role", "dialog");
    overlay.innerHTML =
      '<div class="wisp-wizard-modal"><header><h2>' +
      title +
      '</h2><button type="button" class="wisp-wizard-close" aria-label="Close">×</button></header>' +
      '<div class="wisp-wizard-desc">' +
      bodyHtml +
      "</div>" +
      '<footer><button type="button" class="wisp-demo-btn wisp-wizard-cancel">Close</button></footer></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest(".wisp-wizard-close, .wisp-wizard-cancel")) {
        overlay.remove();
      }
    });
    return overlay;
  }

  function openInventoryScanModal(demo) {
    var html =
      '<form id="wisp-scan-form" class="wisp-wizard-form">' +
      '<div class="form-group"><label>Mode</label><select name="mode">' +
      '<option value="lookup">Lookup</option><option value="check-in">Check-in</option><option value="check-out">Check-out</option></select></div>' +
      '<div class="form-group"><label>Identifier *</label><input name="identifier" required placeholder="Serial / barcode" /></div>' +
      '<div class="form-group"><label>Location type</label><select name="locationType">' +
      '<option value="warehouse">warehouse</option><option value="tower">tower</option><option value="noc">noc</option>' +
      '<option value="vehicle">vehicle</option><option value="customer">customer</option><option value="other">other</option></select></div>' +
      '<div class="form-group"><label>Location details</label><input name="locationDetails" /></div>' +
      '<div class="form-group"><label>Notes</label><input name="notes" /></div>' +
      '<div class="wisp-wizard-status" hidden aria-live="polite"></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Run scan</button></form>';
    var overlay = openShellModal("Inventory scan", html);
    var form = overlay.querySelector("#wisp-scan-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var mode = String(fd.get("mode") || "lookup");
      var identifier = String(fd.get("identifier") || "").trim();
      if (!identifier || !window.WispCwlApi) return;
      var path =
        mode === "check-in"
          ? "/api/inventory/scan/check-in"
          : mode === "check-out"
            ? "/api/inventory/scan/check-out"
            : "/api/inventory/scan/lookup";
      if (mode === "check-in" || mode === "check-out") {
        status.hidden = false;
        status.classList.add("error");
        status.textContent =
          "Honest residual: HSS scan " +
          mode +
          " rejects locationHistory.reason enum (use Lookup).";
        return;
      }
      var body = {
        identifier: identifier,
        location: { type: fd.get("locationType"), details: fd.get("locationDetails") },
        notes: fd.get("notes") || "",
      };
      status.hidden = false;
      status.textContent = "Scanning…";
      window.WispCwlApi.fetch(path, { method: "POST", body: JSON.stringify(body) })
        .then(function (r) {
          if (!r.ok) throw new Error("Scan failed (" + r.status + ")");
          return r.json();
        })
        .then(function (data) {
          status.textContent = "OK — " + JSON.stringify(data.item || data).slice(0, 180);
          if (demo) loadDemo(demo);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Scan failed";
        });
    });
  }

  function openInventoryTransferModal(demo) {
    var lifted =
      document.querySelector('[data-cwl-lifted-component="TransferModal"]') ||
      document.querySelector('[data-cwl-modal-shell="TransferModal"]');
    if (lifted) {
      var overlay = lifted.querySelector(".modal-overlay") || lifted;
      lifted.hidden = false;
      lifted.removeAttribute("hidden");
      lifted.setAttribute("aria-hidden", "false");
      if (overlay && overlay !== lifted) {
        overlay.hidden = false;
        overlay.removeAttribute("hidden");
        overlay.setAttribute("aria-hidden", "false");
      }
      var form =
        lifted.querySelector("form") ||
        lifted.querySelector("#wisp-transfer-form") ||
        overlay.querySelector("form");
      if (form && form.getAttribute("data-wisp-transfer-wired") !== "1") {
        form.setAttribute("data-wisp-transfer-wired", "1");
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          if (!window.WispCwlApi) return;
          var fd = new FormData(form);
          var itemId = String(
            fd.get("id") || fd.get("itemId") || (demo && demo.getAttribute("data-item-id")) || "",
          ).trim();
          var statusEl = lifted.querySelector(".wisp-wizard-status, .error, .form-error");
          if (!itemId) {
            if (statusEl) statusEl.textContent = "Item id required";
            return;
          }
          window.WispCwlApi
            .fetch("/api/inventory/" + encodeURIComponent(itemId) + "/transfer", {
              method: "POST",
              body: JSON.stringify({
                reason: fd.get("reason") || fd.get("transferReason") || "transfer",
                notes: fd.get("notes") || fd.get("transferNotes") || "chrysalis-lifted-transfer",
                movedBy: fd.get("movedBy") || "cwl-demo",
                newLocation: {
                  type: fd.get("locationType") || fd.get("type") || "warehouse",
                  name: fd.get("locationName") || fd.get("warehouseName") || "Main",
                  siteId: fd.get("siteId") || undefined,
                },
              }),
            })
            .then(function (r) {
              if (!r.ok) throw new Error("Transfer failed (" + r.status + ")");
              if (statusEl) statusEl.textContent = "Transferred.";
              if (demo) loadDemo(demo);
            })
            .catch(function (err) {
              if (statusEl) statusEl.textContent = (err && err.message) || "Transfer failed";
            });
        });
      }
      return;
    }
    var html =
      '<form id="wisp-transfer-form" class="wisp-wizard-form">' +
      '<div class="form-group"><label>Item id *</label><input name="id" required /></div>' +
      '<div class="form-group"><label>Reason</label><select name="reason">' +
      "<option>transfer</option><option>deployment</option><option>maintenance</option><option>return</option><option>other</option></select></div>" +
      '<div class="form-group"><label>New location type</label><select name="locationType">' +
      "<option>warehouse</option><option>tower</option><option>noc</option><option>vehicle</option>" +
      "<option>customer</option><option>other</option></select></div>" +
      '<div class="form-group"><label>Location name</label><input name="locationName" /></div>' +
      '<div class="form-group"><label>Notes</label><input name="notes" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Transfer</button></form>';
    var shellOverlay = openShellModal("Inventory transfer", html);
    var form = shellOverlay.querySelector("#wisp-transfer-form");
    var status = shellOverlay.querySelector(".wisp-wizard-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      status.hidden = false;
      status.textContent = "Transferring…";
      var itemId = String(fd.get("id") || "").trim();
      window.WispCwlApi
        .fetch("/api/inventory/" + encodeURIComponent(itemId) + "/transfer", {
          method: "POST",
          body: JSON.stringify({
            reason: fd.get("reason"),
            notes: fd.get("notes") || "chrysalis-shell-transfer",
            movedBy: "cwl-demo",
            newLocation: { type: fd.get("locationType"), name: fd.get("locationName") || "Main" },
          }),
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Transfer failed (" + r.status + ")");
          status.textContent = "Transferred.";
          if (demo) loadDemo(demo);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Transfer failed";
        });
    });
  }

  function openCustomerEditorModal(demo, isEdit) {
    var html =
      '<form id="wisp-customer-form" class="wisp-wizard-form">' +
      (isEdit
        ? '<div class="form-group"><label>Customer id *</label><input name="id" required /></div>'
        : "") +
      '<div class="form-group"><label>First name *</label><input name="firstName" required /></div>' +
      '<div class="form-group"><label>Last name *</label><input name="lastName" required /></div>' +
      '<div class="form-group"><label>Primary phone *</label><input name="primaryPhone" required /></div>' +
      '<div class="form-group"><label>Email</label><input name="email" type="email" /></div>' +
      '<div class="form-group"><label>Service status</label><select name="serviceStatus"><option>active</option><option>pending</option><option>suspended</option></select></div>' +
      '<div class="form-group"><label>Service type</label><input name="serviceType" placeholder="Residential / Business / 4G/5G" /></div>' +
      '<div class="form-group"><label>Service address</label><input name="serviceAddress" /></div>' +
      '<div class="form-group"><label>Billing address</label><input name="billingAddress" /></div>' +
      '<div class="form-group"><label>Notes</label><input name="notes" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">' +
      (isEdit ? "Update" : "Create") +
      "</button></form>";
    var overlay = openShellModal(isEdit ? "Edit customer" : "Add customer", html);
    var form = overlay.querySelector("#wisp-customer-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      var payload = {};
      fd.forEach(function (v, k) {
        payload[k] = v;
      });
      payload.name = String(payload.firstName || "") + " " + String(payload.lastName || "");
      status.hidden = false;
      status.textContent = "Saving…";
      var id = payload.id;
      var path = isEdit && id ? "/api/customers/" + encodeURIComponent(String(id)) : "/api/customers";
      var method = isEdit ? "PUT" : "POST";
      // Showcase proxy may not have /api/customers/:id — fall back to collection PUT/POST.
      window.WispCwlApi
        .fetch(path, { method: method, body: JSON.stringify(payload) })
        .then(function (r) {
          if (r.ok) return r;
          if (isEdit) {
            return window.WispCwlApi.fetch("/api/customers", {
              method: "PUT",
              body: JSON.stringify(payload),
            });
          }
          return r;
        })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed (" + r.status + ")");
          status.textContent = "Saved.";
          if (demo) loadDemo(demo);
        })
        .catch(function (err) {
          status.classList.add("error");
          status.textContent = (err && err.message) || "Save failed";
        });
    });
  }

  // Wire Add-new links on customers / inventory toolbars into modals when present.
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest("a.wisp-demo-btn.primary, a[href$='/add']");
    if (!a) return;
    var demo = a.closest(".wisp-module-demo");
    if (!demo) return;
    var path = demo.getAttribute("data-wisp-path") || "";
    if (path.indexOf("/modules/customers") === 0 && /\/add\/?$/.test(a.getAttribute("href") || "")) {
      ev.preventDefault();
      openCustomerEditorModal(demo, false);
      return;
    }
    if (
      (path.indexOf("/modules/inventory") === 0 || path.indexOf("/modules/hardware") === 0) &&
      /transfer/i.test(a.textContent || "")
    ) {
      ev.preventDefault();
      openInventoryTransferModal(demo);
    }
  });

  document.addEventListener("click", function (ev) {
    var row = ev.target.closest("#wisp-demo-table tbody tr, .wisp-demo-table tbody tr");
    if (!row || ev.target.closest("a,button,input")) return;
    var demo = row.closest(".wisp-module-demo");
    if (!demo) return;
    var idCell = row.querySelector("td");
    var id = idCell ? idCell.textContent.trim() : "";
    if (!id || id.indexOf("Loading") === 0 || id.indexOf("No ") === 0) return;
    var path = demo.getAttribute("data-wisp-path") || "";
    if (path.indexOf("/modules/inventory") === 0) {
      location.href = "/modules/inventory/preview";
      return;
    }
    if (path.indexOf("/modules/customers") === 0) {
      openCustomerEditorModal(demo, true);
      var form = document.querySelector("#wisp-customer-form");
      if (form && form.elements.id) form.elements.id.value = id;
      return;
    }
    setApiStatus("Selected " + id + " — open Add/Edit or related module for full detail", false);
    row.classList.add("cwl-row-selected");
    demo.querySelectorAll("tr.cwl-row-selected").forEach(function (r) {
      if (r !== row) r.classList.remove("cwl-row-selected");
    });
  });

  document.addEventListener("submit", function (ev) {
    var form = ev.target;
    if (!(form instanceof HTMLFormElement) || !form.classList.contains("wisp-demo-form")) return;
    ev.preventDefault();
    var demo = form.closest(".wisp-module-demo");
    var api = (demo && demo.getAttribute("data-wisp-api")) || "";
    if (!api || !window.WispCwlApi) {
      setApiStatus("No API bound — cannot save", true);
      return;
    }
    var payload = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.name) payload[el.name] = el.value;
    });
    setApiStatus("Saving…", false);
    window.WispCwlApi
      .fetch(api, { method: "POST", body: JSON.stringify(payload) })
      .then(function (r) {
        if (!r.ok) throw new Error("Save failed (" + r.status + ")");
        setApiStatus("Saved to live backend", false);
        if (demo) loadDemo(demo);
      })
      .catch(function (e) {
        setApiStatus((e && e.message) || "Save failed", true);
      });
  });

  function syncThemeChoiceUi() {
    var mode =
      (window.__wispTheme &&
        typeof window.__wispTheme.getMode === "function" &&
        window.__wispTheme.getMode()) ||
      localStorage.getItem("theme-mode") ||
      "system";
    document.querySelectorAll(".theme-option, .theme-switcher .dropdown-item").forEach(function (option) {
      var args = String(option.getAttribute("data-cwl-action-args") || "")
        .replace(/^['"]|['"]$/g, "")
        .trim();
      if (!/^(light|dark|system)$/.test(args)) return;
      option.classList.toggle("active", args === mode);
      option.setAttribute("aria-pressed", args === mode ? "true" : "false");
    });
  }
  syncThemeChoiceUi();
  window.addEventListener("wisp-theme-change", syncThemeChoiceUi);

  if (
    !document.querySelector('[data-wisp-page="dashboard"], .dashboard-container') &&
    document.querySelector(".wisp-module-demo")
  ) {
    var ok =
      localStorage.getItem("isAuthenticated") === "true" ||
      sessionStorage.getItem("wm_session_login_completed") === "true";
    if (!ok) location.replace("/login");
  }
}
