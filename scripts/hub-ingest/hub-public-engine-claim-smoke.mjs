#!/usr/bin/env node
/**
 * Public engine claim packaging smoke (G10108).
 * Closes trust-checklist items that are in-repo (license text, Pilot Kit links,
 * trademark notice, OSS scrub gate wiring) without flipping GitHub visibility
 * or inventing demos / EXTFMAP settlement.
 *
 * Gate: hub:public-engine-claim-smoke
 * Tokens: PUBLIC_CLAIM_OK · CONVERT_PUBLIC_CLAIM
 * Docs: docs/PUBLIC-ENGINE-CLAIM.md · docs/GO-PUBLIC.md
 *
 * EXTFMAP: honest open residual — never invent / never ABSENT without ZD&T hunt.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const PUBLIC_CLAIM_OK = "PUBLIC_CLAIM_OK";
export const CONVERT_PUBLIC_CLAIM = "CONVERT_PUBLIC_CLAIM";

/**
 * Honest gaps that do **not** fail this gate — listed so the claim stays truthful.
 * Do not invent closes for these.
 */
export const HONEST_GAPS = [
  {
    id: "github-visibility",
    note: "Remote remains private until operator `gh repo edit --visibility public` + counsel (GO-PUBLIC.md).",
  },
  {
    id: "git-history-scrub",
    note: "Full history scrub / BFG remains operator — tracked-tree only via hub:oss-scrub-smoke (G10109).",
  },
  {
    id: "brand-pilot-cta",
    note: "Site “Start a Pilot” CTA → Pilot Kit 15-min path is Requested brand lane — do not silent-edit.",
  },
  {
    id: "extfmap-residual",
    note: "copy:EXTFMAP stays sole open P0 — ZD&T hunt or CHRYSALIS_EXTFMAP_ABSENT=1 after hunt; no invent (D6447).",
  },
  {
    id: "counsel-signoff",
    note: "Counsel / trademark flip sign-off is operator — not claimed by this smoke.",
  },
];

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
    ok:
      mustInclude(join(ROOT, "README.md"), "Apache-2.0") &&
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
      "hub:public-engine-claim-smoke",
      "PUBLIC_CLAIM_OK",
      "CONVERT_PUBLIC_CLAIM",
      "G10108",
      "EXTFMAP",
      "Honest open gaps",
    ),
  });

  checks.push({
    id: "go-public-runbook",
    ok: mustInclude(
      join(ROOT, "docs/GO-PUBLIC.md"),
      "gh repo edit",
      "hub:oss-scrub-smoke",
      "hub:public-engine-claim-smoke",
      "PUBLIC_CLAIM_OK",
      "visibility public",
      "D6447",
      "copy:EXTFMAP",
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

  checks.push({
    id: "pilot-kit-token-wired",
    ok: mustInclude(
      join(ROOT, "scripts/hub-ingest/hub-cursor-pilot-kit-smoke.mjs"),
      "PILOT_KIT_OK",
      "CONVERT_PILOT_KIT",
    ),
  });

  const pkgScripts = readFileSync(join(ROOT, "package.json"), "utf8");
  checks.push({
    id: "package-scripts",
    ok:
      pkgScripts.includes("hub:public-engine-claim-smoke") &&
      pkgScripts.includes("cobol:extfmap-absent") &&
      pkgScripts.includes("hub:oss-scrub-smoke") &&
      pkgScripts.includes("hub:cursor-pilot-kit-smoke"),
  });

  const ok = checks.every((c) => c.ok);
  const report = {
    kind: "chrysalis.hub.public-engine-claim-smoke",
    schemaVersion: 2,
    ok,
    token: ok ? PUBLIC_CLAIM_OK : undefined,
    convertToken: ok ? CONVERT_PUBLIC_CLAIM : undefined,
    checks,
    failed: checks.filter((c) => !c.ok),
    honestGaps: HONEST_GAPS,
    note:
      "In-repo claim packaging only — does not flip GitHub visibility, rewrite history, settle EXTFMAP, or invent demos (D6447). See honestGaps.",
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
  if (r.ok && r.token) console.log(r.token);
  if (r.ok && r.convertToken) console.log(r.convertToken);
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-public-engine-claim-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
