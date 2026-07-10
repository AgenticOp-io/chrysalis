import { createHash } from "node:crypto";

/** Structural fingerprint for exact / near-miss IS retrieval (D6372). */
export type ShorthandTaskFingerprint = {
  /** Open Legacy / hub domain id when known. */
  domainId?: string;
  /** Origin language stack (e.g. php, javascript). */
  origin: string;
  /** Route-count band from charter (minRoutes). */
  minRoutes?: number;
  /** Charter tags (framework, vertical, etc.). */
  tags?: string[];
  /** Digest of source tree or CWL/WebIR policy when available. */
  sourceDigest?: string;
  /** Stable route-shape digest (sorted path list hash). */
  routeFingerprint?: string;
  /** Digest of declared hole names (procedure + holes capsule). */
  holeDigest?: string;
};

export type OpenLegacyDomainEntry = {
  id: string;
  origin: string;
  minRoutes?: number;
  tags?: string[];
  fixtureRel?: string;
};

const GENERIC_TAGS = new Set(["oracle", "flagship", "structural", "showcase", "wedge"]);

/** Tags that carry transfer signal (framework / vertical), excluding generic labels. */
export function transferTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  return tags.filter((t) => !GENERIC_TAGS.has(t.toLowerCase()));
}

export function fingerprintFromOpenLegacyEntry(entry: OpenLegacyDomainEntry): ShorthandTaskFingerprint {
  return {
    domainId: entry.id,
    origin: entry.origin,
    ...(entry.minRoutes != null ? { minRoutes: entry.minRoutes } : {}),
    ...(entry.tags?.length ? { tags: [...entry.tags] } : {}),
  };
}

export function digestUtf8(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

/** Hash sorted route paths into a stable route fingerprint. */
export function routeFingerprintFromPaths(paths: string[]): string {
  const sorted = [...paths].map((p) => p.trim()).filter(Boolean).sort();
  return digestUtf8(sorted.join("\n"));
}

/** Hash sorted hole names for procedure+holes capsules. */
export function holeDigestFromNames(names: string[]): string {
  const sorted = [...names].map((n) => n.trim()).filter(Boolean).sort();
  return digestUtf8(sorted.join("\n"));
}

/**
 * Near-miss: same origin stack and either shared transfer tag or overlapping route-count band.
 * Exact domainId match is not near-miss (that is a hit).
 */
export function isNearMissFingerprint(
  task: ShorthandTaskFingerprint,
  candidate: ShorthandTaskFingerprint,
): boolean {
  if (task.domainId && candidate.domainId && task.domainId === candidate.domainId) {
    return false;
  }
  if (normalizeOrigin(task.origin) !== normalizeOrigin(candidate.origin)) {
    return false;
  }
  if (task.sourceDigest && candidate.sourceDigest && task.sourceDigest === candidate.sourceDigest) {
    return true;
  }
  if (
    task.routeFingerprint &&
    candidate.routeFingerprint &&
    task.routeFingerprint === candidate.routeFingerprint
  ) {
    return true;
  }
  const taskTags = new Set(transferTags(task.tags).map((t) => t.toLowerCase()));
  const candTags = transferTags(candidate.tags).map((t) => t.toLowerCase());
  if (candTags.some((t) => taskTags.has(t))) return true;

  if (task.minRoutes != null && candidate.minRoutes != null) {
    const a = task.minRoutes;
    const b = candidate.minRoutes;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    // Same origin + overlapping route-count band (within 2×) — migration near-miss.
    if (lo > 0 && hi / lo <= 2) return true;
  }
  // Same origin alone is not enough — that would inflate near-miss on every PHP pair.
  return false;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().toLowerCase();
}
