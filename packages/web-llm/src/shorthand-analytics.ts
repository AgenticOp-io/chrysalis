import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  IS_LIVE_ANALYTICS_KIND,
  IS_LIVE_ANALYTICS_SCHEMA_VERSION,
} from "./kinds.js";
import type { TrajectoryRecord } from "./types.js";
import { readTrajectoryRecords } from "./trajectory.js";

/** Cache outcome for one IS resolve / job step (D6372). */
export type IsCacheOutcome = "hit" | "near-miss" | "miss";

export type OperatorEvidenceSource = "seed" | "hub-convert-verify" | "synthetic-smoke";

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
  evidenceSource?: OperatorEvidenceSource;
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
  /** G9760 — provenance split (seed must not claim live READY). */
  seedJobCount: number;
  liveVerifiedJobCount: number;
  syntheticSmokeJobCount: number;
  jobs: IsLiveJobOutcome[];
  /** Honest scope note — fixture vs live. */
  scope: "live-job" | "synthetic-smoke" | "fixture-domains" | "operator-aggregate";
  notes?: string[];
};

/** Infer evidenceSource when older trajectories omit the field (G9760). */
export function resolveEvidenceSource(
  record: { evidenceSource?: OperatorEvidenceSource; sessionId?: string },
): OperatorEvidenceSource | undefined {
  if (record.evidenceSource) return record.evidenceSource;
  const sid = String(record.sessionId ?? "");
  if (sid.startsWith("seed-")) return "seed";
  if (sid.startsWith("hub-convert")) return "hub-convert-verify";
  return undefined;
}

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
  let seedJobCount = 0;
  let liveVerifiedJobCount = 0;
  let syntheticSmokeJobCount = 0;
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
    const src =
      job.evidenceSource ??
      resolveEvidenceSource(job.sessionId != null ? { sessionId: job.sessionId } : {});
    if (src === "seed") seedJobCount += 1;
    else if (src === "hub-convert-verify") liveVerifiedJobCount += 1;
    else if (src === "synthetic-smoke") syntheticSmokeJobCount += 1;
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
    seedJobCount,
    liveVerifiedJobCount,
    syntheticSmokeJobCount,
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

    const evidenceSource =
      resolveEvidenceSource(resolveStep) ??
      (verifyStep ? resolveEvidenceSource(verifyStep) : undefined);

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
      ...(evidenceSource != null ? { evidenceSource } : {}),
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

/** Merge multiple analytics summaries (dedupe by sessionId). */
export function mergeIsLiveAnalyticsSummaries(
  summaries: IsLiveAnalyticsSummary[],
): IsLiveAnalyticsSummary {
  const jobs: IsLiveJobOutcome[] = [];
  const seen = new Set<string>();
  for (const summary of summaries) {
    for (const job of summary.jobs) {
      const key = job.sessionId ?? `${job.domainId}:${job.ts ?? jobs.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(job);
    }
  }
  const scope = summaries.some((s) => s.scope === "live-job")
    ? "live-job"
    : (summaries[0]?.scope ?? "live-job");
  return summarizeIsLiveAnalytics(jobs, {
    scope,
    notes: [
      `Merged ${summaries.length} analytics artifact(s)`,
      ...summaries.flatMap((s) => s.notes ?? []),
    ],
  });
}

/**
 * Aggregate hit / near-miss / miss from multiple operator trajectory JSONL files (G9600).
 * Deduplicates by sessionId so re-exported smokes do not double-count.
 */
export function aggregateIsLiveAnalyticsFromTrajectoryFiles(
  paths: string[],
  opts: {
    scope?: IsLiveAnalyticsSummary["scope"];
    notes?: string[];
    excludePathPatterns?: RegExp[];
  } = {},
): IsLiveAnalyticsSummary {
  const excludes = opts.excludePathPatterns ?? [
    /[/\\]_is-live-analytics-smoke[/\\]/,
    /[/\\]_web-llm-smoke[/\\]/,
    /[/\\]_is-runtime-smoke[/\\]/,
    /[/\\]_hub-convert-verify-batch[/\\]/
  ];
  const jobs: IsLiveJobOutcome[] = [];
  const seen = new Set<string>();
  const usedPaths: string[] = [];
  for (const filePath of paths) {
    if (!existsSync(filePath)) continue;
    if (excludes.some((re) => re.test(filePath))) continue;
    usedPaths.push(filePath);
    for (const job of extractIsLiveJobsFromTrajectory(readTrajectoryRecords(filePath))) {
      const key = job.sessionId ?? `${job.domainId}:${job.ts ?? jobs.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      jobs.push(job);
    }
  }
  const scope =
    opts.scope ??
    (usedPaths.some((p) => p.includes("operator-evidence") || p.includes("hub-convert"))
      ? "live-job"
      : "operator-aggregate");
  return summarizeIsLiveAnalytics(jobs, {
    scope,
    notes: [
      ...(opts.notes ?? []),
      `Operator trajectory sources: ${usedPaths.length}`,
      ...usedPaths.map((p) => `  ${p}`),
    ],
  });
}

/** Copy hub-convert trajectory into reports for cross-job IS aggregation (G9600). */
export function snapshotOperatorTrajectoryForEvidence(
  repoRoot: string,
  sourcePath: string,
  meta: { domainId: string; fileName?: string },
): string | null {
  if (!existsSync(sourcePath)) return null;
  const destDir = join(repoRoot, "reports", "web-llm", "operator-evidence", meta.domainId);
  const fileName = meta.fileName ?? "latest.trajectory.jsonl";
  const dest = join(destDir, fileName);
  mkdirSync(destDir, { recursive: true });
  writeFileSync(dest, readFileSync(sourcePath, "utf8"), "utf8");
  return dest;
}

/** Discover hub-convert / site-port trajectory JSONL under reports and generated (operator evidence). */
export function discoverOperatorTrajectoryPaths(repoRoot: string): string[] {
  const roots = [
    join(repoRoot, "reports", "web-llm", "operator-evidence"),
    join(repoRoot, "reports", "web-llm"),
    join(repoRoot, "generated"),
  ];
  const out: string[] = [];
  const visit = (dir: string, depth: number) => {
    if (depth > 6 || !existsSync(dir)) return;
    try {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, ent.name);
        if (ent.isDirectory()) visit(full, depth + 1);
        else if (
          ent.name.endsWith(".trajectory.jsonl") ||
          ent.name === "hub-convert.trajectory.jsonl"
        ) {
          out.push(full);
        }
      }
    } catch {
      /* skip unreadable */
    }
  };
  for (const root of roots) visit(root, 0);
  return [...new Set(out)].sort();
}

/** Distinct domain folders under operator-evidence (G9630 production gate). */
export function countOperatorEvidenceDomains(repoRoot: string): number {
  const base = join(repoRoot, "reports", "web-llm", "operator-evidence");
  if (!existsSync(base)) return 0;
  try {
    return readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
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
    return {
      ...doc,
      seedJobCount: doc.seedJobCount ?? 0,
      liveVerifiedJobCount: doc.liveVerifiedJobCount ?? 0,
      syntheticSmokeJobCount: doc.syntheticSmokeJobCount ?? 0,
    };
  } catch {
    return null;
  }
}
