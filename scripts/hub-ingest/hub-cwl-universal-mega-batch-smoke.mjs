#!/usr/bin/env node
/** CWL universal mega batch v3: all origins + CWL mega + oracle + roundtrip + translate + project roundtrip (G562). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAllOriginsBatchSmoke } from "./hub-cwl-all-origins-batch-smoke.mjs";
import { runCwlMegaBatchSmoke } from "./hub-cwl-mega-batch-smoke.mjs";
import { runProjectToCwlOracleGates } from "./hub-project-to-cwl-gates.mjs";
import { runCwlPatternLiteralRoundtripBatchSmoke } from "./hub-cwl-pattern-literal-roundtrip-batch-smoke.mjs";
import { runHubTranslateCwlCoverageSmoke } from "./hub-translate-cwl-coverage-smoke.mjs";
import { runHubTranslateCwlRoundtripSmoke } from "./hub-translate-cwl-roundtrip-smoke.mjs";
import { runProjectToCwlRoundtripSmoke } from "./hub-project-to-cwl-roundtrip-smoke.mjs";

export const HUB_CWL_UNIVERSAL_MEGA_BATCH_KIND = "chrysalis.hub.cwl-universal-mega-batch-smoke";
export const HUB_CWL_UNIVERSAL_MEGA_BATCH_SCHEMA_VERSION = 3;

export async function runCwlUniversalMegaBatchSmoke() {
  const allOrigins = await runCwlAllOriginsBatchSmoke();
  const cwlMega = await runCwlMegaBatchSmoke();
  const oracleGates = await runProjectToCwlOracleGates();
  const patternLiteralRoundtrip = runCwlPatternLiteralRoundtripBatchSmoke();
  const translateCwlCoverage = runHubTranslateCwlCoverageSmoke();
  const translateCwlRoundtrip = runHubTranslateCwlRoundtripSmoke();
  const projectToCwlRoundtrip = await runProjectToCwlRoundtripSmoke();
  const ok =
    allOrigins.ok &&
    cwlMega.ok &&
    oracleGates.ok === true &&
    patternLiteralRoundtrip.ok &&
    translateCwlCoverage.ok &&
    translateCwlRoundtrip.ok &&
    projectToCwlRoundtrip.ok;
  return {
    kind: HUB_CWL_UNIVERSAL_MEGA_BATCH_KIND,
    schemaVersion: HUB_CWL_UNIVERSAL_MEGA_BATCH_SCHEMA_VERSION,
    ok,
    allOrigins,
    cwlMega,
    oracleGates,
    patternLiteralRoundtrip,
    translateCwlCoverage,
    translateCwlRoundtrip,
    projectToCwlRoundtrip,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runCwlUniversalMegaBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
