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
      if (!localStorage.getItem("selectedTenantId") && firebaseConfig && firebaseConfig.defaultTenantId) {
        localStorage.setItem("selectedTenantId", firebaseConfig.defaultTenantId);
        localStorage.setItem("selectedTenantName", firebaseConfig.defaultTenantName || "WISPTools Demo ISP");
      }
    } catch (_e) {
      /* ignore */
    }
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
    return fetch("/assets/wisp-firebase-config.json", { credentials: "same-origin" })
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
          defaultTenantId: "6a166eb07089304417ec967a",
          defaultTenantName: "WISPTools Demo ISP",
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
   * Fetch an /api path against the live backend (same DB/HSS as the original
   * Svelte app). Tries the configured backend origin first (Firebase Hosting
   * has no working apiProxy), falls back to same-origin (GCE chimera gateway
   * proxies /api natively).
   */
  function apiFetch(path, opts) {
    opts = opts || {};
    return fetchFirebaseConfig().then(function (cfg) {
      return authHeaders().then(function (headers) {
        var merged = Object.assign({}, opts.headers || {}, headers);
        if (opts.body && !merged["Content-Type"] && !merged["content-type"]) {
          merged["Content-Type"] = "application/json";
        }
        var init = Object.assign({}, opts, { headers: merged });
        var base = (cfg && cfg.backendUrl ? String(cfg.backendUrl) : "").replace(/\/$/, "");
        var direct = base && path.indexOf("/api") === 0 ? base + path : path;
        var attempt = function (url, credentials) {
          return fetch(url, Object.assign({}, init, { credentials: credentials }));
        };
        if (direct !== path) {
          return attempt(direct, "omit").catch(function () {
            return attempt(path, "same-origin");
          });
        }
        return attempt(path, "same-origin");
      });
    });
  }

  window.WispCwlApi = { fetch: apiFetch, headers: authHeaders };

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

  function submitLogin(form) {
    var creds = formCredentials(form);
    var btn = qs(".btn-primary", form) || qs('[type="submit"]', form);
    if (btn) btn.disabled = true;
    setStatus("Signing in…", false);
    firebaseLogin(creds.email, creds.password)
      .then(function () {
        setStatus("Signed in — redirecting…", false);
        location.href = "/dashboard";
      })
      .catch(function (err) {
        return previewLogin(creds.email, creds.password)
          .then(function () {
            setStatus("Signed in — redirecting…", false);
            location.href = "/dashboard";
          })
          .catch(function () {
            setStatus((err && err.message) || "Sign-in failed", true);
            if (btn) btn.disabled = false;
          });
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

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-cwl-on-click], button");
    if (!btn) return;
    var action = btn.getAttribute("data-cwl-on-click");
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
    }
  });

  guardAuthenticatedPages();
  initModuleDemos();
})();

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
    var keys = ["items", "records", "customers", "devices", "subscribers", "projects", "orders", "results", "data", "rows", "users", "tenants", "graphs"];
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

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "back") {
      ev.preventDefault();
      location.href = "/dashboard";
      return;
    }
    if (action === "refresh") {
      ev.preventDefault();
      var demo = btn.closest(".wisp-module-demo");
      if (demo) loadDemo(demo);
    }
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
