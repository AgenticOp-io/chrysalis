#!/usr/bin/env node
/** Hub evidence trend snapshot smoke (G249). */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendEvidenceSnapshot, buildHubEvidenceReport, computeEvidenceTrend, readEvidenceHistory } from "./hub-evidence.mjs";

export const HUB_EVIDENCE_TREND_SMOKE_KIND = "chrysalis.hub.evidence-trend-smoke";
export const HUB_EVIDENCE_TREND_SMOKE_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const verifySeed = join(scriptRoot, "fixtures/ci/tiny-blog-verify-for-status/summary.json");

export function runEvidenceTrendSmoke() {
  const dir = mkdtempSync(join(tmpdir(), "chrysalis-evidence-trend-smoke-"));
  try {
    mkdirSync(join(dir, ".chrysalis"), { recursive: true });
    mkdirSync(join(dir, "reports", "verify"), { recursive: true });
    writeFileSync(
      join(dir, ".chrysalis", "migration-assessment.json"),
      `${JSON.stringify({
        readinessTier: "pilot-ready",
        origin: "php",
        output: "hono",
        program: { id: "api-slice" },
        nextSteps: ["Run verify replay"],
      })}\n`,
    );
    writeFileSync(join(dir, ".chrysalis", "migration.cwl"), "module x;\nroute GET /health { return true; }\n");
    if (verifySeed) {
      writeFileSync(join(dir, "reports", "verify", "summary.json"), readFileSync(verifySeed, "utf8"));
    }
    const report1 = buildHubEvidenceReport(dir);
    appendEvidenceSnapshot(dir, report1);
    const report2 = buildHubEvidenceReport(dir);
    appendEvidenceSnapshot(dir, report2);
    const history = readEvidenceHistory(dir);
    const trend = computeEvidenceTrend(history);
    return {
      kind: HUB_EVIDENCE_TREND_SMOKE_KIND,
      schemaVersion: HUB_EVIDENCE_TREND_SMOKE_SCHEMA_VERSION,
      ok: history.length >= 2 && (trend.points ?? 0) >= 2,
      snapshotCount: history.length,
      trendPoints: trend.points ?? 0,
      verifyCorrectness: report2.verify.correctness,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const report = runEvidenceTrendSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
