#!/usr/bin/env node
/**
 * GCE suite progress manifest — one JSON file tracks every phase (pending/running/ok/failed/skipped).
 * Used by gce-run-phase.sh and gce-test-status (via `summary`).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ORACLE_PRODUCT_ULTRA_SLICES } from "./hub-ingest/hub-oracle-product-ultra-batch-smoke.mjs";
import { VERIFY_STANDALONE_MEGA_SLICES } from "./hub-ingest/hub-verify-standalone-mega-batch-smoke.mjs";

const PROGRESS_FILE =
  process.env.CHRYSALIS_GCE_PROGRESS_FILE ?? "reports/ci/gce-progress.json";

/** @typedef {'pending'|'running'|'ok'|'failed'|'skipped'} PhaseStatus */

/** @type {Record<string, string>} */
const PHASE_LABELS = {
  "build-install": "pnpm install",
  "build-compile": "pnpm -r build",
  "parser-bridge-vendor": "parser-bridge vendor",
  "cli-shims": "cli shims",
  "hub-strategic-vitest": "hub strategic vitest",
  "hub-express-flagship": "hub express flagship",
  "hub-plain-php-flagship": "hub plain-php flagship",
  "hub-symfony-flagship": "hub symfony flagship",
  "hub-node-express-oracle-verify": "hub node express oracle verify",
  "hub-node-oracle-spike": "hub node oracle spike",
  "hub-cwl": "hub CWL vitest",
  "hub-fixture-emits": "ensure fixture emits",
  "hub-cwl-authoring-v61-v63": "CWL authoring v61-v63",
  "hub-cwl-authoring-v64-v70": "CWL authoring v64-v70",
  "hub-cwl-authoring-v71-v90": "CWL authoring v71-v90",
  "hub-cwl-authoring-v91-v110": "CWL authoring v91-v110",
  "wptp-matrix": "wptp-matrix siblings",
  "hub-gold-verify": "hub gold verify",
  "hub-gold-trace-replay": "hub gold trace replay",
  "full-vitest": "full workspace vitest",
  "hub-completion-json": "hub completion JSON",
  "hub-completion-gate": "hub completion gate",
  "hub-knowledge": "hub knowledge gates",
  "cwl-http-verify": "CWL HTTP verify",
  "cwl-batch-v40": "CWL batch v40 (gate-only)",
  "cwl-batch-v60": "CWL batch v60",
  "cwl-v110-verify-gaps-parallel": "v110 verify-gaps parallel",
  "cwl-v110-migration-mega": "v110 migration mega",
  "post110-verify-gaps": "post-110 verify-gaps",
};

for (const s of ORACLE_PRODUCT_ULTRA_SLICES) {
  PHASE_LABELS[`cwl-v106-${s.id}`] = `v106 ${s.label}`;
}
for (const s of VERIFY_STANDALONE_MEGA_SLICES) {
  PHASE_LABELS[`cwl-v107-${s.id}`] = `v107 ${s.label}`;
}
/** @deprecated legacy monolithic mega phase ids (pre sub-phase split) */
PHASE_LABELS["cwl-batch-v106"] = "CWL batch v106 (legacy monolith)";
PHASE_LABELS["cwl-batch-v107"] = "CWL batch v107 (legacy monolith)";
PHASE_LABELS["cwl-batch-v110"] = "CWL batch v110 (legacy monolith)";

function phaseLogPath(id) {
  return `reports/ci/gce-phase-${id}.log`;
}

/** @param {string} log */
function inferStatusFromLog(log) {
  if (/END exit=0\b/.test(log) || /\[gce-phase:[^\]]+\].*END exit=0/.test(log)) {
    return { status: /** @type {PhaseStatus} */ ("ok"), exitCode: 0 };
  }
  if (/END exit=([1-9][0-9]*)\b/.test(log)) {
    const m = log.match(/END exit=([1-9][0-9]*)\b/);
    return { status: /** @type {PhaseStatus} */ ("failed"), exitCode: Number(m?.[1] ?? 1) };
  }
  if (/Failed Tests|FAIL\s+packages\//.test(log)) {
    return { status: /** @type {PhaseStatus} */ ("failed"), exitCode: 1 };
  }
  if (/\[gce-hub-strategic\][^\n]*\bOK\b/.test(log) || /Test Files[^\n]*passed/.test(log)) {
    return { status: /** @type {PhaseStatus} */ ("ok"), exitCode: 0 };
  }
  if (log.trim().length > 0) {
    return { status: /** @type {PhaseStatus} */ ("running"), exitCode: null };
  }
  return null;
}

/** @param {string[]} ids */
function bootstrapFromLogs(ids) {
  initManifest(ids);
  /** @type {Map<string, { status: PhaseStatus, exitCode: number|null }>} */
  const resolved = new Map();
  let mainLog = "";
  try {
    mainLog = readFileSync("reports/ci/gce-all-tests.log", "utf8");
  } catch {
    /* optional */
  }
  for (const id of ids) {
    const endRe = new RegExp(`\\[gce-phase:${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\][^\\n]*END exit=(\\d+)`, "m");
    const endMatch = mainLog.match(endRe);
    if (endMatch) {
      const ec = Number(endMatch[1]);
      resolved.set(id, { status: ec === 0 ? "ok" : "failed", exitCode: ec });
      continue;
    }
    const path = phaseLogPath(id);
    if (!existsSync(path)) continue;
    const inferred = inferStatusFromLog(readFileSync(path, "utf8"));
    if (inferred) resolved.set(id, inferred);
  }
  /** Later phase activity implies earlier phases finished ok unless marked failed. */
  let sawLaterActivity = false;
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    const r = resolved.get(id);
    if (r?.status === "failed") {
      setPhase(id, "failed", { exitCode: r.exitCode ?? 1 });
      continue;
    }
    if (r?.status === "running" || sawLaterActivity) {
      if (r?.status === "running") setPhase(id, "running");
      else if (sawLaterActivity && (!r || r.status === "ok")) setPhase(id, "ok", { exitCode: 0 });
      else if (r?.status === "ok") setPhase(id, "ok", { exitCode: 0 });
      sawLaterActivity = true;
      continue;
    }
    if (r?.status === "ok") {
      setPhase(id, "ok", { exitCode: r.exitCode ?? 0 });
      sawLaterActivity = true;
    }
  }
  /** Implicit build phases before cli-shims when cli-shims succeeded. */
  if (resolved.get("cli-shims")?.status === "ok" || sawLaterActivity) {
    for (const pre of ["build-install", "build-compile", "parser-bridge-vendor"]) {
      const p = readProgress()?.phases?.find((x) => x.id === pre);
      if (p?.status === "pending") setPhase(pre, "ok", { exitCode: 0 });
    }
  }
}

function readProgress() {
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
  } catch {
    return null;
  }
}

/** @param {Record<string, unknown>} data */
function writeProgress(data) {
  mkdirSync(dirname(PROGRESS_FILE), { recursive: true });
  writeFileSync(PROGRESS_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** @param {string[]} ids */
function initManifest(ids) {
  const now = new Date().toISOString();
  /** @type {Array<{id: string, index: number, label: string, status: PhaseStatus, startedAt: string|null, endedAt: string|null, exitCode: number|null, phaseLog: string|null}>} */
  const phases = ids.map((id, i) => ({
    id,
    index: i + 1,
    label: PHASE_LABELS[id] ?? id,
    status: /** @type {PhaseStatus} */ ("pending"),
    startedAt: null,
    endedAt: null,
    exitCode: null,
    phaseLog: `reports/ci/gce-phase-${id}.log`,
  }));
  writeProgress({
    kind: "chrysalis.gce.progress",
    schemaVersion: 2,
    runStartedAt: now,
    updatedAt: now,
    status: "running",
    currentPhase: null,
    currentIndex: null,
    totalPhases: phases.length,
    completedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    phases,
  });
}

/** @param {string} phaseId @param {PhaseStatus} status @param {{ exitCode?: number|null }} [opts] */
function setPhase(phaseId, status, opts = {}) {
  const prev = readProgress();
  if (!prev?.phases?.length) {
    throw new Error(`progress manifest missing; run init first (${PROGRESS_FILE})`);
  }
  const now = new Date().toISOString();
  let completedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  /** @type {string|null} */
  let currentPhase = null;
  /** @type {number|null} */
  let currentIndex = null;

  for (const p of prev.phases) {
    if (p.id !== phaseId) {
      if (p.status === "ok") completedCount++;
      else if (p.status === "failed") failedCount++;
      else if (p.status === "skipped") skippedCount++;
      if (p.status === "running") {
        currentPhase = p.id;
        currentIndex = p.index;
      }
      continue;
    }
    if (status === "running") {
      p.status = "running";
      p.startedAt = now;
      p.endedAt = null;
      p.exitCode = null;
      currentPhase = p.id;
      currentIndex = p.index;
    } else if (status === "skipped") {
      p.status = "skipped";
      p.endedAt = now;
      p.exitCode = null;
      skippedCount++;
    } else {
      p.status = status;
      p.endedAt = now;
      p.exitCode = opts.exitCode ?? null;
      if (status === "ok") completedCount++;
      else if (status === "failed") failedCount++;
    }
  }

  /** @type {'running'|'ok'|'failed'} */
  let runStatus = "running";
  if (failedCount > 0) runStatus = "failed";
  else if (completedCount + skippedCount >= prev.phases.length) runStatus = "ok";

  writeProgress({
    ...prev,
    updatedAt: now,
    status: runStatus,
    currentPhase,
    currentIndex,
    completedCount,
    failedCount,
    skippedCount,
    phases: prev.phases,
  });
}

function printSummary() {
  const p = readProgress();
  if (!p?.phases?.length) {
    console.log("PROGRESS: (no manifest yet — build may still be starting)");
    return;
  }
  const total = p.totalPhases ?? p.phases.length;
  const done = (p.completedCount ?? 0) + (p.skippedCount ?? 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  console.log(`PROGRESS: ${done}/${total} phases complete (${pct}%)`);
  if (p.currentPhase) {
    const cur = p.phases.find((x) => x.id === p.currentPhase);
    const label = cur?.label ?? p.currentPhase;
    const idx = p.currentIndex ?? cur?.index ?? "?";
    console.log(`CURRENT: [${idx}/${total}] ${p.currentPhase} — ${label} (${cur?.status ?? "running"})`);
    if (cur?.startedAt) console.log(`  started: ${cur.startedAt}`);
  } else if (p.status === "ok") {
    console.log("CURRENT: (all phases complete)");
  } else {
    const next = p.phases.find((x) => x.status === "pending");
    if (next) console.log(`NEXT: [${next.index}/${total}] ${next.id} — ${next.label}`);
  }
  const ok = p.phases.filter((x) => x.status === "ok").map((x) => x.id);
  if (ok.length) console.log(`DONE (${ok.length}): ${ok.join(", ")}`);
  const failed = p.phases.filter((x) => x.status === "failed");
  for (const f of failed) {
    console.log(`FAILED: [${f.index}] ${f.id} exit=${f.exitCode ?? "?"}`);
  }
  const pending = p.phases.filter((x) => x.status === "pending").map((x) => x.id);
  if (pending.length) console.log(`PENDING (${pending.length}): ${pending.slice(0, 8).join(", ")}${pending.length > 8 ? ", ..." : ""}`);
}

/** Pick resume shell script from progress manifest (stdout: script basename or empty if complete). */
function pickResumeScript() {
  const p = readProgress();
  if (!p?.phases?.length) {
    console.log("gce-run-all-tests.sh");
    return;
  }
  if (p.status === "ok" || (p.completedCount ?? 0) + (p.skippedCount ?? 0) >= (p.totalPhases ?? 0)) {
    console.log("");
    return;
  }
  /** @type {'pending'|'running'|'ok'|'failed'|'skipped'|undefined} */
  const failed = p.phases.find((x) => x.status === "failed");
  const running = p.phases.find((x) => x.status === "running");
  const pending = p.phases.find((x) => x.status === "pending");
  const phase = failed ?? running ?? pending;
  if (!phase) {
    console.log("");
    return;
  }
  const id = phase.id;
  if (
    id === "build-install" ||
    id === "build-compile" ||
    id === "parser-bridge-vendor" ||
    id === "cli-shims" ||
    id === "hub-strategic-vitest"
  ) {
    console.log("gce-run-all-tests.sh");
    return;
  }
  if (
    id.startsWith("hub-express") ||
    id.startsWith("hub-plain-php") ||
    id.startsWith("hub-symfony") ||
    id.startsWith("hub-node")
  ) {
    console.log("gce-resume-from-hub-express-flagship.sh");
    return;
  }
  if (id === "hub-cwl" || id === "hub-fixture-emits" || id.startsWith("hub-cwl-authoring")) {
    console.log("gce-resume-from-hub-cwl.sh");
    return;
  }
  if (id === "wptp-matrix" || id === "hub-gold-verify") {
    console.log("gce-resume-from-gold-gates.sh");
    return;
  }
  if (id === "hub-gold-trace-replay") {
    console.log("gce-resume-from-gold-trace-replay.sh");
    return;
  }
  if (id.startsWith("hub-completion") || id === "hub-knowledge" || id === "cwl-http-verify") {
    console.log("gce-resume-from-hub-completion.sh");
    return;
  }
  if (
    id.startsWith("cwl-v106") ||
    id.startsWith("cwl-v107") ||
    id.startsWith("cwl-v110") ||
    id === "cwl-batch-v106" ||
    id === "cwl-batch-v107" ||
    id === "cwl-batch-v110"
  ) {
    console.log("gce-resume-from-mega-phases.sh");
    return;
  }
  if (id.startsWith("cwl-batch") || id === "post110-verify-gaps") {
    console.log("gce-resume-from-cwl-batch-v40.sh");
    return;
  }
  console.log("gce-resume-from-hub-express-flagship.sh");
}

/** @param {string} phaseId @returns {boolean} */
function isPhaseDone(phaseId) {
  const p = readProgress();
  const phase = p?.phases?.find((x) => x.id === phaseId);
  if (!phase) return false;
  return phase.status === "ok" || phase.status === "skipped";
}

const [cmd, arg1, arg2] = process.argv.slice(2);

if (cmd === "init") {
  const ids = (arg1 ?? process.env.CHRYSALIS_GCE_PHASE_LIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) {
    console.error("usage: gce-progress.mjs init phase1,phase2,...  (or CHRYSALIS_GCE_PHASE_LIST)");
    process.exit(2);
  }
  initManifest(ids);
} else if (cmd === "start") {
  if (!arg1) {
    console.error("usage: gce-progress.mjs start <phase-id>");
    process.exit(2);
  }
  setPhase(arg1, "running");
} else if (cmd === "finish") {
  if (!arg1) {
    console.error("usage: gce-progress.mjs finish <phase-id> <exitCode>");
    process.exit(2);
  }
  const ec = Number(arg2 ?? "0");
  setPhase(arg1, ec === 0 ? "ok" : "failed", { exitCode: ec });
} else if (cmd === "skip") {
  if (!arg1) {
    console.error("usage: gce-progress.mjs skip <phase-id>");
    process.exit(2);
  }
  setPhase(arg1, "skipped");
} else if (cmd === "bootstrap") {
  const ids = (arg1 ?? process.env.CHRYSALIS_GCE_PHASE_LIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) {
    console.error("usage: gce-progress.mjs bootstrap phase1,phase2,...");
    process.exit(2);
  }
  bootstrapFromLogs(ids);
  printSummary();
} else if (cmd === "summary") {
  printSummary();
} else if (cmd === "pick-resume") {
  pickResumeScript();
} else if (cmd === "is-done") {
  if (!arg1) {
    console.error("usage: gce-progress.mjs is-done <phase-id>");
    process.exit(2);
  }
  process.exit(isPhaseDone(arg1) ? 0 : 1);
} else if (cmd === "list-labels") {
  console.log(JSON.stringify(PHASE_LABELS, null, 2));
} else {
  console.error("usage: gce-progress.mjs init|bootstrap|start|finish|skip|summary|pick-resume");
  process.exit(2);
}
