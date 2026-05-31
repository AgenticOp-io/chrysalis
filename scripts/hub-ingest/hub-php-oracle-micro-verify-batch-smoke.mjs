#!/usr/bin/env node
/** PHP oracle micro-fixture metadata + Next.js trace verify batch (G621). */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildOracleMicroFixtureReport,
  ORACLE_MICRO_FIXTURE,
} from "./hub-php-oracle-micro-fixture.mjs";
import { runPhpNextjsVerify } from "./hub-php-nextjs-verify.mjs";

export const HUB_PHP_ORACLE_MICRO_VERIFY_BATCH_KIND = "chrysalis.hub.php-oracle-micro-verify-batch-smoke";
export const HUB_PHP_ORACLE_MICRO_VERIFY_BATCH_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const microFixtureDir = join(scriptRoot, ORACLE_MICRO_FIXTURE);

export async function runPhpOracleMicroVerifyBatchSmoke() {
  const micro = buildOracleMicroFixtureReport();
  const microOk = micro.exists === true && (micro.routeCount ?? 0) >= 5;
  const nextjs = await runPhpNextjsVerify(microFixtureDir, { label: ORACLE_MICRO_FIXTURE });
  const nextjsOk = nextjs.ok === true || nextjs.skip === "no-wptp-emit-nextjs";
  return {
    kind: HUB_PHP_ORACLE_MICRO_VERIFY_BATCH_KIND,
    schemaVersion: HUB_PHP_ORACLE_MICRO_VERIFY_BATCH_SCHEMA_VERSION,
    ok: microOk && nextjsOk,
    micro,
    nextjs,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runPhpOracleMicroVerifyBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
