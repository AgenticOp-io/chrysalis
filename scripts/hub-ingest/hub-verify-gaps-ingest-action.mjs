#!/usr/bin/env node
/**
 * Verify gaps → ingest remediation action (G149): re-run ingest when gaps exist.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProjectVerifyGapsIngestReport,
  HUB_VERIFY_GAPS_INGEST_KIND,
} from "./hub-verify-gaps-ingest.mjs";
import { seedLaravelAuthProbeVerifyReport } from "./hub-laravel-auth-probe-verify-seed.mjs";

export const HUB_VERIFY_GAPS_INGEST_ACTION_KIND = "chrysalis.hub.verify-gaps-ingest-action";
export const HUB_VERIFY_GAPS_INGEST_ACTION_SCHEMA_VERSION = 2;

function readHoleCount(projectDir) {
  const holesPath = join(resolve(projectDir), "chrysalis.holes.json");
  if (!existsSync(holesPath)) return null;
  try {
    const h = JSON.parse(readFileSync(holesPath, "utf8"));
    const holes = Array.isArray(h.holes) ? h.holes : Array.isArray(h) ? h : [];
    return holes.length;
  } catch {
    return null;
  }
}

/**
 * @param {string} projectDir
 * @param {{ cliBin?: string, reingest?: boolean }} [opts]
 */
export function runVerifyGapsIngestAction(projectDir, opts = {}) {
  const root = resolve(projectDir);
  const cliBin = opts.cliBin ?? join(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."), "packages/cli/dist/bin.js");
  const reingest = opts.reingest ?? process.env.CHRYSALIS_HUB_GAP_REINGEST === "1";
  const gaps = buildProjectVerifyGapsIngestReport(root);
  const holesBefore = readHoleCount(root);

  /** @type {{ ran: boolean, exitCode: number | null, holesAfter: number | null }} */
  const ingestRun = { ran: false, exitCode: null, holesAfter: null };

  if (reingest && gaps.ingestNext && existsSync(cliBin)) {
    ingestRun.ran = true;
    const progress = join(root, ".chrysalis", "ingest.progress");
    const r = spawnSync(
      process.execPath,
      [cliBin, "ingest", root, "--ingest-progress-file", progress],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    ingestRun.exitCode = r.status ?? 1;
    ingestRun.holesAfter = readHoleCount(root);
  }

  /** @type {{ applied: boolean, ok: boolean, correctness: number | null, skip: string | null }} */
  const verifyClosure = { applied: false, ok: true, correctness: null, skip: null };
  if (
    process.env.CHRYSALIS_HUB_GAP_REINGEST_VERIFY_CLOSURE === "1" &&
    ingestRun.ran &&
    (ingestRun.exitCode ?? 1) === 0
  ) {
    const seeded = seedLaravelAuthProbeVerifyReport(root);
    verifyClosure.applied = true;
    verifyClosure.ok = seeded.ok === true;
    verifyClosure.correctness = seeded.correctness ?? null;
    verifyClosure.skip = seeded.skip ?? null;
  }

  const gapsAfter = ingestRun.ran ? buildProjectVerifyGapsIngestReport(root) : gaps;

  return {
    kind: HUB_VERIFY_GAPS_INGEST_ACTION_KIND,
    schemaVersion: HUB_VERIFY_GAPS_INGEST_ACTION_SCHEMA_VERSION,
    projectDir: root,
    ok:
      !gaps.ingestNext ||
      (ingestRun.ran
        ? (ingestRun.exitCode ?? 1) === 0 && verifyClosure.ok !== false
        : true),
    verifyGaps: {
      kind: HUB_VERIFY_GAPS_INGEST_KIND,
      available: gaps.ok,
      ingestNext: gaps.ingestNext,
      backlogCount: gaps.backlog.length,
    },
    ingestRemediation: gaps.ingestNext
      ? {
          owner: gaps.ingestNext.ingestOwner ?? "packages/ingest",
          divergenceKind: gaps.ingestNext.divergenceKind,
          playbook: gaps.ingestNext.playbook,
          suggestedCommand: `chrysalis ingest ${root}`,
        }
      : null,
    reingest: ingestRun,
    verifyClosure,
    holesBefore,
    holesAfter: ingestRun.holesAfter ?? holesBefore,
    verifyGapsAfter: ingestRun.ran
      ? {
          ingestNext: gapsAfter.ingestNext,
          backlogCount: gapsAfter.backlog.length,
          correctness: gapsAfter.verify?.correctness ?? null,
        }
      : null,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {string} projectDir
 * @param {ReturnType<typeof runVerifyGapsIngestAction>} [report]
 */
export async function writeVerifyGapsIngestActionArtifacts(projectDir, report) {
  const root = resolve(projectDir);
  const payload = report ?? runVerifyGapsIngestAction(root);
  const outDir = join(root, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "verify-gaps-ingest-action.json");
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { jsonPath, report: payload };
}

function parseArgs(argv) {
  let projectDir = null;
  let reingest = process.env.CHRYSALIS_HUB_GAP_REINGEST === "1";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--reingest") reingest = true;
  }
  if (!projectDir) {
    throw new Error("usage: hub-verify-gaps-ingest-action.mjs --project <dir> [--reingest]");
  }
  return { projectDir, reingest };
}

async function main() {
  const { projectDir, reingest } = parseArgs(process.argv);
  const { report, jsonPath } = await writeVerifyGapsIngestActionArtifacts(
    projectDir,
    runVerifyGapsIngestAction(projectDir, { reingest }),
  );
  console.log(JSON.stringify({ ...report, artifactPath: jsonPath }, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
