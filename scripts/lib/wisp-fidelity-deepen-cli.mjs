#!/usr/bin/env node
/**
 * WISP fidelity deepen desk CLI.
 *
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --list
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --candidates
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --external-deps
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --source-doc
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --probe
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --batch n10h
 *   node scripts/lib/wisp-fidelity-deepen-cli.mjs --batch n10f   # legacy spawn
 *
 * Also: pnpm run hub:fidelity-deepen -- --batch n10h
 *       pnpm run hub:fidelity-deepen-candidates
 *       pnpm run hub:fidelity-deepen-external-deps
 *       pnpm run hub:fidelity-deepen-source-doc
 *       pnpm run hub:fidelity-deepen-probe
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  runDeepenBatch,
  buildDeepenCandidates,
  probeDeepenCandidates,
  loadCatalog,
  scriptRoot,
} from "./wisp-fidelity-deepen-harness.mjs";
import { documentDeepenCandidatesFromSource } from "./wisp-fidelity-deepen-source-doc.mjs";
import { runExternalDepsProtocol, externalRiskForApiPath } from "./wisp-external-deps-protocol.mjs";
import { runUntilExhausted } from "./wisp-fidelity-deepen-auto.mjs";
import { HARNESS_BATCHES, LEGACY_BATCHES, listBatches } from "./wisp-fidelity-deepen-batches/index.mjs";

function parseArgs(argv) {
  const out = {
    batch: null,
    list: false,
    candidates: false,
    probe: false,
    sourceDoc: false,
    externalDeps: false,
    untilExhausted: false,
    resetStreak: false,
    maxRounds: 40,
    help: false,
    limit: 40,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") out.list = true;
    else if (a === "--candidates") out.candidates = true;
    else if (a === "--probe") out.probe = true;
    else if (a === "--source-doc" || a === "--from-source") out.sourceDoc = true;
    else if (a === "--external-deps" || a === "--external") out.externalDeps = true;
    else if (a === "--until-exhausted" || a === "--auto") out.untilExhausted = true;
    else if (a === "--reset-streak") out.resetStreak = true;
    else if (a === "--max-rounds") out.maxRounds = Number(argv[++i]) || 40;
    else if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--batch") out.batch = argv[++i];
    else if (a === "--limit") out.limit = Number(argv[++i]) || 40;
    else if (a.startsWith("--batch=")) out.batch = a.slice("--batch=".length);
  }
  return out;
}

function printHelp() {
  console.log(`WISP CWL fidelity deepen desk (D6442 / D6445)

Usage:
  --list                 Show harness + legacy batches
  --candidates [--limit] Next-queue hints for AI ×10 proposal
  --external-deps        Scan origin for external hosts, hardware, API keys (D6445)
  --source-doc [--limit] Document candidates from backend-services (+ MM services)
  --probe [--limit]      Live GET verify deploy parity against HSS (not body invention)
  --batch <id>           Run a batch (n10g+ harness; n10–n10f legacy)
  --until-exhausted      Auto ×10 rounds (GET→param GET→golden mut) until 3 consecutive no-improvement rounds
                         (optional --reset-streak, --max-rounds N)

Workflow: candidates → --external-deps → --source-doc → --probe → AI ×10 → --batch → FUTURE §7
Or autonomous: --until-exhausted (stop after 3 no-improvement rounds — do not wait for "continue")
Contract authority: products/wisptools/backend-services (and Module_Manager service clients).
Missing API keys are documented in the external-deps operator briefing — never invented.`);
}

async function runHarnessBatch(batchId, opts = {}) {
  const mod = HARNESS_BATCHES[batchId];
  if (!mod) throw new Error(`unknown harness batch: ${batchId}`);
  return runDeepenBatch({
    kind: mod.KIND,
    batchId: mod.BATCH_ID,
    passes: mod.PASSES,
    refreshPaths: mod.REFRESH_PATHS,
    needAdmin: mod.NEED_ADMIN,
    runProbes: mod.runProbes,
    note: mod.NOTE,
    opts,
  });
}

function runLegacyBatch(batchId) {
  const rel = LEGACY_BATCHES[batchId];
  if (!rel) throw new Error(`unknown legacy batch: ${batchId}`);
  const r = spawnSync(process.execPath, [join(scriptRoot, rel)], {
    cwd: scriptRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  return { ok: r.status === 0, batchId, legacy: true, status: r.status };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (
    args.help ||
    (!args.list &&
      !args.candidates &&
      !args.probe &&
      !args.sourceDoc &&
      !args.externalDeps &&
      !args.untilExhausted &&
      !args.batch)
  ) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  if (args.list) {
    const catalog = loadCatalog();
    console.log(
      JSON.stringify(
        {
          ...listBatches(),
          closedThroughPass: catalog?.closedThroughPass,
          nextBatchId: catalog?.nextBatchId,
          nextPassRange: catalog?.nextPassRange,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (args.externalDeps) {
    const out = runExternalDepsProtocol();
    console.log(
      JSON.stringify(
        {
          ok: out.ok,
          kind: out.kind,
          schemaVersion: out.schemaVersion,
          operatorBriefing: out.operatorBriefing,
          secretCount: out.secrets.length,
          externalCallCount: out.externalCalls.length,
          hardwareCount: out.hardware.length,
          reportPath: out.reportPath,
          fixturePath: out.fixturePath,
        },
        null,
        2,
      ),
    );
    process.exit(out.ok ? 0 : 1);
  }

  if (args.untilExhausted) {
    const summary = await runUntilExhausted({
      resetStreak: args.resetStreak,
      maxRounds: args.maxRounds,
    });
    process.exit(summary.ok ? 0 : 1);
  }

  if (args.candidates) {
    const result = buildDeepenCandidates({ limit: args.limit });
    let externalDeps = null;
    try {
      externalDeps = runExternalDepsProtocol();
    } catch {
      externalDeps = null;
    }
    const withRisk = (result.candidates || []).map((c) => ({
      ...c,
      externalRisks: externalDeps ? externalRiskForApiPath(c.path || c.api || "", externalDeps) : [],
    }));
    console.log(
      JSON.stringify(
        {
          ...result,
          candidates: withRisk,
          externalDepsBriefing: externalDeps?.operatorBriefing || null,
        },
        null,
        2,
      ),
    );
    process.exit(result.ok ? 0 : 1);
  }

  if (args.sourceDoc) {
    const report = documentDeepenCandidatesFromSource({ limit: args.limit });
    console.log(
      JSON.stringify(
        {
          ok: report.ok,
          backendRoot: report.backendRoot,
          mountCount: report.mountCount,
          documented: (report.documented || []).map((d) => ({
            path: d.path,
            title: d.title,
            sourceFiles: d.sourceFiles,
            bodyFields: d.bodyFields,
            transferReasons: d.transferReasons,
            hitCount: (d.handlers || []).reduce((n, h) => n + (h.hits?.length || 0), 0),
            note: d.note,
          })),
          reportPath: report.reportPath,
        },
        null,
        2,
      ),
    );
    process.exit(report.ok ? 0 : 1);
  }

  if (args.probe) {
    const report = await probeDeepenCandidates({ limit: args.limit });
    console.log(
      JSON.stringify(
        {
          ok: report.ok,
          auth: report.auth,
          probeCount: report.probeCount,
          viableForNextBatch: report.viableForNextBatch,
          honestUnavailable: report.honestUnavailable,
          held: report.held,
          reportPath: report.reportPath,
        },
        null,
        2,
      ),
    );
    process.exit(report.ok ? 0 : 1);
  }

  if (args.batch) {
    const id = String(args.batch).replace(/^fidelity-deepen-/, "");
    if (HARNESS_BATCHES[id]) {
      const report = await runHarnessBatch(id);
      process.exit(report.ok ? 0 : 1);
    }
    if (LEGACY_BATCHES[id]) {
      const report = runLegacyBatch(id);
      process.exit(report.ok ? 0 : 1);
    }
    console.error(`Unknown batch "${id}". Use --list.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
