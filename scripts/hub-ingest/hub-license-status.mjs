#!/usr/bin/env node
/**
 * Hub operator license gate + tier capabilities (G153 / DESIGN D289).
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HUB_LICENSE_STATUS_KIND = "chrysalis.hub.license-status";
export const HUB_LICENSE_STATUS_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const licensePkg = resolve(scriptRoot, "packages/license/dist/index.js");

/** @type {Record<string, { minTier: "dev" | "pro" | "enterprise", label: string }>} */
export const HUB_LICENSE_FEATURES = {
  "hub-translate": { minTier: "dev", label: "Single-site translate" },
  "hub-batch": { minTier: "pro", label: "Multi-site batch translate" },
  "hub-pipeline": { minTier: "pro", label: "Full pipeline (setup + translate)" },
  "hub-verify-gate": { minTier: "pro", label: "Post-translate verify + evidence gate" },
  "hub-chimera-cutover": { minTier: "enterprise", label: "Chimera cutover runbooks" },
  "hub-delivery-dashboard": { minTier: "dev", label: "Delivery dashboard" },
};

const TIER_RANK = { dev: 0, pro: 1, enterprise: 2 };

function licenseRequiredFromEnv() {
  const v = process.env.CHRYSALIS_REQUIRE_LICENSE;
  return v === "1" || v === "true";
}

function minTierFromEnv() {
  const raw = process.env.CHRYSALIS_LICENSE_MIN_TIER?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "dev" || raw === "pro" || raw === "enterprise") return raw;
  return null;
}

async function loadLicenseModule() {
  return import(licensePkg);
}

/**
 * @param {"dev"|"pro"|"enterprise"|null} effectiveTier
 * @param {"dev"|"pro"|"enterprise"} required
 */
export function hubTierMeetsMinimum(effectiveTier, required) {
  if (!effectiveTier) return false;
  return TIER_RANK[effectiveTier] >= TIER_RANK[required];
}

/**
 * Build license status for Hub operator surfaces.
 */
export async function buildHubLicenseStatusReport() {
  const requireLicense = licenseRequiredFromEnv();
  const configuredMinTier = minTierFromEnv();

  /** @type {import("@chrysalis/license").LicenseClaims | null} */
  let claims = null;
  let gatePass = !requireLicense;
  let error = null;

  if (requireLicense) {
    try {
      const lic = await loadLicenseModule();
      const envelope = lic.loadLicenseEnvelopeFromEnv();
      const publicKeyPem = lic.loadPublicKeyPemFromEnv();
      claims = lic.verifyLicenseEnvelope(envelope, publicKeyPem);
      if (configuredMinTier) {
        lic.assertMinLicenseTier(claims, configuredMinTier);
      }
      gatePass = true;
    } catch (e) {
      gatePass = false;
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const effectiveTier = claims?.tier ?? (requireLicense ? null : "dev");

  const features = Object.entries(HUB_LICENSE_FEATURES).map(([id, spec]) => ({
    id,
    label: spec.label,
    minTier: spec.minTier,
    allowed: !requireLicense || (gatePass && hubTierMeetsMinimum(effectiveTier, spec.minTier)),
  }));

  return {
    kind: HUB_LICENSE_STATUS_KIND,
    schemaVersion: HUB_LICENSE_STATUS_SCHEMA_VERSION,
    requireLicense,
    configuredMinTier,
    gatePass,
    tier: effectiveTier,
    subject: claims?.sub ?? null,
    expiresAt: claims?.exp ?? null,
    features: claims?.features ?? null,
    hubFeatures: features,
    error,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * @param {keyof typeof HUB_LICENSE_FEATURES | string} featureId
 */
export async function assertHubLicenseAllows(featureId) {
  const report = await buildHubLicenseStatusReport();
  if (!report.requireLicense) return report;
  if (!report.gatePass) {
    throw new Error(report.error ?? "license gate failed");
  }
  const spec = HUB_LICENSE_FEATURES[featureId];
  if (!spec) return report;
  if (!hubTierMeetsMinimum(report.tier, spec.minTier)) {
    throw new Error(
      `hub license tier ${report.tier ?? "?"} does not allow ${featureId} (requires ${spec.minTier})`,
    );
  }
  return report;
}

async function main() {
  console.log(JSON.stringify(await buildHubLicenseStatusReport(), null, 2));
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
