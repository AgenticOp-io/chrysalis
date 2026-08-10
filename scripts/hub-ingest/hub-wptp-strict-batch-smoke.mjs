#!/usr/bin/env node
/** WPTP strict batch: Next.js verify + matrix gold when WPTP siblings present (G741). */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhpNextjsVerifyBatchSmoke } from "./hub-php-nextjs-verify-batch-smoke.mjs";
import { runWptpGoldSmoke } from "./hub-wptp-gold-smoke.mjs";
import { resolveWptpRepoRoot } from "../lib/wptp-siblings.mjs";

export const HUB_WPTP_STRICT_BATCH_KIND = "chrysalis.hub.wptp-strict-batch-smoke";
export const HUB_WPTP_STRICT_BATCH_SCHEMA_VERSION = 1;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function wptpEmitNextjsAvailable() {
  const root = resolveWptpRepoRoot(scriptRoot, "wptp-emit-nextjs");
  return existsSync(join(root, "package.json"));
}

function wptpMatrixAvailable() {
  const root = resolveWptpRepoRoot(scriptRoot, "wptp-matrix");
  return existsSync(join(root, "package.json"));
}

/** @param {{ ok?: boolean, skip?: string | null } | undefined} report */
function strictVerify(report) {
  return report?.ok === true && report?.skip == null;
}

export async function runWptpStrictBatchSmoke() {
  const emitNextjsAvailable = wptpEmitNextjsAvailable();
  const matrixAvailable = wptpMatrixAvailable();
  if (!emitNextjsAvailable) {
    return {
      kind: HUB_WPTP_STRICT_BATCH_KIND,
      schemaVersion: HUB_WPTP_STRICT_BATCH_SCHEMA_VERSION,
      ok: true,
      skip: "no-wptp-emit-nextjs",
      wptpEmitNextjsAvailable: false,
      wptpMatrixAvailable: matrixAvailable,
      generatedAt: new Date().toISOString(),
    };
  }
  if (!matrixAvailable) {
    return {
      kind: HUB_WPTP_STRICT_BATCH_KIND,
      schemaVersion: HUB_WPTP_STRICT_BATCH_SCHEMA_VERSION,
      ok: true,
      skip: "no-wptp-matrix",
      wptpEmitNextjsAvailable: true,
      wptpMatrixAvailable: false,
      generatedAt: new Date().toISOString(),
    };
  }

  const nextjsBatch = await runPhpNextjsVerifyBatchSmoke();
  const wptpGold = runWptpGoldSmoke();
  const nextjsStrict =
    strictVerify(nextjsBatch.tinyBlog) &&
    strictVerify(nextjsBatch.plainPhpFlagship) &&
    strictVerify(nextjsBatch.symfonyFlagship);
  const goldStrict = wptpGold.ok === true && wptpGold.skip == null;
  return {
    kind: HUB_WPTP_STRICT_BATCH_KIND,
    schemaVersion: HUB_WPTP_STRICT_BATCH_SCHEMA_VERSION,
    ok: nextjsStrict && goldStrict,
    skip: null,
    wptpEmitNextjsAvailable: true,
    wptpMatrixAvailable: true,
    nextjsBatch: {
      ok: nextjsStrict,
      tinyBlog: { ok: nextjsBatch.tinyBlog?.ok === true, skip: nextjsBatch.tinyBlog?.skip ?? null },
      plainPhpFlagship: {
        ok: nextjsBatch.plainPhpFlagship?.ok === true,
        skip: nextjsBatch.plainPhpFlagship?.skip ?? null,
      },
      symfonyFlagship: {
        ok: nextjsBatch.symfonyFlagship?.ok === true,
        skip: nextjsBatch.symfonyFlagship?.skip ?? null,
      },
    },
    wptpGold: { ok: goldStrict, skip: wptpGold.skip ?? null },
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const report = await runWptpStrictBatchSmoke();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok && report.skip == null) process.exit(1);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
