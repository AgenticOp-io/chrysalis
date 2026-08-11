#!/usr/bin/env node
/**
 * Public engine claim packaging smoke (G10108).
 * Closes trust-checklist items that are in-repo (license text, Pilot Kit links,
 * trademark notice) without flipping GitHub visibility or inventing demos.
 *
 * Gate: hub:public-engine-claim-smoke
 * Docs: docs/PUBLIC-ENGINE-CLAIM.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string} path
 * @param {...string} needles
 */
function mustInclude(path, ...needles) {
  if (!existsSync(path)) return false;
  const t = readFileSync(path, "utf8");
  return needles.every((n) => t.includes(n));
}

export async function runPublicEngineClaimSmoke() {
  /** @type {Array<{ id: string, ok: boolean, reason?: string }>} */
  const checks = [];

  const licenseOk =
    mustInclude(join(ROOT, "LICENSE"), "Apache License", "Version 2.0") &&
    !mustInclude(join(ROOT, "LICENSE"), "MIT License");
  checks.push({
    id: "license-apache-2",
    ok: licenseOk,
    reason: licenseOk ? undefined : "LICENSE must be Apache-2.0 text",
  });

  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  checks.push({
    id: "package-json-license",
    ok: pkg.license === "Apache-2.0",
    reason: pkg.license === "Apache-2.0" ? undefined : `license=${pkg.license}`,
  });

  checks.push({
    id: "readme-apache-not-mit",
    ok: mustInclude(join(ROOT, "README.md"), "Apache-2.0") &&
      !/\[MIT\]\(\.\/LICENSE\)/.test(readFileSync(join(ROOT, "README.md"), "utf8")),
    reason: "README License section must cite Apache-2.0 (not MIT)",
  });

  checks.push({
    id: "readme-pilot-kit-link",
    ok: mustInclude(
      join(ROOT, "README.md"),
      "CURSOR-PILOT-KIT.md",
      "pilot:laravel-min",
      "pilot:cobol-clbs",
    ),
  });

  checks.push({
    id: "commercial-apache",
    ok: mustInclude(join(ROOT, "docs/COMMERCIAL.md"), "Apache-2.0"),
  });

  checks.push({
    id: "trademark-notice",
    ok: mustInclude(
      join(ROOT, "README.md"),
      "Trademark",
      "AgenticOp",
      "Chrysalis",
      "agenticop.io",
    ),
  });

  checks.push({
    id: "public-claim-doc",
    ok: mustInclude(
      join(ROOT, "docs/PUBLIC-ENGINE-CLAIM.md"),
      "CURSOR-PILOT-KIT",
      "Apache-2.0",
      "pilot:cobol-clbs",
      "GO-PUBLIC.md",
    ),
  });

  checks.push({
    id: "go-public-runbook",
    ok: mustInclude(
      join(ROOT, "docs/GO-PUBLIC.md"),
      "gh repo edit",
      "hub:oss-scrub-smoke",
      "visibility public",
      "D6447",
    ),
  });

  checks.push({
    id: "notice-file",
    ok: mustInclude(join(ROOT, "NOTICE"), "AgenticOp", "Chrysalis"),
  });

  checks.push({
    id: "pilot-mcp-dual-wedge",
    ok: mustInclude(
      join(ROOT, "fixtures/pilot-kit/cursor-mcp.json"),
      "pilot:laravel-min",
      "pilot:cobol-clbs",
      "cobol-clbs",
    ),
  });

  checks.push({
    id: "extfmap-absent-helper",
    ok: mustInclude(
      join(ROOT, "scripts/cobol-extfmap-absent.mjs"),
      "CHRYSALIS_EXTFMAP_ABSENT",
      "copy:EXTFMAP",
      "Never invent",
    ),
  });

  checks.push({
    id: "oss-scrub-helper",
    ok: mustInclude(
      join(ROOT, "scripts/hub-ingest/hub-oss-scrub-smoke.mjs"),
      "chrysalis.hub.oss-scrub-smoke",
      "service_account",
      "FORBIDDEN_NAME_RE",
      "OSS_SCRUB_OK",
      "CONVERT_OSS_SCRUB",
    ),
  });

  const pkgScripts = readFileSync(join(ROOT, "package.json"), "utf8");
  checks.push({
    id: "package-scripts",
    ok:
      pkgScripts.includes("hub:public-engine-claim-smoke") &&
      pkgScripts.includes("cobol:extfmap-absent") &&
      pkgScripts.includes("hub:oss-scrub-smoke"),
  });

  const ok = checks.every((c) => c.ok);
  const report = {
    kind: "chrysalis.hub.public-engine-claim-smoke",
    schemaVersion: 1,
    ok,
    checks,
    failed: checks.filter((c) => !c.ok),
    note: "In-repo claim packaging only — does not flip GitHub visibility or invent demos (D6447)",
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(ROOT, "reports/pilot-kit");
  try {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, "public-engine-claim-smoke.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
  } catch {
    /* ignore */
  }

  return report;
}

async function main() {
  const r = await runPublicEngineClaimSmoke();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-public-engine-claim-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
