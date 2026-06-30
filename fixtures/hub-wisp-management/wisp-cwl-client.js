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
      if (!res.ok) throw new Error("Sign-in failed (" + res.status + ")");
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
    if (!form.closest('[data-wisp-page="login"], [data-cwl-island="client"], .login-shell, .login-page')) return;
    ev.preventDefault();
    submitLogin(form);
  });

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-cwl-on-click], button");
    if (!btn) return;
    var action = btn.getAttribute("data-cwl-on-click");
    if (action === "loginSubmit" || (btn.type === "submit" && btn.closest("form"))) {
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

  function demoRows(resource, count) {
    var names = ["Tower Alpha", "Sector B12", "CPE Batch 7", "Backhaul West", "POP Downtown", "Relay Hill"];
    var rows = [];
    for (var i = 0; i < count; i++) {
      rows.push({
        id: "DEMO-" + (1000 + i),
        name: names[i % names.length] + " (" + resource + ")",
        status: i % 3 === 0 ? "Pending" : "Active",
        updated: "2026-06-" + String(10 + (i % 18)).padStart(2, "0"),
      });
    }
    return rows;
  }

  function renderTable(demo, rows) {
    var table = demo.querySelector("#wisp-demo-table tbody");
    if (!table) return;
    if (!rows.length) {
      table.innerHTML = "<tr><td colspan=\"4\">No records yet.</td></tr>";
      return;
    }
    table.innerHTML = rows
      .map(function (r) {
        return (
          "<tr><td>" +
          r.id +
          "</td><td>" +
          r.name +
          "</td><td>" +
          r.status +
          "</td><td>" +
          r.updated +
          "</td></tr>"
        );
      })
      .join("");
  }

  function loadDemo(demo) {
    var api = demo.getAttribute("data-wisp-api");
    var layout = demo.getAttribute("data-wisp-layout") || "list";
    if (layout === "form" || layout === "docs") {
      setApiStatus("Demo surface ready", false);
      return;
    }
    if (!api) {
      renderTable(demo, demoRows("module", 4));
      setApiStatus("Static demo data", false);
      return;
    }
    setApiStatus("Loading " + api + "…", false);
    fetch(api, { credentials: "same-origin" })
      .then(function (r) {
        return r.json().catch(function () {
          return { ok: r.ok, status: r.status };
        });
      })
      .then(function (data) {
        var resource = data && data.resource ? data.resource : api.split("/").pop();
        var rows = Array.isArray(data)
          ? data
          : data && (data.items || data.projects || data.records)
            ? data.items || data.projects || data.records
            : demoRows(resource, 5);
        if (!Array.isArray(rows)) rows = demoRows(resource, 5);
        renderTable(demo, rows.slice(0, 8));
        setApiStatus("API " + api + " — " + (data && data.surface ? data.surface : "connected"), false);
      })
      .catch(function () {
        renderTable(demo, demoRows("offline", 4));
        setApiStatus("API unreachable — showing demo rows", true);
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
    setApiStatus("Saved (demo) — native CWL POST would run on production backend", false);
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
