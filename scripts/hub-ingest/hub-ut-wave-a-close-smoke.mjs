#!/usr/bin/env node
/**
 * G9965 — UT Wave A composite (canon lock + lib extract).
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function run(script) {
  const r = spawnSync(process.execPath, [join(root, "scripts/hub-ingest", script)], {
    encoding: "utf8",
    cwd: root,
  });
  return {
    script,
    status: r.status ?? 1,
    ok: (r.status ?? 1) === 0,
    stdoutTail: (r.stdout ?? "").slice(-400),
    stderrTail: (r.stderr ?? "").slice(-400),
  };
}

const steps = [run("hub-ut-canon-lock-smoke.mjs"), run("hub-ut-lib-extract-smoke.mjs")];
const ok = steps.every((s) => s.ok);
console.log(
  JSON.stringify(
    {
      kind: "chrysalis.ut.wave-a-close-smoke",
      schemaVersion: 1,
      gate: "G9965",
      ok,
      steps,
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
