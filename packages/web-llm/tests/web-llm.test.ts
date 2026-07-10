import { describe, expect, test } from "vitest";
import { buildWebVerifyBenchmark, summarizeWebVerifyBenchmark } from "../src/benchmark.js";
import { buildTrainingShardsFromRecords, benchmarkCaseToEvalPrompt } from "../src/dataset.js";
import { evaluateVerifyGatePolicy } from "../src/policy.js";
import { appendTrajectoryRecord, createTrajectorySessionId, readTrajectoryRecords } from "../src/trajectory.js";
import { buildWebVerifyLeaderboard, renderLeaderboardHtml } from "../src/leaderboard.js";
import { chrysalisAgentToolDefinitions } from "../src/tools.js";
import { join, resolve } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { evaluateSitePortVerifyGate, logSitePortStep, resolveSitePortTrajectoryPath, SITE_PORT_GATE_NAMES } from "../src/site-port.js";
import { buildWvbCasesForWorkUnit, mergeWvbWithFederationCases, pickBestSubmissionsByContributorFixture, validateFederationSubmission, validateFederationShard } from "../src/federation.js";
import { buildSkillCapsuleFromShard, buildOracleRefShorthandFromPortReport, buildPolicyGraphShorthandFromPortReport, preferredShorthandTierForTask, summarizeIntelligenceShorthands, validateIntelligenceShorthand } from "../src/shorthand.js";
import { promoteShorthandsByDomain, resolveShorthandForTask, tierRank } from "../src/shorthand-retrieval.js";
import { demoteShorthandsForDomain } from "../src/shorthand-demote.js";
import {
  summarizeIsLiveAnalytics,
  summarizeIsLiveAnalyticsFromTrajectoryFile,
} from "../src/shorthand-analytics.js";
import { CYNOENGINE_ATTRIBUTION, scoreNearMissCandidates } from "../src/shorthand-salience.js";
import {
  emptyIsUtilityStore,
  recordUtilityOutcome,
  shouldDownRankByUtility,
  utilityScoreMultiplier,
} from "../src/shorthand-utility.js";
import { classifyConvertAction, governConvertAction } from "../src/convert-governor.js";
import { createConvertAim, evaluateAimDrive, shouldStallAfterRound } from "../src/convert-aim.js";
import { IS_LIVE_ANALYTICS_KIND } from "../src/kinds.js";
import { buildLoraTrainManifest, validateLoraTrainManifest, LORA_TRAIN_MANIFEST_KIND } from "../src/lora-manifest.js";
import { WEB_LLM_TRAINING_SHARD_KIND, WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION } from "../src/kinds.js";

const repoRoot = resolve(import.meta.dirname, "../../..");

describe("@chrysalis/web-llm", () => {
  test("buildWebVerifyBenchmark meets minimum case count", () => {
    const benchmark = buildWebVerifyBenchmark({ repoRoot });
    const summary = summarizeWebVerifyBenchmark(benchmark);
    expect(summary.ok).toBe(true);
    expect(benchmark.caseCount).toBeGreaterThanOrEqual(50);
  });

  test("verify gate policy rejects failed gates", () => {
    expect(evaluateVerifyGatePolicy({ gateOk: true, verifyCorrectness: 1, holeCount: 0 }).ok).toBe(true);
    expect(evaluateVerifyGatePolicy({ gateOk: false }).ok).toBe(false);
    expect(evaluateVerifyGatePolicy({ unverified: true }).ok).toBe(false);
  });

  test("trajectory append and training shard export", () => {
    const filePath = join(repoRoot, "generated/_web-llm-unit/trajectory.jsonl");
    if (existsSync(filePath)) unlinkSync(filePath);
    const sessionId = createTrajectorySessionId("unit");
    appendTrajectoryRecord({
      filePath,
      sessionId,
      step: 1,
      role: "user",
      content: "verify tiny-blog",
    });
    appendTrajectoryRecord({
      filePath,
      sessionId,
      step: 2,
      role: "assistant",
      content: "done",
      gate: { name: "unit", ok: true },
    });
    const records = readTrajectoryRecords(filePath);
    expect(records.length).toBe(2);
    const shards = buildTrainingShardsFromRecords(records);
    expect(shards.length).toBe(1);
    expect(shards[0]?.messages.length).toBeGreaterThanOrEqual(3);
  });

  test("leaderboard renders html", () => {
    const benchmark = buildWebVerifyBenchmark({ repoRoot });
    const board = buildWebVerifyLeaderboard({ benchmark });
    const html = renderLeaderboardHtml(board);
    expect(html).toContain("Web Verify Benchmark");
    expect(html).toContain("Chrysalis engine");
  });

  test("agent tool definitions include verify and dataset export", () => {
    const tools = chrysalisAgentToolDefinitions();
    const names = tools.map((t) => t.name);
    expect(names).toContain("chrysalis_verify");
    expect(names).toContain("web_llm_export_dataset");
    expect(names).toContain("web_llm_export_shorthand");
    expect(names).toContain("web_llm_preferred_shorthand_tier");
    expect(names).toContain("web_llm_resolve_shorthand");
    expect(names).toContain("hub_convert_is_routing");
    expect(names).toContain("hub_convert_propose_holes");
    expect(names).toContain("hub_convert_apply_holes");
    expect(names).toContain("hub_convert_llm_enrich");
    expect(tools.length).toBeGreaterThanOrEqual(16);
  });

  test("preferredShorthandTierForTask selects lowest verify tier", () => {
    expect(
      preferredShorthandTierForTask({
        hasOracleReplay: true,
        hasPolicyGraph: true,
        needsNovelLanguage: false,
      }),
    ).toBe("IS-T5-oracle-ref");
    expect(
      preferredShorthandTierForTask({
        hasOracleReplay: false,
        hasPolicyGraph: true,
        needsNovelLanguage: false,
      }),
    ).toBe("IS-T4-policy-graph");
    expect(
      preferredShorthandTierForTask({
        hasOracleReplay: false,
        hasPolicyGraph: false,
        needsNovelLanguage: true,
      }),
    ).toBe("IS-T2-lora-delta");
  });

  test("resolveShorthandForTask promotes highest tier and skipLlm", () => {
    const t5 = buildOracleRefShorthandFromPortReport("tinyBlog", {
      ok: true,
      verify: { ok: true, correctness: 1 },
    });
    const t4 = buildPolicyGraphShorthandFromPortReport("tinyBlog", {
      ok: true,
      cwl: { ok: true, cwlPath: "fixtures/tiny-blog/routes.cwl", routeCount: 5 },
    });
    expect(t5).not.toBeNull();
    expect(t4).not.toBeNull();
    const shorthands = [t4!, t5!];
    const promoted = promoteShorthandsByDomain(shorthands);
    expect(promoted.length).toBe(1);
    expect(promoted[0]?.tier).toBe("IS-T5-oracle-ref");
    const resolved = resolveShorthandForTask({
      domainId: "tinyBlog",
      shorthands,
      needsNovelLanguage: false,
    });
    expect(resolved.retrievalHit).toBe(true);
    expect(resolved.skipLlm).toBe(true);
    expect(resolved.cacheOutcome).toBe("hit");
    expect(tierRank(resolved.tier)).toBeLessThanOrEqual(tierRank("IS-T3-skill-capsule"));
  });

  test("near-miss transfer and live analytics summary (D6372)", () => {
    const t5 = buildOracleRefShorthandFromPortReport("plainPhp", {
      ok: true,
      verify: { ok: true, correctness: 1 },
    });
    expect(t5).not.toBeNull();
    const catalog = [
      { id: "plainPhp", origin: "php", minRoutes: 10, tags: ["php", "flagship"] },
      { id: "laravelMin", origin: "php", minRoutes: 10, tags: ["php", "laravel"] },
      { id: "expressJs", origin: "javascript", minRoutes: 10, tags: ["javascript"] },
    ];
    const near = resolveShorthandForTask({
      domainId: "laravelMin",
      shorthands: [t5!],
      domainCatalog: catalog,
    });
    expect(near.cacheOutcome).toBe("near-miss");
    expect(near.skipLlm).toBe(false);
    expect(near.holeDeltaLlmOnly).toBe(true);
    expect(near.nearMissDomainId).toBe("plainPhp");
    expect(typeof near.nearMissScore).toBe("number");
    expect(near.collaborationAttribution).toContain("CynoEngine");

    const miss = resolveShorthandForTask({
      domainId: "expressJs",
      shorthands: [t5!],
      domainCatalog: catalog,
    });
    expect(miss.cacheOutcome).toBe("miss");

    const demote = demoteShorthandsForDomain({
      domainId: "plainPhp",
      reason: "verify-fail",
      shorthands: [t5!],
    });
    expect(demote.demoted).toBe(true);

    const summary = summarizeIsLiveAnalytics(
      [
        { domainId: "a", outcome: "hit", verifyCostMs: 10, skipLlm: true },
        { domainId: "b", outcome: "near-miss", verifyCostMs: 50 },
        { domainId: "c", outcome: "miss", verifyCostMs: 100, verifyOk: false },
      ],
      { scope: "synthetic-smoke" },
    );
    expect(summary.kind).toBe(IS_LIVE_ANALYTICS_KIND);
    expect(summary.hitCount).toBe(1);
    expect(summary.nearMissCount).toBe(1);
    expect(summary.missCount).toBe(1);
    expect(summary.verifyCostMsP50).toBe(50);

    const filePath = join(repoRoot, "generated/_web-llm-unit/is-live-analytics.jsonl");
    if (existsSync(filePath)) unlinkSync(filePath);
    const sid = createTrajectorySessionId("unit-is-live");
    appendTrajectoryRecord({
      filePath,
      sessionId: sid,
      step: 1,
      role: "system",
      gate: { name: "is-routing", ok: true },
      domainId: "tinyBlog",
      isCacheOutcome: "hit",
      skipLlm: true,
    });
    appendTrajectoryRecord({
      filePath,
      sessionId: sid,
      step: 2,
      role: "tool",
      gate: { name: "verify", ok: true },
      domainId: "tinyBlog",
      verifyCostMs: 33,
    });
    const fromFile = summarizeIsLiveAnalyticsFromTrajectoryFile(filePath, { scope: "live-job" });
    expect(fromFile.jobCount).toBe(1);
    expect(fromFile.hitCount).toBe(1);
    expect(fromFile.verifyCostMsP50).toBe(33);
  });

  test("Cyno-inspired salience, utility, governor, aim (D6375 / G9520–G9550)", () => {
    const t5 = buildOracleRefShorthandFromPortReport("plainPhp", {
      ok: true,
      verify: { ok: true, correctness: 1 },
    });
    expect(t5).not.toBeNull();
    const catalog = [
      { id: "plainPhp", origin: "php", minRoutes: 10, tags: ["php", "flagship"] },
      { id: "laravelMin", origin: "php", minRoutes: 10, tags: ["php", "laravel"] },
    ];
    const scored = scoreNearMissCandidates({
      taskFingerprint: { domainId: "laravelMin", origin: "php", minRoutes: 10, tags: ["php"] },
      domainCatalog: catalog,
      shorthands: [t5!],
    });
    expect(scored.length).toBeGreaterThanOrEqual(1);
    expect(scored[0]?.attribution).toBe(CYNOENGINE_ATTRIBUTION);

    let store = emptyIsUtilityStore();
    store = recordUtilityOutcome(store, { domainId: "plainPhp", outcome: "noise" });
    store = recordUtilityOutcome(store, { domainId: "plainPhp", outcome: "noise" });
    store = recordUtilityOutcome(store, { domainId: "plainPhp", outcome: "noise" });
    expect(shouldDownRankByUtility(store.domains.plainPhp)).toBe(true);
    expect(utilityScoreMultiplier(store.domains.plainPhp)).toBeLessThan(1);
    expect(store.attribution).toBe(CYNOENGINE_ATTRIBUTION);

    expect(classifyConvertAction("hub_convert_is_routing").tier).toBe("GREEN");
    expect(classifyConvertAction("hub_convert_apply_holes").tier).toBe("RED");
    expect(
      governConvertAction({
        action: "hub_convert_apply_holes",
        confirmApply: false,
        verifyGatePass: true,
      }).ok,
    ).toBe(false);
    expect(
      governConvertAction({
        action: "hub_convert_apply_holes",
        confirmApply: true,
        verifyGatePass: true,
      }).ok,
    ).toBe(true);

    expect(evaluateAimDrive({ aim: null, nudge: "proceed" }).stall).toBe(true);
    const aim = createConvertAim({ domainId: "laravelMin", successGate: "verify-green" });
    expect(aim.attribution).toBe(CYNOENGINE_ATTRIBUTION);
    expect(evaluateAimDrive({ aim, nudge: "ok" }).ok).toBe(true);
    expect(shouldStallAfterRound({ aim, advancedAim: false, ranVerify: false }).stall).toBe(true);

    const names = chrysalisAgentToolDefinitions().map((t) => t.name);
    expect(names).toContain("web_llm_score_near_miss");
    expect(names).toContain("web_llm_record_utility_outcome");
    expect(names).toContain("hub_convert_govern_action");
    expect(names).toContain("hub_convert_evaluate_aim");
  });

  test("benchmarkCaseToEvalPrompt mentions verify", () => {
    const prompt = benchmarkCaseToEvalPrompt({
      id: "x",
      fixture: "tiny-blog",
      path: "/posts",
      method: "GET",
      task: "verify",
      tier: "structural",
      tags: [],
    });
    expect(prompt).toContain("chrysalis verify");
  });

  test("agent POC scenarios load and checks pass", async () => {
    const { loadPocScenarioCatalog, runAgentPoc, runPocCheck, probeWispGceLiveAnchors } = await import(
      "../src/index.js"
    );
    const catalog = loadPocScenarioCatalog(repoRoot);
    expect(catalog.scenarios.length).toBeGreaterThanOrEqual(4);
    const anchorCheck = await runPocCheck({ kind: "check", check: "wisp-ui-anchors" }, repoRoot);
    expect(anchorCheck.ok).toBe(true);
    const longBody =
      "login-page demo@wisptools.io Sign in dashboard-container modules-grid WISP Management wisp-plan-app plan-map-iframe wisp-header-overlay wisp-deploy-app deploy-map-iframe wisp-coverage-map arcgis-map-view " +
      "wisp-demo-content Hardware wisp-demo-table wisp-demo-form data-wisp-layout=\"form\" " +
      "x".repeat(900);
    const mockFetch = async () =>
      ({
        status: 200,
        text: async () => longBody,
      }) as Response;
    const live = await probeWispGceLiveAnchors(repoRoot, { strict: true, fetchFn: mockFetch as typeof fetch });
    expect(live.ok).toBe(true);
    const report = await runAgentPoc({
      repoRoot,
      scenarios: catalog.scenarios.filter((s) => s.id === "wisp-gce-demo-contract"),
      runTool: async () => ({ ok: true }),
    });
    expect(report.ok).toBe(true);
    expect(report.passCount).toBe(1);
  });

  test("site-port verify gate accepts replay correctness", () => {
    expect(evaluateSitePortVerifyGate({ ok: true, correctness: 1 }).ok).toBe(true);
    expect(evaluateSitePortVerifyGate({ ok: false, correctness: 0.5 }).ok).toBe(false);
    expect(evaluateSitePortVerifyGate({ ok: true, skip: "verify-disabled" }).skipped).toBe(true);
  });

  test("federation rejects shard without verify gate", () => {
    const bad = validateFederationShard({
      kind: WEB_LLM_TRAINING_SHARD_KIND,
      schemaVersion: WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION,
      id: "shard-bad",
      sessionId: "s1",
      generatedAt: new Date().toISOString(),
      messages: [{ role: "user", content: "port tiny-blog" }],
      provenance: ["test"],
    });
    expect(bad.ok).toBe(false);

    const good = validateFederationSubmission({
      workUnit: { id: "tinyBlog", fixtureRel: "fixtures/tiny-blog", origin: "php", minRoutes: 5 },
      portReport: { ok: true, verify: { correctness: 1 }, cwl: { routeCount: 5 } },
      shard: {
        kind: WEB_LLM_TRAINING_SHARD_KIND,
        schemaVersion: WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION,
        id: "shard-good",
        sessionId: "s2",
        generatedAt: new Date().toISOString(),
        messages: [{ role: "user", content: "port tiny-blog" }],
        gate: { name: "site-port:verify", ok: true },
        provenance: ["test"],
      },
    });
    expect(good.ok).toBe(true);
  });

  test("pickBestSubmissionsByContributorFixture keeps strongest verify score", () => {
    const picked = pickBestSubmissionsByContributorFixture([
      { id: "a", fixtureId: "tinyBlog", contributor: "c1", verifyCorrectness: 0.5, shardId: "s1", submittedAt: "2026-01-01T00:00:00.000Z" },
      { id: "b", fixtureId: "tinyBlog", contributor: "c1", verifyCorrectness: 1, shardId: "s2", submittedAt: "2026-01-02T00:00:00.000Z" },
      { id: "c", fixtureId: "expressJs", contributor: "c1", verifyCorrectness: 1, shardId: "s3", submittedAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(picked).toHaveLength(2);
    expect(picked.find((s) => s.fixtureId === "tinyBlog")?.id).toBe("b");
  });

  test("federation WVB merge adds open-fixture cases", () => {
    const base = buildWebVerifyBenchmark({ repoRoot });
    const extra = buildWvbCasesForWorkUnit(
      { id: "tinyBlog", fixtureRel: "fixtures/tiny-blog", origin: "php", minRoutes: 5, tags: ["php"] },
      [{ method: "GET", path: "/vmf-merge-probe-unique" }],
    );
    const merged = mergeWvbWithFederationCases(base, extra);
    expect(merged.caseCount).toBe(base.caseCount + 1);
    expect(merged.cases.some((c) => c.id.startsWith("vmf-tinyBlog"))).toBe(true);
  });

  test("buildPolicyGraph and OracleRef shorthands from port report", () => {
    const port = {
      ok: true,
      cwl: { ok: true, cwlPath: "fixtures/tiny-blog/routes.cwl", routeCount: 5 },
      verify: { ok: true, correctness: 1, mode: "probe-replay" },
    };
    const t4 = buildPolicyGraphShorthandFromPortReport("tinyBlog", port);
    const t5 = buildOracleRefShorthandFromPortReport("tinyBlog", port);
    expect(t4?.tier).toBe("IS-T4-policy-graph");
    expect(t5?.tier).toBe("IS-T5-oracle-ref");
    const summary = summarizeIntelligenceShorthands([t4!, t5!]);
    expect(summary.compressionVs7BTotal).toBeGreaterThan(10_000);
  });

  test("buildSkillCapsuleFromShard collapses verify-green shard to IS-T3", () => {
    const shard = {
      kind: WEB_LLM_TRAINING_SHARD_KIND,
      schemaVersion: WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION,
      id: "shard-is-test",
      sessionId: "sess-is-test",
      generatedAt: new Date().toISOString(),
      messages: [
        { role: "user" as const, content: "port tiny-blog" },
        { role: "assistant" as const, content: "CWL export complete" },
      ],
      gate: { name: "site-port:verify", ok: true, detail: { correctness: 1 } },
      tools: ["chrysalis.port-site"],
      provenance: ["test"],
    };
    const capsule = buildSkillCapsuleFromShard(shard, { domainId: "tinyBlog" });
    expect(capsule?.tier).toBe("IS-T3-skill-capsule");
    expect(capsule?.storageBytesEstimate).toBeLessThan(4096);
    expect(capsule?.compressionFactorVs7BWeights).toBeGreaterThanOrEqual(10_000);
    expect(validateIntelligenceShorthand(capsule).ok).toBe(true);
  });

  test("site-port step logging appends gated trajectory records", () => {
    const filePath = join(repoRoot, "generated/_web-llm-unit/site-port-tiny-blog.jsonl");
    if (existsSync(filePath)) unlinkSync(filePath);
    const projectDir = join(repoRoot, "fixtures/tiny-blog");
    logSitePortStep({
      repoRoot,
      projectDir,
      gateName: SITE_PORT_GATE_NAMES.intelligence,
      ok: true,
      trajectoryPath: filePath,
    });
    const records = readTrajectoryRecords(filePath);
    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(resolveSitePortTrajectoryPath(repoRoot, projectDir)).toContain("tiny-blog.jsonl");
  });

  test("buildLoraTrainManifest requires verify-green shards", () => {
    const manifest = buildLoraTrainManifest({
      repoRoot,
      shards: [
        {
          kind: WEB_LLM_TRAINING_SHARD_KIND,
          schemaVersion: WEB_LLM_TRAINING_SHARD_SCHEMA_VERSION,
          sessionId: "unit",
          messages: [{ role: "user", content: "hi" }],
          gate: { name: "unit", ok: true },
          tools: [],
          provenance: ["test"],
        },
      ],
    });
    expect(manifest.kind).toBe(LORA_TRAIN_MANIFEST_KIND);
    expect(manifest.tier).toBe("IS-T2-lora-delta");
    expect(manifest.shardCount).toBe(1);
    expect(manifest.verifyGreenCount).toBe(1);
    expect(validateLoraTrainManifest(manifest).ok).toBe(true);
    expect(validateLoraTrainManifest({ ...manifest, verifyGreenCount: 0 }).ok).toBe(false);
  });
});
