import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  IS_LIVE_ANALYTICS_KIND,
  IS_LIVE_ANALYTICS_SCHEMA_VERSION,
} from "./kinds.js";
import type { TrajectoryRecord } from "./types.js";
import { readTrajectoryRecords } from "./trajectory.js";

/** Cache outcome for one IS resolve / job step (D6372). */
export type IsCacheOutcome = "hit" | "near-miss" | "miss";

export type IsLiveJobOutcome = {
  domainId: string;
  outcome: IsCacheOutcome;
  tier?: string;
  skipLlm?: boolean;
  verifyCostMs?: number;
  verifyOk?: boolean;
  sourceDigest?: string;
  sessionId?: string;
  ts?: string;
};

export type IsLiveAnalyticsSummary = {
  kind: typeof IS_LIVE_ANALYTICS_KIND;
  schemaVersion: typeof IS_LIVE_ANALYTICS_SCHEMA_VERSION;
  generatedAt: string;
  jobCount: number;
  hitCount: number;
  nearMissCount: number;
  missCount: number;
  hitRate: number;
  nearMissRate: number;
  missRate: number;
  /** Jobs with measured verify wall time. */
  verifySampleCount: number;
  verifyCostMsTotal: number;
  verifyCostMsP50: number | null;
  verifyCostMsMean: number | null;
  verifyFailCount: number;
  skipLlmCount: number;
  jobs: IsLiveJobOutcome[];
  /** Honest scope note — fixture vs live. */
  scope: "live-job" | "synthetic-smoke" | "fixture-domains";
  notes?: string[];
};

function percentileSorted(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx] ?? null;
}

/** Aggregate hit / near-miss / miss + verify cost from job outcomes. */
export function summarizeIsLiveAnalytics(
  jobs: IsLiveJobOutcome[],
  opts: { scope?: IsLiveAnalyticsSummary["scope"]; notes?: string[] } = {},
): IsLiveAnalyticsSummary {
  let hitCount = 0;
  let nearMissCount = 0;
  let missCount = 0;
  let skipLlmCount = 0;
  let verifyFailCount = 0;
  const verifyCosts: number[] = [];

  for (const job of jobs) {
    if (job.outcome === "hit") hitCount += 1;
    else if (job.outcome === "near-miss") nearMissCount += 1;
    else missCount += 1;
    if (job.skipLlm === true) skipLlmCount += 1;
    if (job.verifyOk === false) verifyFailCount += 1;
    if (typeof job.verifyCostMs === "number" && Number.isFinite(job.verifyCostMs) && job.verifyCostMs >= 0) {
      verifyCosts.push(job.verifyCostMs);
    }
  }

  const jobCount = jobs.length;
  const sorted = [...verifyCosts].sort((a, b) => a - b);
  const verifyCostMsTotal = verifyCosts.reduce((a, b) => a + b, 0);

  return {
    kind: IS_LIVE_ANALYTICS_KIND,
    schemaVersion: IS_LIVE_ANALYTICS_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    jobCount,
    hitCount,
    nearMissCount,
    missCount,
    hitRate: jobCount ? hitCount / jobCount : 0,
    nearMissRate: jobCount ? nearMissCount / jobCount : 0,
    missRate: jobCount ? missCount / jobCount : 0,
    verifySampleCount: verifyCosts.length,
    verifyCostMsTotal,
    verifyCostMsP50: percentileSorted(sorted, 0.5),
    verifyCostMsMean: verifyCosts.length ? Math.round(verifyCostMsTotal / verifyCosts.length) : null,
    verifyFailCount,
    skipLlmCount,
    jobs: [...jobs],
    scope: opts.scope ?? "live-job",
    ...(opts.notes?.length ? { notes: opts.notes } : {}),
  };
}

/**
 * Extract IS live outcomes from trajectory JSONL.
 * Prefers explicit `isCacheOutcome`; falls back to `isRetrievalHit` → hit/miss.
 */
export function extractIsLiveJobsFromTrajectory(records: TrajectoryRecord[]): IsLiveJobOutcome[] {
  const bySession = new Map<string, TrajectoryRecord[]>();
  for (const r of records) {
    const list = bySession.get(r.sessionId) ?? [];
    list.push(r);
    bySession.set(r.sessionId, list);
  }

  const jobs: IsLiveJobOutcome[] = [];
  for (const [sessionId, steps] of bySession) {
    const sorted = [...steps].sort((a, b) => a.step - b.step);
    const resolveStep =
      sorted.find((s) => s.isCacheOutcome != null || s.isRetrievalHit != null || s.domainId != null) ??
      sorted[0];
    if (!resolveStep) continue;

    let outcome: IsCacheOutcome | undefined = resolveStep.isCacheOutcome;
    if (!outcome) {
      if (resolveStep.isRetrievalHit === true) outcome = "hit";
      else if (resolveStep.isRetrievalHit === false) outcome = "miss";
      else continue;
    }

    const verifyStep = [...sorted].reverse().find((s) => typeof s.verifyCostMs === "number" || s.gate?.name?.includes("verify"));
    const domainId = resolveStep.domainId ?? verifyStep?.domainId ?? "unknown";

    jobs.push({
      domainId,
      outcome,
      ...(resolveStep.isTier != null ? { tier: resolveStep.isTier } : {}),
      ...(resolveStep.skipLlm != null ? { skipLlm: resolveStep.skipLlm } : {}),
      ...(typeof verifyStep?.verifyCostMs === "number" ? { verifyCostMs: verifyStep.verifyCostMs } : {}),
      ...(verifyStep?.gate != null ? { verifyOk: verifyStep.gate.ok === true } : {}),
      ...(resolveStep.sourceDigest != null ? { sourceDigest: resolveStep.sourceDigest } : {}),
      sessionId,
      ts: resolveStep.ts,
    });
  }
  return jobs;
}

export function summarizeIsLiveAnalyticsFromTrajectoryFile(
  filePath: string,
  opts: { scope?: IsLiveAnalyticsSummary["scope"]; notes?: string[] } = {},
): IsLiveAnalyticsSummary {
  const records = readTrajectoryRecords(filePath);
  return summarizeIsLiveAnalytics(extractIsLiveJobsFromTrajectory(records), opts);
}

export function defaultIsLiveAnalyticsPath(repoRoot: string): string {
  return join(repoRoot, "reports/web-llm/shorthand/is-live-analytics.v1.json");
}

export function writeIsLiveAnalytics(
  repoRoot: string,
  summary: IsLiveAnalyticsSummary,
  outPath?: string,
): string {
  const path = outPath ?? defaultIsLiveAnalyticsPath(repoRoot);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return path;
}

export function loadIsLiveAnalytics(path: string): IsLiveAnalyticsSummary | null {
  if (!existsSync(path)) return null;
  try {
    const doc = JSON.parse(readFileSync(path, "utf8")) as IsLiveAnalyticsSummary;
    if (doc.kind !== IS_LIVE_ANALYTICS_KIND) return null;
    return doc;
  } catch {
    return null;
  }
}
