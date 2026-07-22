/* Chrysalis Conversion Method Console — settings, meters, method coach */
(function () {
  const STEPS = [
    { id: "inventory", label: "1 · Site inventory", weight: 14 },
    { id: "corpus", label: "2 · Corpus queue", weight: 10 },
    { id: "lift", label: "3 · Structural lift", weight: 18 },
    { id: "holes", label: "4 · Hole-close", weight: 14 },
    { id: "shells", label: "5 · Shell / nest fidelity", weight: 14 },
    { id: "gaps", label: "6 · Gap catalog", weight: 10 },
    { id: "prove", label: "7 · Prove vs origin", weight: 10 },
    { id: "deploy", label: "8 · Dual deploy", weight: 10 },
  ];

  const ADAPTERS = [
    { id: "sveltekit", label: "SvelteKit inventory + markup + shells", value: 100 },
    { id: "vite-vue", label: "Vue / Nuxt inventory + overlay shells", value: 100 },
    { id: "next-app", label: "Next App Router inventory + overlay shells", value: 100 },
    { id: "angular", label: "Angular inventory + overlay shells", value: 100 },
    { id: "php-blade", label: "PHP Blade inventory + basic markup", value: 100 },
    { id: "php", label: "PHP handlers + oracle (server track)", value: 100 },
  ];

  const KB = [
    {
      keys: ["inventory", "step 1", "first", "adapter"],
      answer:
        "Step 1 is complete site inventory. Run: pnpm run chrysalis:site-inventory -- --origin <path> [--live <url>] [--framework <adapter>]. Adapters: scripts/lib/site-inventory/. Live census uses data-cwl-* attrs.",
    },
    {
      keys: ["slot", "basewizard", "fold"],
      answer:
        "Named slots must fold into self-gated shells on full lift. Escaped slots are a P1 gap. Boot-hide while the gate is closed; never invent chrome.",
    },
    {
      keys: ["isopen", "shell-key", "orphan"],
      answer:
        "Parent gates win: isOpen={showSiteEditor} → data-cwl-shell-key=\"showSiteEditor\". Orphans go in the gap catalog — stamp, or mark honest-skip / origin-dead.",
    },
    {
      keys: ["demo", "invent", "d6447", "translate"],
      answer:
        "D6442/D6447: translate only. No demo façades, no invented maps/APIs/widgets. Prefer holes over substitutes.",
    },
    {
      keys: ["gap", "catalog", "p0"],
      answer:
        "pnpm run chrysalis:gap-catalog — close P0 nests first, then P1 slots/orphans. Mark fixed / honest-skip / origin-dead.",
    },
    {
      keys: ["vue", "next", "angular", "react", "blade"],
      answer:
        "Markup lift: SvelteKit, Vue, Next, Angular, and Blade (basic). Inventory mirrors them. Overlay gates stamp data-cwl-shell-key like Svelte. Alpine/Livewire remain honesty holes — not invented runtimes.",
    },
    {
      keys: ["prove", "d6448", "success"],
      answer:
        "D6448-ST: hole-zero is necessary but not sufficient. Sign in vs origin. Deploy-green ≠ fidelity.",
    },
    {
      keys: ["deploy", "bust", "firebase", "gce"],
      answer:
        "Bump asset bust; dual-deploy chimera + production host. Do not wipe routes.cwl on structural-only redeploys.",
    },
  ];

  const STORE = "chrysalis.convert-console.v1";

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}");
    } catch {
      return {};
    }
  }

  function saveState(s) {
    localStorage.setItem(STORE, JSON.stringify(s));
  }

  function defaultSteps() {
    return Object.fromEntries(
      STEPS.map((s, i) => [s.id, i === 0 ? "active" : "pending"]),
    );
  }

  function answer(q) {
    const n = String(q || "").toLowerCase();
    for (const row of KB) {
      if (row.keys.some((k) => n.includes(k))) return row.answer;
    }
    return "Ask about inventory adapters, slots/shells, gap catalog, D6442/47/48, prove, or deploy. Canonical: docs/UNIVERSAL-CONVERSION-METHOD.md.";
  }

  const state = {
    framework: "auto",
    origin: "",
    live: "",
    chimera: true,
    prod: true,
    honest: true,
    noInvent: true,
    steps: defaultSteps(),
    chat: [
      {
        role: "assistant",
        text: "Method coach ready. Configure settings, advance steps, and ask about adapters or fidelity laws.",
      },
    ],
    ...loadState(),
  };
  if (!state.steps || !state.steps.inventory) state.steps = defaultSteps();

  const $ = (id) => document.getElementById(id);

  function bindToggle(id, key) {
    const el = $(id);
    el.setAttribute("aria-checked", String(Boolean(state[key])));
    el.addEventListener("click", () => {
      state[key] = !state[key];
      el.setAttribute("aria-checked", String(state[key]));
      persist();
      renderPills();
    });
  }

  function cli() {
    const fw =
      state.framework === "auto" ? "" : ` --framework ${state.framework}`;
    const live = state.live ? ` --live ${state.live}` : "";
    return `pnpm run chrysalis:site-inventory -- --origin ${state.origin || "<path>"}${live}${fw}`;
  }

  function progress() {
    const total = STEPS.reduce((a, s) => a + s.weight, 0);
    let done = 0;
    for (const s of STEPS) {
      if (state.steps[s.id] === "done") done += s.weight;
      else if (state.steps[s.id] === "active") done += s.weight * 0.35;
    }
    return { total, done: Math.round(done), pct: Math.round((done / total) * 100) };
  }

  function persist() {
    saveState({
      framework: state.framework,
      origin: state.origin,
      live: state.live,
      chimera: state.chimera,
      prod: state.prod,
      honest: state.honest,
      noInvent: state.noInvent,
      steps: state.steps,
      chat: state.chat.slice(-40),
    });
  }

  function renderPills() {
    const fwLabel =
      $("framework").selectedOptions[0]?.textContent || state.framework;
    $("pills").innerHTML = [
      `<span class="pill on">Method v2</span>`,
      `<span class="pill ${state.noInvent ? "on" : ""}">${state.noInvent ? "Translate-only" : "Invent risk"}</span>`,
      `<span class="pill">${fwLabel}</span>`,
      state.chimera ? `<span class="pill">Chimera</span>` : "",
      state.prod ? `<span class="pill">Prod host</span>` : "",
    ].join("");
  }

  function renderMeters() {
    const p = progress();
    $("pct").textContent = `${p.pct}%`;
    const doneCount = STEPS.filter((s) => state.steps[s.id] === "done").length;
    $("stepsDone").textContent = `${doneCount}/8`;
    const active = STEPS.find((s) => state.steps[s.id] === "active");
    $("activeLabel").textContent = (active?.label || "—").replace(/^\d+ · /, "");
    $("meterRight").textContent = `${p.done} / ${p.total} weighted`;
    $("methodTrack").innerHTML = STEPS.map((s) => {
      const st = state.steps[s.id];
      const w = st === "done" ? s.weight : st === "active" ? s.weight * 0.35 : 0;
      const cls = st === "done" ? "done" : st === "active" ? "active" : "";
      const pct = (w / p.total) * 100;
      return pct > 0 ? `<div class="seg ${cls}" style="width:${pct}%"></div>` : "";
    }).join("");
  }

  function renderSteps() {
    $("stepList").innerHTML = STEPS.map((s) => {
      const st = state.steps[s.id];
      return `<li><span class="badge ${st}">${st}</span><span>${s.label}</span></li>`;
    }).join("");
  }

  function renderAdapters() {
    $("adapters").innerHTML = ADAPTERS.map(
      (a) => `
      <div class="adapter-row">
        <div class="meter-head"><span>${a.label}</span><span>${a.value}%</span></div>
        <div class="track"><div class="seg" style="width:${a.value}%"></div></div>
      </div>`,
    ).join("");
  }

  function renderChat() {
    $("chat").innerHTML = state.chat
      .map(
        (m) =>
          `<div class="bubble"><div class="who">${m.role === "user" ? "You" : "Coach"}</div>${escapeHtml(m.text)}</div>`,
      )
      .join("");
    $("chat").scrollTop = $("chat").scrollHeight;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderCli() {
    $("cli").textContent = cli();
  }

  function pushChat(role, text) {
    state.chat.push({ role, text });
    persist();
    renderChat();
  }

  function advance() {
    const order = STEPS.map((s) => s.id);
    const i = order.findIndex((id) => state.steps[id] === "active");
    if (i >= 0) state.steps[order[i]] = "done";
    if (i + 1 < order.length) state.steps[order[i + 1]] = "active";
    persist();
    renderMeters();
    renderSteps();
  }

  function reset() {
    state.steps = defaultSteps();
    persist();
    renderMeters();
    renderSteps();
  }

  // hydrate controls
  $("framework").value = state.framework || "auto";
  $("origin").value = state.origin || "";
  $("live").value = state.live || "";
  bindToggle("togChimera", "chimera");
  bindToggle("togProd", "prod");
  bindToggle("togHonest", "honest");
  bindToggle("togNoInvent", "noInvent");

  $("framework").addEventListener("change", () => {
    state.framework = $("framework").value;
    persist();
    renderCli();
    renderPills();
  });
  $("origin").addEventListener("input", () => {
    state.origin = $("origin").value;
    persist();
    renderCli();
  });
  $("live").addEventListener("input", () => {
    state.live = $("live").value;
    persist();
    renderCli();
  });

  $("btnAdvance").addEventListener("click", advance);
  $("btnReset").addEventListener("click", reset);
  $("btnCopy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cli());
      pushChat("assistant", "CLI copied to clipboard.");
    } catch {
      pushChat("assistant", cli());
    }
  });
  $("btnRunHint").addEventListener("click", () => {
    const active = STEPS.find((s) => state.steps[s.id] === "active");
    pushChat(
      "assistant",
      active
        ? `Next: finish “${active.label}”. ${answer(active.id)}`
        : "All steps marked done — re-inventory and prove vs origin.",
    );
  });
  $("btnAsk").addEventListener("click", () => {
    const q = $("ask").value.trim();
    if (!q) return;
    $("ask").value = "";
    pushChat("user", q);
    pushChat("assistant", answer(q));
  });
  $("ask").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("btnAsk").click();
  });
  $("btnAskInv").addEventListener("click", () => {
    pushChat("user", "What is Step 1 inventory?");
    pushChat("assistant", answer("inventory step 1 adapter"));
  });
  $("btnAskOrphan").addEventListener("click", () => {
    pushChat("user", "Explain orphan toggles");
    pushChat("assistant", answer("orphan shell-key isOpen"));
  });

  renderPills();
  renderMeters();
  renderSteps();
  renderAdapters();
  renderChat();
  renderCli();
})();
