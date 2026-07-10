#!/usr/bin/env node
/** Shared web-LLM agent tool runner for MCP server and POC demos. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runWebLlmBuildBenchmark } from "./web-llm-build-benchmark.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

async function loadWebLlm() {
  try {
    return await import("@chrysalis/web-llm");
  } catch {
    return import(pathToFileURL(join(scriptRoot, "packages/web-llm/dist/index.js")).href);
  }
}

function runCli(args) {
  if (!existsSync(cliBin)) {
    return { ok: false, skip: "cli-not-built", stderr: "Run pnpm --filter @chrysalis/cli build" };
  }
  const r = spawnSync(process.execPath, [cliBin, ...args], {
    cwd: scriptRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    ok: (r.status ?? 1) === 0,
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

/**
 * @param {string} repoRoot
 * @param {string} name
 * @param {Record<string, unknown>} [args]
 */
export async function callWebLlmTool(repoRoot, name, args = {}) {
  const mod = await loadWebLlm();
  // G9570 / G9580 — governor + optional aim gate before RED/YELLOW mutate paths
  if (
    name === "hub_convert_apply_holes" ||
    name === "chrysalis_verify" ||
    name === "web_llm_demote_shorthand"
  ) {
    const gated = mod.gateConvertCycle({
      aim:
        args.domainId != null
          ? mod.createConvertAim({
              domainId: String(args.domainId),
              successGate: String(args.successGate ?? "verify-green"),
            })
          : args.aimDomainId != null
            ? mod.createConvertAim({
                domainId: String(args.aimDomainId),
                successGate: String(args.successGate ?? "verify-green"),
              })
            : null,
      nudge: args.nudge != null ? String(args.nudge) : String(args.domainId ?? name),
      action: name,
      confirmApply: args.confirmApply === true,
      verifyGatePass: args.verifyGatePass === true || args.gateOk === true,
    });
    if (!gated.ok) {
      return {
        ok: false,
        stdout: JSON.stringify(gated, null, 2),
        detail: gated,
        stderr: gated.reason,
      };
    }
  } else if (name === "hub_convert_propose_holes" && args.requireAim === true) {
    const gated = mod.gateConvertCycle({
      aim: args.domainId
        ? mod.createConvertAim({
            domainId: String(args.domainId),
            successGate: String(args.successGate ?? "verify-green"),
          })
        : null,
      nudge: args.nudge != null ? String(args.nudge) : undefined,
      action: name,
    });
    if (!gated.ok) {
      return {
        ok: false,
        stdout: JSON.stringify(gated, null, 2),
        detail: gated,
        stderr: gated.reason,
      };
    }
  }
  switch (name) {
    case "chrysalis_status":
      return runCli(["status", "--json", String(args.projectDir ?? ".")]);
    case "chrysalis_verify": {
      const cliArgs = ["verify", "--project", String(args.projectDir ?? ".")];
      if (args.jsonSummary === true) cliArgs.push("--json-summary");
      return runCli(cliArgs);
    }
    case "chrysalis_ingest":
      return runCli([
        "ingest",
        String(args.originDir ?? "."),
        ...(args.language ? ["--language", String(args.language)] : []),
      ]);
    case "chrysalis_insight":
      return runCli(["insight", String(args.projectDir ?? ".")]);
    case "web_llm_build_benchmark": {
      const r = await runWebLlmBuildBenchmark({
        repoRoot: args.repoRoot ? String(args.repoRoot) : repoRoot,
        outPath: args.outPath ? String(args.outPath) : undefined,
      });
      return { ok: r.ok, stdout: JSON.stringify(r, null, 2), detail: r, stderr: "" };
    }
    case "web_llm_build_leaderboard": {
      const { runWebLlmBuildLeaderboard } = await import("./web-llm-build-leaderboard.mjs");
      const r = await runWebLlmBuildLeaderboard({
        repoRoot: args.repoRoot ? String(args.repoRoot) : repoRoot,
        outDir: args.outDir ? String(args.outDir) : undefined,
      });
      return { ok: r.ok, stdout: JSON.stringify(r, null, 2), detail: r, stderr: "" };
    }
    case "web_llm_export_dataset": {
      const { runWebLlmExportDataset } = await import("./web-llm-export-dataset.mjs");
      const r = await runWebLlmExportDataset({
        repoRoot: args.repoRoot ? String(args.repoRoot) : repoRoot,
        outDir: args.outDir ? String(args.outDir) : undefined,
      });
      return { ok: r.ok, stdout: JSON.stringify(r, null, 2), detail: r, stderr: "" };
    }
    case "web_llm_export_shorthand": {
      const { exportIntelligenceShorthands } = await import("./web-llm-export-shorthand.mjs");
      const r = await exportIntelligenceShorthands({
        repoRoot: args.repoRoot ? String(args.repoRoot) : repoRoot,
      });
      if (args.buildHub === true && r.ok === true) {
        const { runWebLlmBuildShorthandHub } = await import("./web-llm-build-shorthand-hub.mjs");
        const hub = await runWebLlmBuildShorthandHub({
          repoRoot: args.repoRoot ? String(args.repoRoot) : repoRoot,
        });
        return { ok: r.ok && hub.ok === true, stdout: JSON.stringify({ export: r, hub }, null, 2), detail: { export: r, hub }, stderr: "" };
      }
      return { ok: r.ok, stdout: JSON.stringify(r, null, 2), detail: r, stderr: "" };
    }
    case "web_llm_preferred_shorthand_tier": {
      if (args.domainId && typeof args.domainId === "string") {
        const shorthands = mod.loadIntelligenceShorthandsFromRepo(
          args.repoRoot ? String(args.repoRoot) : repoRoot,
        );
        const resolved = mod.resolveShorthandForTask({
          domainId: String(args.domainId),
          shorthands,
          needsNovelLanguage: args.needsNovelLanguage === true,
        });
        return { ok: true, stdout: JSON.stringify(resolved, null, 2), detail: resolved, stderr: "" };
      }
      const tier = mod.preferredShorthandTierForTask({
        hasOracleReplay: args.hasOracleReplay === true,
        hasPolicyGraph: args.hasPolicyGraph === true,
        needsNovelLanguage: args.needsNovelLanguage === true,
      });
      const spec = mod.tierSpec(tier);
      const body = { tier, spec };
      return { ok: true, stdout: JSON.stringify(body, null, 2), detail: body, stderr: "" };
    }
    case "web_llm_resolve_shorthand": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const shorthands = mod.loadIntelligenceShorthandsFromRepo(root);
      /** @type {import("@chrysalis/web-llm").OpenLegacyDomainEntry[] | undefined} */
      let domainCatalog;
      if (args.enableNearMiss === true) {
        const { openLegacyIndexEntries } = await import("./site-port-federation-lib.mjs");
        domainCatalog = openLegacyIndexEntries(root).map((e) => ({
          id: e.id,
          origin: e.origin,
          minRoutes: e.minRoutes,
          tags: e.tags,
          fixtureRel: e.fixtureRel,
        }));
      }
      const resolved = mod.resolveShorthandForTask({
        domainId: String(args.domainId ?? ""),
        shorthands,
        needsNovelLanguage: args.needsNovelLanguage === true,
        ...(domainCatalog ? { domainCatalog } : {}),
        utilityStorePath: mod.defaultIsUtilityPath(root),
      });
      const ok =
        Boolean(args.domainId) &&
        (resolved.retrievalHit === true || resolved.cacheOutcome === "near-miss");
      return { ok, stdout: JSON.stringify(resolved, null, 2), detail: resolved, stderr: "" };
    }
    case "web_llm_is_live_analytics": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const trajectoryPath = resolve(root, String(args.trajectoryPath ?? ""));
      const summary = mod.summarizeIsLiveAnalyticsFromTrajectoryFile(trajectoryPath, {
        scope: "live-job",
      });
      let outPath = null;
      if (args.writeReport === true) {
        outPath = mod.writeIsLiveAnalytics(root, summary);
      }
      return {
        ok: summary.jobCount >= 0,
        stdout: JSON.stringify({ ...summary, outPath }, null, 2),
        detail: { ...summary, outPath },
        stderr: "",
      };
    }
    case "web_llm_demote_shorthand": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const result = mod.demoteShorthandInRepo({
        repoRoot: root,
        domainId: String(args.domainId ?? ""),
        reason: /** @type {"verify-fail"|"source-digest-mismatch"|"operator"} */ (
          String(args.reason ?? "operator")
        ),
        sourceDigest: args.sourceDigest ? String(args.sourceDigest) : undefined,
      });
      const ok = result != null && Boolean(args.domainId);
      return { ok, stdout: JSON.stringify(result, null, 2), detail: result, stderr: "" };
    }
    case "web_llm_score_near_miss": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const { openLegacyIndexEntries } = await import("./site-port-federation-lib.mjs");
      const domainCatalog = openLegacyIndexEntries(root).map((e) => ({
        id: e.id,
        origin: e.origin,
        minRoutes: e.minRoutes,
        tags: e.tags,
        fixtureRel: e.fixtureRel,
      }));
      const shorthands = mod.loadIntelligenceShorthandsFromRepo(root);
      const entry = domainCatalog.find((e) => e.id === String(args.domainId ?? ""));
      const taskFingerprint = entry
        ? mod.fingerprintFromOpenLegacyEntry(entry)
        : { domainId: String(args.domainId ?? ""), origin: "unknown" };
      const scored = mod.scoreNearMissCandidates({
        taskFingerprint,
        domainCatalog,
        shorthands,
        ...(args.lastDonorDomainId ? { lastDonorDomainId: String(args.lastDonorDomainId) } : {}),
      });
      const body = {
        domainId: args.domainId,
        candidates: scored,
        attribution: mod.CYNOENGINE_ATTRIBUTION,
      };
      return { ok: Boolean(args.domainId), stdout: JSON.stringify(body, null, 2), detail: body, stderr: "" };
    }
    case "web_llm_record_utility_outcome": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const path = mod.defaultIsUtilityPath(root);
      let store = mod.loadIsUtilityStore(path);
      store = mod.recordUtilityOutcome(store, {
        domainId: String(args.domainId ?? ""),
        outcome: /** @type {"useful"|"noise"} */ (String(args.outcome ?? "noise")),
        ...(typeof args.verifyCorrectness === "number"
          ? { verifyCorrectness: Number(args.verifyCorrectness) }
          : {}),
      });
      mod.writeIsUtilityStore(path, store);
      return { ok: Boolean(args.domainId), stdout: JSON.stringify(store, null, 2), detail: store, stderr: "" };
    }
    case "hub_convert_govern_action": {
      const decision = mod.governConvertAction({
        action: String(args.action ?? ""),
        confirmApply: args.confirmApply === true,
        verifyGatePass: args.verifyGatePass === true,
      });
      return { ok: decision.ok === true || decision.tier === "GREEN" || decision.tier === "YELLOW", stdout: JSON.stringify(decision, null, 2), detail: decision, stderr: "" };
    }
    case "hub_convert_evaluate_aim": {
      const aim = mod.createConvertAim({
        domainId: String(args.domainId ?? ""),
        successGate: String(args.successGate ?? "verify-green"),
        ...(args.origin ? { origin: String(args.origin) } : {}),
        ...(args.output ? { output: String(args.output) } : {}),
      });
      const decision = mod.evaluateAimDrive({
        aim: args.domainId ? aim : null,
        nudge: args.nudge != null ? String(args.nudge) : undefined,
      });
      return { ok: decision.ok === true || decision.stall === true, stdout: JSON.stringify(decision, null, 2), detail: decision, stderr: "" };
    }
    case "hub_convert_is_routing": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const { resolveHubConvertIsRouting } = await import("./hub-ingest/hub-llm-convert-is-routing.mjs");
      const routing = await resolveHubConvertIsRouting({
        repoRoot: root,
        origin: String(args.origin ?? "php"),
        output: String(args.output ?? "hono"),
        projectDir: args.projectDir ? String(args.projectDir) : undefined,
      });
      const ok = routing.proposeOnly === true && routing.verifyRequired === true;
      return { ok, stdout: JSON.stringify(routing, null, 2), detail: routing, stderr: "" };
    }
    case "hub_convert_propose_holes": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const { proposeHubConvertHolePatches } = await import("./hub-ingest/hub-llm-convert-hole-proposals.mjs");
      const report = await proposeHubConvertHolePatches({
        projectDir: resolve(root, String(args.projectDir ?? ".")),
        domainId: args.domainId ? String(args.domainId) : undefined,
        enrichWithLlm: args.enrichWithLlm === true,
        skipLlm: args.skipLlm === true,
        tier: args.tier ? String(args.tier) : undefined,
      });
      const ok = report.applied === false && report.verifyRequired === true;
      return { ok, stdout: JSON.stringify(report, null, 2), detail: report, stderr: "" };
    }
    case "hub_convert_verify_gate": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const { recordConvertVerifyGate } = await import("./hub-ingest/hub-llm-convert-verify-apply.mjs");
      const result = await recordConvertVerifyGate({
        projectDir: resolve(root, String(args.projectDir ?? ".")),
      });
      const ok = result.gatePass === true || result.record?.verifyGate?.gatePass === true;
      return { ok, stdout: JSON.stringify(result, null, 2), detail: result, stderr: "" };
    }
    case "hub_convert_apply_holes": {
      const root = args.repoRoot ? String(args.repoRoot) : repoRoot;
      const { applyHubConvertHoleProposals } = await import("./hub-ingest/hub-llm-convert-verify-apply.mjs");
      const result = await applyHubConvertHoleProposals({
        projectDir: resolve(root, String(args.projectDir ?? ".")),
        confirmApply: args.confirmApply === true,
      });
      const ok = args.confirmApply !== true ? result.applied === false : result.ok === true;
      return { ok, stdout: JSON.stringify(result, null, 2), detail: result, stderr: "" };
    }
    case "hub_convert_llm_enrich": {
      const mod = await loadWebLlm();
      const holes = Array.isArray(args.holes) ? args.holes : [];
      const enriched = await mod.enrichConvertHoleProposals({
        holes: holes.map((h) => ({
          name: String(h?.name ?? "legacy:unknown"),
          detail: h?.detail != null ? String(h.detail) : null,
        })),
        skipLlm: args.skipLlm === true,
        domainId: args.domainId ? String(args.domainId) : undefined,
        tier: args.tier ? String(args.tier) : undefined,
      });
      return { ok: enriched.enrichments.length === holes.length, stdout: JSON.stringify(enriched, null, 2), detail: enriched, stderr: "" };
    }
    case "web_llm_record_trajectory": {
      if (args.role === "assistant" && args.gateOk !== true && args.unverified !== true) {
        return { ok: false, stderr: "assistant records require gateOk or unverified", stdout: "" };
      }
      const record = mod.appendTrajectoryRecord({
        filePath: String(args.filePath),
        sessionId: String(args.sessionId),
        step: Number(args.step ?? 1),
        role: /** @type {"user"|"assistant"|"system"|"tool"} */ (String(args.role ?? "tool")),
        content: args.content ? String(args.content) : undefined,
        gate: args.gateName
          ? { name: String(args.gateName), ok: args.gateOk === true }
          : undefined,
        unverified: args.unverified === true,
        isTier: args.isTier ? String(args.isTier) : undefined,
        isRetrievalHit: args.isRetrievalHit === true ? true : undefined,
        skipLlm: args.skipLlm === true ? true : undefined,
        domainId: args.domainId ? String(args.domainId) : undefined,
      });
      return { ok: true, stdout: JSON.stringify(record, null, 2), detail: record, stderr: "" };
    }
    default:
      return { ok: false, stderr: `unknown tool: ${name}`, stdout: "" };
  }
}
