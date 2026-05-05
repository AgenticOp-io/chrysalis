import { createPublicKey, verify as cryptoVerify, type KeyObject } from "node:crypto";
import { canonicalStringify } from "./canonical-json.js";
import type { LicenseClaims, LicenseEnvelope, LicenseTier } from "./types.js";

const TIERS = new Set<LicenseTier>(["dev", "pro", "enterprise"]);

const TIER_RANK: Record<LicenseTier, number> = {
  dev: 0,
  pro: 1,
  enterprise: 2,
};

export class LicenseVerificationError extends Error {
  override readonly name = "LicenseVerificationError";
  constructor(message: string) {
    super(message);
  }
}

export function parseLicenseClaims(claims: unknown): LicenseClaims {
  if (claims === null || typeof claims !== "object" || Array.isArray(claims)) {
    throw new LicenseVerificationError("license claims must be a JSON object");
  }
  const c = claims as Record<string, unknown>;
  if (typeof c.sub !== "string" || c.sub.length === 0) {
    throw new LicenseVerificationError("license claims.sub must be a non-empty string");
  }
  if (typeof c.tier !== "string" || !TIERS.has(c.tier as LicenseTier)) {
    throw new LicenseVerificationError(`license claims.tier must be one of: ${[...TIERS].join(", ")}`);
  }
  if (typeof c.exp !== "number" || !Number.isFinite(c.exp)) {
    throw new LicenseVerificationError("license claims.exp must be a finite number (Unix seconds)");
  }
  if (c.iss !== undefined && typeof c.iss !== "string") {
    throw new LicenseVerificationError("license claims.iss must be a string when present");
  }
  if (c.iat !== undefined && (typeof c.iat !== "number" || !Number.isFinite(c.iat))) {
    throw new LicenseVerificationError("license claims.iat must be a finite number when present");
  }
  if (c.features !== undefined) {
    if (!Array.isArray(c.features) || !c.features.every((f) => typeof f === "string")) {
      throw new LicenseVerificationError("license claims.features must be an array of strings when present");
    }
  }
  return claims as LicenseClaims;
}

function assertClaimsShape(claims: unknown): asserts claims is LicenseClaims {
  parseLicenseClaims(claims);
}

function loadPublicKey(publicKeyPem: string): KeyObject {
  try {
    return createPublicKey(publicKeyPem);
  } catch {
    throw new LicenseVerificationError("CHRYSALIS_LICENSE_PUBLIC_KEY(_PATH) is not a valid PEM public key");
  }
}

export function readPublicKeyFromPem(publicKeyPem: string): KeyObject {
  return loadPublicKey(publicKeyPem.trim());
}

/**
 * Verify an envelope signature and optional expiry. No network I/O.
 *
 * @param nowSeconds - Wall clock for `exp` check (tests inject a fixed value).
 */
export function verifyLicenseEnvelope(
  envelope: LicenseEnvelope,
  publicKey: KeyObject | string,
  options?: { nowSeconds?: number },
): LicenseClaims {
  assertClaimsShape(envelope.claims);
  if (typeof envelope.sig !== "string" || envelope.sig.length === 0) {
    throw new LicenseVerificationError("license envelope.sig must be a non-empty base64 string");
  }
  const key = typeof publicKey === "string" ? readPublicKeyFromPem(publicKey) : publicKey;
  const payload = Buffer.from(canonicalStringify(envelope.claims), "utf8");
  let sigBuf: Buffer;
  try {
    sigBuf = Buffer.from(envelope.sig, "base64");
  } catch {
    throw new LicenseVerificationError("license envelope.sig is not valid base64");
  }
  if (sigBuf.length === 0) {
    throw new LicenseVerificationError("license envelope.sig decodes to empty buffer");
  }
  const ok = cryptoVerify(null, payload, key, sigBuf);
  if (!ok) {
    throw new LicenseVerificationError("license signature does not match claims (wrong key or tampered envelope)");
  }
  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (now >= envelope.claims.exp) {
    throw new LicenseVerificationError(
      `license expired at ${envelope.claims.exp} (now ${now}); renew or issue a new envelope`,
    );
  }
  return envelope.claims;
}

/** Returns true if `featureId` is allowed for these claims (tier or explicit feature list). */
export function licenseAllowsFeature(claims: LicenseClaims, featureId: string): boolean {
  if (claims.tier === "enterprise") return true;
  return claims.features?.includes(featureId) ?? false;
}

/** Enforce minimum commercial tier (dev < pro < enterprise). */
export function assertMinLicenseTier(claims: LicenseClaims, minTier: LicenseTier): void {
  if (!TIERS.has(minTier)) {
    throw new LicenseVerificationError(`invalid min tier: ${minTier}`);
  }
  if (TIER_RANK[claims.tier] < TIER_RANK[minTier]) {
    throw new LicenseVerificationError(
      `license tier "${claims.tier}" does not meet required minimum "${minTier}"`,
    );
  }
}
