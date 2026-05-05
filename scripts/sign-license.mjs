#!/usr/bin/env node
/**
 * Sign a license claims JSON file with an Ed25519 private key (maintainer / vendor).
 * Requires: `pnpm --filter @chrysalis/license build`
 *
 *   CHRYSALIS_LICENSE_PRIVATE_KEY_PATH=/path/to/pkcs8.pem node scripts/sign-license.mjs claims.json
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { signLicenseEnvelope } = await import(resolve(root, "packages/license/dist/index.js"));

const keyPath = process.env.CHRYSALIS_LICENSE_PRIVATE_KEY_PATH;
if (!keyPath) {
  process.stderr.write("CHRYSALIS_LICENSE_PRIVATE_KEY_PATH is required (PEM PKCS#8 Ed25519 private key)\n");
  process.exit(2);
}
const claimsPath = process.argv[2];
if (!claimsPath) {
  process.stderr.write("usage: node scripts/sign-license.mjs <claims.json>\n");
  process.exit(2);
}
const claimsJson = readFileSync(claimsPath, "utf8");
let claims;
try {
  claims = JSON.parse(claimsJson);
} catch (e) {
  process.stderr.write(`claims JSON invalid: ${e}\n`);
  process.exit(2);
}
const pem = readFileSync(keyPath, "utf8");
const envelope = signLicenseEnvelope(claims, pem);
process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
