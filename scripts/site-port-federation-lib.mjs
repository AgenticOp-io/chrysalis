#!/usr/bin/env node
/** File-based Verified Migration Federation registry (Phase 34b–d). */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const FEDERATION_REGISTRY_KIND = "chrysalis.site-port-federation.registry.v1";
export const FEDERATION_SUBMISSION_KIND = "chrysalis.site-port-federation.submission.v1";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {import('@chrysalis/web-llm').FederationWorkUnit[]} */
export const DEFAULT_WORK_UNITS = [
  { id: "tinyBlog", fixtureRel: "fixtures/tiny-blog", origin: "php", minRoutes: 5, license: "MIT" },
  {
    id: "plainPhp",
    fixtureRel: "fixtures/hub-flagship-plain-php",
    origin: "php",
    minRoutes: 10,
    license: "MIT",
  },
];

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

/**
 * @param {string} repoRoot
 */
export function resolveFederationPaths(repoRoot) {
  const base = process.env.CHRYSALIS_FEDERATION_DIR?.trim() || join(repoRoot, "reports/federation");
  return {
    base,
    registryPath: join(base, "registry.v1.json"),
    submissionsDir: join(base, "submissions"),
    corpusDir: join(base, "corpus"),
    leagueDir: join(base, "league"),
  };
}

/**
 * @param {string} path
 */
export function readJsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * @param {string} repoRoot
 */
export function loadRegistry(repoRoot) {
  const { registryPath } = resolveFederationPaths(repoRoot);
  if (!existsSync(registryPath)) return null;
  return readJsonFile(registryPath);
}

/**
 * @param {string} repoRoot
 * @param {import('@chrysalis/web-llm').FederationWorkUnit[]} [workUnits]
 */
export function syncFederationRegistry(repoRoot, workUnits = DEFAULT_WORK_UNITS) {
  const paths = resolveFederationPaths(repoRoot);
  mkdirSync(paths.base, { recursive: true });
  const existing = loadRegistry(repoRoot);
  const registry = {
    kind: FEDERATION_REGISTRY_KIND,
    schemaVersion: 1,
    workUnits,
    submissions: existing?.submissions ?? [],
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(paths.registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return registry;
}

/**
 * @param {string} repoRoot
 * @param {string} fixtureId
 */
export function findWorkUnit(repoRoot, fixtureId) {
  const registry = loadRegistry(repoRoot) ?? syncFederationRegistry(repoRoot);
  return registry.workUnits.find((w) => w.id === fixtureId) ?? null;
}

/**
 * @param {string} repoRoot
 * @param {string} projectDir
 */
export function resolveFixtureIdForProject(repoRoot, projectDir) {
  const root = resolve(projectDir);
  const registry = loadRegistry(repoRoot) ?? syncFederationRegistry(repoRoot);
  for (const unit of registry.workUnits) {
    const abs = resolve(repoRoot, unit.fixtureRel);
    if (root === abs || root.startsWith(abs + "\\") || root.startsWith(abs + "/")) {
      return unit.id;
    }
  }
  const rel = root.replace(repoRoot, "").replace(/^[/\\]/, "").replace(/\\/g, "/");
  const byRel = registry.workUnits.find((w) => w.fixtureRel === rel);
  return byRel?.id ?? null;
}

/**
 * @param {string} jsonlPath
 */
export function readJsonlShards(jsonlPath) {
  if (!existsSync(jsonlPath)) return [];
  return readFileSync(jsonlPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

/**
 * @param {object} opts
 * @param {string} opts.repoRoot
 * @param {string} opts.projectDir
 * @param {string} [opts.fixtureId]
 * @param {string} [opts.contributor]
 * @param {string} [opts.shardPath]
 */
export async function submitFederationShard(opts) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  syncRegistryFromOpenLegacyIndex(repoRoot);

  const projectDir = resolve(opts.projectDir);
  const fixtureId = opts.fixtureId ?? resolveFixtureIdForProject(repoRoot, projectDir);
  if (!fixtureId) {
    return { ok: false, skip: "fixture-not-in-registry", projectDir };
  }

  const workUnit = findWorkUnit(repoRoot, fixtureId);
  if (!workUnit) {
    return { ok: false, skip: "work-unit-missing", fixtureId };
  }

  const portReportPath = join(projectDir, ".chrysalis", "site-port.json");
  if (!existsSync(portReportPath)) {
    return { ok: false, skip: "missing-site-port-report", portReportPath };
  }
  const portReport = readJsonFile(portReportPath);

  const shardPath =
    opts.shardPath ??
    join(repoRoot, "reports/web-llm/dataset/site-port/training-shards.v1.jsonl");
  const shards = readJsonlShards(shardPath);
  const sessionId = portReport.trajectory?.sessionId;
  let shard =
    (sessionId ? shards.find((s) => s.sessionId === sessionId) : null) ??
    shards[shards.length - 1] ??
    null;

  if (!shard) {
    const trajectoryPath =
      portReport.trajectory?.path ?? mod.resolveSitePortTrajectoryPath(repoRoot, projectDir);
    if (existsSync(trajectoryPath)) {
      const records = mod.readTrajectoryRecords(trajectoryPath);
      const built = mod.buildTrainingShardsFromRecords(records, {
        provenance: ["chrysalis.site-port-federation.submit"],
      });
      shard = sessionId ? built.find((s) => s.sessionId === sessionId) : built[built.length - 1];
    }
  }

  if (!shard) {
    return { ok: false, skip: "no-shard-found", shardPath };
  }

  return submitFederationPayload({
    repoRoot,
    fixtureId,
    contributor: opts.contributor ?? mod.federationContributorId(),
    portReport,
    shard,
    mode: "local-project",
  });
}

/**
 * Accept verify-gated port report + shard JSON (remote contributor path — no source).
 * @param {object} opts
 */
export async function submitFederationPayload(opts) {
  const repoRoot = resolve(opts.repoRoot ?? scriptRoot);
  const mod = await loadWebLlm();
  syncRegistryFromOpenLegacyIndex(repoRoot);

  const fixtureId = opts.fixtureId;
  const contributor = opts.contributor ?? mod.federationContributorId();
  const portReport = opts.portReport;
  const shard = opts.shard;

  if (!fixtureId || !portReport || !shard) {
    return { ok: false, skip: "missing-payload-fields", fixtureId: fixtureId ?? null };
  }

  const workUnit = findWorkUnit(repoRoot, fixtureId);
  if (!workUnit) {
    return { ok: false, skip: "work-unit-missing", fixtureId };
  }

  const validation = mod.validateFederationSubmission({ workUnit, portReport, shard });
  if (!validation.ok) {
    return { ok: false, skip: "validation-failed", reasons: validation.reasons, fixtureId };
  }

  const id = mod.federationSubmissionId(fixtureId, shard.sessionId, contributor);
  const submission = {
    kind: FEDERATION_SUBMISSION_KIND,
    schemaVersion: 1,
    id,
    fixtureId,
    contributor,
    verifyCorrectness: portReport.verify?.correctness ?? 0,
    portReportOk: portReport.ok === true,
    shard,
    submittedAt: new Date().toISOString(),
  };

  const paths = resolveFederationPaths(repoRoot);
  mkdirSync(paths.submissionsDir, { recursive: true });
  const submissionPath = join(paths.submissionsDir, `${id}.json`);
  writeFileSync(submissionPath, `${JSON.stringify(submission, null, 2)}\n`, "utf8");

  let registry = loadRegistry(repoRoot) ?? syncFederationRegistry(repoRoot);
  const index = {
    id,
    fixtureId,
    contributor,
    verifyCorrectness: submission.verifyCorrectness,
    shardId: shard.id,
    submittedAt: submission.submittedAt,
  };
  const merged = [...(registry.submissions ?? []).filter((s) => s.id !== id), index];
  registry.submissions = mod.pickBestSubmissionsByContributorFixture(merged);
  registry.generatedAt = new Date().toISOString();
  writeFileSync(paths.registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

  const keptIds = new Set(registry.submissions.map((s) => s.id));
  for (const file of listSubmissionFiles(paths.submissionsDir)) {
    const sid = file.replace(/\.json$/, "");
    if (!keptIds.has(sid)) {
      try {
        unlinkSync(join(paths.submissionsDir, file));
      } catch {
        /* best-effort prune */
      }
    }
  }

  return {
    ok: true,
    id,
    fixtureId,
    contributor,
    submissionPath,
    shardId: shard.id,
    registryPath: paths.registryPath,
    mode: opts.mode ?? "remote-payload",
  };
}

/**
 * @param {string} repoRoot
 */
export async function mergeFederationCorpus(repoRoot) {
  const mod = await loadWebLlm();
  const paths = resolveFederationPaths(repoRoot);
  const registry = loadRegistry(repoRoot);
  if (!registry || !registry.submissions?.length) {
    return { ok: false, skip: "no-submissions", submissionCount: 0 };
  }

  /** @type {Map<string, import('@chrysalis/web-llm').TrainingShard>} */
  const bySession = new Map();
  for (const idx of registry.submissions) {
    const submissionPath = join(paths.submissionsDir, `${idx.id}.json`);
    if (!existsSync(submissionPath)) continue;
    const submission = readJsonFile(submissionPath);
    const val = mod.validateFederationShard(submission.shard);
    if (!val.ok) continue;
    bySession.set(submission.shard.sessionId, submission.shard);
  }

  const shards = [...bySession.values()].sort((a, b) => a.id.localeCompare(b.id));
  mkdirSync(paths.corpusDir, { recursive: true });
  const jsonlPath = join(paths.corpusDir, "training-shards.v1.jsonl");
  const jsonPath = join(paths.corpusDir, "training-shards.v1.json");
  writeFileSync(jsonlPath, shards.map((s) => JSON.stringify(s)).join("\n") + (shards.length ? "\n" : ""), "utf8");
  writeFileSync(
    jsonPath,
    `${JSON.stringify({ kind: mod.WEB_LLM_TRAINING_SHARD_KIND, schemaVersion: mod.WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION, shardCount: shards.length, shards }, null, 2)}\n`,
    "utf8",
  );

  return {
    ok: shards.length > 0,
    shardCount: shards.length,
    jsonlPath,
    jsonPath,
    submissionCount: registry.submissions.length,
  };
}

/**
 * @param {string} repoRoot
 */
export async function publishFederationLeague(repoRoot) {
  const mod = await loadWebLlm();
  const paths = resolveFederationPaths(repoRoot);
  const registry = loadRegistry(repoRoot) ?? syncFederationRegistry(repoRoot);

  const benchmarkPath = join(repoRoot, "fixtures/web-llm/chrysalis.web-verify-benchmark.v1.json");
  const benchmark = existsSync(benchmarkPath)
    ? readJsonFile(benchmarkPath)
    : mod.buildWebVerifyBenchmark({ repoRoot });

  const entries = mod.buildFederationLeaderboardEntries(registry.submissions ?? [], benchmark);
  const board = mod.buildWebVerifyLeaderboard({ benchmark, entries });
  const html = mod.renderLeaderboardHtml(board);

  mkdirSync(paths.leagueDir, { recursive: true });
  const jsonPath = join(paths.leagueDir, "leaderboard.v1.json");
  const htmlPath = join(paths.leagueDir, "index.html");
  writeFileSync(jsonPath, `${JSON.stringify(board, null, 2)}\n`, "utf8");
  writeFileSync(htmlPath, html, "utf8");

  return {
    ok: board.entries.length >= 2,
    jsonPath,
    htmlPath,
    entryCount: board.entries.length,
    contributorCount: (registry.submissions ?? []).length,
  };
}

/**
 * @param {string} repoRoot
 */
export function openLegacyIndexEntries(repoRoot) {
  return loadOpenLegacyIndex(repoRoot).entries ?? [];
}

/**
 * @param {string} repoRoot
 */
export function expectedOpenLegacyIndexCount(repoRoot) {
  return openLegacyIndexEntries(repoRoot).length;
}

/**
 * @param {string} repoRoot
 */
export function loadOpenLegacyIndex(repoRoot) {
  const indexPath = join(repoRoot, "fixtures/site-port-federation/open-legacy-index.v1.json");
  if (!existsSync(indexPath)) {
    return { kind: "chrysalis.site-port-federation.open-legacy-index.v1", schemaVersion: 1, entries: DEFAULT_WORK_UNITS.map((w) => ({ ...w, title: w.id })) };
  }
  return readJsonFile(indexPath);
}

/**
 * @param {string} repoRoot
 */
export function syncRegistryFromOpenLegacyIndex(repoRoot) {
  const index = loadOpenLegacyIndex(repoRoot);
  const workUnits = (index.entries ?? []).map(({ title: _t, tags, ...rest }) => ({ ...rest, tags }));
  return syncFederationRegistry(repoRoot, workUnits);
}

/**
 * @param {string} repoRoot
 */
export async function mergeFederationWvb(repoRoot) {
  const mod = await loadWebLlm();
  const paths = resolveFederationPaths(repoRoot);
  const registry = loadRegistry(repoRoot) ?? syncRegistryFromOpenLegacyIndex(repoRoot);
  const base = mod.buildWebVerifyBenchmark({ repoRoot });
  /** @type {import('@chrysalis/web-llm').WebVerifyBenchmarkCase[]} */
  const extra = [];
  const submittedFixtures = new Set((registry.submissions ?? []).map((s) => s.fixtureId));

  for (const unit of registry.workUnits ?? []) {
    if (!submittedFixtures.has(unit.id)) continue;
    const routesPath = join(repoRoot, unit.fixtureRel, "chrysalis.routes.json");
    if (!existsSync(routesPath)) continue;
    const routes = readJsonFile(routesPath).routes ?? [];
    extra.push(...mod.buildWvbCasesForWorkUnit(unit, routes));
  }

  const merged = mod.mergeWvbWithFederationCases(base, extra);
  mkdirSync(join(paths.base, "wvb"), { recursive: true });
  const outPath = join(paths.base, "wvb", "chrysalis.web-verify-benchmark.federation.v1.json");
  writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return {
    ok: merged.caseCount >= base.caseCount,
    baseCaseCount: base.caseCount,
    mergedCaseCount: merged.caseCount,
    addedCases: merged.caseCount - base.caseCount,
    outPath,
  };
}

export const OPEN_LEGACY_BUNDLE_KIND = "chrysalis.site-port-federation.open-legacy-bundle.v1";

/**
 * @param {string} repoRoot
 */
export function exportOpenLegacyBundle(repoRoot) {
  const root = resolve(repoRoot);
  const index = loadOpenLegacyIndex(root);
  const charterPath = join(root, "fixtures/site-port-federation/chrysalis.site-port-federation.v1.json");
  const charter = existsSync(charterPath) ? readJsonFile(charterPath) : null;
  const entries = (index.entries ?? []).map((entry) => ({
    ...entry,
    routesManifest: existsSync(join(root, entry.fixtureRel, "chrysalis.routes.json")),
    portCommand: `chrysalis port-site ${entry.fixtureRel} --origin ${entry.origin}`,
    submitCommand: `chrysalis federation submit-shard ${entry.fixtureRel} --contributor <handle>`,
  }));
  const bundle = {
    kind: OPEN_LEGACY_BUNDLE_KIND,
    schemaVersion: 1,
    index: { ...index, entries },
    charter,
    hubApi: {
      health: "GET /api/vmf/health",
      index: "GET /api/vmf/index",
      submit: "POST /api/vmf/submit-shard { fixtureId, contributor, portReport, shard }",
      mergeCorpus: "POST /api/vmf/merge-corpus",
      publishLeague: "POST /api/vmf/publish-league",
      publishAll: "POST /api/vmf/publish-all",
      shorthand: "GET /api/vmf/shorthand",
      exportShorthand: "POST /api/vmf/export-shorthand",
    },
    generatedAt: new Date().toISOString(),
  };
  const paths = resolveFederationPaths(root);
  const outDir = join(paths.base, "bundle");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "open-legacy-bundle.v1.json");
  writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  return { ok: true, outPath, entryCount: entries.length, bundle };
}

/**
 * @param {string} repoRoot
 */
export async function publishFederationArtifacts(repoRoot) {
  const corpus = await mergeFederationCorpus(repoRoot);
  const wvb = await mergeFederationWvb(repoRoot);
  const league = await publishFederationLeague(repoRoot);
  const bundle = exportOpenLegacyBundle(repoRoot);
  let shorthand = { ok: false, skip: "not-run" };
  try {
    const { exportIntelligenceShorthands } = await import("./web-llm-export-shorthand.mjs");
    shorthand = await exportIntelligenceShorthands({ repoRoot });
  } catch {
    /* shorthand export optional until web-llm built */
  }
  const ok = corpus.ok === true && wvb.ok === true && league.ok === true && bundle.ok === true;
  return { ok, corpus, wvb, league, bundle, shorthand };
}

/**
 * @param {string} submissionsDir
 */
export function listSubmissionFiles(submissionsDir) {
  if (!existsSync(submissionsDir)) return [];
  return readdirSync(submissionsDir).filter((f) => f.endsWith(".json"));
}
