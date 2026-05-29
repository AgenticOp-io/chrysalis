#!/usr/bin/env node
/**
 * Per-project migration evidence (verify %, holes, playbooks) — STRATEGIC-PLAN Phase 2 / G96.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildVerifyPlaybooksReport, defaultVerifySummaryPath } from "./hub-verify-playbooks.mjs";

export const HUB_EVIDENCE_KIND = "chrysalis.hub.evidence";
export const HUB_EVIDENCE_SCHEMA_VERSION = 2;

const VERIFY_GATE_CORRECTNESS = 1;
const EVIDENCE_HISTORY_FILE = ".chrysalis/evidence-history.jsonl";
const EVIDENCE_HISTORY_MAX = 32;

/**
 * @param {string} projectDir
 * @param {number} [maxEntries]
 */
export function readEvidenceHistory(projectDir, maxEntries = EVIDENCE_HISTORY_MAX) {
  const path = join(resolve(projectDir), EVIDENCE_HISTORY_FILE);
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.trim().length > 0);
  const entries = [];
  for (const line of lines.slice(-maxEntries)) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip malformed line */
    }
  }
  return entries;
}

/**
 * @param {ReturnType<typeof buildHubEvidenceReport>} report
 */
export function evidenceSnapshotFromReport(report) {
  return {
    at: report.generatedAt,
    correctness: report.verify.correctness,
    holeCount: report.holes.count,
    gatePass: report.verifyGate.pass,
    deliveryScore: report.deliveryScore,
  };
}

/**
 * @param {string} projectDir
 * @param {ReturnType<typeof buildHubEvidenceReport>} report
 */
export function appendEvidenceSnapshot(projectDir, report) {
  const root = resolve(projectDir);
  const path = join(root, EVIDENCE_HISTORY_FILE);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(evidenceSnapshotFromReport(report))}\n`, "utf8");
}

/**
 * @param {Array<{ correctness: number | null, holeCount: number | null, deliveryScore: number, gatePass: boolean, at: string }>} history
 */
export function computeEvidenceTrend(history) {
  const points = history.length;
  if (points === 0) {
    return { points: 0, deltaCorrectness: null, deltaHoles: null, deltaDeliveryScore: null, improving: null };
  }
  const last = history[points - 1];
  if (points < 2) {
    return {
      points: 1,
      deltaCorrectness: null,
      deltaHoles: null,
      deltaDeliveryScore: null,
      improving: null,
      lastAt: last.at,
    };
  }
  const prev = history[points - 2];
  const deltaCorrectness =
    last.correctness !== null && prev.correctness !== null ? last.correctness - prev.correctness : null;
  const deltaHoles =
    last.holeCount !== null && prev.holeCount !== null ? last.holeCount - prev.holeCount : null;
  const deltaDeliveryScore =
    typeof last.deliveryScore === "number" && typeof prev.deliveryScore === "number"
      ? last.deliveryScore - prev.deliveryScore
      : null;
  const improving =
    deltaCorrectness !== null
      ? deltaCorrectness > 0 || (deltaCorrectness === 0 && (deltaHoles ?? 0) < 0)
      : null;
  return {
    points,
    deltaCorrectness,
    deltaHoles,
    deltaDeliveryScore,
    improving,
    lastAt: last.at,
    priorAt: prev.at,
  };
}

/**
 * @param {string} projectDir
 */
export function buildHubEvidenceReport(projectDir) {
  const root = resolve(projectDir);
  const holesPath = join(root, "chrysalis.holes.json");
  const verifySummaryPath = defaultVerifySummaryPath(root);
  const migrationCwlPath = join(root, ".chrysalis", "migration.cwl");
  const migrationOpenApiPath = join(root, ".chrysalis", "migration.openapi.json");
  const cwlExportPath = join(root, ".chrysalis", "cwl-export.json");

  let holeCount = null;
  let holes = [];
  if (existsSync(holesPath)) {
    try {
      const h = JSON.parse(readFileSync(holesPath, "utf8"));
      holes = Array.isArray(h.holes) ? h.holes : Array.isArray(h) ? h : [];
      holeCount = holes.length;
    } catch {
      holeCount = null;
    }
  }

  let verify = {
    available: false,
    correctness: null,
    framesTotal: null,
    framesPassed: null,
    failedTraceCount: 0,
    gatePass: false,
  };
  if (existsSync(verifySummaryPath)) {
    try {
      const s = JSON.parse(readFileSync(verifySummaryPath, "utf8"));
      const agg = s.aggregate ?? {};
      let failedTraceCount = 0;
      for (const ep of s.endpoints ?? []) {
        failedTraceCount += (ep.divergences ?? []).length;
      }
      const correctness = agg.correctness ?? null;
      verify = {
        available: true,
        correctness,
        framesTotal: agg.framesTotal ?? null,
        framesPassed: agg.framesPassed ?? null,
        failedTraceCount,
        gatePass: correctness !== null && correctness >= VERIFY_GATE_CORRECTNESS,
        summaryPath: verifySummaryPath,
      };
    } catch {
      verify.available = false;
    }
  }

  const playbooks = buildVerifyPlaybooksReport(verify.available ? verifySummaryPath : undefined);

  const blockers = [];
  if (holeCount !== null && holeCount > 0) {
    blockers.push({ kind: "holes", count: holeCount, detail: `${holeCount} residual legacy hole(s)` });
  }
  if (verify.available && !verify.gatePass) {
    blockers.push({
      kind: "verify",
      count: verify.failedTraceCount,
      detail: `correctness ${verify.correctness} < ${VERIFY_GATE_CORRECTNESS}`,
    });
  }
  if (!existsSync(migrationCwlPath)) {
    blockers.push({ kind: "contract", count: 1, detail: "missing .chrysalis/migration.cwl (run translate)" });
  }

  const deliveryScore =
    verify.available && verify.correctness !== null
      ? Math.max(0, verify.correctness - (holeCount ?? 0) * 0.01)
      : holeCount === 0
        ? 0.5
        : 0;

  const history = readEvidenceHistory(root);
  const trend = computeEvidenceTrend(history);

  return {
    kind: HUB_EVIDENCE_KIND,
    schemaVersion: HUB_EVIDENCE_SCHEMA_VERSION,
    projectDir: root,
    holes: { count: holeCount, path: existsSync(holesPath) ? holesPath : null, sample: holes.slice(0, 8) },
    verify,
    verifyGate: { minCorrectness: VERIFY_GATE_CORRECTNESS, pass: verify.gatePass },
    playbooks: {
      observed: playbooks.observedDivergences,
      catalog: playbooks.playbooks.map((p) => ({ kind: p.kind, title: p.title })),
    },
    migrationContract: {
      cwlPath: existsSync(migrationCwlPath) ? migrationCwlPath : null,
      openapiPath: existsSync(migrationOpenApiPath) ? migrationOpenApiPath : null,
      exportMetaPath: existsSync(cwlExportPath) ? cwlExportPath : null,
    },
    blockers,
    deliveryScore,
    trend,
    historyPath: existsSync(join(root, EVIDENCE_HISTORY_FILE)) ? join(root, EVIDENCE_HISTORY_FILE) : null,
    generatedAt: new Date().toISOString(),
  };
}

function parseArgs(argv) {
  let projectDir = null;
  let jsonOut = null;
  let recordSnapshot = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--record-snapshot") recordSnapshot = true;
  }
  if (!projectDir) {
    throw new Error("usage: hub-evidence.mjs --project <dir> [--json-out path] [--record-snapshot]");
  }
  return { projectDir, jsonOut, recordSnapshot };
}

async function main() {
  const { projectDir, jsonOut, recordSnapshot } = parseArgs(process.argv);
  const report = buildHubEvidenceReport(projectDir);
  if (recordSnapshot) {
    appendEvidenceSnapshot(projectDir, report);
    report.trend = computeEvidenceTrend(readEvidenceHistory(projectDir));
  }
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.verify.available && !report.verifyGate.pass) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
