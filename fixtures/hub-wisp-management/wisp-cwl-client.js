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
    var btn = ev.target.closest("[data-cwl-on-click], button, a.btn-primary, .back-button, .btn-back");
    if (!btn) return;
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
    if (btn.classList.contains("back-button") || btn.classList.contains("btn-back") || action === "back") {
      if (btn.tagName === "A" && btn.getAttribute("href")) return;
      ev.preventDefault();
      location.href = "/dashboard";
      return;
    }
    var label = (btn.textContent || "").replace(/\s+/g, " ").trim();
    if (/^➕?\s*Add Hardware/i.test(label) || /^Add Hardware/i.test(label)) {
      ev.preventDefault();
      location.href = "/modules/hardware/add";
      return;
    }
    // G9908 — empty Add dropdown → /add instead of a dead toggle
    if (btn.classList.contains("dropdown-toggle") || /\bdropdown-toggle\b/.test(btn.className)) {
      var menu = btn.parentElement && btn.parentElement.querySelector(".dropdown-menu");
      if (!menu || !(menu.textContent || "").trim()) {
        ev.preventDefault();
        var base = location.pathname.replace(/\/$/, "");
        location.href = base + "/add";
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
      /Add (new|item|customer|device|hardware|site)/i.test(label) &&
      btn.closest(".hardware-page, .inventory-page, .customers-page, .sites-page, .work-orders-page")
    ) {
      ev.preventDefault();
      var path = location.pathname.replace(/\/$/, "");
      location.href = path + "/add";
    }
  });

  guardAuthenticatedPages();
  initModuleDemos();
  initStructuralModulePages();
  initDashboardModules();
  initShellIslands();
})();

/**
 * G9910 — hydrate empty dashboard module/admin cards from known CWL routes + /api/admin.
 * Does not invent modules outside the showcase route set.
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
        var feats = (m.features || []).slice(0, 3);
        return (
          '<a class="module-card" href="' +
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
          '<div class="module-status"><span class="status-pill">' +
          esc(m.status || "active") +
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

  renderCore(CORE);
  renderAdmin(ADMIN);

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

  function ensureOverlayChrome(el, name, kind) {
    el.setAttribute("data-cwl-island", "shell");
    scrubShellJunk(el);
    if (el.querySelector(".cwl-shell-chrome")) return;
    var bodies = {
      wizard: "Wizard shell — interactive steps not lifted into CWL.",
      nav: "Nav shell — live menu not lifted into CWL.",
      modal: "Modal shell — interactive content not lifted into CWL.",
    };
    el.innerHTML =
      '<div class="cwl-shell-chrome">' +
      '<header class="cwl-shell-header"><h2>' +
      humanize(name) +
      '</h2><button type="button" class="cwl-shell-close" aria-label="Close">×</button></header>' +
      '<p class="cwl-shell-body">' +
      (bodies[kind] || bodies.modal) +
      "</p>" +
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
            ? " — hydrated summary (controls not lifted)"
            : " — shell");
        el.insertBefore(cap, el.firstChild);
      }
      return;
    }
    var msg =
      kind === "map"
        ? "live map embed not lifted"
        : kind === "chart"
          ? "live chart not lifted"
          : "live controls not lifted into CWL";
    var labelClass = kind === "map" ? "cwl-map-shell-label cwl-inline-shell" : "cwl-inline-shell";
    el.innerHTML =
      '<div class="' +
      labelClass +
      '"><strong>' +
      humanize(name) +
      "</strong><span>" +
      (kind.charAt(0).toUpperCase() + kind.slice(1)) +
      " shell — " +
      msg +
      "</span></div>";
    el.classList.add("cwl-" + kind + "-shell-ready");
  }

  function openShell(el) {
    el.setAttribute("aria-hidden", "false");
    el.classList.add("cwl-shell-open");
  }

  function closeShell(el) {
    el.setAttribute("aria-hidden", "true");
    el.classList.remove("cwl-shell-open");
  }

  var OVERLAY_SEL =
    "[data-cwl-modal-shell], [data-cwl-wizard-shell], [data-cwl-nav-shell]";

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
  document.querySelectorAll("[data-cwl-map-shell]").forEach(function (el) {
    ensureInlineShell(el, el.getAttribute("data-cwl-map-shell") || "Map", "map");
  });
  document.querySelectorAll("[data-cwl-chart-shell]").forEach(function (el) {
    ensureInlineShell(el, el.getAttribute("data-cwl-chart-shell") || "Chart", "chart");
  });
  document.querySelectorAll("[data-cwl-widget-shell]").forEach(function (el) {
    ensureInlineShell(el, el.getAttribute("data-cwl-widget-shell") || "Widget", "widget");
  });

  // Ensure every overlay shell on the page has at least one opener in header actions.
  (function ensureShellOpeners() {
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

  document.addEventListener("click", function (ev) {
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
    }
    if (
      /^Help$/i.test(label) ||
      /\bhelp-btn\b/.test(btn.className) ||
      /\bhelp-button\b/.test(btn.className) ||
      /Open help/i.test(title)
    ) {
      if (openByAttr("data-cwl-modal-shell", "HelpModal")) return;
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

    if (/Check\s*In|RMA|Manual Lookup|Onboarding|Wizard/i.test(label) && !/Add Hardware/i.test(label)) {
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
    { sel: ".permissions-page", page: "permissions", api: "/api/permissions" },
    { sel: ".role-management-page", page: "roles", api: "/api/permissions" },
    { sel: ".voice-page", page: "voice", api: "/api/voice" },
    { sel: ".wisp-plan-app", page: "plan", api: "/api/plans" },
    { sel: ".cbrs-module", page: "cbrs", api: "/api/network" },
    { sel: ".support-dashboard", page: "support", api: "/api/maintain" },
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
      api: "/api/network",
      pathPrefix: "/modules/pci-resolution",
    },
    { sel: ".hardware-page", page: "hardware", api: "/api/hardware" },
    { sel: ".inventory-page", page: "inventory", api: "/api/inventory" },
    { sel: ".customers-page", page: "customers", api: "/api/customers" },
    { sel: ".sites-page", page: "sites", api: "/api/network" },
    { sel: ".work-orders-page", page: "work-orders", api: "/api/work-orders" },
    { sel: ".help-desk-container", page: "help-desk", api: "/api/maintain" },
    { sel: ".maintain-module", page: "maintain", api: "/api/maintain" },
    { sel: ".billing-module", page: "billing", api: "/api/customer-billing" },
    { sel: ".user-management-container", page: "users", api: "/api/users" },
    { sel: ".tenant-management-page", page: "tenants", api: "/api/tenants" },
    { sel: ".hss-management", page: "hss", api: "/api/hss" },
    {
      sel: ".admin-page",
      page: "admin-tenants",
      api: "/api/admin",
      pathPrefix: "/admin/tenant-management",
    },
    {
      sel: ".app",
      page: "monitoring",
      api: "/api/monitoring",
      pathPrefix: "/modules/monitoring",
    },
    {
      sel: ".app",
      page: "deploy",
      api: "/api/deploy",
      pathPrefix: "/modules/deploy",
    },
    { sel: '[data-wisp-page="hardware"]', page: "hardware", api: "/api/hardware" },
    { sel: '[data-wisp-page="inventory"]', page: "inventory", api: "/api/inventory" },
    { sel: '[data-wisp-page="customers"]', page: "customers", api: "/api/customers" },
    { sel: '[data-wisp-page="plan"]', page: "plan", api: "/api/plans" },
  ];

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
  if (location.pathname.indexOf("/modules/hardware") === 0) pathApi = "/api/hardware";
  else if (location.pathname.indexOf("/modules/inventory/bundles") === 0) pathApi = "/api/bundles";
  else if (location.pathname.indexOf("/modules/inventory") === 0) pathApi = "/api/inventory";
  else if (location.pathname.indexOf("/modules/customers") === 0) pathApi = "/api/customers";
  else if (location.pathname.indexOf("/modules/sites") === 0) pathApi = "/api/network";
  else if (location.pathname.indexOf("/modules/work-orders") === 0) pathApi = "/api/work-orders";
  else if (location.pathname.indexOf("/modules/help-desk") === 0) pathApi = "/api/maintain";
  else if (location.pathname.indexOf("/modules/maintain") === 0) pathApi = "/api/maintain";
  else if (location.pathname.indexOf("/modules/billing") === 0) pathApi = "/api/customer-billing";
  else if (location.pathname.indexOf("/modules/user-management/permissions") === 0)
    pathApi = "/api/permissions";
  else if (location.pathname.indexOf("/modules/user-management/roles") === 0)
    pathApi = "/api/permissions";
  else if (location.pathname.indexOf("/modules/user-management") === 0) pathApi = "/api/users";
  else if (location.pathname.indexOf("/modules/tenant-management") === 0) pathApi = "/api/tenants";
  else if (location.pathname.indexOf("/admin/tenant-management") === 0) pathApi = "/api/admin";
  else if (location.pathname.indexOf("/modules/monitoring") === 0) pathApi = "/api/monitoring";
  else if (location.pathname.indexOf("/modules/hss-management") === 0) pathApi = "/api/hss";
  else if (location.pathname.indexOf("/modules/deploy") === 0) pathApi = "/api/deploy";
  else if (location.pathname.indexOf("/modules/voice-telephony") === 0) pathApi = "/api/voice";
  else if (location.pathname.indexOf("/modules/plan") === 0) pathApi = "/api/plans";
  else if (location.pathname.indexOf("/modules/cbrs-management") === 0) pathApi = "/api/network";
  else if (location.pathname.indexOf("/modules/pci-resolution") === 0) pathApi = "/api/network";
  else if (location.pathname.indexOf("/modules/coverage-map") === 0) pathApi = "/api/coverage";
  else if (location.pathname.indexOf("/settings/module-access") === 0) pathApi = "/api/module-access";
  else if (location.pathname.indexOf("/support-dashboard") === 0) pathApi = "/api/maintain";

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
    page.getAttribute("data-wisp-api") ||
    pathApi ||
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
      "items",
      "records",
      "hardware",
      "inventory",
      "customers",
      "sites",
      "workOrders",
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
      var st = String(rows[i].status || "").toLowerCase();
      if (!st) continue;
      byStatus[st] = (byStatus[st] || 0) + 1;
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
      if (/\bactive\b/.test(L)) return stats.active != null ? stats.active : byStatus.active || 0;
      if (/pending/.test(L)) return stats.pending != null ? stats.pending : byStatus.pending || 0;
      if (/suspend/.test(L)) return stats.suspended != null ? stats.suspended : byStatus.suspended || 0;
      if (/available|in stock/.test(L)) return stats.inStock != null ? stats.inStock : "–";
      if (/rma|maintenance/.test(L)) return stats.rma != null ? stats.rma : "–";
      if (/deployed|online/.test(L)) {
        var d = (byStatus.deployed || 0) + (byStatus.online || 0);
        return d > 0 ? d : "–";
      }
      if (/epc|snmp/.test(L)) return "–";
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
      else if (/Hardware/i.test(t)) el.textContent = "Hardware (–)";
    });
  }

  /** G9933 — plan overlay counts from /api/plans; map iframe stays a shell. */
  function fillPlanCounts(rows) {
    page.querySelectorAll(".control-label").forEach(function (el) {
      var t = el.textContent || "";
      if (/Projects/i.test(t)) el.textContent = "Projects (" + rows.length + ")";
      else if (/Hardware/i.test(t)) el.textContent = "Hardware (–)";
    });
  }

  /** G9905/G9912/G9913/G9917 — hydrate tbody, ticket/tenant grids, or inject a list. */
  function fillList(rows) {
    if (!rows.length) return;
    var tbody = null;
    page.querySelectorAll("tbody").forEach(function (tb) {
      if (!tbody && !tb.closest(".cwl-widget-shell")) tbody = tb;
    });
    var grid =
      page.querySelector(".tenants-grid") ||
      page.querySelector(".tickets-grid") ||
      page.querySelector(".customer-grid") ||
      page.querySelector(".work-orders-grid") ||
      page.querySelector(".sites-grid") ||
      page.querySelector(".site-grid") ||
      page.querySelector(".bundles-grid") ||
      page.querySelector(".role-tabs");
    var cols = Object.keys(rows[0]).slice(0, 5);
    var cardClass = page.querySelector(".tenants-grid")
      ? "tenant-card"
      : page.querySelector(".tickets-grid")
        ? "ticket-card"
        : page.querySelector(".work-orders-grid")
          ? "work-order-card"
          : page.querySelector(".sites-grid, .site-grid")
            ? "site-card"
            : page.querySelector(".bundles-grid")
              ? "bundle-card"
              : page.querySelector(".role-tabs")
                ? "role-tab"
                : "customer-card";

    var heading = page.querySelector(".tenants-section h2");
    if (heading) heading.textContent = "All Tenants (" + rows.length + ")";

    if (tbody) {
      tbody.innerHTML = rows
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
        .join("");
      return;
    }

    if (grid) {
      grid.innerHTML = rows
        .slice(0, 25)
        .map(function (row) {
          return (
            '<article class="' +
            cardClass +
            ' cwl-hydrated-card" data-cwl-hydrated="1">' +
            "<h3>" +
            esc(row.name || row.title || row.displayName || row.id || "Record") +
            "</h3>" +
            "<p>" +
            esc(row.status || row.email || row.priority || "") +
            "</p>" +
            "</article>"
          );
        })
        .join("");
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

  function load() {
    var doFetch = window.WispCwlApi
      ? window.WispCwlApi.fetch
      : function (p) {
          return fetch(p, { credentials: "same-origin" });
        };
    doFetch(api)
      .then(function (r) {
        if (!r.ok) throw new Error("API " + api + " returned " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (meta.page === "billing" && fillPlans(data)) {
          fillStats(data, Array.isArray(data.plans) ? data.plans : firstArray(data) || []);
          return;
        }
        var rows = firstArray(data) || [];
        // Prefer named arrays for remaining-surface pages when stub bodies omit items.
        if (meta.page === "voice" && Array.isArray(data.lines)) rows = data.lines;
        if (meta.page === "cbrs" && Array.isArray(data.grants) && data.grants.length)
          rows = data.grants;
        else if (meta.page === "cbrs" && Array.isArray(data.sites)) rows = data.sites;
        if (meta.page === "deploy") fillDeployCounts(rows);
        if (meta.page === "plan") {
          fillPlanCounts(rows);
          fillStats(data, rows);
          return;
        }
        if (meta.page === "module-access") {
          fillModuleAccess(data, rows);
          return;
        }
        fillStats(data, rows);
        if (rows.length) fillList(rows);
        else if (
          meta.page === "bundles" ||
          meta.page === "permissions" ||
          meta.page === "roles" ||
          meta.page === "module-access"
        ) {
          var emptyHost =
            page.querySelector(".bundles-grid") ||
            page.querySelector(".role-tabs") ||
            page.querySelector(".permission-type-selector") ||
            page.querySelector(".page-header");
          if (emptyHost && !page.querySelector("[data-cwl-empty-honest]")) {
            var empty = document.createElement("p");
            empty.setAttribute("data-cwl-empty-honest", "1");
            empty.className = "cwl-empty-honest muted";
            empty.textContent =
              "No " + meta.page + " records from " + api + " (API ok — empty list).";
            emptyHost.appendChild(empty);
          }
        }
      })
      .catch(function (e) {
        var status = page.querySelector("[data-wisp-api-status], .wisp-api-status");
        if (!status) {
          status = document.createElement("p");
          status.className = "wisp-api-status error";
          status.setAttribute("data-wisp-api-status", "1");
          (page.querySelector(".page-header") || page).appendChild(status);
        }
        status.textContent = (e && e.message) || "API unreachable";
        status.classList.add("error");
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
    var keys = ["items", "records", "customers", "devices", "subscribers", "projects", "orders", "results", "data", "rows", "users", "tenants", "graphs", "modules", "coverage", "sites", "towers"];
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
    var html =
      '<form id="wisp-transfer-form" class="wisp-wizard-form">' +
      '<div class="form-group"><label>Item id *</label><input name="id" required /></div>' +
      '<div class="form-group"><label>Reason</label><select name="reason">' +
      "<option>deployment</option><option>maintenance</option><option>repair</option><option>upgrade</option>" +
      "<option>relocation</option><option>storage</option><option>rma</option><option>other</option></select></div>" +
      '<div class="form-group"><label>New location type</label><select name="locationType">' +
      "<option>warehouse</option><option>tower</option><option>noc</option><option>vehicle</option>" +
      "<option>customer</option><option>rma</option><option>vendor</option><option>other</option></select></div>" +
      '<div class="form-group"><label>Location name</label><input name="locationName" /></div>' +
      '<div class="form-group"><label>Notes</label><input name="notes" /></div>' +
      '<div class="wisp-wizard-status" hidden></div>' +
      '<button type="submit" class="wisp-demo-btn primary">Transfer</button></form>';
    var overlay = openShellModal("Inventory transfer", html);
    var form = overlay.querySelector("#wisp-transfer-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!window.WispCwlApi) return;
      var fd = new FormData(form);
      status.hidden = false;
      status.textContent = "Transferring…";
      window.WispCwlApi
        .fetch("/api/inventory/transfer", {
          method: "POST",
          body: JSON.stringify({
            id: fd.get("id"),
            reason: fd.get("reason"),
            notes: fd.get("notes"),
            newLocation: { type: fd.get("locationType"), name: fd.get("locationName") },
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
