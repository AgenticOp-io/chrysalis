import { readFileSync } from "node:fs";
import type { LicenseEnvelope } from "./types.js";
import { LicenseVerificationError, parseLicenseClaims } from "./verify.js";

function parseEnvelopeJson(raw: string): LicenseEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new LicenseVerificationError("license JSON is not valid JSON");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new LicenseVerificationError("license envelope must be a JSON object");
  }
  const o = parsed as Record<string, unknown>;
  if (!o.claims || typeof o.claims !== "object" || Array.isArray(o.claims)) {
    throw new LicenseVerificationError('license envelope must include an object "claims"');
  }
  if (typeof o.sig !== "string") {
    throw new LicenseVerificationError('license envelope must include a string "sig"');
  }
  const claims = parseLicenseClaims(o.claims);
  return { claims, sig: o.sig };
}

/**
 * Load envelope from `CHRYSALIS_LICENSE` (inline JSON) or `CHRYSALIS_LICENSE_PATH` (file).
 */
export function loadLicenseEnvelopeFromEnv(): LicenseEnvelope {
  const inline = process.env.CHRYSALIS_LICENSE;
  const path = process.env.CHRYSALIS_LICENSE_PATH;
  if (inline && path) {
    throw new LicenseVerificationError("set only one of CHRYSALIS_LICENSE or CHRYSALIS_LICENSE_PATH");
  }
  if (!inline && !path) {
    throw new LicenseVerificationError(
      "set CHRYSALIS_LICENSE (JSON string) or CHRYSALIS_LICENSE_PATH (file) when license enforcement is on",
    );
  }
  const raw = inline ?? readFileSync(path!, "utf8");
  return parseEnvelopeJson(raw.trim());
}

/**
 * Load Ed25519 public key PEM from `CHRYSALIS_LICENSE_PUBLIC_KEY` or `CHRYSALIS_LICENSE_PUBLIC_KEY_PATH`.
 */
export function loadPublicKeyPemFromEnv(): string {
  const inline = process.env.CHRYSALIS_LICENSE_PUBLIC_KEY;
  const path = process.env.CHRYSALIS_LICENSE_PUBLIC_KEY_PATH;
  if (inline && path) {
    throw new LicenseVerificationError(
      "set only one of CHRYSALIS_LICENSE_PUBLIC_KEY or CHRYSALIS_LICENSE_PUBLIC_KEY_PATH",
    );
  }
  if (inline) return inline.replace(/\\n/g, "\n");
  if (path) return readFileSync(path, "utf8");
  throw new LicenseVerificationError(
    "set CHRYSALIS_LICENSE_PUBLIC_KEY (PEM) or CHRYSALIS_LICENSE_PUBLIC_KEY_PATH when license enforcement is on",
  );
}
