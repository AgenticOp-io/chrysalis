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
              });
            }
            if (!skipProxy && viaProxy) return attempt(viaProxy, "omit");
            return res;
          });
        }

        return chain.catch(function () {
          if (direct !== path) return attempt(direct, "omit");
          return Promise.reject(new Error("api-fetch-failed"));
        });
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
      var path = location.pathname.replace(/\/$/, "");
      location.href = path + "/add";
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

  guardAuthenticatedPages();
  initModuleDemos();
  initStructuralModulePages();
  initDashboardModules();
  initShellIslands();
  initModuleTipsIslands();
  initNotificationsBadge();
  initExtraListSurfaces();
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
    addGet(voiceHost, "voice-accounts", "/api/voice/provider-accounts", "Voice accounts");
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
      '<button type="button" class="close-btn btn-secondary">Got it</button></div></div>';
    document.body.appendChild(overlay);
    function close() {
      var dont = overlay.querySelector(".tips-dont-show");
      if (dont && dont.checked) markDismissed(moduleId);
      overlay.remove();
    }
    overlay.querySelectorAll(".close-btn").forEach(function (b) {
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
  // Defer so page chrome paints first (matches Module_Manager 500ms after load).
  setTimeout(function () {
    window.WispCwlTips.show(moduleId);
  }, 600);
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
    { sel: ".permissions-page", page: "permissions", api: "/api/permissions/roles" },
    { sel: ".role-management-page", page: "roles", api: "/api/permissions/roles" },
    { sel: ".voice-page", page: "voice", api: "/api/voice" },
    { sel: ".wisp-plan-app", page: "plan", api: "/api/plans" },
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
    { sel: ".hardware-page", page: "hardware", api: "/api/network/equipment" },
    { sel: ".inventory-page", page: "inventory", api: "/api/inventory" },
    { sel: ".customers-page", page: "customers", api: "/api/customers" },
    { sel: ".sites-page", page: "sites", api: "/api/network/sites" },
    { sel: ".work-orders-page", page: "work-orders", api: "/api/work-orders" },
    { sel: ".help-desk-container", page: "help-desk", api: "/api/incidents" },
    { sel: ".maintain-module", page: "maintain", api: "/api/incidents" },
    { sel: ".billing-module", page: "billing", api: "/api/customer-billing" },
    { sel: ".user-management-container", page: "users", api: "/api/users" },
    { sel: ".tenant-management-page", page: "tenants", api: "/api/tenants" },
    { sel: ".hss-management", page: "hss", api: "/api/hss/groups" },
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
    { sel: '[data-wisp-page="hardware"]', page: "hardware", api: "/api/network/equipment" },
    { sel: '[data-wisp-page="inventory"]', page: "inventory", api: "/api/inventory" },
    { sel: '[data-wisp-page="customers"]', page: "customers", api: "/api/customers" },
    { sel: '[data-wisp-page="plan"]', page: "plan", api: "/api/plans" },
    { sel: '[data-wisp-page="sites"]', page: "sites", api: "/api/network/sites" },
    { sel: '[data-wisp-page="work-orders"]', page: "work-orders", api: "/api/work-orders" },
    { sel: '[data-wisp-page="hss-management"]', page: "hss", api: "/api/hss/groups" },
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

  // Dead HSS mounts — show honest status instead of inventing data.
  var HONEST_UNAVAILABLE = {
    "/api/voice": true,
    "/api/billing": true,
    "/api/customer-billing": true,
    "/api/module-access": true,
    "/api/tenants": true,
    "/api/admin": true,
    "/api/hardware": true,
    "/api/maintain": true,
    "/api/deploy": true,
    "/api/coverage": true,
    "/api/epc": true,
    "/api/mikrotik": true,
    "/api/branding": true,
    "/api/auth": true,
    "/api/agent": true,
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
  if (location.pathname.indexOf("/modules/hardware") === 0) pathApi = "/api/network/equipment";
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
  else if (location.pathname.indexOf("/modules/hss-management") === 0) pathApi = "/api/hss/groups";
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

  /** G9933 — plan overlay counts + projects list from /api/plans. */
  function fillPlanCounts(rows) {
    page.querySelectorAll(".control-label").forEach(function (el) {
      var t = el.textContent || "";
      if (/Projects/i.test(t)) el.textContent = "Projects (" + rows.length + ")";
      else if (/Hardware/i.test(t)) el.textContent = "Hardware (–)";
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
    var summary = page.querySelector("#plan-active-summary");
    if (summary && rows.length) {
      var first = rows[0];
      summary.hidden = false;
      summary.textContent =
        rows.length +
        " plan(s) — active context: " +
        (first.name || first._id || "plan") +
        " (" +
        (first.status || "draft") +
        ")";
    }
  }

  function fillSitesTable(rows) {
    var tbody = page.querySelector(".sites-table tbody");
    if (!tbody) return false;
    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-state cwl-empty-honest" data-cwl-empty-honest="1">No sites from /api/network/sites.</td></tr>';
      return true;
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
      return ["serialNumber", "manufacturer", "model", "status", "location"].filter(function (k) {
        return row[k] !== undefined;
      });
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
    var cols = preferredCols(rows[0]);
    if (!cols.length) cols = Object.keys(rows[0]).slice(0, 5);
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
                if (v && typeof v === "object") v = v.name || v.city || JSON.stringify(v).slice(0, 40);
                return "<td>" + esc(v).slice(0, 48) + "</td>";
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
    var specs = [
      { re: /\/modules\/inventory\/([^/]+)$/, api: "/api/inventory", keys: ["items", "records"], skip: ["add", "bundles", "reports"] },
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
          if (val != null && typeof val !== "object") el.textContent = String(val);
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
        if (meta.page === "cbrs" || meta.page === "pci" || meta.page === "acs-cpe") {
          if (!rows.length) rows = firstArray(data) || [];
        }
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
          fillList(rows);
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
    var overlay = openShellModal("Inventory transfer", html);
    var form = overlay.querySelector("#wisp-transfer-form");
    var status = overlay.querySelector(".wisp-wizard-status");
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
