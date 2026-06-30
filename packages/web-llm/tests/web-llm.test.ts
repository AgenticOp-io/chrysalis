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
import { buildSkillCapsuleFromShard, buildOracleRefShorthandFromPortReport, buildPolicyGraphShorthandFromPortReport, summarizeIntelligenceShorthands, validateIntelligenceShorthand } from "../src/shorthand.js";
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
    expect(tools.length).toBeGreaterThanOrEqual(9);
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
});
