/** Commercial / distribution tier label (ordering used for MIN_TIER enforcement). */
export type LicenseTier = "dev" | "pro" | "enterprise";

export type LicenseClaims = {
  /** Customer or org identifier (opaque string). */
  sub: string;
  tier: LicenseTier;
  /** Expiration (Unix seconds; verify uses `now < exp`). */
  exp: number;
  /** Optional issuer id (e.g. maintainer org). */
  iss?: string;
  /** Issued-at (Unix seconds). */
  iat?: number;
  /** Optional feature flags for fine-grained gating. */
  features?: string[];
};

export type LicenseEnvelope = {
  claims: LicenseClaims;
  /** Ed25519 signature over UTF-8 `canonicalStringify(claims)`, base64-encoded. */
  sig: string;
};
