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
    fetch("/api/plans", { credentials: "same-origin" })
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
