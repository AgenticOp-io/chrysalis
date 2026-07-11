(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function postToMap(type, payload) {
    var iframe = qs("#plan-map-iframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ source: "wisp-plan-shell", type: type, payload: payload || {} }, "*");
    }
  }

  function renderProjects(listEl, projects) {
    if (!listEl) return;
    if (!projects || !projects.length) {
      listEl.innerHTML = '<p class="plan-panel-empty">No plan projects yet. Create one from the map tools.</p>';
      return;
    }
    listEl.innerHTML = projects
      .map(function (p) {
        var name = p.name || p.title || "Untitled plan";
        var status = p.status || "draft";
        var id = p.id || p._id || "";
        return (
          '<article class="plan-project-item" data-plan-id="' +
          String(id).replace(/"/g, "") +
          '"><h3>' +
          name +
          "</h3><p>Status: " +
          status +
          "</p></article>"
        );
      })
      .join("");
    listEl.querySelectorAll(".plan-project-item").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = el.getAttribute("data-plan-id");
        postToMap("select-plan", { planId: id });
        var summary = qs("#plan-active-summary");
        if (summary) {
          summary.hidden = false;
          summary.innerHTML =
            "<h3>Active Plan</h3><p>" +
            (el.querySelector("h3")?.textContent || "Plan") +
            "</p><p>Map updated for selected project.</p>";
        }
      });
    });
  }

  function loadProjects(listEl) {
    if (!listEl) return;
    listEl.innerHTML = '<p class="plan-panel-loading">Loading projects…</p>';
    var doFetch = window.WispCwlApi
      ? window.WispCwlApi.fetch
      : function (p) { return fetch(p, { credentials: "same-origin" }); };
    doFetch("/api/plans")
      .then(function (r) {
        return r.ok ? r.json() : [];
      })
      .then(function (data) {
        var projects = Array.isArray(data) ? data : data?.projects || data?.items || [];
        renderProjects(listEl, projects);
      })
      .catch(function () {
        listEl.innerHTML = '<p class="plan-panel-empty">Could not load projects. Sign in and try again.</p>';
      });
  }

  var WIZARDS = [
    {
      id: "customer",
      title: "Add Customer",
      desc: "Create a customer record (billing, service address, contact).",
      api: "/api/customers",
      fields: [
        { name: "firstName", label: "First name", required: true },
        { name: "lastName", label: "Last name", required: true },
        { name: "email", label: "Email", type: "email" },
        { name: "primaryPhone", label: "Phone" },
      ],
    },
    {
      id: "subscriber",
      title: "Add Subscriber",
      desc: "Provision an HSS subscriber (IMSI, key material).",
      api: "/api/hss/subscribers",
      fields: [
        { name: "imsi", label: "IMSI", required: true },
        { name: "msisdn", label: "MSISDN" },
        { name: "ki", label: "Ki (hex)" },
        { name: "opc", label: "OPc (hex)" },
      ],
    },
    {
      id: "work-order",
      title: "Create Work Order",
      desc: "Schedule field work (install, repair, survey).",
      api: "/api/work-orders",
      fields: [
        { name: "title", label: "Title", required: true },
        { name: "type", label: "Type (install/repair/survey)" },
        { name: "description", label: "Description" },
      ],
    },
    {
      id: "inventory",
      title: "Add Inventory Item",
      desc: "Register hardware (CPE, radios, routers).",
      api: "/api/inventory",
      fields: [
        { name: "name", label: "Item name", required: true },
        { name: "serialNumber", label: "Serial number" },
        { name: "model", label: "Model" },
      ],
    },
  ];

  function wizardModal(wiz) {
    var overlay = document.createElement("div");
    overlay.className = "wisp-wizard-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    var inputs = wiz.fields
      .map(function (f) {
        return (
          '<div class="form-group"><label for="wiz-' + f.name + '">' + f.label +
          (f.required ? " *" : "") +
          '</label><input id="wiz-' + f.name + '" name="' + f.name + '" type="' + (f.type || "text") + '"' +
          (f.required ? " required" : "") + " /></div>"
        );
      })
      .join("");
    overlay.innerHTML =
      '<div class="wisp-wizard-modal"><header><h2>' + wiz.title + "</h2>" +
      '<button type="button" class="wisp-wizard-close" aria-label="Close">×</button></header>' +
      '<p class="wisp-wizard-desc">' + wiz.desc + "</p>" +
      '<form class="wisp-wizard-form">' + inputs +
      '<div class="wisp-wizard-status" aria-live="polite" hidden></div>' +
      '<footer><button type="button" class="wisp-demo-btn wisp-wizard-cancel">Cancel</button>' +
      '<button type="submit" class="wisp-demo-btn primary">Create</button></footer></form></div>';
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
    }
    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay || ev.target.closest(".wisp-wizard-close, .wisp-wizard-cancel")) close();
    });
    var form = overlay.querySelector(".wisp-wizard-form");
    var status = overlay.querySelector(".wisp-wizard-status");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var payload = {};
      wiz.fields.forEach(function (f) {
        var el = form.querySelector('[name="' + f.name + '"]');
        if (el && el.value) payload[f.name] = el.value;
      });
      status.hidden = false;
      status.textContent = "Creating…";
      status.classList.remove("error");
      var doFetch = window.WispCwlApi
        ? window.WispCwlApi.fetch
        : function (p, o) { return fetch(p, Object.assign({ credentials: "same-origin" }, o)); };
      doFetch(wiz.api, { method: "POST", body: JSON.stringify(payload) })
        .then(function (r) {
          if (!r.ok) {
            return r.text().then(function (t) {
              throw new Error("Backend rejected (" + r.status + "): " + t.slice(0, 140));
            });
          }
          status.textContent = "Created — saved to the live backend.";
          setTimeout(close, 1200);
        })
        .catch(function (e) {
          status.classList.add("error");
          status.textContent = (e && e.message) || "Create failed";
        });
    });
    var firstInput = overlay.querySelector("input");
    if (firstInput) firstInput.focus();
  }

  function initWizardLauncher() {
    var page = qs('[data-wisp-page="wizards"]');
    if (!page) return;
    var panel = page.querySelector(".wisp-demo-panel");
    if (!panel) return;
    var grid = document.createElement("div");
    grid.className = "wisp-wizard-grid";
    grid.innerHTML = WIZARDS.map(function (w) {
      return (
        '<article class="wisp-wizard-card" data-wizard="' + w.id + '">' +
        "<h3>" + w.title + "</h3><p>" + w.desc + "</p>" +
        '<button type="button" class="wisp-demo-btn primary" data-wizard-launch="' + w.id + '">Launch wizard</button></article>'
      );
    }).join("");
    panel.insertBefore(grid, panel.firstChild);
    page.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-wizard-launch]");
      if (!btn) return;
      var wiz = WIZARDS.filter(function (w) { return w.id === btn.getAttribute("data-wizard-launch"); })[0];
      if (wiz) wizardModal(wiz);
    });
  }

  initWizardLauncher();

  var plan = qs('[data-wisp-page="plan"]');
  if (plan) {
    var panel = qs("#plan-projects-panel");
    var listEl = qs("#plan-projects-list");

    plan.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      if (action === "back") {
        location.href = "/dashboard";
        return;
      }
      if (action === "projects") {
        if (panel) {
          panel.hidden = !panel.hidden;
          if (!panel.hidden) loadProjects(listEl);
        }
        return;
      }
      if (action === "close-projects") {
        if (panel) panel.hidden = true;
        return;
      }
      if (action === "hardware") {
        location.href = "/modules/hardware";
        return;
      }
      if (action === "layers") {
        postToMap("toggle-layers");
        return;
      }
      if (action === "marketing") {
        postToMap("marketing-draw");
        return;
      }
    });
  }
})();
