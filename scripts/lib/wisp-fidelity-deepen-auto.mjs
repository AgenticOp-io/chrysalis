#!/usr/bin/env node
/**
 * Autonomous deepen exhaust loop (D6445).
 *
 * Continues proposing ×10 GET-first deepen rounds until **3 consecutive**
 * rounds show **no improvement** (zero newly green exact method+path probes).
 * Operator does not need to say "continue".
 *
 *   pnpm run hub:fidelity-deepen-until-exhausted
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --until-exhausted
 *
 * Laws: D6442 translate-only bodies; D6445 external-deps briefing; never invent keys.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runDeepenBatch,
  loadCatalog,
  catalogPath,
  scriptRoot,
} from "./wisp-fidelity-deepen-harness.mjs";
import { runExternalDepsProtocol, externalRiskForApiPath } from "./wisp-external-deps-protocol.mjs";
import { extractExpressApiMounts } from "./sync-api-paths-from-backend.mjs";

export const AUTO_KIND = "chrysalis.wisp.fidelity-deepen-auto-exhaust";
export const AUTO_SCHEMA = 1;
export const STOP_AFTER_NO_IMPROVEMENT = 3;
export const BATCH_SIZE = 10;

const autoStatePath = join(
  scriptRoot,
  "fixtures/hub-wisp-management/chrysalis.wisp-fidelity-deepen-auto-state.v1.json",
);

const SKIP_DIR = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

/**
 * @param {object} [opts]
 */
export function loadAutoState(opts = {}) {
  const p = opts.statePath || autoStatePath;
  if (!existsSync(p)) {
    return {
      kind: AUTO_KIND,
      schemaVersion: AUTO_SCHEMA,
      stopAfterNoImprovement: STOP_AFTER_NO_IMPROVEMENT,
      consecutiveNoImprovement: 0,
      status: "idle",
      exactPathsProbed: [],
      rounds: [],
      updatedAt: null,
    };
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

/**
 * @param {object} state
 * @param {object} [opts]
 */
export function saveAutoState(state, opts = {}) {
  const p = opts.statePath || autoStatePath;
  mkdirSync(dirname(p), { recursive: true });
  const next = { ...state, updatedAt: new Date().toISOString() };
  writeFileSync(p, JSON.stringify(next, null, 2) + "\n");
  return next;
}

function resolveBackendRoot(opts = {}) {
  return resolve(
    opts.backendRoot ??
      process.env.CHRYSALIS_WISP_BACKEND ??
      join(
        process.env.CHRYSALIS_WISP_ROOT ??
          process.env.WISP_MODULE_DIR ??
          "C:/Users/david/AgenticOps/products/wisptools/Module_Manager",
        "..",
        "backend-services",
      ),
  );
}

function walkJs(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkJs(p, acc);
    else if (ent.name.endsWith(".js")) {
      try {
        if (statSync(p).size < 1_500_000) acc.push(p);
      } catch {
        /* ignore */
      }
    }
  }
  return acc;
}

/**
 * Discover static GET routes (no :params) from Express mounts + router.get.
 * @param {string} backendRoot
 * @returns {Array<{ path: string, source: string }>}
 */
export function discoverStaticGetRoutes(backendRoot) {
  const serverPath = join(backendRoot, "server.js");
  if (!existsSync(serverPath)) return [];
  const mounts = extractExpressApiMounts(readFileSync(serverPath, "utf8"));
  mounts.push({ path: "/api/branding", source: "routes/branding-api.js" });

  /** @type {Map<string, { path: string, source: string }>} */
  const out = new Map();
  const getRe = /router\.get\(\s*['"`]([^'"`]+)['"`]/g;
  const appGetRe = /app\.get\(\s*['"`](\/api[^'"`]+)['"`]/g;

  for (const mount of mounts) {
    let rel = mount.source.replace(/^\.\//, "");
    const candidates = [];
    if (rel.endsWith(".js")) candidates.push(join(backendRoot, rel));
    else {
      candidates.push(join(backendRoot, `${rel}.js`));
      candidates.push(join(backendRoot, rel, "index.js"));
      // also walk directory
      const dir = join(backendRoot, rel);
      if (existsSync(dir)) walkJs(dir, candidates);
    }
    for (const file of candidates) {
      if (!existsSync(file) || !file.endsWith(".js")) continue;
      let text;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const src = relative(backendRoot, file).replace(/\\/g, "/");
      for (const m of text.matchAll(getRe)) {
        const sub = m[1];
        if (sub.includes(":")) continue; // param routes need ids — later
        if (sub.includes("*")) continue;
        const full = (mount.path.replace(/\/$/, "") + (sub.startsWith("/") ? sub : `/${sub}`)).replace(
          /\/+/g,
          "/",
        );
        if (!full.startsWith("/api") && !full.startsWith("/admin")) continue;
        out.set(full, { path: full, source: src });
      }
      for (const m of text.matchAll(appGetRe)) {
        const full = m[1];
        if (full.includes(":")) continue;
        out.set(full, { path: full, source: src });
      }
    }
  }

  // Branding helper registers app.get('/api/branding/:tenantId') — skip params
  return [...out.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Exact probe key.
 * @param {string} method
 * @param {string} path
 */
export function exactKey(method, path) {
  return `${String(method).toUpperCase()} ${path}`;
}

/**
 * Seed exactPathsProbed from prior deepen reports + batch TARGETS so auto
 * does not re-count already-closed endpoints as improvement.
 */
export function seedExactPathsFromHistory(state) {
  const probed = new Set(state.exactPathsProbed || []);
  const batchesDir = join(scriptRoot, "scripts/lib/wisp-fidelity-deepen-batches");
  if (existsSync(batchesDir)) {
    for (const name of readdirSync(batchesDir)) {
      if (!name.endsWith(".mjs") || name === "index.mjs") continue;
      try {
        const text = readFileSync(join(batchesDir, name), "utf8");
        for (const m of text.matchAll(/path:\s*["']([^"']+)["']/g)) {
          probed.add(exactKey("GET", m[1]));
        }
        for (const m of text.matchAll(
          /probeDemo\(\s*["'](GET|POST|PUT|PATCH|DELETE)["']\s*,\s*[`'"]([^`'"]+)[`'"]/g,
        )) {
          const path = m[2];
          if (!path.includes("${")) probed.add(exactKey(m[1], path));
        }
      } catch {
        /* ignore */
      }
    }
  }
  const reportsDir = join(scriptRoot, "reports/wisp");
  if (existsSync(reportsDir)) {
    for (const name of readdirSync(reportsDir)) {
      if (!/^fidelity-deepen-.*\.json$/.test(name)) continue;
      try {
        const j = JSON.parse(readFileSync(join(reportsDir, name), "utf8"));
        for (const p of j.probes || []) {
          if (p.path && (p.ok === true || (p.status >= 200 && p.status < 300))) {
            probed.add(exactKey(p.method || "GET", p.path));
          }
        }
      } catch {
        /* ignore */
      }
    }
  }
  const catalog = loadCatalog();
  for (const p of catalog?.passes || []) {
    if (p.exactPath) probed.add(exactKey("GET", p.exactPath));
  }
  return [...probed].sort();
}

/**
 * @param {string} batchId
 */
function batchIdToPassStart(catalog, batchId) {
  if (catalog?.nextPassRange?.[0]) return catalog.nextPassRange[0];
  const n = Number(String(batchId).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : (catalog?.closedThroughPass || 0) + 1;
}

/**
 * Advance batch id: n10z → n11a → n11b … n11z → n12a
 * @param {string} id
 */
export function bumpBatchId(id) {
  const m = String(id).match(/^n(\d+)([a-z])$/i);
  if (!m) {
    const n = (Number(String(id).replace(/\D/g, "")) || 10) + 1;
    return `n${n}a`;
  }
  const num = Number(m[1]);
  const letter = m[2].toLowerCase();
  if (letter === "z") return `n${num + 1}a`;
  return `n${num}${String.fromCharCode(letter.charCodeAt(0) + 1)}`;
}

/**
 * Pick next ×10 targets not yet exact-probed.
 * @param {object} opts
 */
export function selectAutoTargets(opts = {}) {
  const backendRoot = resolveBackendRoot(opts);
  const state = opts.state || loadAutoState();
  const probed = new Set(state.exactPathsProbed || []);
  const discovered = discoverStaticGetRoutes(backendRoot);
  const deps = opts.externalDeps || null;

  /** @type {Array<{ path: string, source: string, risks: string[] }>} */
  const fresh = [];
  for (const d of discovered) {
    const key = exactKey("GET", d.path);
    if (probed.has(key)) continue;
    const risks = deps ? externalRiskForApiPath(d.path, deps) : [];
    // Soft filter: still allow geocode etc — risks are notes, not hard skips
    fresh.push({ ...d, risks });
  }

  const limit = opts.limit ?? BATCH_SIZE;
  return {
    backendRoot,
    candidates: fresh.slice(0, limit),
    remainingAfter: Math.max(0, fresh.length - limit),
    totalFresh: fresh.length,
  };
}

/**
 * @param {object} report deepen batch report
 */
export function countImprovements(report, priorProbed) {
  const prior = new Set(priorProbed || []);
  /** @type {string[]} */
  const newlyGreen = [];
  /** @type {string[]} */
  const newlyTried = [];
  for (const p of report.probes || []) {
    const method = p.method || "GET";
    const path = p.path;
    if (!path) continue;
    const key = exactKey(method, path);
    newlyTried.push(key);
    const ok = p.ok === true || (p.status >= 200 && p.status < 300);
    if (ok && !prior.has(key) && !String(p.action || "").startsWith("skip")) {
      newlyGreen.push(key);
    }
  }
  return { newlyGreen, newlyTried, improvement: newlyGreen.length };
}

/**
 * Persist catalog advance after a successful auto round.
 */
export function updateCatalogAfterAutoRound(opts) {
  const catalog = loadCatalog();
  if (!catalog) throw new Error("missing deepen catalog");
  const {
    batchId,
    passStart,
    passEnd,
    passes,
    newlyGreen,
  } = opts;

  catalog.batches = catalog.batches || [];
  if (!catalog.batches.some((b) => b.id === batchId)) {
    catalog.batches.push({
      id: batchId,
      passRange: [passStart, passEnd],
      status: "closed-harness-auto",
    });
  }
  catalog.passes = catalog.passes || [];
  for (const p of passes) {
    if (!catalog.passes.some((x) => x.id === p.id)) catalog.passes.push(p);
  }
  catalog.closedThroughPass = Math.max(catalog.closedThroughPass || 0, passEnd);
  catalog.nextBatchId = bumpBatchId(batchId);
  catalog.nextPassRange = [passEnd + 1, passEnd + BATCH_SIZE];
  catalog.desk = catalog.desk || {};
  catalog.desk.autoExhaust = {
    protocol: "scripts/lib/wisp-fidelity-deepen-auto.mjs",
    stopAfterNoImprovement: STOP_AFTER_NO_IMPROVEMENT,
    decision: "D6445",
    lastBatchId: batchId,
    lastImprovement: newlyGreen.length,
  };
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
  return catalog;
}

/**
 * Write a thin harness batch module for reproducibility.
 */
export function writeAutoBatchModule(batchId, passStart, targets) {
  const file = join(scriptRoot, `scripts/lib/wisp-fidelity-deepen-batches/${batchId}.mjs`);
  const clean = `/** Auto deepen batch ${batchId} — generated by wisp-fidelity-deepen-auto (D6445). */
export const BATCH_ID = ${JSON.stringify(batchId)};
export const KIND = ${JSON.stringify(`chrysalis.wisp.fidelity-deepen-${batchId}`)};
export const NEED_ADMIN = false;
export const NOTE = ${JSON.stringify(`Auto exhaust GET round ${batchId} (D6445)`)};
export const AUTO = true;
export const PASSES = [
${targets.map((t, i) => `  { id: ${passStart + i}, title: ${JSON.stringify(`Auto GET ${t.path}`)} },`).join("\n")}
];
export const REFRESH_PATHS = ${JSON.stringify(
    [...new Set(targets.map((t) => "/" + t.path.split("/").filter(Boolean).slice(0, 2).join("/")))],
  )};
export const TARGETS = ${JSON.stringify(
    targets.map((t, i) => ({
      pass: passStart + i,
      path: t.path,
      source: t.source,
      risks: t.risks || [],
    })),
    null,
    2,
  )};

export async function runProbes(ctx) {
  const { probeDemo } = ctx;
  /** @type {Array<Record<string, unknown>>} */
  const probes = [];
  for (const t of TARGETS) {
    probes.push({
      pass: t.pass,
      ...(await probeDemo("GET", t.path)),
      source: t.source || "auto-discover",
      risks: t.risks || [],
    });
  }
  return probes;
}
`;
  writeFileSync(file, clean);
  return file;
}

/**
 * One auto round.
 */
export async function runAutoRound(opts = {}) {
  const catalog = loadCatalog();
  if (!catalog) throw new Error("missing catalog");
  const state = loadAutoState();
  const deps = opts.skipExternalDeps ? null : runExternalDepsProtocol();
  const batchId = catalog.nextBatchId || "n10z";
  const passStart = catalog.nextPassRange?.[0] || (catalog.closedThroughPass || 0) + 1;
  const selection = selectAutoTargets({
    state,
    externalDeps: deps,
    limit: opts.limit ?? BATCH_SIZE,
  });

  if (selection.candidates.length === 0) {
    return {
      ok: true,
      batchId,
      improvement: 0,
      reason: "no-fresh-static-get-routes",
      totalFresh: 0,
      selection,
      exhaustedQueue: true,
    };
  }

  const targets = selection.candidates;
  const passEnd = passStart + targets.length - 1;
  writeAutoBatchModule(batchId, passStart, targets);

  // Dynamic import of just-written module
  const modPath = join(scriptRoot, `scripts/lib/wisp-fidelity-deepen-batches/${batchId}.mjs`);
  const mod = await import(`file:///${modPath.replace(/\\/g, "/")}?t=${Date.now()}`);

  const priorProbed = [...(state.exactPathsProbed || [])];
  const report = await runDeepenBatch({
    kind: mod.KIND,
    batchId: mod.BATCH_ID,
    passes: mod.PASSES,
    refreshPaths: mod.REFRESH_PATHS,
    needAdmin: false,
    runProbes: mod.runProbes,
    note: `${mod.NOTE}; remainingFresh=${selection.remainingAfter}`,
    opts: { ...(opts.batchOpts || {}), skipLiveRefresh: opts.skipLiveRefresh !== false },
  });

  // Ensure path/method on probes for improvement count
  for (let i = 0; i < (report.probes || []).length; i++) {
    const p = report.probes[i];
    if (!p.path && targets[i]) p.path = targets[i].path;
    if (!p.method) p.method = "GET";
  }

  const { newlyGreen, newlyTried, improvement } = countImprovements(report, priorProbed);

  const exactPathsProbed = [...new Set([...(state.exactPathsProbed || []), ...newlyTried])];
  const consecutiveNoImprovement =
    improvement > 0 ? 0 : (state.consecutiveNoImprovement || 0) + 1;

  const passes = targets.map((t, i) => {
    const pr = report.probes?.[i];
    const ok = pr?.ok === true || (pr?.status >= 200 && pr?.status < 300);
    return {
      id: passStart + i,
      batch: batchId,
      title: `Auto GET ${t.path}`,
      status: ok ? "done" : "honest",
      apiPaths: [t.path.split("/").slice(0, 3).join("/") || t.path],
      exactPath: t.path,
      source: t.source,
      ...(t.risks?.length ? { externalRisk: t.risks.join("; ") } : {}),
      ...(ok ? {} : { residual: `auto-get-${pr?.status || "fail"}` }),
    };
  });

  if (improvement > 0 || targets.length > 0) {
    updateCatalogAfterAutoRound({
      batchId,
      passStart,
      passEnd,
      passes,
      newlyGreen,
    });
  }

  const round = {
    batchId,
    passRange: [passStart, passEnd],
    improvement,
    newlyGreen,
    tried: newlyTried.length,
    remainingFresh: selection.remainingAfter,
    at: new Date().toISOString(),
  };

  const nextState = saveAutoState({
    ...state,
    status: consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT ? "exhausted" : "running",
    stopAfterNoImprovement: STOP_AFTER_NO_IMPROVEMENT,
    consecutiveNoImprovement,
    exactPathsProbed,
    rounds: [...(state.rounds || []), round].slice(-50),
    lastRound: round,
  });

  return {
    ok: report.ok !== false,
    batchId,
    passStart,
    passEnd,
    improvement,
    newlyGreen,
    consecutiveNoImprovement: nextState.consecutiveNoImprovement,
    remainingFresh: selection.remainingAfter,
    totalFreshBefore: selection.totalFresh,
    reportPath: report.reportPath,
    stop: nextState.consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT,
    exhaustedQueue: false,
  };
}

/**
 * Loop until 3 no-improvement rounds or empty queue.
 * @param {object} [opts]
 */
export async function runUntilExhausted(opts = {}) {
  const maxRounds = opts.maxRounds ?? 40;
  const startedAt = new Date().toISOString();
  /** @type {object[]} */
  const rounds = [];
  let stopReason = "max-rounds";

  let st = loadAutoState();
  if (opts.resetStreak) {
    st = saveAutoState({ ...st, consecutiveNoImprovement: 0, status: "running" });
  }
  // Always merge history seed so previously closed deepen GETs are not "new"
  const seeded = seedExactPathsFromHistory(st);
  st = saveAutoState({
    ...st,
    exactPathsProbed: seeded,
    status: st.status === "exhausted" && opts.resetStreak ? "running" : st.status || "running",
  });

  for (let i = 0; i < maxRounds; i++) {
    const result = await runAutoRound(opts);
    rounds.push(result);
    console.log(
      JSON.stringify(
        {
          round: i + 1,
          batchId: result.batchId,
          improvement: result.improvement,
          consecutiveNoImprovement: result.consecutiveNoImprovement,
          remainingFresh: result.remainingFresh,
          stop: result.stop,
          reason: result.reason,
        },
        null,
        2,
      ),
    );

    if (result.exhaustedQueue) {
      // Empty queue counts as no improvement
      const st = loadAutoState();
      const consecutiveNoImprovement = (st.consecutiveNoImprovement || 0) + (result.improvement ? 0 : 1);
      saveAutoState({
        ...st,
        consecutiveNoImprovement,
        status: consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT ? "exhausted" : st.status,
      });
      if (consecutiveNoImprovement >= STOP_AFTER_NO_IMPROVEMENT) {
        stopReason = "no-fresh-routes-and-streak";
        break;
      }
      // If queue empty once, we're done — nothing left to find
      stopReason = "no-fresh-static-get-routes";
      saveAutoState({ ...loadAutoState(), status: "exhausted", consecutiveNoImprovement: STOP_AFTER_NO_IMPROVEMENT });
      break;
    }

    if (result.stop) {
      stopReason = `no-improvement-x${STOP_AFTER_NO_IMPROVEMENT}`;
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    kind: AUTO_KIND,
    schemaVersion: AUTO_SCHEMA,
    ok: true,
    startedAt,
    finishedAt,
    stopReason,
    stopAfterNoImprovement: STOP_AFTER_NO_IMPROVEMENT,
    roundsRun: rounds.length,
    totalImprovement: rounds.reduce((n, r) => n + (r.improvement || 0), 0),
    rounds: rounds.map((r) => ({
      batchId: r.batchId,
      improvement: r.improvement,
      consecutiveNoImprovement: r.consecutiveNoImprovement,
      remainingFresh: r.remainingFresh,
    })),
    statePath: autoStatePath,
    catalogPath,
  };

  const summaryPath = join(scriptRoot, "reports/wisp/fidelity-deepen-auto-exhaust.json");
  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n");
  summary.summaryPath = summaryPath;
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const resetStreak = args.includes("--reset-streak");
  const maxRounds = (() => {
    const i = args.indexOf("--max-rounds");
    return i >= 0 ? Number(args[i + 1]) || 40 : 40;
  })();
  await runUntilExhausted({ resetStreak, maxRounds });
}

if (process.argv[1]?.includes("wisp-fidelity-deepen-auto")) main();
