#!/usr/bin/env node
/**
 * Chimera cutover runbooks + operator metrics (G143).
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHubEvidenceReport } from "./hub-evidence.mjs";
import { buildMigrationProgram } from "./hub-migration-programs.mjs";

export const HUB_CHIMERA_CUTOVER_KIND = "chrysalis.hub.chimera-cutover";
export const HUB_CHIMERA_CUTOVER_SCHEMA_VERSION = 1;

const CHIMERA_MODES = ["legacy", "shadow", "canary", "cutover"];
const CANARY_RAMP = [10, 25, 50, 100];

/**
 * @param {string} projectDir
 */
function readChimeraDeployConfig(projectDir) {
  for (const rel of ["chimera.json", ".chrysalis/chimera.json"]) {
    const path = join(projectDir, rel);
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8"));
      return { path, config: raw };
    } catch {
      return { path, config: null, parseError: true };
    }
  }
  return { path: null, config: null };
}

/**
 * @param {string | undefined} snapshotPath
 */
async function readLatestOperatorSnapshot(snapshotPath) {
  if (!snapshotPath) return null;
  const path = resolve(snapshotPath);
  if (!existsSync(path)) return null;
  try {
    const text = await readFile(path, "utf8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return null;
    const row = JSON.parse(lines[lines.length - 1]);
    if (row?.kind !== "chrysalis.chimera.operator-snapshot") return null;
    return row;
  } catch {
    return null;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.projectDir
 * @param {string} opts.origin
 * @param {string[]} opts.outputs
 * @param {string} [opts.programId]
 * @param {string} [opts.snapshotPath]
 */
export async function buildChimeraCutoverRunbook(opts) {
  const root = resolve(opts.projectDir);
  const outputs = opts.outputs ?? [];
  const programId = opts.programId ?? "api-slice";
  const evidence = buildHubEvidenceReport(root);
  const program = buildMigrationProgram({
    origin: opts.origin,
    outputs,
    programId,
    detectedDatabases: [],
  });
  const chimeraConfig = readChimeraDeployConfig(root);
  const operatorSnapshot = await readLatestOperatorSnapshot(
    opts.snapshotPath ?? join(root, ".chrysalis", "chimera-operator.ndjson"),
  );

  const gates = [
    {
      id: "verify-gate",
      pass: evidence.verifyGate.pass,
      detail: evidence.verifyGate.pass
        ? `correctness ${evidence.verify.correctness} >= ${evidence.verifyGate.minCorrectness}`
        : evidence.verify.available
          ? `correctness ${evidence.verify.correctness} < ${evidence.verifyGate.minCorrectness}`
          : "verify summary missing",
    },
    {
      id: "holes-clear",
      pass: evidence.holes.count === 0,
      detail:
        evidence.holes.count === 0
          ? "no residual legacy holes"
          : `${evidence.holes.count ?? "?"} hole(s) remain`,
    },
    {
      id: "migration-contract",
      pass: Boolean(evidence.migrationContract.cwlPath),
      detail: evidence.migrationContract.cwlPath
        ? evidence.migrationContract.cwlPath
        : "missing .chrysalis/migration.cwl",
    },
  ];
  const readyForShadow = gates.every((g) => g.pass);

  const phases = [
    {
      id: "prep",
      title: "Pre-cutover gates",
      ready: readyForShadow,
      steps: [
        "Export migration.cwl for the migration program slice (hub translate).",
        "Run verify replay on staging; require correctness 1.0 on scoped traces.",
        "Clear residual legacy holes or delegate via chimera until hole count is 0.",
        "Align session bridge (Redis) when auth routes are in scope.",
      ],
      gates,
    },
    {
      id: "shadow",
      title: "Shadow mode (observe only)",
      ready: readyForShadow,
      steps: [
        'Deploy chimera with mode "shadow" — client sees legacy; modern mirrored in background.',
        "Monitor shadow NDJSON divergences; use verify playbooks for each divergence kind.",
        "Hold shadow until divergence rate is acceptable for the scoped routes.",
      ],
      chimeraMode: "shadow",
    },
    {
      id: "canary",
      title: "Canary ramp",
      ready: readyForShadow,
      steps: [
        'Switch chimera to mode "canary" with program route rules (modern target).',
        `Ramp percentModern: ${CANARY_RAMP.join("% → ")}% with operator snapshots between steps.`,
        "Watch stats().canary and session stickiness cookie/header configuration.",
      ],
      chimeraMode: "canary",
      rampPercentModern: CANARY_RAMP,
    },
    {
      id: "cutover",
      title: "Full cutover",
      ready: readyForShadow,
      steps: [
        'Set chimera mode "cutover" when canary metrics and verify gate stay green.',
        "Keep legacy upstream warm for fast rollback during the observation window.",
        "Record operator snapshot batch (aggregate-chimera-operator-snapshots.mjs) for fleet drift.",
      ],
      chimeraMode: "cutover",
    },
  ];

  const operatorMetrics = {
    verifyCorrectness: evidence.verify.correctness,
    verifyGatePass: evidence.verifyGate.pass,
    holeCount: evidence.holes.count,
    deliveryScore: evidence.deliveryScore,
    blockers: evidence.blockers,
    trend: evidence.trend,
    chimeraConfigPath: chimeraConfig.path,
    chimeraMode: chimeraConfig.config?.mode ?? null,
    operatorSnapshot: operatorSnapshot
      ? {
          wallTimeIso: operatorSnapshot.wallTimeIso,
          instanceId: operatorSnapshot.instanceId,
          deployRoutingFingerprintSha256: operatorSnapshot.deployRoutingFingerprintSha256,
          stats: operatorSnapshot.stats ?? null,
        }
      : null,
  };

  return {
    kind: HUB_CHIMERA_CUTOVER_KIND,
    schemaVersion: HUB_CHIMERA_CUTOVER_SCHEMA_VERSION,
    projectDir: root,
    origin: opts.origin,
    outputs,
    programId,
    program: {
      id: program.program.id,
      title: program.program.title,
      routePatterns: program.routePatterns,
      verifyThreshold: program.verifyThreshold,
    },
    phases,
    operatorMetrics,
    chimeraModes: CHIMERA_MODES,
    readyForShadow,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {Awaited<ReturnType<typeof buildChimeraCutoverRunbook>>} report
 */
export function renderChimeraCutoverMarkdown(report) {
  const lines = [
    "# Chimera cutover runbook",
    "",
    `- **Origin:** ${report.origin}`,
    `- **Outputs:** ${report.outputs.join(", ")}`,
    `- **Program:** ${report.program.title} (\`${report.program.id}\`)`,
    `- **Ready for shadow:** ${report.readyForShadow ? "yes" : "no"}`,
    "",
    "## Operator metrics",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Verify correctness | ${report.operatorMetrics.verifyCorrectness ?? "n/a"} |`,
    `| Verify gate | ${report.operatorMetrics.verifyGatePass ? "pass" : "fail"} |`,
    `| Holes | ${report.operatorMetrics.holeCount ?? "n/a"} |`,
    `| Delivery score | ${report.operatorMetrics.deliveryScore} |`,
    `| Chimera mode (config) | ${report.operatorMetrics.chimeraMode ?? "not deployed"} |`,
    "",
    "## Pre-cutover gates",
    "",
  ];
  for (const g of report.phases[0]?.gates ?? []) {
    lines.push(`- [${g.pass ? "x" : " "}] **${g.id}** — ${g.detail}`);
  }
  lines.push("");
  for (const phase of report.phases) {
    lines.push(`## ${phase.title}`);
    lines.push("");
    for (const step of phase.steps) {
      lines.push(`1. ${step}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

/**
 * @param {string} projectDir
 * @param {Awaited<ReturnType<typeof buildChimeraCutoverRunbook>>} report
 */
export async function writeChimeraCutoverArtifacts(projectDir, report) {
  const root = resolve(projectDir);
  const outDir = join(root, ".chrysalis");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "chimera-cutover.json");
  const mdPath = join(outDir, "chimera-cutover.md");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(mdPath, renderChimeraCutoverMarkdown(report), "utf8");
  return { jsonPath, mdPath, report };
}

function parseArgs(argv) {
  let projectDir = null;
  let origin = "php";
  let outputs = ["hono"];
  let programId = "api-slice";
  let snapshotPath = null;
  let jsonOut = null;
  let writeArtifacts = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--project" && argv[i + 1]) projectDir = resolve(argv[++i]);
    else if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--outputs" && argv[i + 1]) {
      outputs = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--program" && argv[i + 1]) programId = argv[++i];
    else if (argv[i] === "--snapshot" && argv[i + 1]) snapshotPath = resolve(argv[++i]);
    else if (argv[i] === "--json-out" && argv[i + 1]) jsonOut = resolve(argv[++i]);
    else if (argv[i] === "--write-artifacts") writeArtifacts = true;
  }
  if (!projectDir) {
    throw new Error(
      "usage: hub-chimera-cutover.mjs --project <dir> [--origin php] [--outputs hono] [--program api-slice] [--snapshot path] [--write-artifacts]",
    );
  }
  return { projectDir, origin, outputs, programId, snapshotPath, jsonOut, writeArtifacts };
}

async function main() {
  const { projectDir, origin, outputs, programId, snapshotPath, jsonOut, writeArtifacts } = parseArgs(
    process.argv,
  );
  const report = await buildChimeraCutoverRunbook({ projectDir, origin, outputs, programId, snapshotPath });
  if (writeArtifacts) {
    await writeChimeraCutoverArtifacts(projectDir, report);
  }
  if (jsonOut) {
    await mkdir(dirname(jsonOut), { recursive: true });
    await writeFile(jsonOut, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
