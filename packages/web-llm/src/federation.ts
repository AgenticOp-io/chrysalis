import { createHash } from "node:crypto";
import { join } from "node:path";
import { WEB_LLM_TRAINING_SHARD_KIND } from "./kinds.js";
import { evaluateVerifyGatePolicy } from "./policy.js";
import type { LeaderboardEntry, TrainingShard, WebVerifyBenchmark } from "./types.js";

export const FEDERATION_REGISTRY_KIND = "chrysalis.site-port-federation.registry.v1";
export const FEDERATION_SUBMISSION_KIND = "chrysalis.site-port-federation.submission.v1";
export const FEDERATION_REGISTRY_SCHEMA_VERSION = 1;
export const FEDERATION_SUBMISSION_SCHEMA_VERSION = 1;

export type FederationWorkUnit = {
  id: string;
  fixtureRel: string;
  origin: string;
  minRoutes: number;
  license?: string;
  tags?: string[];
};

export type FederationRegistry = {
  kind: typeof FEDERATION_REGISTRY_KIND;
  schemaVersion: number;
  workUnits: FederationWorkUnit[];
  submissions: FederationSubmissionIndex[];
  generatedAt: string;
};

export type FederationSubmissionIndex = {
  id: string;
  fixtureId: string;
  contributor: string;
  verifyCorrectness: number;
  shardId: string;
  submittedAt: string;
};

export type FederationSubmission = {
  kind: typeof FEDERATION_SUBMISSION_KIND;
  schemaVersion: number;
  id: string;
  fixtureId: string;
  contributor: string;
  verifyCorrectness: number;
  portReportOk: boolean;
  shard: TrainingShard;
  submittedAt: string;
};

export type SitePortReportSummary = {
  ok?: boolean;
  origin?: string;
  cwl?: { routeCount?: number | null; holeCount?: number | null };
  verify?: { ok?: boolean; correctness?: number | null };
  trajectory?: { sessionId?: string | null };
};

const FORBIDDEN_PATTERNS = [
  /password\s*=\s*['"][^'"]+['"]/i,
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
  /\.env\.(local|production)/i,
];

export function resolveFederationDir(repoRoot: string) {
  const fromEnv = process.env.CHRYSALIS_FEDERATION_DIR?.trim();
  if (fromEnv) return fromEnv;
  return join(repoRoot, "reports/federation");
}

export function federationContributorId() {
  return (
    process.env.CHRYSALIS_FEDERATION_CONTRIBUTOR?.trim() ||
    process.env.USER ||
    process.env.USERNAME ||
    "anonymous"
  );
}

export function scanShardForForbiddenContent(shard: TrainingShard): string[] {
  const hits: string[] = [];
  const text = shard.messages.map((m) => m.content).join("\n");
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(text)) hits.push(re.source);
  }
  return hits;
}

export function validateFederationShard(shard: TrainingShard): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (shard.kind !== WEB_LLM_TRAINING_SHARD_KIND) {
    reasons.push("shard:wrong-kind");
  }
  if (!shard.gate || shard.gate.ok !== true) {
    reasons.push("shard:gate-not-ok");
  }
  const forbidden = scanShardForForbiddenContent(shard);
  if (forbidden.length) {
    reasons.push(`shard:forbidden-content:${forbidden.join(",")}`);
  }
  const policy = evaluateVerifyGatePolicy({ gateOk: shard.gate?.ok === true });
  if (!policy.ok) reasons.push(...policy.reasons);
  return { ok: reasons.length === 0, reasons };
}

export function validateFederationSubmission(input: {
  workUnit: FederationWorkUnit;
  portReport: SitePortReportSummary;
  shard: TrainingShard;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.portReport.ok !== true) reasons.push("port-report:not-ok");
  if ((input.portReport.verify?.correctness ?? 0) < 1) {
    reasons.push("verify:correctness-below-1");
  }
  if ((input.portReport.cwl?.routeCount ?? 0) < input.workUnit.minRoutes) {
    reasons.push("cwl:route-count-below-min");
  }
  const shardVal = validateFederationShard(input.shard);
  if (!shardVal.ok) reasons.push(...shardVal.reasons);
  return { ok: reasons.length === 0, reasons };
}

/** Keep the strongest submission per contributor+fixture (verify correctness wins). */
export function pickBestSubmissionsByContributorFixture(
  submissions: FederationSubmissionIndex[],
): FederationSubmissionIndex[] {
  const best = new Map<string, FederationSubmissionIndex>();
  for (const sub of submissions) {
    const key = `${sub.contributor}:${sub.fixtureId}`;
    const prev = best.get(key);
    if (!prev || sub.verifyCorrectness > prev.verifyCorrectness) {
      best.set(key, sub);
    } else if (
      sub.verifyCorrectness === prev.verifyCorrectness &&
      sub.submittedAt.localeCompare(prev.submittedAt) > 0
    ) {
      best.set(key, sub);
    }
  }
  return [...best.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function buildFederationLeaderboardEntries(
  submissions: FederationSubmissionIndex[],
  benchmark: WebVerifyBenchmark,
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [
    {
      id: "chrysalis-engine",
      label: "Chrysalis engine (verify substrate)",
      wvbCaseCount: benchmark.caseCount,
      gatePassRate: 1,
      notes: "Baseline WVB inventory from in-repo fixtures.",
    },
  ];

  /** @type {Map<string, { total: number; ok: number }>} */
  const byContributor = new Map();
  for (const sub of submissions) {
    const row = byContributor.get(sub.contributor) ?? { total: 0, ok: 0 };
    row.total += 1;
    if (sub.verifyCorrectness >= 1) row.ok += 1;
    byContributor.set(sub.contributor, row);
  }

  for (const [contributor, stats] of byContributor) {
    entries.push({
      id: `contributor-${contributor}`,
      label: `VMF contributor: ${contributor}`,
      wvbCaseCount: stats.ok,
      gatePassRate: stats.total ? stats.ok / stats.total : 0,
      notes: `${stats.ok}/${stats.total} verify-green shard(s) in federation registry.`,
    });
  }

  entries.push({
    id: "placeholder-fine-tune",
    label: "CWL-native fine-tune (sponsor slot)",
    notes: "Reserved for sponsor-funded open weights evaluated on WVB.",
  });

  return entries;
}

export const OPEN_LEGACY_INDEX_KIND = "chrysalis.site-port-federation.open-legacy-index.v1";

export type OpenLegacyIndexEntry = FederationWorkUnit & {
  title: string;
  tags?: string[];
};

export type OpenLegacyIndex = {
  kind: typeof OPEN_LEGACY_INDEX_KIND;
  schemaVersion: number;
  entries: OpenLegacyIndexEntry[];
  generatedAt?: string;
};

export function federationSubmissionId(fixtureId: string, sessionId: string, contributor: string) {
  const h = createHash("sha256").update(`${fixtureId}:${sessionId}:${contributor}`).digest("hex").slice(0, 12);
  return `sub-${h}`;
}

/** Build WVB cases from a verified open-fixture work unit (routes.json only). */
export function buildWvbCasesForWorkUnit(
  workUnit: FederationWorkUnit,
  routes: Array<{ method?: string; path?: string }>,
): import("./types.js").WebVerifyBenchmarkCase[] {
  const cases: import("./types.js").WebVerifyBenchmarkCase[] = [];
  let i = 0;
  for (const route of routes) {
    const method = String(route.method ?? "GET").toUpperCase();
    const path = String(route.path ?? "/");
    cases.push({
      id: `vmf-${workUnit.id}-${method}-${path.replace(/[^a-zA-Z0-9]+/g, "_")}-${i++}`,
      fixture: workUnit.fixtureRel.replace(/^fixtures\//, ""),
      path,
      method,
      task: "migrate",
      tier: workUnit.tags?.includes("oracle") ? "oracle" : "structural",
      tags: ["vmf", "open-legacy-index", workUnit.id],
    });
  }
  return cases;
}

export function mergeWvbWithFederationCases(
  base: WebVerifyBenchmark,
  extra: import("./types.js").WebVerifyBenchmarkCase[],
): WebVerifyBenchmark {
  const cases = [...base.cases];
  const seen = new Set(cases.map((c) => `${c.fixture}:${c.method}:${c.path}`));
  for (const c of extra) {
    const key = `${c.fixture}:${c.method}:${c.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cases.push(c);
  }
  cases.sort((a, b) => a.id.localeCompare(b.id));
  const tiers: WebVerifyBenchmark["tiers"] = {};
  const tasks: WebVerifyBenchmark["tasks"] = {};
  for (const c of cases) {
    tiers[c.tier] = (tiers[c.tier] ?? 0) + 1;
    tasks[c.task] = (tasks[c.task] ?? 0) + 1;
  }
  return {
    ...base,
    caseCount: cases.length,
    cases,
    tiers,
    tasks,
    generatedAt: new Date().toISOString(),
  };
}
