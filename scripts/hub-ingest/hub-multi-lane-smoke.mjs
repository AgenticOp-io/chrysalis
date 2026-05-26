#!/usr/bin/env node
/**
 * Hub ↔ core lane boundary smoke: oracle redactor lockstep + parser-bridge vendor honesty.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const parserVendor = join(scriptRoot, "packages/parser-bridge/vendor/autoload.php");
const redactorTests = [
  join(scriptRoot, "packages/oracle-php/tests/redactor_sql_rows_test.php"),
  join(scriptRoot, "packages/oracle-php/tests/redactor_sql_params_test.php"),
];

function phpOnPath() {
  const r = spawnSync("php", ["-v"], { encoding: "utf8" });
  return r.status === 0;
}

function main() {
  const php = phpOnPath();
  let oracleRedactor = false;
  let parserBridgeVendor = existsSync(parserVendor);

  if (php) {
    const r = spawnSync("php", redactorTests, { cwd: scriptRoot, encoding: "utf8" });
    oracleRedactor = r.status === 0;
  }

  const ok = !php || oracleRedactor;
  console.log(
    JSON.stringify(
      {
        kind: "chrysalis.hub.multi-lane-smoke",
        schemaVersion: 0,
        ok,
        phpAvailable: php,
        oracleRedactor,
        parserBridgeVendor,
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
