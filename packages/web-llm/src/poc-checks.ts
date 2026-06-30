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
    default:
      return { ok: false, skip: `unknown-check:${step.check}` };
  }
}

export function summarizeBenchmarkForPoc(repoRoot: string) {
  const benchmark = buildWebVerifyBenchmark({ repoRoot });
  return summarizeWebVerifyBenchmark(benchmark);
}
