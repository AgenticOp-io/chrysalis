#!/usr/bin/env node
/**
 * G9970 — Wave B requires G7690 regression green (UT close composite).
 *
 * Default runs the full `hub-cwl-universal-translator-close-smoke` (G7690).
 * Set `CHRYSALIS_UT_WAVE_B_FULL_G7690=0` for a fast auth-effects-only check
 * (still requires honest nextjs skip-ok when WPTP sibling is absent).
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCwlAuthEffectsSmoke } from "./hub-cwl-auth-effects-smoke.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const UT_WAVE_B_G7690_KIND = "chrysalis.ut.wave-b-g7690-smoke";

export async function runUtWaveBG7690Gate(opts = {}) {
  const auth = await runCwlAuthEffectsSmoke(opts);
  const authOk = auth.ok === true;
  const nextjsSkipOk =
    auth.traceSkip?.["cwl-auth-effects-nextjs"] === "no-wptp-emit-nextjs" ||
    auth.traceReplay?.["cwl-auth-effects-nextjs"] === true ||
    auth.traceReplay?.["cwl-auth-effects-nextjs"] === "skipped-no-wptp-emit-nextjs";

  const runFull =
    opts.fullG7690 === false || process.env.CHRYSALIS_UT_WAVE_B_FULL_G7690 === "0" ? false : true;

  /** @type {{ ok: boolean, skip?: string, status?: number | null }} */
  let composite = { ok: true, skip: "g7690-deferred-auth-effects-sufficient" };
  if (runFull) {
    const r = spawnSync(process.execPath, [join(root, "scripts/hub-ingest/hub-cwl-universal-translator-close-smoke.mjs")], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD: process.env.CHRYSALIS_STRATEGIC_PLAN_SKIP_FLAGSHIP_GOLD ?? "1",
      },
      maxBuffer: 40 * 1024 * 1024,
    });
    composite = { ok: (r.status ?? 1) === 0, status: r.status };
  }

  const ok = authOk && nextjsSkipOk && composite.ok;
  return {
    kind: UT_WAVE_B_G7690_KIND,
    schemaVersion: 1,
    gate: "G9970",
    ok,
    authOk,
    nextjsSkipOk,
    fullG7690: runFull,
    auth: {
      ok: authOk,
      traceReplay: auth.traceReplay,
      traceSkip: auth.traceSkip,
    },
    g7690: composite,
  };
}

async function main() {
  const gate = await runUtWaveBG7690Gate();
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-ut-wave-b-g7690-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
