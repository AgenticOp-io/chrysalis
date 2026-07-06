#!/usr/bin/env node
/**
 * `chrysalis` — the CLI entrypoint. Thin wrapper over the package APIs.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ingestDirectory } from "@chrysalis/ingest";
import {
  computeOracleFootprint,
  countAuthTaggedHoles,
  countByDialect,
  countHoles,
  irCoverageStats,
  mergeWebIrModules,
  moduleToGoldenSnapshot,
  walk,
  type Module,
  type RouteOracleFootprint,
} from "@chrysalis/webir";
import { emit as emitFastify } from "@chrysalis/emit-fastify";
import { emit as emitHono } from "@chrysalis/emit-hono";
import { emit as emitRuntimeCwl } from "@chrysalis/emit-runtime-cwl";
import { renderCwlFromModule } from "./cwl-projection.js";
import { loadObserveConfig, mergeCorpusDirectories, readCorpus, startObserver } from "@chrysalis/oracle";
import {
  buildMergedVerifySummaryJson,
  buildReport,
  divergenceKindHistogram,
  failedTraceCount,
  mergeCorrectnessReports,
  replayCorpus,
  resolveVerifyReplayExtras,
  writeReport,
  type CorrectnessReport,
  type ReplayOptions,
} from "@chrysalis/verify";
import {
  domainTypesByTable,
  emitTypes,
  runArchaeology,
  TRACE_LITERAL_UNION_PROVENANCE_PREFIX,
} from "@chrysalis/archaeology";
import {
  buildChimeraOperatorSnapshot,
  parseChimeraDeployConfigJson,
  startChimera,
  type CanarySettings,
  type ChimeraDeployConfigFile,
  type ChimeraHandle,
  type ParseChimeraDeployConfigOptions,
  type RouteRule,
} from "@chrysalis/runtime-chimera";
import {
  DEFAULT_RECOGNIZERS,
  analyzeModule,
  type InsightReport,
  type Opportunity,
  type RecognizerId,
} from "@chrysalis/insight";
import {
  DEFAULT_PASSES,
  applyRewrites,
  applyRewritesAsync,
  type RewriteReport,
  type RewriteResult,
} from "@chrysalis/rewrite";
import {
  applyHoleClosureAndVerify,
  createHttpChatRepairProposerFromEnv,
  parseHoleClosurePatchJson,
  runVerifiedRepairLoop,
  stubRepairProposer,
} from "@chrysalis/repair";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { spawnSync } from "node:child_process";
import {
  LicenseVerificationError,
  assertMinLicenseTier,
  loadLicenseEnvelopeFromEnv,
  loadPublicKeyPemFromEnv,
  verifyLicenseEnvelope,
  type LicenseTier,
} from "@chrysalis/license";

const SUBCOMMANDS = [
  ["init", "Mark a directory as a Chrysalis project"],
  ["observe", "Run the oracle sidecar against a live PHP app"],
  ["corpus", "Read + summarize a traces/ directory"],
  ["ingest", "Translate PHP source into a WebIR module"],
  ["archaeology", "Recover schema from DB + forms + traces"],
  ["emit", "Emit a target project from a WebIR module (e.g. --target=hono|fastify)"],
  ["convert", "One-shot ingest + emit (Milestone 1 convenience)"],
  ["verify", "Replay oracle traces against the generated code"],
  ["verify-merge", "Merge per-shard verify summary.json files (V2-M1)"],
  ["corpus-merge", "Merge multiple traces/ day-bucket trees into one corpus root (V2-M3)"],
  ["deploy", "Configure the chimera router (--mode=shadow|canary|cutover)"],
  ["insight", "Catalog anti-patterns on the WebIR and propose idiomatic replacements"],
  [
    "rewrite",
    "Apply IR rewrites from insight; optional --http-replay-backends=hono,fastify",
  ],
  ["status", "Print the migration dashboard"],
  [
    "repair",
    "Verify-gated WebIR repair (optional --llm, --hole-patch, --write-module)",
  ],
  ["license", "Verify local Ed25519 license envelope (optional commercial gate)"],
  ["port-site", "Port a legacy site to CWL with verify-gated LLM trajectories (Phase 33)"],
  ["federation", "Verified Migration Federation — registry, submit shards, corpus, league"],
  ["evidence", "Migration Evidence POC — unified Site-Port + VMF + web-LLM demo hub"],
  ["cwl", "CWL authoring: init starter contract, preview via runtime-cwl"],
] as const;

/** Written by `chrysalis init`; other tooling may use it to detect a Chrysalis PHP root. */
const CHRYSALIS_PROJECT_FILENAME = "chrysalis.project.json";
const CHRYSALIS_PROJECT_SCHEMA_VERSION = "1.0.0";

function printHelp(): void {
  console.log("chrysalis — grow a modern framework inside a legacy PHP app\n");
  console.log("Usage: chrysalis <command> [...args]\n");
  console.log("Commands:");
  for (const [name, desc] of SUBCOMMANDS) {
    console.log(`  ${name.padEnd(12)} ${desc}`);
  }
  console.log(
    "\nParser selection for ingest-driven commands: --parser-provider glayzzle|nikic (default: glayzzle)",
  );
  console.log(
    "Optional default: CHRYSALIS_PARSER_PROVIDER=glayzzle|nikic (flag still wins)\n",
  );
  console.log(
    "Scale-out (V2): verify --shard-index/--shard-count, verify-merge, corpus-merge, ingest|emit --shard-* / --merge-all-shards / --ingest-cache / --ingest-progress-file / --ingest-checkpoint-file / --ingest-resume-checkpoint / --ingest-dedupe-structural-subgraphs / --ingest-dedupe-structural-subgraphs-ignore-origin (DESIGN D283) / --ingest-lift-shared-helpers (B2) / --ingest-lift-shared-helpers-respect-origin (B2) / --ingest-lift-shared-helpers-semantic (B3) / --ingest-embed-shared-helper-bodies (B4), verify|repair|insight|status --ingest-progress-file (verify|status need --project for progress+checkpoint); emit --emit-handler-fingerprints, --emit-runtime-facade, --emit-shared-runtime-imports (not with --emit-handler-import-barrel), --emit-dedupe-identical-handler-bodies (DESIGN D282); PHP Redis session smoke: pnpm run test:oracle-php-session-redis; fleet: scripts/aggregate-chimera-operator-snapshots.mjs, scripts/aggregate-verify-summaries.mjs\n",
  );
  console.log("\nRead DESIGN.md before contributing.");
}

function licenseEnforcementEnabled(): boolean {
  const v = process.env.CHRYSALIS_REQUIRE_LICENSE;
  return v === "1" || v === "true";
}

function parseMinTierEnv(): LicenseTier | null | "invalid" {
  const raw = process.env.CHRYSALIS_LICENSE_MIN_TIER;
  if (!raw || raw.trim() === "") return null;
  const t = raw.trim().toLowerCase();
  if (t === "dev" || t === "pro" || t === "enterprise") return t;
  return "invalid";
}

/**
 * When `CHRYSALIS_REQUIRE_LICENSE=1`, all commands except `license`, `init`, and `cwl` require a valid
 * local envelope + public key (no network). Optional `CHRYSALIS_LICENSE_MIN_TIER=dev|pro|enterprise`.
 */
function runLicenseGate(cmd: string): number | null {
  if (cmd === "license" || cmd === "init" || cmd === "cwl") return null;
  if (!licenseEnforcementEnabled()) return null;
  const minTier = parseMinTierEnv();
  if (minTier === "invalid") {
    console.error(
      "[chrysalis] CHRYSALIS_LICENSE_MIN_TIER must be one of: dev, pro, enterprise",
    );
    return 2;
  }
  try {
    const envelope = loadLicenseEnvelopeFromEnv();
    const pem = loadPublicKeyPemFromEnv();
    const claims = verifyLicenseEnvelope(envelope, pem);
    if (minTier) assertMinLicenseTier(claims, minTier);
    return null;
  } catch (e) {
    const msg = e instanceof LicenseVerificationError ? e.message : String(e);
    console.error(`[chrysalis] ${msg}`);
    console.error(
      "[chrysalis] license enforcement is on (CHRYSALIS_REQUIRE_LICENSE). See packages/license/README.md and docs/COMMERCIAL.md",
    );
    return 2;
  }
}

/**
 * Create `chrysalis.project.json` so tooling can detect a Chrysalis-managed PHP tree.
 * Idempotent when the marker already matches this schema. Excluded from `CHRYSALIS_REQUIRE_LICENSE`.
 */
async function cmdInit(rest: string[]): Promise<number> {
  const pos = rest.filter((a) => !a.startsWith("-"));
  const targetDir = resolve(pos[0] ?? process.cwd());
  try {
    mkdirSync(targetDir, { recursive: true });
  } catch (e) {
    console.error(`[init] cannot create directory ${targetDir}: ${e}`);
    return 2;
  }
  const marker = join(targetDir, CHRYSALIS_PROJECT_FILENAME);
  if (existsSync(marker)) {
    try {
      const j = JSON.parse(readFileSync(marker, "utf8")) as Record<string, unknown>;
      if (
        j.schemaVersion === CHRYSALIS_PROJECT_SCHEMA_VERSION &&
        typeof j.initializedAt === "string"
      ) {
        console.log(`[chrysalis] project already initialized (${marker})`);
        return 0;
      }
      console.error(
        `[init] ${marker} exists but is not a recognized Chrysalis project file (refusing to overwrite).`,
      );
      return 2;
    } catch {
      console.error(`[init] ${marker} exists but is not valid JSON (refusing to overwrite).`);
      return 2;
    }
  }
  const payload = {
    kind: "chrysalis.project",
    schemaVersion: CHRYSALIS_PROJECT_SCHEMA_VERSION,
    initializedAt: new Date().toISOString(),
  };
  writeFileSync(marker, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[chrysalis] initialized project: ${marker}`);
  return 0;
}

function resolveRepoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}

async function loadHubCwlPreview(): Promise<{
  buildCwlPreviewReport: (
    projectDir: string,
    opts?: {
      cwlPath?: string;
      probe?: boolean;
      repoRoot?: string;
      bootstrap?: boolean;
    },
  ) => Promise<Record<string, unknown>>;
  writeCwlPreviewArtifacts: (
    projectDir: string,
    opts?: {
      cwlPath?: string;
      probe?: boolean;
      repoRoot?: string;
      bootstrap?: boolean;
    },
  ) => Promise<{ jsonPath: string; report: Record<string, unknown> }>;
}> {
  const hubScript = join(resolveRepoRoot(), "scripts/hub-ingest/hub-cwl-preview.mjs");
  return import(pathToFileURL(hubScript).href) as Promise<{
    buildCwlPreviewReport: (
      projectDir: string,
      opts?: {
        cwlPath?: string;
        probe?: boolean;
        repoRoot?: string;
        bootstrap?: boolean;
      },
    ) => Promise<Record<string, unknown>>;
    writeCwlPreviewArtifacts: (
      projectDir: string,
      opts?: {
        cwlPath?: string;
        probe?: boolean;
        repoRoot?: string;
        bootstrap?: boolean;
      },
    ) => Promise<{ jsonPath: string; report: Record<string, unknown> }>;
  }>;
}

async function cmdCwlInit(rest: string[]): Promise<number> {
  const pos = rest.filter((a) => !a.startsWith("-"));
  const targetDir = resolve(pos[0] ?? process.cwd());
  try {
    mkdirSync(targetDir, { recursive: true });
  } catch (e) {
    console.error(`[cwl init] cannot create directory ${targetDir}: ${e}`);
    return 2;
  }
  const cwlPath = join(targetDir, ".chrysalis", "migration.cwl");
  if (existsSync(cwlPath)) {
    console.log(`[cwl init] CWL contract already exists (${cwlPath})`);
    return 0;
  }
  const probe = !rest.includes("--no-probe");
  const { writeCwlPreviewArtifacts } = await loadHubCwlPreview();
  const { jsonPath, report } = await writeCwlPreviewArtifacts(targetDir, {
    bootstrap: true,
    probe,
    repoRoot: resolveRepoRoot(),
  });
  if (report.ok !== true) {
    console.error(`[cwl init] failed: ${String(report.error ?? "unknown")}`);
    return 1;
  }
  console.log(
    `[cwl init] wrote ${cwlPath} (${String(report.routeCount ?? 0)} route(s), module ${String(report.moduleName ?? "?")})`,
  );
  console.log(`[cwl init] preview artifact: ${jsonPath}`);
  const probeResult = report.probe as Record<string, unknown> | null | undefined;
  if (probeResult && typeof probeResult.status === "number") {
    console.log(`[cwl init] runtime probe: ${String(probeResult.route ?? "GET")} -> ${probeResult.status}`);
  }
  return 0;
}

async function cmdCwlPreview(rest: string[]): Promise<number> {
  const pos = rest.filter((a) => !a.startsWith("-"));
  const targetDir = resolve(pos[0] ?? process.cwd());
  const bootstrap = rest.includes("--bootstrap");
  const probe = !rest.includes("--no-probe");
  const { buildCwlPreviewReport } = await loadHubCwlPreview();
  const report = await buildCwlPreviewReport(targetDir, {
    bootstrap,
    probe,
    repoRoot: resolveRepoRoot(),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report.ok === true ? 0 : 1;
}

async function cmdCwlFmt(rest: string[]): Promise<number> {
  const pos = rest.filter((a) => !a.startsWith("-"));
  const target = resolve(pos[0] ?? join(process.cwd(), ".chrysalis", "migration.cwl"));
  const mod = await import(resolve(resolveRepoRoot(), "scripts/hub-ingest/cwl-fmt.mjs") as string);
  const write = !rest.includes("--check");
  const report = await mod.formatCwlFile(target, { write });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.changed && rest.includes("--check")) {
    console.error("[cwl fmt] file would change (run without --check to write)");
    return 1;
  }
  console.log(`[cwl fmt] ${report.changed ? "formatted" : "unchanged"} ${target}`);
  return 0;
}

async function cmdCwlLint(rest: string[]): Promise<number> {
  const pos = rest.filter((a) => !a.startsWith("-"));
  const targetDir = resolve(pos[0] ?? process.cwd());
  const cwlPath = join(targetDir, ".chrysalis", "migration.cwl");
  if (!existsSync(cwlPath)) {
    console.error(`[cwl lint] missing ${cwlPath} (run cwl init first)`);
    return 1;
  }
  const mod = await import(
    resolve(resolveRepoRoot(), "scripts/hub-ingest/cwl-diagnose.mjs") as string
  );
  const report = await mod.diagnoseCwlFile(cwlPath);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  for (const d of (report.diagnostics as Array<{ severity: string; message: string }>) ?? []) {
    if (d.severity === "error") console.error(`[cwl lint] error: ${d.message}`);
    else if (d.severity === "warn") console.warn(`[cwl lint] warn: ${d.message}`);
  }
  return report.ok === true ? 0 : 1;
}

async function cmdPortSite(rest: string[]): Promise<number> {
  const pos = rest.filter((a) => !a.startsWith("-"));
  const projectDir = pos[0];
  if (!projectDir) {
    console.error(
      "usage: chrysalis port-site <project-dir> [--origin php|javascript] [--trajectory path] [--corpus traces/] [--verify-target hono] [--min-routes N] [--no-verify] [--no-dataset]",
    );
    return 2;
  }
  const flags = parseFlags(rest);
  const mod = await import(
    pathToFileURL(resolve(resolveRepoRoot(), "scripts/site-port-to-cwl.mjs")).href
  );
  const report = await mod.runSitePortToCwl({
    projectDir: resolve(projectDir),
    repoRoot: resolveRepoRoot(),
    ...(typeof flags.origin === "string" ? { origin: flags.origin } : {}),
    ...(typeof flags.trajectory === "string" ? { trajectoryPath: resolve(flags.trajectory) } : {}),
    ...(typeof flags.corpus === "string" ? { corpusDir: resolve(flags.corpus) } : {}),
    ...(typeof flags["min-routes"] === "string"
      ? { minRoutes: Number.parseInt(flags["min-routes"], 10) }
      : {}),
    exportDataset: !rest.includes("--no-dataset"),
    verify: !rest.includes("--no-verify"),
    ...(typeof flags["verify-target"] === "string" ? { verifyTarget: flags["verify-target"] } : {}),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.ok === true) {
    console.log(
      `[port-site] CWL contract: ${String(report.cwl?.cwlPath ?? join(resolve(projectDir), ".chrysalis", "migration.cwl"))} (${String(report.cwl?.routeCount ?? 0)} route(s))`,
    );
    if (report.trajectory?.path) {
      console.log(`[port-site] trajectory: ${report.trajectory.path}`);
    }
  } else {
    console.error(`[port-site] failed: ${String(report.reason ?? "pipeline-error")}`);
  }
  return report.ok === true ? 0 : 1;
}

async function loadFederationLib(): Promise<{
  syncRegistryFromOpenLegacyIndex: (repoRoot: string) => unknown;
  submitFederationShard: (opts: Record<string, unknown>) => Promise<Record<string, unknown>>;
  mergeFederationCorpus: (repoRoot: string) => Promise<Record<string, unknown>>;
  mergeFederationWvb: (repoRoot: string) => Promise<Record<string, unknown>>;
  publishFederationLeague: (repoRoot: string) => Promise<Record<string, unknown>>;
}> {
  return import(
    pathToFileURL(resolve(resolveRepoRoot(), "scripts/site-port-federation-lib.mjs")).href
  ) as Promise<{
    syncRegistryFromOpenLegacyIndex: (repoRoot: string) => unknown;
    submitFederationShard: (opts: Record<string, unknown>) => Promise<Record<string, unknown>>;
    mergeFederationCorpus: (repoRoot: string) => Promise<Record<string, unknown>>;
    mergeFederationWvb: (repoRoot: string) => Promise<Record<string, unknown>>;
    publishFederationLeague: (repoRoot: string) => Promise<Record<string, unknown>>;
  }>;
}

async function loadFederationDemo(): Promise<{
  runFederationDemo: (opts?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}> {
  return import(
    pathToFileURL(resolve(resolveRepoRoot(), "scripts/site-port-federation-demo.mjs")).href
  ) as Promise<{
    runFederationDemo: (opts?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }>;
}

async function cmdFederation(rest: string[]): Promise<number> {
  const sub = rest[0];
  if (!sub || sub === "--help" || sub === "-h" || sub === "help") {
    console.log("chrysalis federation — Verified Migration Federation (VMF)\n");
    console.log("  sync-registry              Refresh public work-unit registry (Open Legacy Index)");
    console.log("  submit-shard <project-dir> Submit verify-gated trajectory shard");
    console.log("  merge-corpus               Merge accepted shards into federated corpus");
    console.log("  merge-wvb                  Merge federation WVB cases from verified submissions");
    console.log("  publish-league             Publish Verify League leaderboard HTML+JSON");
    console.log("  export-shorthand           Export IS-T3/T4/T5 intelligence shorthands (CPU only)");
    console.log("  demo                       One-command Site-Port + VMF POC (port all index fixtures)");
    console.log("  serve                      Local VMF hub HTTP API (file-based ingest v1)");
    console.log("\nEnv: CHRYSALIS_FEDERATION_CONTRIBUTOR, CHRYSALIS_FEDERATION_DIR, CHRYSALIS_POC_SKIP_BUILD, CHRYSALIS_FEDERATION_HUB_PORT");
    return 0;
  }

  const lib = await loadFederationLib();
  const repoRoot = resolveRepoRoot();

  if (sub === "sync-registry") {
    const registry = lib.syncRegistryFromOpenLegacyIndex(repoRoot) as { workUnits?: unknown[]; generatedAt?: string };
    console.log(
      `[federation] registry synced (${String(registry.workUnits?.length ?? 0)} work unit(s))`,
    );
    return (registry.workUnits?.length ?? 0) >= 1 ? 0 : 1;
  }

  if (sub === "submit-shard") {
    const pos = rest.slice(1).filter((a) => !a.startsWith("-"));
    const projectDir = pos[0];
    if (!projectDir) {
      console.error("usage: chrysalis federation submit-shard <project-dir> [--fixture id] [--contributor name]");
      return 2;
    }
    const flags = parseFlags(rest.slice(1));
    const result = await lib.submitFederationShard({
      repoRoot,
      projectDir: resolve(projectDir),
      ...(typeof flags.fixture === "string" ? { fixtureId: flags.fixture } : {}),
      ...(typeof flags.contributor === "string" ? { contributor: flags.contributor } : {}),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.ok === true) {
      console.log(`[federation] submitted ${String(result.id ?? "?")} for ${String(result.fixtureId ?? "?")}`);
    }
    return result.ok === true ? 0 : 1;
  }

  if (sub === "merge-corpus") {
    const result = await lib.mergeFederationCorpus(repoRoot);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.ok === true) {
      console.log(`[federation] merged ${String(result.shardCount ?? 0)} shard(s) into federated corpus`);
    }
    return result.ok === true ? 0 : 1;
  }

  if (sub === "publish-league") {
    const result = await lib.publishFederationLeague(repoRoot);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.ok === true) {
      console.log(`[federation] league published: ${String(result.htmlPath ?? "?")}`);
    }
    return result.ok === true ? 0 : 1;
  }

  if (sub === "merge-wvb") {
    const result = await lib.mergeFederationWvb(repoRoot);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.ok === true) {
      console.log(`[federation] WVB merged: ${String(result.outPath ?? "?")} (${String(result.mergedCaseCount ?? "?")} cases)`);
    }
    return result.ok === true ? 0 : 1;
  }

  if (sub === "export-shorthand") {
    const exportMod = (await import(
      pathToFileURL(resolve(repoRoot, "scripts/web-llm-export-shorthand.mjs")).href
    )) as { exportIntelligenceShorthands: (opts: { repoRoot: string }) => Promise<Record<string, unknown>> };
    const hubMod = (await import(
      pathToFileURL(resolve(repoRoot, "scripts/web-llm-build-shorthand-hub.mjs")).href
    )) as { runWebLlmBuildShorthandHub: (opts: { repoRoot: string }) => Promise<Record<string, unknown>> };
    const exported = await exportMod.exportIntelligenceShorthands({ repoRoot });
    const hub = await hubMod.runWebLlmBuildShorthandHub({ repoRoot });
    const summary = exported.summary as { compressionVs7BTotal?: number } | undefined;
    process.stdout.write(`${JSON.stringify({ exported, hub }, null, 2)}\n`);
    if (exported.ok === true) {
      console.log(
        `[federation] exported ${String(exported.count ?? 0)} shorthand(s), ${String(summary?.compressionVs7BTotal ?? "?")}× vs 7B`,
      );
    }
    return exported.ok === true ? 0 : 1;
  }

  if (sub === "demo") {
    const demoMod = await loadFederationDemo();
    const result = await demoMod.runFederationDemo({ repoRoot });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.ok === true) {
      console.log(`[federation] POC hub: ${String(result.hubPath ?? "?")}`);
    }
    return result.ok === true ? 0 : 1;
  }

  if (sub === "serve") {
    const hubMod = (await import(
      pathToFileURL(resolve(repoRoot, "scripts/federation-hub-server.mjs")).href
    )) as { startFederationHubServer: (opts: { repoRoot: string; port?: number }) => Promise<{ baseUrl: string }> };
    const flags = parseFlags(rest.slice(1));
    const portRaw = flags.port ?? process.env.CHRYSALIS_FEDERATION_HUB_PORT;
    const port = typeof portRaw === "string" ? Number.parseInt(portRaw, 10) : undefined;
    const started = await hubMod.startFederationHubServer({ repoRoot, ...(port ? { port } : {}) });
    console.log(`[federation] hub listening on ${started.baseUrl}`);
    return 0;
  }

  console.error(`[federation] unknown subcommand: ${sub}`);
  console.error("run 'chrysalis federation help' for usage.");
  return 2;
}

async function loadMigrationEvidenceDemo(): Promise<{
  runMigrationEvidenceDemo: (opts?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}> {
  return import(
    pathToFileURL(resolve(resolveRepoRoot(), "scripts/migration-evidence-demo.mjs")).href
  ) as Promise<{
    runMigrationEvidenceDemo: (opts?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  }>;
}

async function cmdEvidence(rest: string[]): Promise<number> {
  const sub = rest[0];
  if (!sub || sub === "--help" || sub === "-h" || sub === "help") {
    console.log("chrysalis evidence — Migration Evidence POC (Phase 35)\n");
    console.log("  demo                       Run Site-Port + VMF + web-LLM demos and build unified hub");
    console.log("  export-shorthand           Export IS intelligence shorthands (CPU only, no GPU)");
    console.log("\nEnv: CHRYSALIS_POC_SKIP_BUILD, CHRYSALIS_FEDERATION_CONTRIBUTOR");
    return 0;
  }

  if (sub === "demo") {
    const mod = await loadMigrationEvidenceDemo();
    const result = await mod.runMigrationEvidenceDemo({ repoRoot: resolveRepoRoot() });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.ok === true) {
      console.log(`[evidence] POC hub: ${String(result.hubPath ?? "?")}`);
    }
    return result.ok === true ? 0 : 1;
  }

  if (sub === "export-shorthand") {
    const repoRoot = resolveRepoRoot();
    const exportMod = (await import(
      pathToFileURL(resolve(repoRoot, "scripts/web-llm-export-shorthand.mjs")).href
    )) as { exportIntelligenceShorthands: (opts: { repoRoot: string }) => Promise<Record<string, unknown>> };
    const hubMod = (await import(
      pathToFileURL(resolve(repoRoot, "scripts/web-llm-build-shorthand-hub.mjs")).href
    )) as { runWebLlmBuildShorthandHub: (opts: { repoRoot: string }) => Promise<Record<string, unknown>> };
    const exported = await exportMod.exportIntelligenceShorthands({ repoRoot });
    const hub = await hubMod.runWebLlmBuildShorthandHub({ repoRoot });
    process.stdout.write(`${JSON.stringify({ exported, hub }, null, 2)}\n`);
    return exported.ok === true ? 0 : 1;
  }

  console.error(`[evidence] unknown subcommand: ${sub}`);
  console.error("run 'chrysalis evidence help' for usage.");
  return 2;
}

async function cmdCwl(rest: string[]): Promise<number> {
  const sub = rest[0];
  if (!sub || sub === "--help" || sub === "-h" || sub === "help") {
    console.log("chrysalis cwl — CWL authoring shortcuts\n");
    console.log("  init [<dir>]       Bootstrap .chrysalis/migration.cwl starter module");
    console.log("  preview [<dir>]    List routes and probe runtime-cwl (JSON on stdout)");
    console.log("  lint [<dir>]       Parse migration.cwl and report diagnostics (JSON on stdout)");
    console.log("  fmt [<file>]       Format CWL via WebIR round-trip (default: .chrysalis/migration.cwl)");
    console.log("\nFlags:");
    console.log("  --no-probe         Skip runtime-cwl HTTP probe");
    console.log("  --bootstrap        (preview) create starter CWL when missing");
    console.log("  --check            (fmt) exit 1 if file would change");
    return 0;
  }
  if (sub === "init") {
    return cmdCwlInit(rest.slice(1));
  }
  if (sub === "preview") {
    return cmdCwlPreview(rest.slice(1));
  }
  if (sub === "lint") {
    return cmdCwlLint(rest.slice(1));
  }
  if (sub === "fmt") {
    return cmdCwlFmt(rest.slice(1));
  }
  console.error(`[cwl] unknown subcommand: ${sub}`);
  console.error("run 'chrysalis cwl help' for usage.");
  return 2;
}

async function cmdLicense(rest: string[]): Promise<number> {
  const sub = rest[0] ?? "help";
  if (sub === "--help" || sub === "-h" || sub === "help") {
    console.log("chrysalis license — local Ed25519 envelope (no network)\n");
    console.log("  check   Validate CHRYSALIS_LICENSE* + CHRYSALIS_LICENSE_PUBLIC_KEY*");
    console.log("  print   check, then print claims (sub, tier, exp, …)\n");
    console.log(
      "Enforcement: CHRYSALIS_REQUIRE_LICENSE=1 gates other commands; optional CHRYSALIS_LICENSE_MIN_TIER=dev|pro|enterprise (DESIGN D289).",
    );
    console.log("Commercial SKUs: docs/COMMERCIAL.md\n");
    return 0;
  }
  if (sub !== "check" && sub !== "print") {
    console.error(`[chrysalis] unknown license subcommand: ${sub}`);
    return 2;
  }
  const minTier = parseMinTierEnv();
  if (minTier === "invalid") {
    console.error(
      "[chrysalis] CHRYSALIS_LICENSE_MIN_TIER must be one of: dev, pro, enterprise",
    );
    return 2;
  }
  try {
    const envelope = loadLicenseEnvelopeFromEnv();
    const pem = loadPublicKeyPemFromEnv();
    const claims = verifyLicenseEnvelope(envelope, pem);
    if (minTier) assertMinLicenseTier(claims, minTier);
    if (sub === "print") {
      console.log(
        JSON.stringify(
          {
            sub: claims.sub,
            tier: claims.tier,
            exp: claims.exp,
            iss: claims.iss,
            features: claims.features,
          },
          null,
          2,
        ),
      );
    } else {
      console.log("license ok.");
    }
    return 0;
  } catch (e) {
    const msg = e instanceof LicenseVerificationError ? e.message : String(e);
    console.error(`[chrysalis] ${msg}`);
    return 2;
  }
}

function parseFlags(args: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) {
        out[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith("--")) {
          out[a.slice(2)] = next;
          i += 1;
        } else {
          out[a.slice(2)] = true;
        }
      }
    }
  }
  return out;
}

function positional(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      if (a.indexOf("=") < 0 && args[i + 1] && !args[i + 1]!.startsWith("--")) i += 1;
      continue;
    }
    out.push(a);
  }
  return out;
}

type ParserProvider = "glayzzle" | "nikic";

type ShardIngestMode =
  | { mode: "none" }
  | { mode: "single"; shardIndex: number; shardCount: number }
  | { mode: "mergeAll"; shardCount: number };

function shardIngestModeFromFlags(
  flags: Record<string, string | boolean>,
): { ok: true; value: ShardIngestMode } | { ok: false; message: string } {
  const scRaw = flags["shard-count"];
  const siRaw = flags["shard-index"];
  const mergeAll = flags["merge-all-shards"] === true;

  if (scRaw === undefined && siRaw === undefined && !mergeAll) {
    return { ok: true, value: { mode: "none" } };
  }

  if (mergeAll) {
    if (typeof scRaw !== "string") {
      return { ok: false, message: "error: --merge-all-shards requires --shard-count <int>" };
    }
    if (siRaw !== undefined) {
      return { ok: false, message: "error: --merge-all-shards cannot be combined with --shard-index" };
    }
    const k = Math.floor(Number.parseFloat(scRaw));
    if (!Number.isFinite(k) || k < 2) {
      return { ok: false, message: "error: --shard-count must be a finite integer >= 2" };
    }
    return { ok: true, value: { mode: "mergeAll", shardCount: k } };
  }

  if (typeof scRaw !== "string") {
    return { ok: false, message: "error: ingest shard filter requires --shard-count <int>=2" };
  }
  const k = Math.floor(Number.parseFloat(scRaw));
  if (!Number.isFinite(k) || k < 2) {
    return { ok: false, message: "error: --shard-count must be a finite integer >= 2" };
  }
  const idx =
    typeof siRaw === "string" ? Math.floor(Number.parseFloat(siRaw)) : 0;
  if (typeof siRaw === "string" && !Number.isFinite(idx)) {
    return { ok: false, message: "error: --shard-index must be a finite integer" };
  }
  if (idx < 0 || idx >= k) {
    return { ok: false, message: `error: --shard-index must satisfy 0 <= index < shard-count (got ${idx}, ${k})` };
  }
  return { ok: true, value: { mode: "single", shardCount: k, shardIndex: idx } };
}

function emitRouteRegistrationFromFlags(
  flags: Record<string, string | boolean>,
): { ok: true; value: "lazy" | undefined } | { ok: false; message: string } {
  const raw = flags["emit-route-registration"];
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== "string") {
    return { ok: false, message: "error: --emit-route-registration expects eager|lazy" };
  }
  const v = raw.trim().toLowerCase();
  if (v === "eager") return { ok: true, value: undefined };
  if (v === "lazy") return { ok: true, value: "lazy" };
  return {
    ok: false,
    message: `error: --emit-route-registration must be eager or lazy (got ${JSON.stringify(raw)})`,
  };
}

async function ingestProjectWithShardMode(
  root: string,
  mode: ShardIngestMode,
  extras: {
    parserProvider?: ParserProvider;
    ingestCacheDir?: string;
    ingestProgressFile?: string;
    ingestCheckpointFile?: string;
    ingestResumeFromCheckpoint?: boolean;
    dedupeStructuralSubgraphs?: boolean;
    dedupeStructuralSubgraphsIgnoreOrigin?: boolean;
    liftSharedHelpers?: boolean;
    liftSharedHelpersSemantic?: boolean;
    liftSharedHelpersIgnoreOrigin?: boolean;
    embedSharedHelperBodiesInModule?: boolean;
  },
): Promise<Module> {
  const base = {
    ...(extras.parserProvider ? { parserProvider: extras.parserProvider } : {}),
    ...(extras.ingestCacheDir !== undefined ? { ingestCacheDir: extras.ingestCacheDir } : {}),
    ...(extras.ingestProgressFile !== undefined ? { ingestProgressFile: extras.ingestProgressFile } : {}),
    ...(extras.ingestCheckpointFile !== undefined ? { ingestCheckpointFile: extras.ingestCheckpointFile } : {}),
    ...(extras.ingestResumeFromCheckpoint === true ? { ingestResumeFromCheckpoint: true as const } : {}),
    ...(extras.dedupeStructuralSubgraphs === true ? { dedupeStructuralSubgraphs: true as const } : {}),
    ...(extras.dedupeStructuralSubgraphsIgnoreOrigin === true
      ? { dedupeStructuralSubgraphsIgnoreOrigin: true as const }
      : {}),
    ...(extras.liftSharedHelpers === true ? { liftSharedHelpers: true as const } : {}),
    ...(extras.liftSharedHelpersSemantic === true ? { liftSharedHelpersSemantic: true as const } : {}),
    ...(extras.liftSharedHelpersIgnoreOrigin === false
      ? { liftSharedHelpersIgnoreOrigin: false as const }
      : {}),
    ...(extras.embedSharedHelperBodiesInModule === true
      ? { embedSharedHelperBodiesInModule: true as const }
      : {}),
  };
  if (mode.mode === "none") {
    return ingestDirectory(root, base);
  }
  if (mode.mode === "single") {
    return ingestDirectory(root, {
      ...base,
      shardIndex: mode.shardIndex,
      shardCount: mode.shardCount,
    });
  }
  const mods: Module[] = [];
  for (let i = 0; i < mode.shardCount; i++) {
    mods.push(
      await ingestDirectory(root, {
        ...base,
        shardIndex: i,
        shardCount: mode.shardCount,
      }),
    );
  }
  return mergeWebIrModules(mods);
}

function parserProviderFromFlags(
  flags: Record<string, string | boolean>,
): ParserProvider | null | undefined {
  const raw = flags["parser-provider"];
  const envRaw = process.env.CHRYSALIS_PARSER_PROVIDER;
  if (raw === undefined) {
    if (!envRaw || envRaw.trim() === "") return undefined;
    if (envRaw === "glayzzle" || envRaw === "nikic") return envRaw;
    console.error(
      `error: unsupported CHRYSALIS_PARSER_PROVIDER '${envRaw}'. Supported: glayzzle, nikic`,
    );
    return null;
  }
  if (raw === "glayzzle" || raw === "nikic") return raw;
  if (typeof raw === "string") {
    console.error(`error: unsupported --parser-provider '${raw}'. Supported: glayzzle, nikic`);
    return null;
  }
  console.error("error: --parser-provider requires a value (glayzzle|nikic)");
  return null;
}

function ingestCacheDirFromFlags(
  flags: Record<string, string | boolean>,
): { ok: true; ingestCacheDir?: string } | { ok: false; message: string } {
  const raw = flags["ingest-cache"];
  if (raw === undefined) return { ok: true };
  if (raw === true || raw === "") {
    return { ok: false, message: "error: --ingest-cache requires a directory path" };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "error: --ingest-cache requires a directory path" };
  }
  return { ok: true, ingestCacheDir: resolve(raw) };
}

function ingestProgressFileFromFlags(
  flags: Record<string, string | boolean>,
  shardMode: ShardIngestMode,
): { ok: true; ingestProgressFile?: string } | { ok: false; message: string } {
  const raw = flags["ingest-progress-file"];
  if (raw === undefined) return { ok: true };
  if (raw === true || raw === "") {
    return { ok: false, message: "error: --ingest-progress-file requires a path" };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "error: --ingest-progress-file requires a path" };
  }
  if (shardMode.mode === "mergeAll") {
    return {
      ok: false,
      message:
        "error: --ingest-progress-file cannot be used with --merge-all-shards (each shard overwrites the same path; use per-shard runs with distinct files instead)",
    };
  }
  return { ok: true, ingestProgressFile: resolve(raw) };
}

function ingestCheckpointFileFromFlags(
  flags: Record<string, string | boolean>,
  shardMode: ShardIngestMode,
): {
  ok: true;
  ingestCheckpointFile?: string;
  ingestResumeFromCheckpoint?: boolean;
} | { ok: false; message: string } {
  const raw = flags["ingest-checkpoint-file"];
  const resume = flags["ingest-resume-checkpoint"] === true;
  if (raw === undefined) {
    if (resume) {
      return { ok: false, message: "error: --ingest-resume-checkpoint requires --ingest-checkpoint-file <path>" };
    }
    return { ok: true };
  }
  if (raw === true || raw === "") {
    return { ok: false, message: "error: --ingest-checkpoint-file requires a path" };
  }
  if (typeof raw !== "string") {
    return { ok: false, message: "error: --ingest-checkpoint-file requires a path" };
  }
  if (shardMode.mode === "mergeAll") {
    return {
      ok: false,
      message:
        "error: --ingest-checkpoint-file cannot be used with --merge-all-shards (use per-shard runs with distinct checkpoint paths instead)",
    };
  }
  return {
    ok: true,
    ingestCheckpointFile: resolve(raw),
    ...(resume ? { ingestResumeFromCheckpoint: true as const } : {}),
  };
}

type IngestLiftCliOptions = {
  dedupeStructuralSubgraphs?: true;
  dedupeStructuralSubgraphsIgnoreOrigin?: true;
  liftSharedHelpers?: true;
  liftSharedHelpersIgnoreOrigin?: false;
  liftSharedHelpersSemantic?: true;
  embedSharedHelperBodiesInModule?: true;
};

function ingestLiftOptionsFromFlags(flags: Record<string, string | boolean>): IngestLiftCliOptions {
  return {
    ...(flags["ingest-dedupe-structural-subgraphs"] === true
      ? { dedupeStructuralSubgraphs: true as const }
      : {}),
    ...(flags["ingest-dedupe-structural-subgraphs-ignore-origin"] === true
      ? { dedupeStructuralSubgraphsIgnoreOrigin: true as const }
      : {}),
    ...(flags["ingest-lift-shared-helpers"] === true ? { liftSharedHelpers: true as const } : {}),
    ...(flags["ingest-lift-shared-helpers-respect-origin"] === true
      ? { liftSharedHelpersIgnoreOrigin: false as const }
      : {}),
    ...(flags["ingest-lift-shared-helpers-semantic"] === true
      ? { liftSharedHelpersSemantic: true as const }
      : {}),
    ...(flags["ingest-embed-shared-helper-bodies"] === true
      ? { embedSharedHelperBodiesInModule: true as const }
      : {}),
  };
}

function validateIngestLiftFlagsFromCli(
  flags: Record<string, string | boolean>,
): { ok: true } | { ok: false; message: string } {
  if (
    flags["ingest-dedupe-structural-subgraphs-ignore-origin"] === true &&
    flags["ingest-dedupe-structural-subgraphs"] !== true
  ) {
    return {
      ok: false,
      message:
        "error: --ingest-dedupe-structural-subgraphs-ignore-origin requires --ingest-dedupe-structural-subgraphs",
    };
  }
  if (flags["ingest-lift-shared-helpers"] === true && flags["ingest-dedupe-structural-subgraphs"] !== true) {
    return {
      ok: false,
      message: "error: --ingest-lift-shared-helpers requires --ingest-dedupe-structural-subgraphs",
    };
  }
  if (
    flags["ingest-lift-shared-helpers-respect-origin"] === true &&
    flags["ingest-lift-shared-helpers"] !== true
  ) {
    return {
      ok: false,
      message:
        "error: --ingest-lift-shared-helpers-respect-origin requires --ingest-lift-shared-helpers",
    };
  }
  if (flags["ingest-lift-shared-helpers-semantic"] === true && flags["ingest-lift-shared-helpers"] !== true) {
    return {
      ok: false,
      message: "error: --ingest-lift-shared-helpers-semantic requires --ingest-lift-shared-helpers",
    };
  }
  if (
    flags["ingest-embed-shared-helper-bodies"] === true &&
    flags["ingest-dedupe-structural-subgraphs"] !== true
  ) {
    return {
      ok: false,
      message: "error: --ingest-embed-shared-helper-bodies requires --ingest-dedupe-structural-subgraphs",
    };
  }
  return { ok: true };
}

function collectPhpRootsFromArgs(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--php-root=")) {
      out.push(resolve(a.slice("--php-root=".length)));
    } else if (a === "--php-root" && args[i + 1] && !args[i + 1]!.startsWith("--")) {
      out.push(resolve(args[i + 1]!));
      i += 1;
    }
  }
  return out;
}

async function cmdIngest(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  if (!root) {
    console.error(
      "usage: chrysalis ingest <php-project-dir> [--parser-provider glayzzle|nikic] [--shard-index I --shard-count K] [--merge-all-shards --shard-count K] [--ingest-cache <dir>] [--ingest-progress-file <path>] [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint] [--ingest-dedupe-structural-subgraphs] [--ingest-dedupe-structural-subgraphs-ignore-origin] [--ingest-lift-shared-helpers] [--ingest-lift-shared-helpers-semantic] [--ingest-embed-shared-helper-bodies]",
    );
    return 2;
  }
  const parserProvider = parserProviderFromFlags(flags);
  if (parserProvider === null) return 2;
  const cacheOpts = ingestCacheDirFromFlags(flags);
  if (!cacheOpts.ok) {
    console.error(cacheOpts.message);
    return 2;
  }
  const shardMode = shardIngestModeFromFlags(flags);
  if (!shardMode.ok) {
    console.error(shardMode.message);
    return 2;
  }
  const progressOpts = ingestProgressFileFromFlags(flags, shardMode.value);
  if (!progressOpts.ok) {
    console.error(progressOpts.message);
    return 2;
  }
  const checkpointOpts = ingestCheckpointFileFromFlags(flags, shardMode.value);
  if (!checkpointOpts.ok) {
    console.error(checkpointOpts.message);
    return 2;
  }
  if (shardMode.value.mode === "mergeAll") {
    console.log(
      `[ingest] merge-all-shards: ${shardMode.value.shardCount} shard ingests -> mergeWebIrModules`,
    );
  } else if (shardMode.value.mode === "single") {
    console.log(
      `[ingest] shard ${shardMode.value.shardIndex}/${shardMode.value.shardCount} (route file filter; call map uses full manifest)`,
    );
  }
  if (cacheOpts.ingestCacheDir !== undefined) {
    console.log(`[ingest] AST cache: ${cacheOpts.ingestCacheDir}`);
  }
  if (progressOpts.ingestProgressFile !== undefined) {
    console.log(`[ingest] progress JSON: ${progressOpts.ingestProgressFile}`);
  }
  if (checkpointOpts.ingestCheckpointFile !== undefined) {
    console.log(
      `[ingest] checkpoint: ${checkpointOpts.ingestCheckpointFile}${checkpointOpts.ingestResumeFromCheckpoint === true ? " (resume)" : ""}`,
    );
  }
  if (flags["ingest-dedupe-structural-subgraphs"] === true) {
    console.log("[ingest] structural subgraph dedupe: dedupeStructuralSubgraphsInModule (DESIGN D283)");
  }
  if (flags["ingest-dedupe-structural-subgraphs-ignore-origin"] === true) {
    console.log("[ingest] structural dedupe uses origin-insensitive key (ROADMAP helper lifting)");
  }
  const liftFlagCheck = validateIngestLiftFlagsFromCli(flags);
  if (!liftFlagCheck.ok) {
    console.error(liftFlagCheck.message);
    return 1;
  }
  if (flags["ingest-lift-shared-helpers"] === true) {
    console.log("[ingest] lift shared helper bodies for call-effect widening (IR helper lifting B2)");
  }
  if (flags["ingest-lift-shared-helpers-respect-origin"] === true) {
    console.log("[ingest] lift shared helpers: require origin match");
  }
  if (flags["ingest-lift-shared-helpers-semantic"] === true) {
    console.log("[ingest] lift shared helpers: semantic local-name equivalence (IR helper lifting B3)");
  }
  if (flags["ingest-embed-shared-helper-bodies"] === true) {
    console.log("[ingest] embed lib/vendor helper bodies as module roots before dedupe (IR helper lifting B4)");
  }
  const mod = await ingestProjectWithShardMode(resolve(root), shardMode.value, {
    ...(parserProvider ? { parserProvider } : {}),
    ...(cacheOpts.ingestCacheDir !== undefined ? { ingestCacheDir: cacheOpts.ingestCacheDir } : {}),
    ...(progressOpts.ingestProgressFile !== undefined
      ? { ingestProgressFile: progressOpts.ingestProgressFile }
      : {}),
    ...(checkpointOpts.ingestCheckpointFile !== undefined
      ? { ingestCheckpointFile: checkpointOpts.ingestCheckpointFile }
      : {}),
    ...(checkpointOpts.ingestResumeFromCheckpoint === true
      ? { ingestResumeFromCheckpoint: true as const }
      : {}),
    ...ingestLiftOptionsFromFlags(flags),
  });
  console.log(`routes:   ${mod.roots.length}`);
  console.log(`nodes:    ${mod.nodes.size}`);
  const holes = countHoles(mod);
  const authTagged = countAuthTaggedHoles(mod);
  console.log(
    `holes:    ${holes}` +
      (authTagged > 0 ? `  (${authTagged} auth-tagged ingest holes)` : ""),
  );
  console.log(`dialects: ${JSON.stringify(countByDialect(mod))}`);
  return 0;
}

async function cmdEmit(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  const outDir = typeof flags.out === "string" ? flags.out : null;
  const target = typeof flags.target === "string" ? flags.target : "hono";
  if (!root || !outDir) {
    console.error(
      "usage: chrysalis emit <php-project-dir> --out <out> [--target=hono|fastify|runtime-cwl] [--emit-route-registration eager|lazy] [--emit-handler-import-barrel] [--emit-shared-runtime-imports] [--emit-dedupe-identical-handler-bodies] [--emit-route-path-constants] [--emit-handler-fingerprints] [--emit-runtime-facade] [--emit-resume] [--schema <schema.sql>] [--parser-provider glayzzle|nikic] [--shard-index I --shard-count K] [--merge-all-shards --shard-count K] [--ingest-cache <dir>] [--ingest-progress-file <path>] [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint] [--ingest-dedupe-structural-subgraphs] [--ingest-dedupe-structural-subgraphs-ignore-origin] [--ingest-lift-shared-helpers] [--ingest-lift-shared-helpers-semantic] [--ingest-embed-shared-helper-bodies]",
    );
    return 2;
  }
  const parserProvider = parserProviderFromFlags(flags);
  if (parserProvider === null) return 2;
  const cacheOpts = ingestCacheDirFromFlags(flags);
  if (!cacheOpts.ok) {
    console.error(cacheOpts.message);
    return 2;
  }
  const shardMode = shardIngestModeFromFlags(flags);
  if (!shardMode.ok) {
    console.error(shardMode.message);
    return 2;
  }
  const progressOptsEmit = ingestProgressFileFromFlags(flags, shardMode.value);
  if (!progressOptsEmit.ok) {
    console.error(progressOptsEmit.message);
    return 2;
  }
  const checkpointOptsEmit = ingestCheckpointFileFromFlags(flags, shardMode.value);
  if (!checkpointOptsEmit.ok) {
    console.error(checkpointOptsEmit.message);
    return 2;
  }
  if (shardMode.value.mode === "mergeAll") {
    console.log(
      `[emit] merge-all-shards: ${shardMode.value.shardCount} shard ingests -> mergeWebIrModules`,
    );
  } else if (shardMode.value.mode === "single") {
    console.log(
      `[emit] shard ${shardMode.value.shardIndex}/${shardMode.value.shardCount} (partial route set; call map uses full manifest)`,
    );
  }
  if (cacheOpts.ingestCacheDir !== undefined) {
    console.log(`[emit] AST cache: ${cacheOpts.ingestCacheDir}`);
  }
  if (progressOptsEmit.ingestProgressFile !== undefined) {
    console.log(`[emit] ingest progress JSON: ${progressOptsEmit.ingestProgressFile}`);
  }
  if (checkpointOptsEmit.ingestCheckpointFile !== undefined) {
    console.log(
      `[emit] ingest checkpoint: ${checkpointOptsEmit.ingestCheckpointFile}${checkpointOptsEmit.ingestResumeFromCheckpoint === true ? " (resume)" : ""}`,
    );
  }
  if (flags["ingest-dedupe-structural-subgraphs"] === true) {
    console.log("[emit] ingest structural subgraph dedupe: dedupeStructuralSubgraphsInModule (DESIGN D283)");
  }
  if (flags["ingest-dedupe-structural-subgraphs-ignore-origin"] === true) {
    console.log("[emit] ingest structural dedupe uses origin-insensitive key (ROADMAP helper lifting)");
  }
  const liftFlagCheckEmit = validateIngestLiftFlagsFromCli(flags);
  if (!liftFlagCheckEmit.ok) {
    console.error(liftFlagCheckEmit.message);
    return 1;
  }
  if (target !== "hono" && target !== "fastify" && target !== "runtime-cwl") {
    console.error(`error: unsupported emit target '${target}'. Supported: hono, fastify, runtime-cwl`);
    return 2;
  }
  const routeReg = emitRouteRegistrationFromFlags(flags);
  if (!routeReg.ok) {
    console.error(routeReg.message);
    return 2;
  }
  if (
    target === "runtime-cwl" &&
    (flags["emit-handler-import-barrel"] === true ||
      flags["emit-shared-runtime-imports"] === true ||
      flags["emit-route-path-constants"] === true ||
      flags["emit-handler-fingerprints"] === true ||
      flags["emit-runtime-facade"] === true ||
      flags["emit-dedupe-identical-handler-bodies"] === true ||
      flags["emit-resume"] === true ||
      routeReg.value === "lazy")
  ) {
    console.error("error: runtime-cwl emit does not support hono/fastify emit strategy flags");
    return 2;
  }
  if (flags["emit-shared-runtime-imports"] === true && flags["emit-handler-import-barrel"] === true) {
    console.error(
      "error: --emit-shared-runtime-imports cannot be combined with --emit-handler-import-barrel",
    );
    return 2;
  }
  const mod = await ingestProjectWithShardMode(resolve(root), shardMode.value, {
    ...(parserProvider ? { parserProvider } : {}),
    ...(cacheOpts.ingestCacheDir !== undefined ? { ingestCacheDir: cacheOpts.ingestCacheDir } : {}),
    ...(progressOptsEmit.ingestProgressFile !== undefined
      ? { ingestProgressFile: progressOptsEmit.ingestProgressFile }
      : {}),
    ...(checkpointOptsEmit.ingestCheckpointFile !== undefined
      ? { ingestCheckpointFile: checkpointOptsEmit.ingestCheckpointFile }
      : {}),
    ...(checkpointOptsEmit.ingestResumeFromCheckpoint === true
      ? { ingestResumeFromCheckpoint: true as const }
      : {}),
    ...ingestLiftOptionsFromFlags(flags),
  });
  const outAbs = resolve(outDir);
  const schemaPath = typeof flags.schema === "string" ? resolve(flags.schema) : null;
  let domainMap: Record<string, string> | undefined;
  let schemaReport: ReturnType<typeof runArchaeology> | undefined;
  if (schemaPath) {
    const phpRoot = resolve(root);
    schemaReport = runArchaeology({ schemaPath, phpRoots: [phpRoot] });
    domainMap = domainTypesByTable(schemaReport);
    mkdirSync(join(outAbs, "src"), { recursive: true });
    writeFileSync(join(outAbs, "src", "domain.ts"), emitTypes(schemaReport));
  }
  if (target === "runtime-cwl") {
    const { text, holeCount } = await renderCwlFromModule(mod, {
      header: `# Chrysalis Web Language — runtime-cwl emit from ${resolve(root)}`,
      moduleName: mod.meta.sourceApp || "chrysalis",
    });
    const res = await emitRuntimeCwl({
      module: mod,
      outDir: outAbs,
      cwlSource: text,
      holeCount,
      provenanceRoot: resolve(root),
    });
    console.log(`routes:       ${res.routeCount}`);
    console.log(`files:        ${res.files.length}`);
    console.log(`cwl holes:    ${res.holeCount}`);
    if (res.holeCount > 0) {
      console.log(`  (CWL projection holes — verify before production claims)`);
    }
    return 0;
  }
  const emitStrategy: {
    routeRegistration?: "lazy";
    handlerImportBarrel?: true;
    emitRoutePathConstants?: true;
    emitHandlerFingerprints?: true;
    runtimeFacadeModule?: true;
    emitSharedRuntimeImports?: true;
    emitDedupeIdenticalHandlerBodies?: true;
  } = {
    ...(routeReg.value === "lazy" ? { routeRegistration: "lazy" as const } : {}),
    ...(flags["emit-handler-import-barrel"] === true ? { handlerImportBarrel: true as const } : {}),
    ...(flags["emit-route-path-constants"] === true ? { emitRoutePathConstants: true as const } : {}),
    ...(flags["emit-handler-fingerprints"] === true ? { emitHandlerFingerprints: true as const } : {}),
    ...(flags["emit-runtime-facade"] === true ? { runtimeFacadeModule: true as const } : {}),
    ...(flags["emit-shared-runtime-imports"] === true ? { emitSharedRuntimeImports: true as const } : {}),
    ...(flags["emit-dedupe-identical-handler-bodies"] === true
      ? { emitDedupeIdenticalHandlerBodies: true as const }
      : {}),
  };
  const emitOpts = {
    module: mod,
    outDir: outAbs,
    provenanceRoot: resolve(root),
    ...(schemaReport ? { schemaReport } : {}),
    ...(domainMap ? { domainTypesByTable: domainMap } : {}),
    ...(Object.keys(emitStrategy).length > 0 ? { emitStrategy } : {}),
    ...(flags["emit-resume"] === true ? { emitResume: true as const } : {}),
  };
  const res =
    target === "fastify" ? await emitFastify(emitOpts) : await emitHono(emitOpts);
  console.log(`handlers:     ${res.handlerCount}`);
  console.log(`files:        ${res.files.length}`);
  console.log(`emit holes:   ${res.holes.length}`);
  for (const [h, effs] of Object.entries(res.effectsByHandler)) {
    console.log(`  ${h.padEnd(25)} effects: ${effs.join(", ") || "(none)"}`);
  }
  return 0;
}

async function cmdConvert(args: string[]): Promise<number> {
  // Same as `emit` for now; kept as a distinct verb because it will grow
  // more pipeline stages (observe → ingest → archaeology → emit → verify).
  return cmdEmit(args);
}

async function cmdObserve(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  if (!root) {
    console.error(
      "usage: chrysalis observe <php-project-dir> [--traces <dir>] [--port 8080] [--host 127.0.0.1]",
    );
    console.error(
      "  Optional chrysalis.observe.json in the project dir merges onto built-in default redaction (same path overrides kind).",
    );
    return 2;
  }
  const phpRoot = resolve(root);
  const traceDir = resolve(typeof flags.traces === "string" ? flags.traces : "traces");
  const port = typeof flags.port === "string" ? Number.parseInt(flags.port, 10) : 8080;
  const host = typeof flags.host === "string" ? flags.host : "127.0.0.1";

  // The prelude ships inside the repo at packages/oracle-php/src/bootstrap.php.
  // Resolve its path relative to this CLI's installation root.
  const thisFile = fileURLToPath(import.meta.url);
  const preludePath = resolve(thisFile, "..", "..", "..", "oracle-php", "src", "bootstrap.php");

  let redaction;
  try {
    redaction = loadObserveConfig(phpRoot);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    console.error(`[observe] ${m}`);
    return 2;
  }
  const observeJsonPath = join(phpRoot, "chrysalis.observe.json");
  const observeJson = existsSync(observeJsonPath);
  console.log(`[observe] php root:   ${phpRoot}`);
  console.log(`[observe] trace dir:  ${traceDir}`);
  console.log(`[observe] prelude:    ${preludePath}`);
  console.log(`[observe] listening:  http://${host}:${port}`);
  console.log(
    observeJson
      ? `[observe] redaction:  ${redaction.rules.length} rule(s) (defaults + chrysalis.observe.json)`
      : `[observe] redaction:  ${redaction.rules.length} rule(s) (built-in defaults only)`,
  );

  const handle = startObserver({
    phpRoot,
    traceDir,
    preludePath,
    redaction,
    host,
    port,
    onStdout: (s) => process.stdout.write(s),
    onStderr: (s) => process.stderr.write(s),
  });

  process.on("SIGINT", () => {
    console.log("\n[observe] shutting down...");
    void handle.stop();
  });

  const code = await handle.exited;
  return code;
}

async function cmdCorpus(args: string[]): Promise<number> {
  const pos = positional(args);
  const root = pos[0];
  if (!root) {
    console.error("usage: chrysalis corpus <traces-dir>");
    return 2;
  }
  const corpus = readCorpus({ root: resolve(root) });
  console.log(`traces: ${corpus.traces.length}`);
  const byRoute = new Map<string, number>();
  let outboundHttp = 0;
  let mailSend = 0;
  for (const t of corpus.traces) {
    for (const e of t.events) {
      if (e.type === "http.outbound") outboundHttp += 1;
      if (e.type === "mail.send") mailSend += 1;
    }
    const req = t.events.find((e) => e.type === "http.request");
    if (!req || req.type !== "http.request") continue;
    const key = `${req.method} ${req.path}`;
    byRoute.set(key, (byRoute.get(key) ?? 0) + 1);
  }
  for (const [route, count] of [...byRoute.entries()].sort()) {
    console.log(`  ${route.padEnd(30)} ${count}`);
  }
  if (outboundHttp > 0 || mailSend > 0) {
    console.log(`  side effects: http.outbound=${outboundHttp} mail.send=${mailSend}`);
  }
  return 0;
}

async function cmdCorpusMerge(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const outDir = typeof flags.out === "string" ? resolve(flags.out) : null;
  if (pos.length < 1 || !outDir) {
    console.error(
      "usage: chrysalis corpus-merge <traces-dir> [<traces-dir> ...] --out <merged-dir> [--on-duplicate error|skip] [--dedupe-trace-id off|skip] [--sample-modulo K --sample-remainder R] [--dry-run] [--json-out <file>]",
    );
    return 2;
  }
  const onDup = flags["on-duplicate"];
  if (onDup === true) {
    console.error("error: --on-duplicate requires a value: error or skip");
    return 2;
  }
  const policy =
    onDup === undefined || onDup === "error"
      ? "error"
      : onDup === "skip"
        ? "skip"
        : null;
  if (policy === null) {
    console.error("error: --on-duplicate must be error or skip");
    return 2;
  }
  const dedupeTraceIdRaw = flags["dedupe-trace-id"];
  if (dedupeTraceIdRaw === true) {
    console.error("error: --dedupe-trace-id requires a value: off or skip");
    return 2;
  }
  const dedupeTraceId =
    dedupeTraceIdRaw === undefined || dedupeTraceIdRaw === "off"
      ? "off"
      : dedupeTraceIdRaw === "skip"
        ? "skip"
        : null;
  if (dedupeTraceId === null) {
    console.error("error: --dedupe-trace-id must be off or skip");
    return 2;
  }
  const sampleModuloRaw = flags["sample-modulo"];
  const sampleRemainderRaw = flags["sample-remainder"];
  const dryRun = flags["dry-run"] === true;
  const jsonOutRaw = flags["json-out"];
  if (jsonOutRaw === true) {
    console.error("error: --json-out requires a file path");
    return 2;
  }
  const jsonOutPath = typeof jsonOutRaw === "string" ? resolve(jsonOutRaw) : null;
  let sampleModulo: number | undefined;
  let sampleRemainder: number | undefined;
  if (sampleModuloRaw !== undefined || sampleRemainderRaw !== undefined) {
    if (typeof sampleModuloRaw !== "string") {
      console.error("error: --sample-modulo requires an integer >= 1");
      return 2;
    }
    const m = Math.floor(Number.parseFloat(sampleModuloRaw));
    if (!Number.isFinite(m) || m < 1) {
      console.error("error: --sample-modulo must be a finite integer >= 1");
      return 2;
    }
    const r =
      typeof sampleRemainderRaw === "string"
        ? Math.floor(Number.parseFloat(sampleRemainderRaw))
        : 0;
    if (!Number.isFinite(r) || r < 0 || r >= m) {
      console.error(`error: --sample-remainder must satisfy 0 <= r < sample-modulo (got ${r}, ${m})`);
      return 2;
    }
    sampleModulo = m;
    sampleRemainder = r;
  }
  const sources = pos.map((p) => resolve(p));
  try {
    const r = mergeCorpusDirectories({
      sources,
      outDir,
      onDuplicate: policy,
      dedupeTraceId,
      ...(sampleModulo !== undefined ? { sampleModulo } : {}),
      ...(sampleRemainder !== undefined ? { sampleRemainder } : {}),
      ...(dryRun ? { dryRun: true } : {}),
    });
    console.log(
      `[corpus-merge] copied ${r.copiedFiles} trace file(s); skipped ${r.skippedDuplicates} duplicate path(s); skipped ${r.skippedTraceIdDuplicates} duplicate traceId(s); skipped ${r.skippedBySampling} by sampling`,
    );
    if (dryRun) {
      console.log("[corpus-merge] dry-run: no files written");
    }
    if (jsonOutPath !== null) {
      const toolVersion = readRootToolVersion();
      const payload = {
        kind: "chrysalis.corpus-merge.summary",
        schemaVersion: 1,
        toolVersion,
        generatedAt: new Date().toISOString(),
        options: {
          outDir,
          onDuplicate: policy,
          dedupeTraceId,
          dryRun,
          ...(sampleModulo !== undefined ? { sampleModulo } : {}),
          ...(sampleRemainder !== undefined ? { sampleRemainder } : {}),
        },
        sources,
        counts: r,
      } as const;
      mkdirSync(dirname(jsonOutPath), { recursive: true });
      writeFileSync(jsonOutPath, JSON.stringify(payload, null, 2), "utf8");
      console.log(`[corpus-merge] summary: ${jsonOutPath}`);
    }
  } catch (e) {
    console.error(`[corpus-merge] ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
  return 0;
}

async function cmdArchaeology(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const schemaPath = pos[0];
  if (!schemaPath) {
    console.error(
      "usage: chrysalis archaeology <schema.sql> [--traces <dir>] [--php-root <dir>] [--out <file>]",
    );
    return 2;
  }
  const tracesDir = typeof flags.traces === "string" ? flags.traces : null;
  const outPath = typeof flags.out === "string" ? flags.out : null;
  const phpRoots = collectPhpRootsFromArgs(args);

  const corpus = tracesDir ? readCorpus({ root: resolve(tracesDir) }) : null;
  const input: Parameters<typeof runArchaeology>[0] = {
    schemaPath: resolve(schemaPath),
    ...(corpus ? { corpus } : {}),
    ...(phpRoots.length > 0 ? { phpRoots } : {}),
  };
  const report = runArchaeology(input);

  console.log(
    `[archaeology] schema: ${schemaPath} → ${report.entities.length} entities` +
      (corpus ? ` (corpus: ${corpus.traces.length} traces)` : "") +
      (phpRoots.length ? ` (php scan: ${phpRoots.length} root(s))` : ""),
  );
  for (const e of report.entities) {
    const ddl = e.fields.filter((f) => f.kind !== "observed-only").length;
    const obs = e.fields.filter((f) => f.kind !== "ddl").length;
    console.log(
      `  ${e.typescriptName.padEnd(16)} table=${e.name.padEnd(12)} fields=${e.fields.length}  (ddl=${ddl}, observed=${obs}, statements=${e.observedStatementCount})`,
    );
  }
  if (report.unknownDdl.length > 0) {
    console.log(`  ⚠ unknown DDL fragments: ${report.unknownDdl.length}`);
  }
  if (report.orphanShapes.length > 0) {
    console.log(`  ⚠ orphan observed shapes: ${report.orphanShapes.length}`);
  }
  if (report.unattributedFormFields.length > 0) {
    console.log(`  ⚠ unattributed form fields: ${report.unattributedFormFields.length}`);
  }

  if (outPath) {
    const src = emitTypes(report);
    writeFileSync(resolve(outPath), src);
    console.log(`[archaeology] wrote ${outPath}`);
  }
  return 0;
}

async function cmdVerify(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const corpusRoot = pos[0];
  const baseUrl = typeof flags["base-url"] === "string" ? flags["base-url"] : null;
  if (!corpusRoot || !baseUrl) {
    console.error(
      "usage: chrysalis verify <traces-dir> --base-url <url> [--report <dir>] [--threshold 0.9] [--json-summary] [--no-recorded-sql] [--only-route \"METHOD /path\"] [--only-trace-id <id>] [--shard-index I --shard-count K] [--project <php-root>] [--ingest-cache <dir>] [--ingest-progress-file <path>] [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint] [--ingest-dedupe-structural-subgraphs] [--ingest-dedupe-structural-subgraphs-ignore-origin] [--parser-provider glayzzle|nikic] [--replay-concurrency N] [--disable-cookie-chain] [--replay-timeout-ms MS] [--replay-worker-threads]",
    );
    return 2;
  }
  const reportDir = typeof flags.report === "string" ? flags.report : "reports/verify";
  const threshold = typeof flags.threshold === "string" ? Number.parseFloat(flags.threshold) : 0.8;
  const projectRoot = typeof flags.project === "string" ? resolve(flags.project) : null;
  const parserProvider = parserProviderFromFlags(flags);
  if (parserProvider === null) return 2;
  const cacheOpts = ingestCacheDirFromFlags(flags);
  if (!cacheOpts.ok) {
    console.error(cacheOpts.message);
    return 2;
  }
  const progressOptsVerify = ingestProgressFileFromFlags(flags, { mode: "none" });
  if (!progressOptsVerify.ok) {
    console.error(progressOptsVerify.message);
    return 2;
  }
  const checkpointOptsVerify = ingestCheckpointFileFromFlags(flags, { mode: "none" });
  if (!checkpointOptsVerify.ok) {
    console.error(checkpointOptsVerify.message);
    return 2;
  }
  if (progressOptsVerify.ingestProgressFile !== undefined && !projectRoot) {
    console.error("error: --ingest-progress-file requires --project for verify");
    return 2;
  }
  if (checkpointOptsVerify.ingestCheckpointFile !== undefined && !projectRoot) {
    console.error("error: --ingest-checkpoint-file requires --project for verify");
    return 2;
  }
  const liftFlagCheckVerify = validateIngestLiftFlagsFromCli(flags);
  if (!liftFlagCheckVerify.ok) {
    console.error(liftFlagCheckVerify.message);
    return 1;
  }
  const jsonSummary = flags["json-summary"] === true;
  const vlog = jsonSummary ? (m: string) => console.error(m) : (m: string) => console.log(m);

  const corpus = readCorpus({ root: resolve(corpusRoot) });
  vlog(`[verify] loaded ${corpus.traces.length} traces from ${corpusRoot}`);
  let verifyModule: Module | undefined;
  if (projectRoot) {
    if (progressOptsVerify.ingestProgressFile !== undefined) {
      vlog(`[verify] ingest progress JSON: ${progressOptsVerify.ingestProgressFile}`);
    }
    if (checkpointOptsVerify.ingestCheckpointFile !== undefined) {
      vlog(`[verify] ingest checkpoint: ${checkpointOptsVerify.ingestCheckpointFile}${checkpointOptsVerify.ingestResumeFromCheckpoint === true ? " (resume)" : ""}`);
    }
    verifyModule = await ingestDirectory(projectRoot, {
      ...(parserProvider ? { parserProvider } : {}),
      ...(cacheOpts.ingestCacheDir !== undefined ? { ingestCacheDir: cacheOpts.ingestCacheDir } : {}),
      ...(progressOptsVerify.ingestProgressFile !== undefined
        ? { ingestProgressFile: progressOptsVerify.ingestProgressFile }
        : {}),
      ...(checkpointOptsVerify.ingestCheckpointFile !== undefined
        ? { ingestCheckpointFile: checkpointOptsVerify.ingestCheckpointFile }
        : {}),
      ...(checkpointOptsVerify.ingestResumeFromCheckpoint === true
        ? { ingestResumeFromCheckpoint: true as const }
        : {}),
      ...ingestLiftOptionsFromFlags(flags),
    });
    vlog(`[verify] IR divergence attribution enabled (--project ${projectRoot})`);
  }
  const replayParsed = resolveVerifyReplayExtras(flags);
  if (!replayParsed.ok) {
    console.error(replayParsed.message);
    return 2;
  }
  if (replayParsed.logHint) {
    vlog(`[verify] replay options: ${replayParsed.logHint}`);
  }
  vlog(`[verify] replaying against ${baseUrl} ...`);

  const onlyRoute = typeof flags["only-route"] === "string" ? flags["only-route"] : undefined;
  const onlyTraceId = typeof flags["only-trace-id"] === "string" ? flags["only-trace-id"] : undefined;
  if (onlyRoute) {
    vlog(`[verify] filter only-route: ${onlyRoute.trim()}`);
  }
  if (onlyTraceId) {
    vlog(`[verify] filter only-trace-id: ${onlyTraceId.trim()}`);
  }
  if (replayParsed.extras.shardCount !== undefined) {
    vlog(
      `[verify] shard ${replayParsed.extras.shardIndex ?? 0}/${replayParsed.extras.shardCount} (deterministic trace filter)`,
    );
  }

  let outcomes;
  try {
    outcomes = await replayCorpus(corpus, {
      baseUrl,
      recordedSqlReplay: flags["no-recorded-sql"] !== true,
      ...(verifyModule ? { module: verifyModule } : {}),
      ...(onlyRoute !== undefined && onlyRoute.trim() !== "" ? { onlyRoute: onlyRoute.trim() } : {}),
      ...(onlyTraceId !== undefined && onlyTraceId.trim() !== ""
        ? { onlyTraceId: onlyTraceId.trim() }
        : {}),
      ...replayParsed.extras,
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m.startsWith("replayCorpus: no traces matched")) {
      console.error(`[verify] ${m}`);
      return 2;
    }
    throw e;
  }
  const report = buildReport(outcomes);
  const reportDirResolved = resolve(reportDir);
  const summaryAbs = join(reportDirResolved, "summary.json");
  const written = writeReport(reportDirResolved, report, outcomes);
  vlog(`[verify] wrote ${written.length} report file(s) under ${reportDir}`);
  vlog(`[verify] summary: ${summaryAbs}`);

  const failedFrames = report.aggregate.framesTotal - report.aggregate.framesPassed;
  const hist = failedFrames > 0 ? divergenceKindHistogram(report) : [];

  if (!jsonSummary) {
    console.log("");
    console.log(`aggregate correctness: ${(report.aggregate.correctness * 100).toFixed(1)}%`);
    console.log(`frames passed:         ${report.aggregate.framesPassed} / ${report.aggregate.framesTotal}`);
    console.log("");
    console.log("per-endpoint:");
    for (const e of report.endpoints) {
      const pct = (e.correctness * 100).toFixed(1).padStart(5);
      const sim = e.avgBodySimilarity.toFixed(2);
      console.log(`  ${e.route.padEnd(25)} ${pct}%   body≈${sim}   (${e.framesPassed}/${e.framesTotal})`);
    }
  }
  if (failedFrames > 0 && !jsonSummary) {
    console.error("");
    console.error("[verify] stderr: failure diagnostics");
    console.error(`[verify]   failed frames: ${failedFrames}`);
    if (hist.length > 0) {
      console.error("[verify]   divergence kinds (failed traces):");
      for (const { kind, count } of hist) {
        console.error(`[verify]     ${kind.padEnd(22)} ${count}`);
      }
    }
    console.error("[verify]   next steps:");
    console.error(`[verify]     · open summary: ${summaryAbs}`);
    const absCorpus = resolve(corpusRoot);
    if (projectRoot) {
      const absProj = resolve(projectRoot);
      console.error(
        `[verify]     · repair (example): chrysalis repair ${absCorpus} --base-url ${baseUrl} --project ${absProj}`,
      );
    } else {
      console.error(
        "[verify]     · add --project <php-root> for IR node attribution on failures (same flag as verify)",
      );
    }
    console.error("");
    console.error("[verify] stderr: per-trace divergences");
    for (const e of report.endpoints) {
      for (const d of e.divergences) {
        console.error(`[verify]   ${e.route}  trace=${d.traceId}  kinds=${d.kinds.join(", ")}`);
        if (d.attributedNodeIds && d.attributedNodeIds.length > 0) {
          console.error(`[verify]     IR nodes: ${d.attributedNodeIds.join(", ")}`);
        }
        for (const detail of d.details) {
          console.error(`[verify]     · ${detail}`);
        }
      }
    }
  }

  const pass = report.aggregate.correctness + 1e-9 >= threshold;
  if (jsonSummary) {
    const toolVersion = readRootToolVersion();
    console.log(
      JSON.stringify({
        kind: "chrysalis.verify.summary",
        schemaVersion: 1,
        toolVersion,
        corpusRoot: resolve(corpusRoot),
        baseUrl,
        reportDir: reportDirResolved,
        summaryPath: summaryAbs,
        threshold,
        aggregate: report.aggregate,
        failedFrameCount: failedFrames,
        failedTraceCount: failedTraceCount(report),
        divergenceKinds: hist,
        endpoints: report.endpoints,
        pass,
      }),
    );
  }

  if (!pass) {
    console.error(
      `[verify] correctness ${report.aggregate.correctness.toFixed(3)} below threshold ${threshold}`,
    );
    console.error(`[verify] summary: ${summaryAbs}`);
    console.error("[verify] replay flags and CHRYSALIS_VERIFY_* env: packages/verify/README.md");
    return 1;
  }
  return 0;
}

function readRootToolVersion(): string {
  const repoRoot = resolve(fileURLToPath(import.meta.url), "..", "..", "..");
  let toolVersion = "0.0.0";
  try {
    const raw = readFileSync(join(repoRoot, "package.json"), "utf8");
    const j = JSON.parse(raw) as { version?: string };
    if (typeof j.version === "string" && j.version.length > 0) {
      toolVersion = j.version;
    }
  } catch {
    // keep default
  }
  return toolVersion;
}

async function cmdVerifyMerge(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  if (pos.length < 1) {
    console.error(
      "usage: chrysalis verify-merge <summary.json> [<summary.json> ...] [--shard-count K] [--json-out]",
    );
    console.error(
      "  Each file must match reports/verify/summary.json (CorrectnessReport). Shards must be disjoint.",
    );
    console.error(
      "  --shard-count defaults to the number of files (replay K when every shard wrote a report).",
    );
    return 2;
  }

  let metaShardCount = pos.length;
  if (typeof flags["shard-count"] === "string") {
    const k = Math.floor(Number.parseFloat(flags["shard-count"]));
    if (!Number.isFinite(k) || k < 1) {
      console.error("[verify-merge] error: --shard-count must be a finite integer >= 1");
      return 2;
    }
    metaShardCount = k;
  }

  const reports: CorrectnessReport[] = [];
  const paths: string[] = [];
  for (const p of pos) {
    const abs = resolve(p);
    if (!existsSync(abs)) {
      console.error(`[verify-merge] missing file: ${abs}`);
      return 2;
    }
    let raw: string;
    try {
      raw = readFileSync(abs, "utf8");
    } catch (e) {
      console.error(`[verify-merge] could not read ${abs}: ${e instanceof Error ? e.message : String(e)}`);
      return 2;
    }
    let j: unknown;
    try {
      j = JSON.parse(raw) as unknown;
    } catch (e) {
      console.error(
        `[verify-merge] invalid JSON in ${abs}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return 2;
    }
    if (
      typeof j !== "object" ||
      j === null ||
      typeof (j as CorrectnessReport).aggregate !== "object" ||
      (j as CorrectnessReport).aggregate === null ||
      !Array.isArray((j as CorrectnessReport).endpoints)
    ) {
      console.error(`[verify-merge] invalid summary shape (expected CorrectnessReport): ${abs}`);
      return 2;
    }
    reports.push(j as CorrectnessReport);
    paths.push(abs);
  }

  const merged = mergeCorrectnessReports(reports);
  const jsonOut = flags["json-out"] === true;
  if (jsonOut) {
    const toolVersion = readRootToolVersion();
    const inputs = paths.map((path, i) => ({
      path,
      shardIndex: i,
      report: reports[i]!,
    }));
    console.log(
      JSON.stringify(
        buildMergedVerifySummaryJson({
          toolVersion,
          shardCount: metaShardCount,
          inputs,
        }),
      ),
    );
  } else {
    console.log(JSON.stringify(merged, null, 2));
  }
  return 0;
}

function writeRepairModuleSnapshot(mod: Module, outPath: string, projectRoot: string): void {
  const abs = resolve(outPath);
  mkdirSync(dirname(abs), { recursive: true });
  const json = moduleToGoldenSnapshot(mod, { relativizeProjectRoot: projectRoot });
  writeFileSync(abs, json, "utf8");
}

async function cmdRepair(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const corpusRoot = pos[0];
  const baseUrl = typeof flags["base-url"] === "string" ? flags["base-url"] : null;
  const projectRoot = typeof flags.project === "string" ? resolve(flags.project) : null;
  if (!corpusRoot || !baseUrl || !projectRoot) {
    console.error(
      "usage: chrysalis repair <traces-dir> --base-url <url> --project <php-root> [--llm] [--repair-verbose] [--hole-patch <file.json>] [--write-module <webir.json>] [--max-iter 5] [--endpoint \"METHOD /path\"] [--no-recorded-sql] [--ingest-cache <dir>] [--ingest-progress-file <path>] [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint] [--ingest-dedupe-structural-subgraphs] [--ingest-dedupe-structural-subgraphs-ignore-origin] [--parser-provider glayzzle|nikic] [--replay-concurrency N] [--disable-cookie-chain] [--replay-timeout-ms MS] [--replay-worker-threads]",
    );
    return 2;
  }
  const useLlm = flags.llm === true;
  if (useLlm && !process.env.CHRYSALIS_REPAIR_LLM_API_KEY) {
    console.error("[repair] --llm requires CHRYSALIS_REPAIR_LLM_API_KEY");
    return 2;
  }
  const maxIterRaw =
    typeof flags["max-iter"] === "string" ? Number.parseInt(flags["max-iter"], 10) : 5;
  const maxIterations = Number.isFinite(maxIterRaw) && maxIterRaw > 0 ? maxIterRaw : 5;
  const endpoint = typeof flags.endpoint === "string" ? flags.endpoint : undefined;
  const repairVerbose = flags["repair-verbose"] === true;
  const holePatchPath =
    typeof flags["hole-patch"] === "string" ? resolve(flags["hole-patch"]) : null;
  const writeModulePath =
    typeof flags["write-module"] === "string" ? flags["write-module"] : null;
  const parserProvider = parserProviderFromFlags(flags);
  if (parserProvider === null) return 2;
  const cacheOpts = ingestCacheDirFromFlags(flags);
  if (!cacheOpts.ok) {
    console.error(cacheOpts.message);
    return 2;
  }
  const progressOptsRepair = ingestProgressFileFromFlags(flags, { mode: "none" });
  if (!progressOptsRepair.ok) {
    console.error(progressOptsRepair.message);
    return 2;
  }
  const checkpointOptsRepair = ingestCheckpointFileFromFlags(flags, { mode: "none" });
  if (!checkpointOptsRepair.ok) {
    console.error(checkpointOptsRepair.message);
    return 2;
  }
  const liftFlagCheckRepair = validateIngestLiftFlagsFromCli(flags);
  if (!liftFlagCheckRepair.ok) {
    console.error(liftFlagCheckRepair.message);
    return 1;
  }

  const replayParsed = resolveVerifyReplayExtras(flags);
  if (!replayParsed.ok) {
    console.error(replayParsed.message);
    return 2;
  }
  const repairReplayExtras = Object.fromEntries(
    Object.entries(replayParsed.extras).filter(([k]) => k !== "shardIndex" && k !== "shardCount"),
  ) as Partial<ReplayOptions>;
  if (replayParsed.logHint) {
    console.log(`[repair] replay options: ${replayParsed.logHint}`);
  }

  const corpus = readCorpus({ root: resolve(corpusRoot) });
  if (progressOptsRepair.ingestProgressFile !== undefined) {
    console.log(`[repair] ingest progress JSON: ${progressOptsRepair.ingestProgressFile}`);
  }
  if (checkpointOptsRepair.ingestCheckpointFile !== undefined) {
    console.log(
      `[repair] ingest checkpoint: ${checkpointOptsRepair.ingestCheckpointFile}${checkpointOptsRepair.ingestResumeFromCheckpoint === true ? " (resume)" : ""}`,
    );
  }
  const webirModule = await ingestDirectory(projectRoot, {
    ...(parserProvider ? { parserProvider } : {}),
    ...(cacheOpts.ingestCacheDir !== undefined ? { ingestCacheDir: cacheOpts.ingestCacheDir } : {}),
    ...(progressOptsRepair.ingestProgressFile !== undefined
      ? { ingestProgressFile: progressOptsRepair.ingestProgressFile }
      : {}),
    ...(checkpointOptsRepair.ingestCheckpointFile !== undefined
      ? { ingestCheckpointFile: checkpointOptsRepair.ingestCheckpointFile }
      : {}),
    ...(checkpointOptsRepair.ingestResumeFromCheckpoint === true
      ? { ingestResumeFromCheckpoint: true as const }
      : {}),
    ...ingestLiftOptionsFromFlags(flags),
  });
  console.log(`[repair] corpus ${corpus.traces.length} traces; IR from ${projectRoot}`);

  if (holePatchPath != null) {
    let patchText: string;
    try {
      patchText = readFileSync(holePatchPath, "utf8");
    } catch (e) {
      console.error(
        `[repair] cannot read --hole-patch ${holePatchPath}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return 2;
    }
    let closure;
    try {
      closure = parseHoleClosurePatchJson(patchText);
    } catch (e) {
      console.error(`[repair] invalid hole patch JSON: ${e instanceof Error ? e.message : String(e)}`);
      return 2;
    }
    console.log(`[repair] applying hole closure from ${holePatchPath}`);
    const holeResult = await applyHoleClosureAndVerify(
      webirModule,
      corpus,
      {
        baseUrl,
        recordedSqlReplay: flags["no-recorded-sql"] !== true,
        ...repairReplayExtras,
        workerThreads: false,
      },
      closure,
    );
    if (holeResult.ok) {
      console.log("[repair] hole closure accepted (full corpus replay passed)");
      if (writeModulePath != null) {
        writeRepairModuleSnapshot(holeResult.module, writeModulePath, projectRoot);
        console.log(`[repair] wrote WebIR snapshot to ${resolve(writeModulePath)}`);
      }
      return 0;
    }
    const bad = holeResult.outcomes.filter((o) => !o.ok);
    console.error(`[repair] hole closure rejected: ${bad.length} failing trace(s) after replay`);
    for (const o of bad.slice(0, 5)) {
      console.error(`  ${o.route} trace=${o.traceId}`);
    }
    console.error(
      "[repair] replay tuning flags (repair replays the full corpus; no --only-route / --only-trace-id / --shard-*): packages/verify/README.md",
    );
    return 1;
  }

  if (useLlm) {
    const model = process.env.CHRYSALIS_REPAIR_LLM_MODEL ?? "gpt-4o-mini";
    console.log(
      `[repair] HTTP chat repair proposer enabled (model ${model}); patches still require full-corpus replay`,
    );
  }

  const result = await runVerifiedRepairLoop({
    corpus,
    initialModule: webirModule,
    replayBase: {
      baseUrl,
      recordedSqlReplay: flags["no-recorded-sql"] !== true,
      ...repairReplayExtras,
      workerThreads: false,
    },
    proposer: useLlm
      ? createHttpChatRepairProposerFromEnv({ verbose: repairVerbose })
      : stubRepairProposer(),
    maxIterations,
    ...(endpoint !== undefined ? { endpoint } : {}),
  });

  if (result.ok) {
    console.log(`[repair] corpus verifies (${result.iterationsRun} repair iteration(s))`);
    if (writeModulePath != null) {
      writeRepairModuleSnapshot(result.module, writeModulePath, projectRoot);
      console.log(`[repair] wrote WebIR snapshot to ${resolve(writeModulePath)}`);
    }
    return 0;
  }

  const failed = result.finalOutcomes.filter((o) => !o.ok);
  console.error(`[repair] still failing: ${failed.length} trace(s)`);
  if (result.message) console.error(`[repair] ${result.message}`);
  for (const o of failed.slice(0, 5)) {
    console.error(`  ${o.route} trace=${o.traceId}`);
    if (o.attributedNodeIds?.length) {
      console.error(`    IR nodes: ${o.attributedNodeIds.join(", ")}`);
    }
  }
  if (useLlm) {
    console.error(
      "[repair] LLM proposer returned no verify-gated patch or exhausted iterations; see @chrysalis/repair.",
    );
  } else {
    console.error(
      "[repair] default proposer is a stub; pass --llm with CHRYSALIS_REPAIR_LLM_API_KEY or supply a custom RepairProposer.",
    );
  }
  console.error(
    "[repair] replay tuning flags (repair replays the full corpus; no --only-route / --only-trace-id): packages/verify/README.md",
  );
  return 1;
}

type ChimeraCliDeployMode = "legacy" | "cutover" | "shadow" | "canary";

interface ChimeraDeployMerged {
  readonly modeRaw: ChimeraCliDeployMode;
  readonly legacy: string;
  readonly modern: string;
  readonly host: string;
  readonly port: number;
  readonly rules: ReadonlyArray<RouteRule>;
  readonly shadowLogDir: string | undefined;
  readonly canary: CanarySettings | undefined;
}

function chimeraDeployHmacSecret(flags: Record<string, string | boolean>): string | undefined {
  const hmacFlag = flags["config-hmac-secret"];
  const hmacSecretEnv = process.env.CHRYSALIS_CHIMERA_CONFIG_HMAC_SECRET;
  if (typeof hmacFlag === "string" && hmacFlag.length > 0) return hmacFlag;
  if (typeof hmacSecretEnv === "string" && hmacSecretEnv.length > 0) return hmacSecretEnv;
  return undefined;
}

function chimeraDeployHmacParseOptions(
  flags: Record<string, string | boolean>,
): { ok: true; options: ParseChimeraDeployConfigOptions } | { ok: false; message: string } {
  const primary = chimeraDeployHmacSecret(flags);
  const prevRaw = process.env.CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS;
  let hmacPreviousSecrets: string[] | undefined;
  if (typeof prevRaw === "string" && prevRaw.trim().length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(prevRaw) as unknown;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        message: `CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS must be valid JSON array of strings (${msg})`,
      };
    }
    if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
      return {
        ok: false,
        message:
          "CHRYSALIS_CHIMERA_CONFIG_HMAC_PREVIOUS_SECRETS must be a JSON array of strings",
      };
    }
    hmacPreviousSecrets = parsed as string[];
  }

  const keysFromFlag =
    typeof flags["config-hmac-keys-json"] === "string" ? flags["config-hmac-keys-json"] : undefined;
  const keysFromEnv = process.env.CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON;
  const keysRaw =
    keysFromFlag !== undefined && keysFromFlag.trim().length > 0
      ? keysFromFlag
      : typeof keysFromEnv === "string" && keysFromEnv.trim().length > 0
        ? keysFromEnv
        : undefined;

  let hmacSecretsByKeyId: Record<string, string> | undefined;
  if (keysRaw !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(keysRaw) as unknown;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        message: `--config-hmac-keys-json / CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON must be valid JSON (${msg})`,
      };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ok: false,
        message:
          "--config-hmac-keys-json / CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON must be a JSON object (key id → secret string)",
      };
    }
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) m[k] = v;
    }
    if (Object.keys(m).length === 0) {
      return {
        ok: false,
        message:
          "--config-hmac-keys-json / CHRYSALIS_CHIMERA_CONFIG_HMAC_KEYS_JSON must contain at least one non-empty string value",
      };
    }
    hmacSecretsByKeyId = m;
  }

  const options: ParseChimeraDeployConfigOptions = {
    ...(primary !== undefined ? { hmacSecret: primary } : {}),
    ...(hmacPreviousSecrets !== undefined && hmacPreviousSecrets.length > 0
      ? { hmacPreviousSecrets }
      : {}),
    ...(hmacSecretsByKeyId !== undefined ? { hmacSecretsByKeyId } : {}),
  };
  return { ok: true, options };
}

function mergeChimeraDeployFlagsAndFile(
  flags: Record<string, string | boolean>,
  fileCfg: ChimeraDeployConfigFile,
):
  | { ok: true; merged: ChimeraDeployMerged }
  | { ok: false; message: string } {
  const modeRaw = (typeof flags.mode === "string" ? flags.mode : fileCfg.mode ?? "legacy") as ChimeraCliDeployMode;
  if (
    modeRaw !== "legacy" &&
    modeRaw !== "cutover" &&
    modeRaw !== "shadow" &&
    modeRaw !== "canary"
  ) {
    return {
      ok: false,
      message: `usage: chrysalis deploy --mode=legacy|cutover|shadow|canary\n  unknown mode: ${modeRaw}`,
    };
  }
  const legacy = typeof flags.legacy === "string" ? flags.legacy : fileCfg.legacy;
  const modern = typeof flags.modern === "string" ? flags.modern : fileCfg.modern;
  if (!legacy || !modern) {
    return {
      ok: false,
      message:
        "usage: chrysalis deploy --mode=<legacy|cutover|shadow|canary> --legacy <url> --modern <url>\n" +
        "                       [--port 8080] [--host 127.0.0.1]\n" +
        "                       [--config chimera.json] [--config-url <url>] [--config-hmac-secret <str>]\n" +
        "                       [--config-hmac-keys-json <json>]\n" +
        "                       [--operator-metrics-json <path>] [--operator-metrics-ndjson <path>]\n" +
        "                       [--operator-metrics-interval-ms <n>]\n" +
        "                       [--shadow-log-dir reports/shadow]\n" +
        "                       [--canary-percent 0-100] [--canary-salt <str>]\n" +
        "                       [--canary-cookie <name>] [--canary-header <name>]",
    };
  }
  const port =
    typeof flags.port === "string" ? Number.parseInt(flags.port, 10) : fileCfg.port ?? 8080;
  const host = typeof flags.host === "string" ? flags.host : fileCfg.host ?? "127.0.0.1";
  const rules: ReadonlyArray<RouteRule> = fileCfg.rules ?? [];
  const shadowLogDir =
    typeof flags["shadow-log-dir"] === "string" ? flags["shadow-log-dir"] : fileCfg.shadowLogDir;

  let canary: CanarySettings | undefined;
  if (modeRaw === "canary") {
    const pctFlag = flags["canary-percent"];
    const pctRaw =
      typeof pctFlag === "string" ? Number.parseFloat(pctFlag) : fileCfg.canary?.percentModern;
    if (pctRaw === undefined || Number.isNaN(pctRaw)) {
      return {
        ok: false,
        message:
          "error: canary mode requires --canary-percent <0-100> or config.canary.percentModern",
      };
    }
    const saltFlag = flags["canary-salt"];
    const salt =
      typeof saltFlag === "string" ? saltFlag : fileCfg.canary?.salt ?? "chrysalis-canary-v1";
    const cookieFlag = flags["canary-cookie"];
    const stickinessCookie =
      typeof cookieFlag === "string" ? cookieFlag : fileCfg.canary?.stickinessCookie;
    const headerFlag = flags["canary-header"];
    const stickinessHeader =
      typeof headerFlag === "string" ? headerFlag : fileCfg.canary?.stickinessHeader;
    canary = {
      percentModern: Math.min(100, Math.max(0, pctRaw)),
      salt,
      ...(stickinessCookie ? { stickinessCookie } : {}),
      ...(stickinessHeader ? { stickinessHeader } : {}),
    };
  }

  return {
    ok: true,
    merged: {
      modeRaw,
      legacy,
      modern,
      host,
      port,
      rules,
      shadowLogDir: typeof shadowLogDir === "string" ? shadowLogDir : undefined,
      canary,
    },
  };
}

function chimeraRoutingFieldsForSnapshot(
  merged: ChimeraDeployMerged,
  toolVersion?: string,
): Record<string, unknown> {
  return {
    mode: merged.modeRaw,
    legacy: merged.legacy,
    modern: merged.modern,
    host: merged.host,
    port: merged.port,
    rules: merged.rules,
    ...(merged.shadowLogDir !== undefined ? { shadowLogDir: merged.shadowLogDir } : {}),
    ...(merged.canary !== undefined ? { canary: merged.canary } : {}),
    ...(toolVersion !== undefined ? { toolVersion } : {}),
  };
}

async function cmdDeploy(args: string[]): Promise<number> {
  const flags = parseFlags(args);
  const configUrlFromFlag = typeof flags["config-url"] === "string" ? flags["config-url"] : null;
  const configUrlFromEnv = process.env.CHRYSALIS_CHIMERA_CONFIG_URL;
  const configUrl =
    (typeof configUrlFromFlag === "string" && configUrlFromFlag.length > 0 ? configUrlFromFlag : null) ??
    (typeof configUrlFromEnv === "string" && configUrlFromEnv.length > 0 ? configUrlFromEnv : null);
  const configPath = typeof flags.config === "string" ? resolve(flags.config) : null;
  if (configUrl && configPath) {
    console.error(
      "error: use only one of --config <file> or --config-url / CHRYSALIS_CHIMERA_CONFIG_URL",
    );
    return 2;
  }

  const hmacOptsResult = chimeraDeployHmacParseOptions(flags);
  if (!hmacOptsResult.ok) {
    console.error(`error: ${hmacOptsResult.message}`);
    return 2;
  }
  const hmacParseOpts = hmacOptsResult.options;

  const metricsJsonPath =
    typeof flags["operator-metrics-json"] === "string" && flags["operator-metrics-json"].length > 0
      ? resolve(flags["operator-metrics-json"])
      : undefined;
  const metricsNdjsonPath =
    typeof flags["operator-metrics-ndjson"] === "string" && flags["operator-metrics-ndjson"].length > 0
      ? resolve(flags["operator-metrics-ndjson"])
      : undefined;
  const metricsIntervalRaw = flags["operator-metrics-interval-ms"];
  let metricsIntervalMs = 10_000;
  if (typeof metricsIntervalRaw === "string") {
    const n = Number.parseInt(metricsIntervalRaw, 10);
    if (!Number.isFinite(n) || n < 1000) {
      console.error("error: --operator-metrics-interval-ms must be an integer >= 1000");
      return 2;
    }
    metricsIntervalMs = n;
  }
  const operatorMetricsEnabled = metricsJsonPath !== undefined || metricsNdjsonPath !== undefined;

  const instanceId =
    typeof process.env.CHRYSALIS_CHIMERA_INSTANCE_ID === "string" &&
    process.env.CHRYSALIS_CHIMERA_INSTANCE_ID.length > 0
      ? process.env.CHRYSALIS_CHIMERA_INSTANCE_ID
      : `${hostname()}:${process.pid}`;

  let lastMerged: ChimeraDeployMerged | undefined;
  let lastToolVersion: string | undefined;
  let lastConfigLabel = "";

  async function loadConfigText(): Promise<
    { ok: true; text: string; label: string } | { ok: false; message: string }
  > {
    if (configUrl) {
      try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 30_000);
        const res = await fetch(configUrl, { redirect: "manual", signal: ac.signal });
        clearTimeout(to);
        if (!res.ok) {
          return { ok: false, message: `config-url ${configUrl}: HTTP ${res.status}` };
        }
        return { ok: true, text: await res.text(), label: configUrl };
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        return { ok: false, message: `config-url ${configUrl}: ${m}` };
      }
    }
    if (configPath) {
      return { ok: true, text: readFileSync(configPath, "utf8"), label: configPath };
    }
    return { ok: true, text: "{}", label: "(flags only)" };
  }

  let statsTimer: ReturnType<typeof setInterval> | undefined;
  let handle: ChimeraHandle | undefined;
  let modeRawForStats: ChimeraCliDeployMode = "legacy";
  let reloadBusy = false;
  const tickIntervalMs = operatorMetricsEnabled ? metricsIntervalMs : 10_000;

  const stopServerAndTimer = async (): Promise<void> => {
    if (statsTimer !== undefined) {
      clearInterval(statsTimer);
      statsTimer = undefined;
    }
    if (handle !== undefined) {
      await handle.stop();
      handle = undefined;
    }
  };

  const printStats = (): void => {
    if (!handle) return;
    const s = handle.stats();
    const sh = s.shadow;
    let line =
      `[deploy] stats  total=${s.total}  legacy=${s.byTarget.legacy}  modern=${s.byTarget.modern}  ` +
      `shadow(req=${sh.requests} agreed=${sh.agreed} diverged=${sh.diverged} lines=${sh.divergenceLines} mirrorErr=${sh.mirrorErrors})`;
    if (modeRawForStats === "canary") {
      const c = s.canary;
      line += `  canary(modernRule=${c.modernRuleMatches} servedModern=${c.servedModern} legacyDespiteModern=${c.servedLegacyWhileModernRule} noRule=${c.noModernRule})`;
    }
    console.log(line);
  };

  const writeOperatorMetricsFiles = (): void => {
    if (!operatorMetricsEnabled || !handle || lastMerged === undefined) return;
    try {
      const snap = buildChimeraOperatorSnapshot({
        wallTimeIso: new Date().toISOString(),
        instanceId,
        configLabel: lastConfigLabel,
        routingFields: chimeraRoutingFieldsForSnapshot(lastMerged, lastToolVersion),
        ...(lastToolVersion !== undefined ? { toolVersion: lastToolVersion } : {}),
        stats: handle.stats(),
      });
      const compact = JSON.stringify(snap);
      const pretty = `${JSON.stringify(snap, null, 2)}\n`;
      if (metricsJsonPath !== undefined) writeFileSync(metricsJsonPath, pretty, "utf8");
      if (metricsNdjsonPath !== undefined) appendFileSync(metricsNdjsonPath, `${compact}\n`, "utf8");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      console.error(`[deploy] operator metrics write failed: ${m}`);
    }
  };

  const tickDeploy = (): void => {
    printStats();
    writeOperatorMetricsFiles();
  };

  async function applyMerged(
    merged: ChimeraDeployMerged,
    logBanner: boolean,
    context: { configLabel: string; toolVersion?: string },
  ): Promise<void> {
    lastMerged = merged;
    lastToolVersion = context.toolVersion;
    lastConfigLabel = context.configLabel;
    if (logBanner) {
      console.log(`[deploy] mode:       ${merged.modeRaw}`);
      console.log(`[deploy] legacy:     ${merged.legacy}`);
      console.log(`[deploy] modern:     ${merged.modern}`);
      console.log(`[deploy] listening:  http://${merged.host}:${merged.port}`);
      console.log(`[deploy] rules:      ${merged.rules.length}`);
      if (merged.shadowLogDir) console.log(`[deploy] shadow log: ${merged.shadowLogDir}`);
      if (merged.canary) {
        console.log(
          `[deploy] canary:     ${merged.canary.percentModern}% modern (salt len=${merged.canary.salt.length})`,
        );
        if (merged.canary.stickinessCookie)
          console.log(`[deploy] canary cookie: ${merged.canary.stickinessCookie}`);
        if (merged.canary.stickinessHeader)
          console.log(`[deploy] canary header: ${merged.canary.stickinessHeader}`);
      }
    }
    await stopServerAndTimer();
    handle = await startChimera({
      mode: merged.modeRaw,
      legacy: merged.legacy,
      modern: merged.modern,
      rules: merged.rules,
      host: merged.host,
      port: merged.port,
      ...(merged.shadowLogDir ? { shadowLogDir: resolve(merged.shadowLogDir) } : {}),
      ...(merged.canary ? { canary: merged.canary } : {}),
    });
    modeRawForStats = merged.modeRaw;
    statsTimer = setInterval(tickDeploy, tickIntervalMs);
  }

  async function reloadFromSignal(): Promise<void> {
    if (reloadBusy) return;
    reloadBusy = true;
    try {
      console.log("[deploy] reloading configuration (SIGHUP/SIGUSR2)...");
      const loaded = await loadConfigText();
      if (!loaded.ok) {
        console.error(`[deploy] reload skipped: ${loaded.message}`);
        return;
      }
      const parsed = parseChimeraDeployConfigJson(loaded.text, loaded.label, hmacParseOpts);
      if (!parsed.ok) {
        console.error(`[deploy] reload skipped: ${parsed.message}`);
        return;
      }
      const mergedResult = mergeChimeraDeployFlagsAndFile(flags, parsed.value);
      if (!mergedResult.ok) {
        console.error(`[deploy] reload skipped: ${mergedResult.message}`);
        return;
      }
      await applyMerged(mergedResult.merged, false, {
        configLabel: loaded.label,
        ...(parsed.value.toolVersion !== undefined
          ? { toolVersion: parsed.value.toolVersion }
          : {}),
      });
      console.log("[deploy] reload complete.");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      console.error(`[deploy] reload failed: ${m}`);
    } finally {
      reloadBusy = false;
    }
  }

  const loaded0 = await loadConfigText();
  if (!loaded0.ok) {
    console.error(`[deploy] ${loaded0.message}`);
    return 2;
  }
  const parsed0 = parseChimeraDeployConfigJson(loaded0.text, loaded0.label, hmacParseOpts);
  if (!parsed0.ok) {
    console.error(parsed0.message);
    return 2;
  }
  const merged0 = mergeChimeraDeployFlagsAndFile(flags, parsed0.value);
  if (!merged0.ok) {
    console.error(merged0.message);
    return 2;
  }

  try {
    await applyMerged(merged0.merged, true, {
      configLabel: loaded0.label,
      ...(parsed0.value.toolVersion !== undefined ? { toolVersion: parsed0.value.toolVersion } : {}),
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    console.error(`[deploy] failed to start: ${m}`);
    return 2;
  }

  process.on("SIGHUP", () => {
    void reloadFromSignal();
  });
  process.on("SIGUSR2", () => {
    void reloadFromSignal();
  });

  const shutdown = async (): Promise<void> => {
    console.log("\n[deploy] shutting down...");
    tickDeploy();
    await stopServerAndTimer();
  };
  process.on("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().then(() => process.exit(0));
  });

  await new Promise<void>(() => {});
  return 0;
}

async function cmdInsight(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  if (!root) {
    console.error(
      "usage: chrysalis insight <php-project-dir>\n" +
        "                         [--traces <dir>] [--out <report.json>]\n" +
        "                         [--only raw-sql-concat,unescaped-output,n-plus-one-queries,scattered-validation,string-dispatch]\n" +
        "                         [--ingest-cache <dir>]\n" +
        "                         [--ingest-progress-file <path>]\n" +
        "                         [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint]\n" +
        "                         [--ingest-dedupe-structural-subgraphs] [--ingest-dedupe-structural-subgraphs-ignore-origin] [--ingest-lift-shared-helpers] [--ingest-lift-shared-helpers-semantic] [--ingest-embed-shared-helper-bodies]\n" +
        "                         [--parser-provider glayzzle|nikic]\n" +
        "                         [--json]",
    );
    return 2;
  }
  const parserProvider = parserProviderFromFlags(flags);
  if (parserProvider === null) return 2;
  const cacheOpts = ingestCacheDirFromFlags(flags);
  if (!cacheOpts.ok) {
    console.error(cacheOpts.message);
    return 2;
  }
  const progressOptsInsight = ingestProgressFileFromFlags(flags, { mode: "none" });
  if (!progressOptsInsight.ok) {
    console.error(progressOptsInsight.message);
    return 2;
  }
  const checkpointOptsInsight = ingestCheckpointFileFromFlags(flags, { mode: "none" });
  if (!checkpointOptsInsight.ok) {
    console.error(checkpointOptsInsight.message);
    return 2;
  }
  const liftFlagCheckInsight = validateIngestLiftFlagsFromCli(flags);
  if (!liftFlagCheckInsight.ok) {
    console.error(liftFlagCheckInsight.message);
    return 1;
  }

  const mod = await ingestDirectory(resolve(root), {
    ...(parserProvider ? { parserProvider } : {}),
    ...(cacheOpts.ingestCacheDir !== undefined ? { ingestCacheDir: cacheOpts.ingestCacheDir } : {}),
    ...(progressOptsInsight.ingestProgressFile !== undefined
      ? { ingestProgressFile: progressOptsInsight.ingestProgressFile }
      : {}),
    ...(checkpointOptsInsight.ingestCheckpointFile !== undefined
      ? { ingestCheckpointFile: checkpointOptsInsight.ingestCheckpointFile }
      : {}),
    ...(checkpointOptsInsight.ingestResumeFromCheckpoint === true
      ? { ingestResumeFromCheckpoint: true as const }
      : {}),
    ...ingestLiftOptionsFromFlags(flags),
  });

  const tracesDir = typeof flags.traces === "string" ? resolve(flags.traces) : null;
  let corpus: ReturnType<typeof readCorpus> | null = null;
  if (tracesDir && existsSync(tracesDir)) {
    try {
      corpus = readCorpus({ root: tracesDir });
    } catch (err) {
      console.error(`[insight] could not read corpus at ${tracesDir}: ${String(err)}`);
    }
  }

  const only = typeof flags.only === "string" ? parseOnly(flags.only) : null;

  const report = analyzeModule(mod, {
    ...(corpus ? { corpus } : {}),
    ...(only ? { only } : {}),
  });

  const outPath = typeof flags.out === "string" ? resolve(flags.out) : null;
  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`[insight] report written to ${outPath}`);
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  renderInsightReport(report);

  const strict = flags.strict === true || flags.strict === "true";
  if (strict && report.opportunities.length > 0) {
    return 1;
  }
  return 0;
}

function npmInstallEmitted(outDir: string): void {
  const r = spawnSync("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: outDir,
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
  });
  if (r.status !== 0) {
    const detail = (r.stderr || r.stdout || "").toString().trim();
    throw new Error(
      `npm install failed in ${outDir}${detail ? `: ${detail}` : ""}`,
    );
  }
}

type EmitTarget = "hono" | "fastify" | "runtime-cwl";

async function loadEmittedFetch(
  outDir: string,
  target: EmitTarget,
): Promise<typeof fetch> {
  const { tsImport } = await import("tsx/esm/api");
  const abs = resolve(outDir);
  const parentURL = pathToFileURL(join(abs, "package.json")).href;
  if (target === "hono") {
    const imported = (await tsImport("./src/server.ts", parentURL)) as {
      app: { fetch: typeof fetch };
      chrysalisInProcessFetch?: (url: string, init?: RequestInit) => Promise<Response>;
    };
    if (typeof imported.chrysalisInProcessFetch === "function") {
      return imported.chrysalisInProcessFetch.bind(imported) as typeof fetch;
    }
    return imported.app.fetch.bind(imported.app) as typeof fetch;
  }
  const imported = (await tsImport("./src/server.ts", parentURL)) as {
    fetch: typeof fetch;
  };
  return imported.fetch;
}

function emitDirForBackend(
  baseOut: string,
  backend: EmitTarget,
  backends: ReadonlyArray<EmitTarget>,
): string {
  if (backend === "hono") return resolve(baseOut);
  if (backends.length === 1 && backends[0] === "fastify") return resolve(baseOut);
  return resolve(`${baseOut}-fastify`);
}

/** Comma-separated `hono`, `fastify`; default `[fallback]`. */
function parseHttpReplayBackends(
  raw: string | boolean | undefined,
  fallback: EmitTarget,
): EmitTarget[] | null {
  if (raw === undefined || typeof raw === "boolean") {
    return [fallback];
  }
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return [fallback];
  const out: EmitTarget[] = [];
  for (const p of parts) {
    if (p !== "hono" && p !== "fastify") {
      console.error(
        `error: --http-replay-backends entries must be hono and/or fastify (got '${p}')`,
      );
      return null;
    }
    const t = p as EmitTarget;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

async function cmdRewrite(args: string[]): Promise<number> {
  const pos = positional(args);
  const flags = parseFlags(args);
  const root = pos[0];
  const outDir = typeof flags.out === "string" ? flags.out : null;
  const emitTarget: EmitTarget =
    typeof flags.target === "string" && flags.target === "fastify" ? "fastify" : "hono";
  if (typeof flags.target === "string" && flags.target !== "hono" && flags.target !== "fastify") {
    console.error(`error: unsupported --target '${flags.target}'. Supported: hono, fastify`);
    return 2;
  }
  if (!root) {
    console.error(
      "usage: chrysalis rewrite <php-project-dir> [--out <ts-out>]\n" +
        "                         [--target=hono|fastify]\n" +
        "                         [--traces <dir>] [--min-confidence 0.75]\n" +
        "                         [--passes sanitize-output,parameterize-sql,boundary-zod,dispatch-union-zod,batch-n1-read,...]\n" +
        "                         [--report <rewrite.json>]\n" +
        "                         [--no-post-verify] [--verify-behavior]\n" +
        "                         [--http-replay <traces-dir>] [--http-replay-backends=hono,fastify]\n" +
        "                         [--http-replay-skip-install]\n" +
        "                         [--ingest-cache <dir>]\n" +
        "                         [--ingest-checkpoint-file <path>] [--ingest-resume-checkpoint]\n" +
        "                         [--ingest-dedupe-structural-subgraphs] [--ingest-dedupe-structural-subgraphs-ignore-origin] [--ingest-lift-shared-helpers] [--ingest-lift-shared-helpers-semantic] [--ingest-embed-shared-helper-bodies]\n" +
        "                         [--parser-provider glayzzle|nikic]\n" +
        "                         [--json]",
    );
    return 2;
  }
  const rootAbs = resolve(root);
  const parserProvider = parserProviderFromFlags(flags);
  if (parserProvider === null) return 2;
  const cacheOpts = ingestCacheDirFromFlags(flags);
  if (!cacheOpts.ok) {
    console.error(cacheOpts.message);
    return 2;
  }
  const checkpointOptsRewrite = ingestCheckpointFileFromFlags(flags, { mode: "none" });
  if (!checkpointOptsRewrite.ok) {
    console.error(checkpointOptsRewrite.message);
    return 2;
  }
  const liftFlagCheckRewrite = validateIngestLiftFlagsFromCli(flags);
  if (!liftFlagCheckRewrite.ok) {
    console.error(liftFlagCheckRewrite.message);
    return 1;
  }

  const httpReplayRoot =
    typeof flags["http-replay"] === "string" ? resolve(flags["http-replay"]) : null;
  if (httpReplayRoot && !outDir) {
    console.error("error: --http-replay requires --out (emit directory for the generated app)");
    return 2;
  }

  const mod = await ingestDirectory(rootAbs, {
    ...(parserProvider ? { parserProvider } : {}),
    ...(cacheOpts.ingestCacheDir !== undefined ? { ingestCacheDir: cacheOpts.ingestCacheDir } : {}),
    ...(checkpointOptsRewrite.ingestCheckpointFile !== undefined
      ? { ingestCheckpointFile: checkpointOptsRewrite.ingestCheckpointFile }
      : {}),
    ...(checkpointOptsRewrite.ingestResumeFromCheckpoint === true
      ? { ingestResumeFromCheckpoint: true as const }
      : {}),
    ...ingestLiftOptionsFromFlags(flags),
  });

  const tracesDir = typeof flags.traces === "string" ? resolve(flags.traces) : null;
  let corpus: ReturnType<typeof readCorpus> | null = null;
  if (tracesDir && existsSync(tracesDir)) {
    try {
      corpus = readCorpus({ root: tracesDir });
    } catch (err) {
      console.error(`[rewrite] could not read corpus at ${tracesDir}: ${String(err)}`);
    }
  }

  let replayCorpusForHttp: ReturnType<typeof readCorpus> | null = null;
  if (httpReplayRoot) {
    if (!existsSync(httpReplayRoot)) {
      console.error(`error: --http-replay directory not found: ${httpReplayRoot}`);
      return 2;
    }
    try {
      replayCorpusForHttp = readCorpus({ root: httpReplayRoot });
    } catch (err) {
      console.error(`[rewrite] could not read http-replay corpus: ${String(err)}`);
      return 2;
    }
  }

  const insight = analyzeModule(mod, { ...(corpus ? { corpus } : {}) });

  const minConfidence =
    typeof flags["min-confidence"] === "string"
      ? Number.parseFloat(flags["min-confidence"])
      : 0.75;
  const passIds =
    typeof flags.passes === "string"
      ? flags.passes.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

  // Post-verify defaults ON: it re-runs each applied opportunity's
  // recognizer on the rewritten module and rolls back the batch if
  // any applied rewrite didn't actually fix its finding. Cheap and
  // directly user-visible; users can disable with `--no-post-verify`
  // if they want to inspect a partial / broken rewrite.
  const postVerifyEnabled = flags["no-post-verify"] !== true;
  // behavior-verify runs the in-process IR simulator against
  // synthesized probe inputs on both pre and post modules and rolls
  // back on unexplained divergence. Opt-in for now because the
  // simulator only covers a subset of ops; it abstains on unknown
  // ops, so false-positive rollbacks are unlikely but the gate is
  // loud by design.
  const behaviorVerifyEnabled = flags["verify-behavior"] === true;
  const httpReplaySkipInstall = flags["http-replay-skip-install"] === true;
  const httpReplayTargets = httpReplayRoot
    ? parseHttpReplayBackends(flags["http-replay-backends"], emitTarget)
    : null;
  if (httpReplayRoot && httpReplayTargets === null) {
    return 2;
  }

  const rewriteOptsBase = {
    minConfidence,
    ...(passIds ? { only: passIds } : {}),
    ...(postVerifyEnabled ? { postVerifyRecognizers: DEFAULT_RECOGNIZERS } : {}),
    ...(behaviorVerifyEnabled ? { behaviorVerify: true } : {}),
  };

  const outAbs = outDir ? resolve(outDir) : "";
  const useHttpReplay = replayCorpusForHttp !== null && outDir !== null;

  let emittedForHttpReplay = false;
  let result: RewriteResult;

  if (useHttpReplay) {
    const backends = httpReplayTargets!;
    try {
      result = await applyRewritesAsync(mod, insight.opportunities, DEFAULT_PASSES, {
        ...rewriteOptsBase,
        httpReplay: {
          corpus: replayCorpusForHttp!,
          baseUrl: "http://127.0.0.1",
          resolveFetches: backends.map((t) => ({
            label: t,
            resolveFetch: async (rewritten) => {
              const dir = emitDirForBackend(outAbs, t, backends);
              if (t === "fastify") {
                await emitFastify({ module: rewritten, outDir: dir, provenanceRoot: rootAbs });
              } else {
                await emitHono({ module: rewritten, outDir: dir, provenanceRoot: rootAbs });
              }
              emittedForHttpReplay = true;
              if (!httpReplaySkipInstall) {
                npmInstallEmitted(dir);
              }
              return loadEmittedFetch(dir, t);
            },
          })),
        },
      });
    } catch (err) {
      console.error(`[rewrite] http-replay pipeline failed: ${String(err)}`);
      return 1;
    }
    if (result.report.httpReplayVerify && !result.report.httpReplayVerify.ok) {
      try {
        for (const t of backends) {
          const dir = emitDirForBackend(outAbs, t, backends);
          if (t === "fastify") {
            await emitFastify({ module: result.module, outDir: dir, provenanceRoot: rootAbs });
          } else {
            await emitHono({ module: result.module, outDir: dir, provenanceRoot: rootAbs });
          }
        }
      } catch (revertErr) {
        console.error(
          `[rewrite] could not re-emit rolled-back module: ${String(revertErr)}`,
        );
      }
    }
  } else {
    result = applyRewrites(mod, insight.opportunities, DEFAULT_PASSES, rewriteOptsBase);
  }

  const reportPath = typeof flags.report === "string" ? resolve(flags.report) : null;
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(result.report, null, 2), "utf8");
    console.log(`[rewrite] report written to ${reportPath}`);
  }

  if (outDir && !emittedForHttpReplay) {
    const emitRes =
      emitTarget === "fastify"
        ? await emitFastify({ module: result.module, outDir: outAbs, provenanceRoot: rootAbs })
        : await emitHono({ module: result.module, outDir: outAbs, provenanceRoot: rootAbs });
    console.log(`[rewrite] emitted ${emitRes.files.length} file(s) to ${outAbs}`);
  } else if (emittedForHttpReplay) {
    console.log(`[rewrite] emitted (during http-replay) to ${outAbs}`);
  }

  if (flags.json) {
    console.log(JSON.stringify({ report: result.report }, null, 2));
    return 0;
  }

  renderRewriteReport(result.report, minConfidence);
  return 0;
}

function renderRewriteReport(report: RewriteReport, minConfidence: number): void {
  console.log(`chrysalis rewrite — ${report.sourceApp}`);
  console.log("─".repeat(48));
  console.log(`min-confidence : ${minConfidence.toFixed(2)}`);
  console.log(
    `considered     : ${report.summary.considered} opportunity(ies)`,
  );
  console.log(
    `applied        : ${report.summary.applied}   skipped: ${report.summary.skipped}`,
  );
  for (const [pass, n] of Object.entries(report.summary.byPass)) {
    console.log(`  - ${pass.padEnd(26)} ${n}`);
  }
  if (report.applied.length > 0) {
    console.log("\napplied:");
    for (const a of report.applied) {
      console.log(`  ✓ ${a.pass}  on  ${a.opportunity}   (edits=${a.editCount})`);
    }
  }
  if (report.skipped.length > 0) {
    console.log("\nskipped:");
    for (const s of report.skipped) {
      console.log(`  · ${s.pass}  on  ${s.opportunity}   (${s.reason})`);
    }
  }
  if (report.postVerify) {
    const pv = report.postVerify;
    console.log(
      `\npost-verify    : ${pv.ok ? "ok" : "FAILED"}   ` +
        `(recognizers re-run: ${pv.recognizersRun.join(", ") || "none"})`,
    );
    if (!pv.ok) {
      for (const f of pv.failures) {
        console.log(`  ✗ ${f.pass} on ${f.opportunity} — ${f.detail}`);
      }
      console.log("(batch rolled back — no rewrites committed to module)");
    }
  }
  if (report.behaviorVerify) {
    const bv = report.behaviorVerify;
    console.log(
      `\nbehavior-verify: ${bv.ok ? "ok" : "FAILED"}   ` +
        `(probes=${bv.probesRun} routes=${bv.routesCovered} abstained=${bv.abstained})`,
    );
    if (!bv.ok) {
      for (const d of bv.divergences) {
        console.log(`  ✗ ${d.route} ${d.probe} [${d.kind}] — ${d.detail}`);
        console.log(`      expected: ${d.expected}`);
        console.log(`      actual  : ${d.post}`);
      }
      console.log("(batch rolled back — behavioral regression detected)");
    }
  }
  if (report.httpReplayVerify) {
    const hr = report.httpReplayVerify;
    if (hr.backends && hr.backends.length > 1) {
      for (const b of hr.backends) {
        const n = b.outcomes.length;
        const passed = b.outcomes.filter((o) => o.ok).length;
        console.log(
          `\nhttp-replay (${b.label}) : ${b.ok ? "ok" : "FAILED"}   ` +
            `(frames ${passed}/${n}${b.failedRoutes.length ? `; failed: ${b.failedRoutes.join(", ")}` : ""})`,
        );
        if (!b.ok) {
          for (const o of b.outcomes) {
            if (o.ok) continue;
            console.log(
              `  ✗ ${o.route} — ${o.diff.divergences.map((d) => d.kind).join(", ") || "divergence"}`,
            );
          }
        }
      }
      if (!hr.ok) {
        console.log("(batch rolled back — HTTP replay diverged from corpus)");
      }
    } else {
      const n = hr.outcomes.length;
      const passed = hr.outcomes.filter((o) => o.ok).length;
      console.log(
        `\nhttp-replay    : ${hr.ok ? "ok" : "FAILED"}   ` +
          `(frames ${passed}/${n}${hr.failedRoutes.length ? `; failed: ${hr.failedRoutes.join(", ")}` : ""})`,
      );
      if (!hr.ok) {
        for (const o of hr.outcomes) {
          if (o.ok) continue;
          console.log(
            `  ✗ ${o.route} — ${o.diff.divergences.map((d) => d.kind).join(", ") || "divergence"}`,
          );
        }
        console.log("(batch rolled back — HTTP replay diverged from corpus)");
      }
    }
  }
}

function parseOnly(raw: string): ReadonlyArray<RecognizerId> {
  const known = new Set<RecognizerId>(DEFAULT_RECOGNIZERS.map((r) => r.id));
  const out: RecognizerId[] = [];
  for (const tok of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (known.has(tok as RecognizerId)) out.push(tok as RecognizerId);
    else console.error(`[insight] unknown recognizer: ${tok}`);
  }
  return out;
}

function renderInsightReport(report: InsightReport): void {
  console.log(`chrysalis insight — ${report.sourceApp}`);
  console.log("─".repeat(48));
  console.log(`recognizers  : ${report.recognizers.join(", ")}`);
  console.log(
    `opportunities: ${report.summary.total}  ` +
      `(strong=${report.summary.bySeverity.strong} ` +
      `suggestion=${report.summary.bySeverity.suggestion} ` +
      `info=${report.summary.bySeverity.info})`,
  );
  for (const [rec, n] of Object.entries(report.summary.byRecognizer)) {
    console.log(`  - ${rec.padEnd(26)} ${n}`);
  }
  if (report.opportunities.length === 0) {
    console.log("\nno opportunities found.");
    return;
  }
  console.log("");
  const sorted = [...report.opportunities].sort(
    (a, b) => severityRank(b) - severityRank(a) || b.confidence - a.confidence,
  );
  for (const op of sorted) {
    const where = op.route ? `${op.route.method} ${op.route.path}` : "(unscoped)";
    const origin = renderLocator(op.origin);
    console.log(
      `• [${op.severity.toUpperCase()} ${(op.confidence * 100).toFixed(0)}%] ${op.title}`,
    );
    console.log(`    at ${where}   ${origin}`);
    console.log(`    why: ${op.rationale}`);
    console.log(`    fix: ${op.proposedLift.kind} — ${op.proposedLift.sketch}`);
    if (op.proposedLift.requires?.length) {
      console.log(`    requires: ${op.proposedLift.requires.join(", ")}`);
    }
    const corpusConf = op.evidence["corpusConfirmations"];
    if (typeof corpusConf === "number" && corpusConf > 0) {
      console.log(
        `    corpus:   ${corpusConf} trace(s), up to ${op.evidence["observedMaxPerRequest"]} firings/req`,
      );
    }
    console.log("");
  }
}

function severityRank(op: Opportunity): number {
  switch (op.severity) {
    case "strong":
      return 3;
    case "suggestion":
      return 2;
    case "info":
      return 1;
  }
}

function renderLocator(l: Opportunity["origin"]): string {
  switch (l.kind) {
    case "php":
      return `${l.file}:${l.line}`;
    case "db":
      return `db:${l.table}${l.column ? `.${l.column}` : ""}`;
    case "form":
      return `form:${l.file}#${l.fieldName}`;
    case "trace":
      return `trace:${l.corpusId}/${l.frameId}`;
    case "synthetic":
      return `synthetic:${l.reason}`;
  }
}

interface StatusCorrectnessBackend {
  readonly label: string;
  readonly aggregate: number;
  readonly framesPassed: number;
  readonly framesTotal: number;
  readonly perRoute: Array<{ route: string; correctness: number }>;
}

interface StatusSummary {
  readonly corpus: {
    traces: number;
    routes: number;
    /** D32: `http.outbound` events summed across all traces. */
    httpOutbound?: number;
    /** D32: `mail.send` events summed across all traces. */
    mailSend?: number;
  } | null;
  readonly correctness: {
    /** Worst backend when `byBackend` is set (portability bar). */
    readonly aggregate: number;
    readonly framesPassed: number;
    readonly framesTotal: number;
    readonly perRoute: Array<{ route: string; correctness: number }>;
    /** D25-style layout: `reports/verify/hono`, `reports/verify/fastify`. */
    readonly byBackend?: ReadonlyArray<StatusCorrectnessBackend>;
  } | null;
  readonly archaeology: {
    readonly entities: number;
    readonly fields: number;
    readonly unknownDdl: number;
    readonly orphanShapes: number;
    /** Form controls in PHP that could not be mapped to a single DDL field. */
    readonly unattributedFormFields: number;
    /** Fields with at least one `@chrysalis-conflict` (DDL vs traces, enum mismatch, …). */
    readonly fieldsWithConflicts: number;
    /** Fields promoted to string-literal unions from `sql.query.rows` (D28). */
    readonly fieldsWithTraceLiteralUnions: number;
  } | null;
  readonly shadow: {
    readonly requests: number;
    readonly agreed: number;
    readonly diverged: number;
  } | null;
  readonly residualLegacy: {
    readonly holeCount: number;
    readonly dialectCounts: Record<string, number>;
    /** Top ingest hole reasons (exact strings), sorted desc by count. */
    readonly topHoleReasons: ReadonlyArray<{ readonly reason: string; readonly count: number }>;
    /** Ingest `data.hole` nodes whose reason starts with `new:dynamic` (unusual if lowering uses `__new_dynamic`). */
    readonly dynamicNewHoleCount: number;
    /** WebIR `data.call` sites with callee `__new_dynamic` (dynamic class construction lowering). */
    readonly dynamicNewWebIrCount: number;
  } | null;
  readonly insights: {
    readonly total: number;
    readonly byRecognizer: Record<string, number>;
    readonly bySeverity: Record<string, number>;
    readonly top: ReadonlyArray<{
      readonly title: string;
      readonly severity: string;
      readonly confidence: number;
      readonly route: string | null;
    }>;
  } | null;
  /** Static oracle replay surface (WebIR-only); see DESIGN.md Oracle footprint. */
  readonly oracleFootprint: {
    readonly hydrationIndex: number;
    readonly routeCount: number;
    readonly tapeTablesHint: readonly string[];
    readonly writeTablesHint: readonly string[];
    readonly totalHoleCount: number;
    readonly routesWithWallClock: number;
    readonly routesWithEntropy: number;
    readonly routesWithSession: number;
    readonly routesWithHttpOutbound: number;
    readonly routesWithMail: number;
    readonly routesWithCache: number;
    readonly routesWithFilesystem: number;
    readonly routesWithDynamicNew: number;
    readonly routes: readonly RouteOracleFootprint[];
  } | null;
  /**
   * Set when `--project` ingest succeeds. Machine-readable ingest mode for migration
   * metrics (V2-M2): monolithic, single route shard, or merged shards.
   */
  readonly ingestSharding:
    | { readonly mode: "monolithic" }
    | { readonly mode: "routeShard"; readonly shardIndex: number; readonly shardCount: number }
    | { readonly mode: "mergedShards"; readonly shardCount: number }
    | null;
  /**
   * Milestone 4 dashboard roll-up (DESIGN success metrics). Optional sidecars:
   * `reports/migration/idiomaticity.json` `{ "pct": 0..1 }`,
   * `residual-legacy.json` `{ "legacyRequestPct": 0..100 }` plus optional Milestone 6A
   * fields `authLegacyRequestPct`, `authEmitHoleMax`, `authIngestHoleMax` (D188).
   */
  migration: {
    readonly coverage: {
      readonly pct: number;
      readonly nodes: number;
      readonly holes: number;
      /** WebIR ingest: `data.hole` reasons with `auth:` prefix (Milestone 6A). */
      readonly authHoles: number;
    } | null;
    readonly correctness: number | null;
    readonly idiomaticity: number | null;
    readonly residualLegacyRequestPct: number | null;
    /** Auth-boundary subset of emit hole density vs manifest routes (when sidecar lists it). */
    readonly authResidualLegacyRequestPct: number | null;
    /** Max auth-tagged emit holes across Hono/Fastify (when sidecar lists it). */
    readonly authEmitHoleMax: number | null;
    /** Ingest `auth:`-tagged `data.hole` count from flagship verify emit-stats snapshot. */
    readonly authIngestHoleMax: number | null;
  };
}

function tryReadJson<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

type VerifyReportJson = {
  aggregate: { correctness: number; framesPassed: number; framesTotal: number };
  endpoints: Array<{ route: string; correctness: number }>;
};

function archaeologyDashboardStats(arch: ReturnType<typeof runArchaeology>): NonNullable<
  StatusSummary["archaeology"]
> {
  let fields = 0;
  let fieldsWithConflicts = 0;
  let fieldsWithTraceLiteralUnions = 0;
  for (const e of arch.entities) {
    for (const f of e.fields) {
      fields += 1;
      if (f.conflicts.length > 0) fieldsWithConflicts += 1;
      if (
        f.provenance.some(
          (p) =>
            p.kind === "trace" && p.detail.startsWith(TRACE_LITERAL_UNION_PROVENANCE_PREFIX),
        )
      ) {
        fieldsWithTraceLiteralUnions += 1;
      }
    }
  }
  return {
    entities: arch.entities.length,
    fields,
    unknownDdl: arch.unknownDdl.length,
    orphanShapes: arch.orphanShapes.length,
    unattributedFormFields: arch.unattributedFormFields.length,
    fieldsWithConflicts,
    fieldsWithTraceLiteralUnions,
  };
}

function holeReasonStats(mod: Module): {
  readonly top: ReadonlyArray<{ readonly reason: string; readonly count: number }>;
  readonly dynamicNewCount: number;
  readonly dynamicNewWebIrCount: number;
} {
  const counts = new Map<string, number>();
  let dynamicNewCount = 0;
  let dynamicNewWebIrCount = 0;
  walk(mod, (n) => {
    if (n.dialect === "data" && n.op === "hole") {
      const reason = typeof n.attrs.reason === "string" ? n.attrs.reason : "unknown";
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
      if (reason.startsWith("new:dynamic")) dynamicNewCount += 1;
    }
    if (n.dialect === "data" && n.op === "call") {
      const c = String((n.attrs as { callee?: string }).callee ?? "");
      if (c === "__new_dynamic") dynamicNewWebIrCount += 1;
    }
  });
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));
  return { top, dynamicNewCount, dynamicNewWebIrCount };
}

function correctnessFromVerifyReport(r: VerifyReportJson): Omit<
  StatusCorrectnessBackend,
  "label"
> {
  return {
    aggregate: r.aggregate.correctness,
    framesPassed: r.aggregate.framesPassed,
    framesTotal: r.aggregate.framesTotal,
    perRoute: r.endpoints.map((e) => ({ route: e.route, correctness: e.correctness })),
  };
}

function tryReadBackendVerifySummary(
  reportDir: string,
  backend: string,
): VerifyReportJson | null {
  const base = join(reportDir, backend);
  const direct = tryReadJson<VerifyReportJson>(join(base, "summary.json"));
  if (direct) return direct;
  let best: { run: number; summary: VerifyReportJson } | null = null;
  try {
    for (const name of readdirSync(base)) {
      const m = /^run-(\d+)$/.exec(name);
      if (!m) continue;
      const summary = tryReadJson<VerifyReportJson>(join(base, name, "summary.json"));
      if (!summary) continue;
      const run = Number(m[1]);
      if (!best || run > best.run) best = { run, summary };
    }
  } catch {
    return null;
  }
  return best?.summary ?? null;
}

/** `summary.json` from `writeReport`, optional legacy `correctness.json`, or D25 subdirs. */
function readCorrectnessForStatus(reportDir: string): StatusSummary["correctness"] | null {
  const root = resolve(reportDir);
  const single =
    tryReadJson<VerifyReportJson>(join(root, "summary.json")) ??
    tryReadJson<VerifyReportJson>(join(root, "correctness.json"));
  if (single) {
    const c = correctnessFromVerifyReport(single);
    return {
      aggregate: c.aggregate,
      framesPassed: c.framesPassed,
      framesTotal: c.framesTotal,
      perRoute: c.perRoute,
    };
  }

  const subs = ["hono", "fastify"] as const;
  const backends: StatusCorrectnessBackend[] = [];
  for (const id of subs) {
    const raw = tryReadBackendVerifySummary(root, id);
    if (raw) backends.push({ label: id, ...correctnessFromVerifyReport(raw) });
  }
  if (backends.length === 0) return null;
  if (backends.length === 1) {
    const b = backends[0]!;
    return {
      aggregate: b.aggregate,
      framesPassed: b.framesPassed,
      framesTotal: b.framesTotal,
      perRoute: b.perRoute,
    };
  }
  const worst = backends.reduce((a, b) => (a.aggregate <= b.aggregate ? a : b));
  return {
    aggregate: worst.aggregate,
    framesPassed: worst.framesPassed,
    framesTotal: worst.framesTotal,
    perRoute: worst.perRoute,
    byBackend: backends,
  };
}

async function cmdStatus(args: string[]): Promise<number> {
  const flags = parseFlags(args);
  const parserProvider = parserProviderFromFlags(flags);
  if (parserProvider === null) return 2;
  const cacheOpts = ingestCacheDirFromFlags(flags);
  if (!cacheOpts.ok) {
    console.error(cacheOpts.message);
    return 2;
  }
  const shardMode = shardIngestModeFromFlags(flags);
  if (!shardMode.ok) {
    console.error(shardMode.message);
    return 2;
  }
  const progressOptsStatus = ingestProgressFileFromFlags(flags, shardMode.value);
  if (!progressOptsStatus.ok) {
    console.error(progressOptsStatus.message);
    return 2;
  }
  const checkpointOptsStatus = ingestCheckpointFileFromFlags(flags, shardMode.value);
  if (!checkpointOptsStatus.ok) {
    console.error(checkpointOptsStatus.message);
    return 2;
  }
  const project = typeof flags.project === "string" ? resolve(flags.project) : null;
  if (progressOptsStatus.ingestProgressFile !== undefined && !project) {
    console.error("error: --ingest-progress-file requires --project for status");
    return 2;
  }
  if (checkpointOptsStatus.ingestCheckpointFile !== undefined && !project) {
    console.error("error: --ingest-checkpoint-file requires --project for status");
    return 2;
  }
  const liftFlagCheckStatus = validateIngestLiftFlagsFromCli(flags);
  if (!liftFlagCheckStatus.ok) {
    console.error(liftFlagCheckStatus.message);
    return 1;
  }
  const tracesDir = typeof flags.traces === "string" ? resolve(flags.traces) : "traces";
  const reportDir = typeof flags.report === "string" ? resolve(flags.report) : "reports/verify";
  const shadowDir = typeof flags.shadow === "string" ? resolve(flags.shadow) : "reports/shadow";
  const schemaPath = typeof flags.schema === "string" ? resolve(flags.schema) : null;

  const migrationReportsDir =
    typeof flags["migration-reports"] === "string"
      ? resolve(flags["migration-reports"])
      : resolve("reports/migration");

  const summary: StatusSummary = {
    corpus: null,
    correctness: null,
    archaeology: null,
    shadow: null,
    residualLegacy: null,
    insights: null,
    oracleFootprint: null,
    ingestSharding: null,
    migration: {
      coverage: null,
      correctness: null,
      idiomaticity: null,
      residualLegacyRequestPct: null,
      authResidualLegacyRequestPct: null,
      authEmitHoleMax: null,
      authIngestHoleMax: null,
    },
  };

  // Corpus ------------------------------------------------------------
  let corpus: ReturnType<typeof readCorpus> | null = null;
  if (existsSync(tracesDir)) {
    try {
      corpus = readCorpus({ root: tracesDir });
      const routes = new Set<string>();
      let httpOutbound = 0;
      let mailSend = 0;
      for (const t of corpus.traces) {
        const req = t.events.find((e) => e.type === "http.request");
        if (req && req.type === "http.request") routes.add(`${req.method} ${req.path}`);
        for (const e of t.events) {
          if (e.type === "http.outbound") httpOutbound += 1;
          if (e.type === "mail.send") mailSend += 1;
        }
      }
      (summary as { corpus: StatusSummary["corpus"] }).corpus = {
        traces: corpus.traces.length,
        routes: routes.size,
        ...(httpOutbound > 0 ? { httpOutbound } : {}),
        ...(mailSend > 0 ? { mailSend } : {}),
      };
    } catch {
      // ignore; corpus simply stays null
    }
  }

  // Correctness -------------------------------------------------------
  const correctness = readCorrectnessForStatus(reportDir);
  if (correctness) {
    (summary as { correctness: StatusSummary["correctness"] }).correctness = correctness;
  }

  // Archaeology ------------------------------------------------------
  if (schemaPath && existsSync(schemaPath)) {
    try {
      const input: Parameters<typeof runArchaeology>[0] = {
        schemaPath,
        ...(corpus ? { corpus } : {}),
        ...(project ? { phpRoots: [resolve(project)] as const } : {}),
      };
      const arch = runArchaeology(input);
      (summary as { archaeology: StatusSummary["archaeology"] }).archaeology =
        archaeologyDashboardStats(arch);
    } catch {
      // ignore
    }
  }

  // Shadow -----------------------------------------------------------
  const shadowLog = resolve(shadowDir, "shadow.ndjson");
  if (existsSync(shadowLog)) {
    let requests = 0;
    let agreed = 0;
    let diverged = 0;
    for (const line of readFileSync(shadowLog, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line) as { divergences?: ReadonlyArray<unknown> };
        requests += 1;
        if ((rec.divergences?.length ?? 0) === 0) agreed += 1;
        else diverged += 1;
      } catch {
        // skip malformed line
      }
    }
    (summary as { shadow: StatusSummary["shadow"] }).shadow = { requests, agreed, diverged };
  }

  // Residual legacy (holes) + insights --------------------------------
  let ingestedMod: Module | null = null;
  if (project) {
    try {
      const statusDiag = flags.json ? console.error : console.log;
      if (shardMode.value.mode === "mergeAll") {
        statusDiag(
          `[status] merge-all-shards: ${shardMode.value.shardCount} shard ingests -> mergeWebIrModules`,
        );
      } else if (shardMode.value.mode === "single") {
        statusDiag(
          `[status] shard ${shardMode.value.shardIndex}/${shardMode.value.shardCount} (partial route set for migration metrics)`,
        );
      }
      const mod = await ingestProjectWithShardMode(project, shardMode.value, {
        ...(parserProvider ? { parserProvider } : {}),
        ...(cacheOpts.ingestCacheDir !== undefined ? { ingestCacheDir: cacheOpts.ingestCacheDir } : {}),
        ...(progressOptsStatus.ingestProgressFile !== undefined
          ? { ingestProgressFile: progressOptsStatus.ingestProgressFile }
          : {}),
        ...(checkpointOptsStatus.ingestCheckpointFile !== undefined
          ? { ingestCheckpointFile: checkpointOptsStatus.ingestCheckpointFile }
          : {}),
        ...(checkpointOptsStatus.ingestResumeFromCheckpoint === true
          ? { ingestResumeFromCheckpoint: true as const }
          : {}),
        ...ingestLiftOptionsFromFlags(flags),
      });
      ingestedMod = mod;
      const ingestSharding: NonNullable<StatusSummary["ingestSharding"]> =
        shardMode.value.mode === "none"
          ? { mode: "monolithic" }
          : shardMode.value.mode === "single"
            ? {
                mode: "routeShard",
                shardIndex: shardMode.value.shardIndex,
                shardCount: shardMode.value.shardCount,
              }
            : { mode: "mergedShards", shardCount: shardMode.value.shardCount };
      (summary as { ingestSharding: StatusSummary["ingestSharding"] }).ingestSharding =
        ingestSharding;
      const holeStats = holeReasonStats(mod);
      (summary as { residualLegacy: StatusSummary["residualLegacy"] }).residualLegacy = {
        holeCount: countHoles(mod),
        dialectCounts: countByDialect(mod),
        topHoleReasons: holeStats.top,
        dynamicNewHoleCount: holeStats.dynamicNewCount,
        dynamicNewWebIrCount: holeStats.dynamicNewWebIrCount,
      };
      const insightReport = analyzeModule(mod, corpus ? { corpus } : undefined);
      const top = [...insightReport.opportunities]
        .sort((a, b) => severityRank(b) - severityRank(a) || b.confidence - a.confidence)
        .slice(0, 5)
        .map((op) => ({
          title: op.title,
          severity: op.severity,
          confidence: op.confidence,
          route: op.route ? `${op.route.method} ${op.route.path}` : null,
        }));
      (summary as { insights: StatusSummary["insights"] }).insights = {
        total: insightReport.summary.total,
        byRecognizer: insightReport.summary.byRecognizer as Record<string, number>,
        bySeverity: insightReport.summary.bySeverity as Record<string, number>,
        top,
      };
      const fp = computeOracleFootprint(mod);
      (summary as { oracleFootprint: StatusSummary["oracleFootprint"] }).oracleFootprint = {
        hydrationIndex: fp.hydrationIndex,
        routeCount: fp.routes.length,
        tapeTablesHint: fp.tapeTablesHint,
        writeTablesHint: fp.writeTablesHint,
        totalHoleCount: fp.totalHoleCount,
        routesWithWallClock: fp.routes.filter((r) => r.wallClock).length,
        routesWithEntropy: fp.routes.filter((r) => r.entropy).length,
        routesWithSession: fp.routes.filter((r) => r.session).length,
        routesWithHttpOutbound: fp.routes.filter((r) => r.httpOutbound).length,
        routesWithMail: fp.routes.filter((r) => r.mail).length,
        routesWithCache: fp.routes.filter((r) => r.cache).length,
        routesWithFilesystem: fp.routes.filter((r) => r.filesystem).length,
        routesWithDynamicNew: fp.routes.filter((r) => r.dynamicNewCount > 0).length,
        routes: fp.routes,
      };
      try {
        const fpPath = join(project, "reports/oracle-footprint.json");
        mkdirSync(dirname(fpPath), { recursive: true });
        writeFileSync(
          fpPath,
          JSON.stringify(
            {
              chrysalisSchema: "oracle-footprint/1.0.0",
              sourceApp: mod.meta.sourceApp,
              ...fp,
            },
            null,
            2,
          ),
          "utf8",
        );
      } catch {
        // ignore disk errors (read-only tree, etc.)
      }
    } catch {
      // ignore
    }
  } else {
    // A pre-computed insight report on disk is a valid fallback source.
    const preComputed = tryReadJson<InsightReport>(resolve("reports/insight/opportunities.json"));
    if (preComputed) {
      const top = [...preComputed.opportunities]
        .sort((a, b) => severityRank(b) - severityRank(a) || b.confidence - a.confidence)
        .slice(0, 5)
        .map((op) => ({
          title: op.title,
          severity: op.severity,
          confidence: op.confidence,
          route: op.route ? `${op.route.method} ${op.route.path}` : null,
        }));
      (summary as { insights: StatusSummary["insights"] }).insights = {
        total: preComputed.summary.total,
        byRecognizer: preComputed.summary.byRecognizer as Record<string, number>,
        bySeverity: preComputed.summary.bySeverity as Record<string, number>,
        top,
      };
    }
  }

  // Milestone 4 roll-up (coverage + optional sidecars) ----------------
  const idiomaticityJson = tryReadJson<{ pct: number }>(
    join(migrationReportsDir, "idiomaticity.json"),
  );
  const residualLegacyJson = tryReadJson<{
    legacyRequestPct: number;
    authLegacyRequestPct?: number;
    authEmitHoleMax?: number;
    authIngestHoleMax?: number | null;
  }>(join(migrationReportsDir, "residual-legacy.json"));
  summary.migration = {
    coverage: ingestedMod
      ? (() => {
          const s = irCoverageStats(ingestedMod);
          return {
            pct: s.coverage,
            nodes: s.nodeCount,
            holes: s.holeCount,
            authHoles: countAuthTaggedHoles(ingestedMod),
          };
        })()
      : null,
    correctness: summary.correctness?.aggregate ?? null,
    idiomaticity:
      idiomaticityJson != null &&
      typeof idiomaticityJson.pct === "number" &&
      idiomaticityJson.pct >= 0 &&
      idiomaticityJson.pct <= 1
        ? idiomaticityJson.pct
        : null,
    residualLegacyRequestPct:
      residualLegacyJson != null &&
      typeof residualLegacyJson.legacyRequestPct === "number" &&
      residualLegacyJson.legacyRequestPct >= 0 &&
      residualLegacyJson.legacyRequestPct <= 100
        ? residualLegacyJson.legacyRequestPct
        : null,
    authResidualLegacyRequestPct:
      residualLegacyJson != null &&
      typeof residualLegacyJson.authLegacyRequestPct === "number" &&
      residualLegacyJson.authLegacyRequestPct >= 0 &&
      residualLegacyJson.authLegacyRequestPct <= 100
        ? residualLegacyJson.authLegacyRequestPct
        : null,
    authEmitHoleMax:
      residualLegacyJson != null &&
      typeof residualLegacyJson.authEmitHoleMax === "number" &&
      Number.isFinite(residualLegacyJson.authEmitHoleMax) &&
      Number.isInteger(residualLegacyJson.authEmitHoleMax) &&
      residualLegacyJson.authEmitHoleMax >= 0
        ? residualLegacyJson.authEmitHoleMax
        : null,
    authIngestHoleMax:
      residualLegacyJson != null &&
      typeof residualLegacyJson.authIngestHoleMax === "number" &&
      Number.isFinite(residualLegacyJson.authIngestHoleMax) &&
      Number.isInteger(residualLegacyJson.authIngestHoleMax) &&
      residualLegacyJson.authIngestHoleMax >= 0
        ? residualLegacyJson.authIngestHoleMax
        : null,
  };

  // Render -----------------------------------------------------------
  if (flags.json) {
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }

  console.log("chrysalis status");
  console.log("────────────────");
  if (summary.ingestSharding && summary.ingestSharding.mode !== "monolithic") {
    const sh = summary.ingestSharding;
    if (sh.mode === "routeShard") {
      console.log(`ingest       : shard ${sh.shardIndex}/${sh.shardCount} (route filter)`);
    } else {
      console.log(`ingest       : merge-all-shards K=${sh.shardCount}`);
    }
  }
  if (summary.corpus) {
    const c = summary.corpus;
    const side =
      (c.httpOutbound ?? 0) > 0 || (c.mailSend ?? 0) > 0
        ? `  oracle side-effects: http.outbound=${c.httpOutbound ?? 0} mail.send=${c.mailSend ?? 0}`
        : "";
    console.log(`corpus       : ${c.traces} traces, ${c.routes} routes${side}`);
  } else {
    console.log(`corpus       : (none — pass --traces <dir>)`);
  }
  if (summary.correctness) {
    const c = summary.correctness;
    if (c.byBackend && c.byBackend.length > 1) {
      const pct = (c.aggregate * 100).toFixed(1);
      console.log(
        `correctness  : worst ${pct}%  (${c.framesPassed}/${c.framesTotal} frames, limiting backend)  [dual verify]`,
      );
      for (const b of c.byBackend) {
        const bp = (b.aggregate * 100).toFixed(1);
        console.log(
          `               ${b.label.padEnd(8)} ${bp}%  (${b.framesPassed}/${b.framesTotal} frames)`,
        );
        for (const e of b.perRoute) {
          const p = (e.correctness * 100).toFixed(1).padStart(5);
          console.log(`                        ${p}%  ${e.route}`);
        }
      }
    } else {
      const pct = (c.aggregate * 100).toFixed(1);
      console.log(`correctness  : ${pct}%  (${c.framesPassed}/${c.framesTotal} frames passed)`);
      for (const e of c.perRoute) {
        const p = (e.correctness * 100).toFixed(1).padStart(5);
        console.log(`               ${p}%  ${e.route}`);
      }
    }
  } else {
    console.log(`correctness  : (none — run 'chrysalis verify' or verify-tiny-blog first)`);
  }
  if (summary.archaeology) {
    const a = summary.archaeology;
    console.log(
      `archaeology  : ${a.entities} entities, ${a.fields} fields, ` +
        `${a.unknownDdl} unknown DDL, ${a.orphanShapes} orphan shapes, ` +
        `${a.unattributedFormFields} unattributed form field(s), ` +
        `${a.fieldsWithConflicts} field conflict(s), ${a.fieldsWithTraceLiteralUnions} trace literal union(s)`,
    );
  } else {
    console.log(`archaeology  : (none — pass --schema <schema.sql>)`);
  }
  if (summary.shadow) {
    const s = summary.shadow;
    const pct = s.requests === 0 ? "0.0" : ((s.agreed / s.requests) * 100).toFixed(1);
    console.log(
      `shadow       : ${s.requests} mirrored, ${s.agreed} agreed (${pct}%), ${s.diverged} diverged`,
    );
  } else {
    console.log(`shadow       : (none — run 'chrysalis deploy --mode=shadow' first)`);
  }
  if (summary.residualLegacy) {
    const r = summary.residualLegacy;
    const dialects = Object.entries(r.dialectCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    const dynamicHolePart =
      r.dynamicNewHoleCount > 0 ? `  dynamic-new ingest holes: ${r.dynamicNewHoleCount}` : "";
    const dynamicIrPart =
      r.dynamicNewWebIrCount > 0 ? `  WebIR __new_dynamic: ${r.dynamicNewWebIrCount}` : "";
    const topReasonsPart =
      r.topHoleReasons.length > 0
        ? `  top reasons: ${r.topHoleReasons.map((x) => `${x.reason}=${x.count}`).join(", ")}`
        : "";
    console.log(
      `residual PHP : ${r.holeCount} holes   dialects: ${dialects}${dynamicHolePart}${dynamicIrPart}${topReasonsPart}`,
    );
  } else {
    console.log(`residual PHP : (none — pass --project <php-dir>)`);
  }
  if (summary.insights) {
    const i = summary.insights;
    console.log(
      `insights     : ${i.total} opportunities  ` +
        `(strong=${i.bySeverity["strong"] ?? 0} ` +
        `suggestion=${i.bySeverity["suggestion"] ?? 0} ` +
        `info=${i.bySeverity["info"] ?? 0})`,
    );
    for (const t of i.top) {
      const p = (t.confidence * 100).toFixed(0).padStart(3);
      const where = t.route ?? "(unscoped)";
      console.log(`               [${t.severity.padEnd(10)} ${p}%] ${where}  ${t.title}`);
    }
  } else {
    console.log(`insights     : (none — pass --project <php-dir> or run 'chrysalis insight')`);
  }
  if (summary.oracleFootprint) {
    const o = summary.oracleFootprint;
    const tape =
      o.tapeTablesHint.length > 0 ? o.tapeTablesHint.slice(0, 5).join(",") + (o.tapeTablesHint.length > 5 ? "…" : "") : "—";
    const writes =
      o.writeTablesHint.length > 0
        ? o.writeTablesHint.slice(0, 3).join(",") + (o.writeTablesHint.length > 3 ? "…" : "")
        : "—";
    const extra: string[] = [];
    if (o.totalHoleCount > 0) extra.push(`holes=${o.totalHoleCount}`);
    if (o.routesWithSession > 0) extra.push(`sess=${o.routesWithSession}`);
    if (o.routesWithHttpOutbound > 0) extra.push(`http=${o.routesWithHttpOutbound}`);
    if (o.routesWithMail > 0) extra.push(`mail=${o.routesWithMail}`);
    if (o.routesWithCache > 0) extra.push(`cache=${o.routesWithCache}`);
    if (o.routesWithFilesystem > 0) extra.push(`fs=${o.routesWithFilesystem}`);
    if (o.routesWithDynamicNew > 0) extra.push(`dynnew=${o.routesWithDynamicNew}`);
    const extraStr = extra.length > 0 ? `  ${extra.join(" ")}` : "";
    console.log(
      `oracle footprint: hydration ${o.hydrationIndex}/100  ` +
        `routes=${o.routeCount}  time=${o.routesWithWallClock}  rng=${o.routesWithEntropy}  ` +
        `read→${tape}  write→${writes}${extraStr}  ` +
        `artifact reports/oracle-footprint.json`,
    );
  } else {
    console.log(`oracle footprint: (none — pass --project <php-dir>)`);
  }
  const mig = summary.migration;
  const covStr =
    mig.coverage != null
      ? `${(mig.coverage.pct * 100).toFixed(1)}% (${mig.coverage.nodes} nodes, ${mig.coverage.holes} holes` +
          (mig.coverage.authHoles > 0 ? `, ${mig.coverage.authHoles} auth-tagged` : "") +
          ")"
      : "— (pass --project for IR coverage)";
  const corrStr =
    mig.correctness != null ? `${(mig.correctness * 100).toFixed(1)}%` : "—";
  const idioStr =
    mig.idiomaticity != null ? `${(mig.idiomaticity * 100).toFixed(1)}%` : "—";
  const residualParts: string[] = [];
  if (mig.residualLegacyRequestPct != null) {
    residualParts.push(`${mig.residualLegacyRequestPct.toFixed(1)}% legacy-req`);
  }
  if (mig.authResidualLegacyRequestPct != null) {
    const bits: string[] = [`${mig.authResidualLegacyRequestPct.toFixed(1)}%`];
    if (mig.authEmitHoleMax != null && mig.authEmitHoleMax > 0) {
      bits.push(`emit max ${mig.authEmitHoleMax}`);
    }
    if (mig.authIngestHoleMax != null && mig.authIngestHoleMax > 0) {
      bits.push(`ingest auth ${mig.authIngestHoleMax}`);
    }
    residualParts.push(`auth ${bits.join(" · ")}`);
  }
  const resStr = residualParts.length > 0 ? residualParts.join("  ") : "—";
  console.log(
    `migration(M4): coverage ${covStr}  correctness ${corrStr}  idiomaticity ${idioStr}  residual ${resStr}`,
  );
  return 0;
}

const [, , cmd, ...rest] = process.argv;

async function main(): Promise<number> {
  if (!cmd || cmd === "--help" || cmd === "-h") {
    printHelp();
    return 0;
  }
  const known = SUBCOMMANDS.some(([c]) => c === cmd);
  if (!known) {
    console.error(`[chrysalis] unknown command: ${cmd}`);
    console.error("run 'chrysalis --help' to see available commands.");
    return 2;
  }
  const gate = runLicenseGate(cmd);
  if (gate !== null) return gate;
  switch (cmd) {
    case "init":
      return await cmdInit(rest);
    case "ingest":
      return await cmdIngest(rest);
    case "emit":
      return await cmdEmit(rest);
    case "convert":
      return await cmdConvert(rest);
    case "observe":
      return await cmdObserve(rest);
    case "corpus":
      return await cmdCorpus(rest);
    case "corpus-merge":
      return await cmdCorpusMerge(rest);
    case "archaeology":
      return await cmdArchaeology(rest);
    case "verify":
      return await cmdVerify(rest);
    case "verify-merge":
      return await cmdVerifyMerge(rest);
    case "deploy":
      return await cmdDeploy(rest);
    case "insight":
      return await cmdInsight(rest);
    case "rewrite":
      return await cmdRewrite(rest);
    case "status":
      return await cmdStatus(rest);
    case "repair":
      return await cmdRepair(rest);
    case "license":
      return await cmdLicense(rest);
    case "port-site":
      return await cmdPortSite(rest);
    case "federation":
      return await cmdFederation(rest);
    case "evidence":
      return await cmdEvidence(rest);
    case "cwl":
      return await cmdCwl(rest);
    default:
      console.log(`[chrysalis] '${cmd}' is not implemented yet (Milestone 0 scaffold).`);
      console.log(`[chrysalis] args: ${JSON.stringify(rest)}`);
      return 0;
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[chrysalis] unhandled error:", err);
    process.exit(1);
  },
);
