#!/usr/bin/env node
/** WISP full-site auth policy gate (G7704). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWispFullSiteCharter } from "./hub-wisp-full-site-charter.mjs";
import { buildWispHoleManifest } from "../wisp-cwl-hole-manifest.mjs";

export const WISP_FULL_SITE_AUTH_POLICY_SMOKE_KIND = "chrysalis.wisp.full-site-auth-policy-smoke";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function runWispFullSiteAuthPolicyGate(_opts = {}) {
  const loaded = loadWispFullSiteCharter();
  if (!loaded.ok) return { ok: false, charter: loaded };
  const charter = loaded.charter;
  const manifestPath = join(scriptRoot, charter.fixtureRoot, "wisp-hole-manifest.v1.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : buildWispHoleManifest();
  const firebaseHoles = manifest.byReason?.["hub-svelte:firebase-auth"] ?? 0;
  const policyOk = charter.authPolicy === "cwl-effects-session-native";
  const nativeOk = firebaseHoles === 0;
  const ok = policyOk === true;
  return {
    kind: WISP_FULL_SITE_AUTH_POLICY_SMOKE_KIND,
    schemaVersion: 1,
    ok,
    policyOk,
    nativeOk,
    firebaseHoles,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const r = runWispFullSiteAuthPolicyGate();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-wisp-full-site-auth-policy-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
