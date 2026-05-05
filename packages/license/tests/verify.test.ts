import { generateKeyPairSync } from "node:crypto";
import { describe, expect, test } from "vitest";
import { canonicalStringify } from "../src/canonical-json.js";
import { signLicenseEnvelope } from "../src/sign.js";
import type { LicenseClaims } from "../src/types.js";
import {
  LicenseVerificationError,
  assertMinLicenseTier,
  licenseAllowsFeature,
  readPublicKeyFromPem,
  verifyLicenseEnvelope,
} from "../src/verify.js";

function pemPair(): { publicPem: string; privatePem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicPem: publicKey.export({ type: "spki", format: "pem" }) as string,
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
  };
}

describe("@chrysalis/license", () => {
  test("canonicalStringify is stable for nested objects", () => {
    const a = canonicalStringify({ z: 1, a: { y: 2, x: 3 } });
    const b = canonicalStringify({ a: { x: 3, y: 2 }, z: 1 });
    expect(a).toBe(b);
  });

  test("verifyLicenseEnvelope accepts a valid envelope before exp", () => {
    const { publicPem, privatePem } = pemPair();
    const claims: LicenseClaims = {
      sub: "acme",
      tier: "pro",
      exp: 2_000_000_000,
      features: ["x"],
    };
    const env = signLicenseEnvelope(claims, privatePem);
    const out = verifyLicenseEnvelope(env, publicPem, { nowSeconds: 100 });
    expect(out.sub).toBe("acme");
  });

  test("verifyLicenseEnvelope rejects after exp", () => {
    const { publicPem, privatePem } = pemPair();
    const claims: LicenseClaims = { sub: "acme", tier: "pro", exp: 1000 };
    const env = signLicenseEnvelope(claims, privatePem);
    expect(() => verifyLicenseEnvelope(env, publicPem, { nowSeconds: 2000 })).toThrow(
      LicenseVerificationError,
    );
  });

  test("verifyLicenseEnvelope rejects wrong key", () => {
    const { privatePem } = pemPair();
    const { publicPem: otherPub } = pemPair();
    const claims: LicenseClaims = { sub: "acme", tier: "pro", exp: 2_000_000_000 };
    const env = signLicenseEnvelope(claims, privatePem);
    expect(() => verifyLicenseEnvelope(env, otherPub, { nowSeconds: 100 })).toThrow(
      LicenseVerificationError,
    );
  });

  test("readPublicKeyFromPem loads SPKI PEM", () => {
    const { publicPem, privatePem } = pemPair();
    const claims: LicenseClaims = { sub: "a", tier: "dev", exp: 2_000_000_000 };
    const env = signLicenseEnvelope(claims, privatePem);
    const key = readPublicKeyFromPem(publicPem);
    verifyLicenseEnvelope(env, key, { nowSeconds: 1 });
  });

  test("licenseAllowsFeature", () => {
    expect(
      licenseAllowsFeature({ sub: "a", tier: "enterprise", exp: 0 }, "any.feature"),
    ).toBe(true);
    expect(
      licenseAllowsFeature({ sub: "a", tier: "pro", exp: 0, features: ["f"] }, "f"),
    ).toBe(true);
    expect(licenseAllowsFeature({ sub: "a", tier: "pro", exp: 0 }, "f")).toBe(false);
  });

  test("assertMinLicenseTier", () => {
    const pro: LicenseClaims = { sub: "a", tier: "pro", exp: 0 };
    assertMinLicenseTier(pro, "dev");
    assertMinLicenseTier(pro, "pro");
    expect(() => assertMinLicenseTier(pro, "enterprise")).toThrow(LicenseVerificationError);
  });
});
