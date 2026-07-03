import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PocScenarioStep } from "./poc-scenarios.js";
import { buildWebVerifyBenchmark, summarizeWebVerifyBenchmark } from "./benchmark.js";
import { probeWispGceLiveAnchors } from "./poc-live-probe.js";

export type PocCheckResult = { ok: boolean; skip?: string; detail?: Record<string, unknown> };

export async function runPocCheck(
  step: Extract<PocScenarioStep, { kind: "check" }>,
  repoRoot: string,
): Promise<PocCheckResult> {
  switch (step.check) {
    case "min-wvb-cases": {
      const benchmark = buildWebVerifyBenchmark({ repoRoot });
      const min = step.min ?? 250;
      const ok = benchmark.caseCount >= min;
      return { ok, detail: { caseCount: benchmark.caseCount, min } };
    }
    case "min-shorthand-count": {
      const path = join(repoRoot, "reports/web-llm/shorthand/intelligence-shorthands.v1.json");
      if (!existsSync(path)) return { ok: false, skip: "shorthand-not-exported" };
      const bundle = JSON.parse(readFileSync(path, "utf8"));
      const count = bundle.summary?.count ?? bundle.count ?? 0;
      const min = step.min ?? 1;
      return { ok: count >= min, detail: { count, min, compressionVs7BTotal: bundle.summary?.compressionVs7BTotal ?? null } };
    }
    case "wisp-ui-anchors": {
      const benchmark = buildWebVerifyBenchmark({ repoRoot });
      const manifestPath = join(repoRoot, "fixtures/hub-wisp-management/chrysalis.wisp-ui-parity.v1.json");
      if (!existsSync(manifestPath)) return { ok: false, skip: "missing-parity-manifest" };
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const required = (manifest.anchors ?? []).map((a: { path: string }) => String(a.path));
      const paths = new Set((benchmark.cases ?? []).map((c) => c.path));
      const missing = required.filter((p: string) => !paths.has(p));
      const anchors = (benchmark.cases ?? []).filter((c) => (c.tags ?? []).includes("anchor"));
      return { ok: missing.length === 0, detail: { anchorCount: anchors.length, missing } };
    }
    case "wisp-ui-parity-manifest": {
      const path = join(repoRoot, "fixtures/hub-wisp-management/chrysalis.wisp-ui-parity.v1.json");
      if (!existsSync(path)) return { ok: false, skip: "missing-parity-manifest" };
      const manifest = JSON.parse(readFileSync(path, "utf8"));
      const ok = manifest.ok === true && (manifest.stubScan?.violationCount ?? 1) === 0;
      return { ok, detail: { violationCount: manifest.stubScan?.violationCount ?? null } };
    }
    case "wisp-demo-manifest": {
      const path = join(repoRoot, "fixtures/hub-wisp-management/wisp-demo-manifest.v1.json");
      if (!existsSync(path)) return { ok: false, skip: "missing-demo-manifest" };
      const text = readFileSync(path, "utf8");
      const ok =
        text.includes("cwl-native-api") &&
        text.includes("runtime-cwl-native") &&
        text.includes("cwl-native-login");
      return { ok, detail: { cwlNative: ok } };
    }
    case "wisp-gce-live-anchors": {
      const live = await probeWispGceLiveAnchors(repoRoot);
      return {
        ok: live.ok,
        ...(live.skip ? { skip: live.skip } : {}),
        detail: {
          baseUrl: live.baseUrl,
          strict: live.strict,
          probeCount: live.probes.length,
          passCount: live.probes.filter((p) => p.ok).length,
          probes: live.probes,
        },
      };
    }
    case "is-tier-skip-llm": {
      const { loadIntelligenceShorthandsFromRepo, resolveShorthandForTask } = await import(
        "./shorthand-retrieval.js"
      );
      const domainId = step.domainId ?? "tinyBlog";
      const shorthands = loadIntelligenceShorthandsFromRepo(repoRoot);
      const resolved = resolveShorthandForTask({ domainId, shorthands, needsNovelLanguage: false });
      const ok = resolved.retrievalHit === true && resolved.skipLlm === true;
      return {
        ok,
        detail: {
          domainId,
          tier: resolved.tier,
          retrievalHit: resolved.retrievalHit,
          skipLlm: resolved.skipLlm,
        },
      };
    }
    case "convert-proposals-never-applied": {
      const rel = step.projectDir ?? "fixtures/tiny-blog";
      const path = join(repoRoot, rel, ".chrysalis/hub-convert.hole-proposals.json");
      if (!existsSync(path)) {
        return { ok: true, detail: { skip: "no-proposals-artifact", projectDir: rel } };
      }
      const artifact = JSON.parse(readFileSync(path, "utf8"));
      const ok =
        artifact.applied === false &&
        (artifact.proposals ?? []).every((p: { apply?: boolean }) => p.apply !== true);
      return {
        ok,
        detail: {
          applied: artifact.applied,
          proposalCount: artifact.proposalCount ?? 0,
          projectDir: rel,
        },
      };
    }
    default:
      return { ok: false, skip: `unknown-check:${step.check}` };
  }
}

export function summarizeBenchmarkForPoc(repoRoot: string) {
  const benchmark = buildWebVerifyBenchmark({ repoRoot });
  return summarizeWebVerifyBenchmark(benchmark);
}
