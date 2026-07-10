import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { IntelligenceShorthand } from "./shorthand.js";
import {
  defaultIntelligenceShorthandIndexPath,
  loadIntelligenceShorthandsFromFile,
  promoteShorthandsByDomain,
  type IntelligenceShorthandBundle,
} from "./shorthand-retrieval.js";

export const IS_DEMOTE_LOG_KIND = "chrysalis.web-llm.is-demote-log";
export const IS_DEMOTE_LOG_SCHEMA_VERSION = 1;

export type DemoteShorthandInput = {
  domainId: string;
  /** Expected source digest; demote when capsule digest mismatches or verify failed. */
  sourceDigest?: string;
  reason: "verify-fail" | "source-digest-mismatch" | "operator";
  shorthands: IntelligenceShorthand[];
};

export type DemoteShorthandResult = {
  demoted: boolean;
  domainId: string;
  reason: DemoteShorthandInput["reason"];
  removedIds: string[];
  remaining: IntelligenceShorthand[];
};

/** Remove verify-gated capsules for a domain (auto-demote on verify fail / digest drift). */
export function demoteShorthandsForDomain(input: DemoteShorthandInput): DemoteShorthandResult {
  const removedIds: string[] = [];
  const remaining: IntelligenceShorthand[] = [];

  for (const sh of input.shorthands) {
    if (sh.domainId !== input.domainId) {
      remaining.push(sh);
      continue;
    }
    if (input.reason === "source-digest-mismatch" && input.sourceDigest) {
      const capsuleDigest = sh.payload.shardDigest ?? sh.payload.policyRef;
      if (capsuleDigest && capsuleDigest === input.sourceDigest) {
        remaining.push(sh);
        continue;
      }
    }
    removedIds.push(sh.id);
  }

  return {
    demoted: removedIds.length > 0,
    domainId: input.domainId,
    reason: input.reason,
    removedIds,
    remaining,
  };
}

export function defaultIsDemoteLogPath(repoRoot: string): string {
  return join(repoRoot, "reports/web-llm/shorthand/is-demote-log.v1.jsonl");
}

export function appendIsDemoteLog(
  repoRoot: string,
  entry: {
    domainId: string;
    reason: DemoteShorthandInput["reason"];
    removedIds: string[];
    sourceDigest?: string;
  },
  logPath?: string,
): string {
  const path = logPath ?? defaultIsDemoteLogPath(repoRoot);
  mkdirSync(dirname(path), { recursive: true });
  const line = {
    kind: IS_DEMOTE_LOG_KIND,
    schemaVersion: IS_DEMOTE_LOG_SCHEMA_VERSION,
    ts: new Date().toISOString(),
    ...entry,
  };
  appendFileSync(path, `${JSON.stringify(line)}\n`, "utf8");
  return path;
}

/**
 * Apply demotion to on-disk shorthand bundle and rewrite promoted list.
 * Returns null if index missing.
 */
export function demoteShorthandInRepo(input: {
  repoRoot: string;
  domainId: string;
  reason: DemoteShorthandInput["reason"];
  sourceDigest?: string;
  indexPath?: string;
}): DemoteShorthandResult | null {
  const indexPath = input.indexPath ?? defaultIntelligenceShorthandIndexPath(input.repoRoot);
  if (!existsSync(indexPath)) return null;

  const shorthands = loadIntelligenceShorthandsFromFile(indexPath);
  const result = demoteShorthandsForDomain({
    domainId: input.domainId,
    reason: input.reason,
    shorthands,
    ...(input.sourceDigest != null ? { sourceDigest: input.sourceDigest } : {}),
  });
  if (!result.demoted) return result;

  const doc = JSON.parse(readFileSync(indexPath, "utf8")) as IntelligenceShorthandBundle;
  const promoted = promoteShorthandsByDomain(result.remaining);
  const next: IntelligenceShorthandBundle = {
    ...doc,
    shorthands: result.remaining,
    promotedShorthands: promoted,
    count: result.remaining.length,
  };
  writeFileSync(indexPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  appendIsDemoteLog(input.repoRoot, {
    domainId: input.domainId,
    reason: input.reason,
    removedIds: result.removedIds,
    ...(input.sourceDigest != null ? { sourceDigest: input.sourceDigest } : {}),
  });
  return result;
}

/** Stable digest for source tree listing or CWL text (key capsules by source). */
export function sourceDigestFromText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 24);
}
