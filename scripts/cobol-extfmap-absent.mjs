#!/usr/bin/env node
/**
 * Operator attestation: EXTFMAP proprietary COPY is ABSENT from licensed SDFHCOB
 * drop (ZD&T hunt complete). Does **not** invent EXTFMAP.cpy.
 *
 * Usage:
 *   CHRYSALIS_EXTFMAP_ABSENT=1 node scripts/cobol-extfmap-absent.mjs
 *   node scripts/cobol-extfmap-absent.mjs --check   # report-only (no write)
 *
 * When attested, residual ledger status for copy:EXTFMAP becomes `absent`
 * (still P0 classification history; not a green runtime claim).
 *
 * Docs: docs/COBOL-IBM-SDFHCOB-DROP.md · docs/COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "reports/cobol/extfmap-absent.json");
const DROP = join(ROOT, "fixtures/hub-cobol-clbs-mini/copybook/EXTFMAP.cpy");

function main() {
  const checkOnly = process.argv.includes("--check");
  const envAbsent =
    process.env.CHRYSALIS_EXTFMAP_ABSENT === "1" ||
    process.env.CHRYSALIS_EXTFMAP_ABSENT === "true";
  const dropPresent = existsSync(DROP);

  /** @type {"present" | "absent-attested" | "open"} */
  let status = "open";
  if (dropPresent) status = "present";
  else if (envAbsent) status = "absent-attested";

  const report = {
    kind: "chrysalis.cobol.extfmap-absent.v1",
    schemaVersion: 1,
    id: "copy:EXTFMAP",
    status,
    dropPath: DROP.replace(/\\/g, "/"),
    dropPresent,
    envAttested: envAbsent,
    invariant:
      "Never invent EXTFMAP.cpy. Absent means operator completed ZD&T/SDFHCOB hunt and marked ABSENT.",
    docs: [
      "docs/COBOL-IBM-SDFHCOB-DROP.md",
      "docs/COBOL-ZD&T-LICENSED-EXTRACT-RUNBOOK.md",
    ],
    residualNote:
      status === "absent-attested"
        ? "Residual ledger may treat copy:EXTFMAP as status=absent (not closed-by-drop)"
        : status === "present"
          ? "Licensed drop on disk — residual should close copy:EXTFMAP"
          : "Set CHRYSALIS_EXTFMAP_ABSENT=1 after ZD&T hunt proves ABSENT, or drop EXTFMAP.cpy",
    generatedAt: new Date().toISOString(),
  };

  if (!checkOnly) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));

  // Exit 0 for present or attested-absent; exit 2 while still open (operator action needed).
  if (status === "open") process.exit(checkOnly ? 0 : 2);
  process.exit(0);
}

main();
