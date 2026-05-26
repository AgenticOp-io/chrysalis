#!/usr/bin/env node
/**
 * Hub ↔ core lane boundary smoke: oracle redactor lockstep + parser-bridge vendor + nikic parity.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const parserVendor = join(scriptRoot, "packages/parser-bridge/vendor/autoload.php");
const nikicTest = join(scriptRoot, "packages/parser-bridge/tests/nikic.test.ts");
const redactorTests = [
  join(scriptRoot, "packages/oracle-php/tests/redactor_sql_rows_test.php"),
  join(scriptRoot, "packages/oracle-php/tests/redactor_sql_params_test.php"),
];

function phpOnPath() {
  const r = spawnSync("php", ["-v"], { encoding: "utf8" });
  return r.status === 0;
}

function runParserNikicParity() {
  if (!existsSync(parserVendor)) {
    return { ran: false, ok: false, skip: "no-parser-vendor" };
  }
  if (!phpOnPath()) {
    return { ran: false, ok: true, skip: "no-php" };
  }
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const r = spawnSync(
    pnpm,
    ["exec", "vitest", "run", nikicTest],
    {
      cwd: scriptRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  return { ran: true, ok: r.status === 0, exitCode: r.status ?? 1 };
}

function main() {
  const php = phpOnPath();
  let oracleRedactor = false;
  const parserBridgeVendor = existsSync(parserVendor);
  const nikic = runParserNikicParity();

  if (php) {
    const r = spawnSync("php", redactorTests, { cwd: scriptRoot, encoding: "utf8" });
    oracleRedactor = r.status === 0;
  }

  const ok = (!php || oracleRedactor) && (nikic.skip != null || nikic.ok);
  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.multi-lane-smoke",
        schemaVersion: 1,
        ok,
        phpAvailable: php,
        oracleRedactor,
        parserBridgeVendor,
        parserNikicParity: nikic.ok,
        parserNikicSkipped: nikic.skip ?? null,
        parserNikicRan: nikic.ran,
      },
      null,
      2,
    ),
  );
  if (!ok) process.exit(1);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
