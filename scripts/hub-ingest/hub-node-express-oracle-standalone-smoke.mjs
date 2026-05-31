#!/usr/bin/env node
/** Node Express oracle verify standalone smoke (G334). */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runNodeExpressOracleVerify } from "./hub-node-express-oracle-verify.mjs";

export const HUB_NODE_EXPRESS_ORACLE_STANDALONE_KIND = "chrysalis.hub.node-express-oracle-standalone-smoke";
export const HUB_NODE_EXPRESS_ORACLE_STANDALONE_SCHEMA_VERSION = 1;

export async function runNodeExpressOracleStandaloneSmoke() {
  const verify = await runNodeExpressOracleVerify();
  return {
    kind: HUB_NODE_EXPRESS_ORACLE_STANDALONE_KIND,
    schemaVersion: HUB_NODE_EXPRESS_ORACLE_STANDALONE_SCHEMA_VERSION,
    ok: verify.ok === true || verify.skip != null,
    skip: verify.skip ?? null,
    correctness: verify.correctness ?? null,
    traceCount: verify.traceCount ?? null,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runNodeExpressOracleStandaloneSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((e) => { console.error(e); process.exit(1); });
