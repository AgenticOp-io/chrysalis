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
      const resolved = mod.resolveShorthandForTask({
        domainId: String(args.domainId ?? ""),
        shorthands,
        needsNovelLanguage: args.needsNovelLanguage === true,
      });
      const ok = Boolean(args.domainId) && resolved.retrievalHit === true;
      return { ok, stdout: JSON.stringify(resolved, null, 2), detail: resolved, stderr: "" };
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
