import { createPrivateKey, sign as cryptoSign, type KeyObject } from "node:crypto";
import { canonicalStringify } from "./canonical-json.js";
import type { LicenseClaims, LicenseEnvelope } from "./types.js";
import { LicenseVerificationError, parseLicenseClaims } from "./verify.js";

function loadPrivateKey(privateKeyPem: string): KeyObject {
  try {
    return createPrivateKey(privateKeyPem);
  } catch {
    throw new LicenseVerificationError("private key PEM is invalid");
  }
}

/**
 * Sign claims with an Ed25519 private key (maintainer / vendor use).
 * The default OSS CLI does not call this; use `scripts/sign-license.mjs` or your billing pipeline.
 */
export function signLicenseEnvelope(claims: LicenseClaims, privateKey: KeyObject | string): LicenseEnvelope {
  const parsed = parseLicenseClaims(claims);
  const key = typeof privateKey === "string" ? loadPrivateKey(privateKey.trim()) : privateKey;
  const payload = Buffer.from(canonicalStringify(parsed), "utf8");
  const sigBuf = cryptoSign(null, payload, key);
  return {
    claims: parsed,
    sig: sigBuf.toString("base64"),
  };
}
