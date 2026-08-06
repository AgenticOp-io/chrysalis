#!/usr/bin/env node
/**
 * Convert **consumes** CWL↔Helix cutover — does not own it (D6550 / G10125 / G10126).
 *
 * Prefer chrysalis-cwl `smoke:ut-evidence --require-helix` when present (spine +
 * ingest matrix + evidence pack). Fall back to `smoke:ut-spine --require-helix`.
 * Honest skip when pillars absent (Convert CI without engines layout).
 *
 * Gate: hub:cwl-helix-cutover-smoke → CWL_HELIX_CUTOVER_OK | CWL_HELIX_CUTOVER_SKIP
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function resolveSibling(name, envKey) {
  if (process.env[envKey]) return resolve(process.env[envKey]);
  return resolve(ROOT, "..", name);
}

/**
 * @param {{ requireHelix?: boolean }} [opts]
 */
export async function runCwlHelixCutoverSmoke(opts = {}) {
  const cwlRoot = resolveSibling("chrysalis-cwl", "CHRYSALIS_CWL_ROOT");
  const secureRoot = resolveSibling("chrysalis-security", "CHRYSALIS_SECURITY_ROOT");
  const spine = join(cwlRoot, "scripts/smoke-ut-spine.mjs");
  const evidence = join(cwlRoot, "scripts/ut-evidence-pack.mjs");
  const bridge = join(secureRoot, "packages/cwl-bridge/index.mjs");

  const requireHelix =
    opts.requireHelix === true ||
    process.env.CHRYSALIS_UT_SPINE_REQUIRE_HELIX === "1";

  /** @type {Array<{ id: string, ok: boolean, detail?: string }>} */
  const checks = [];

  const cwlOk = existsSync(spine);
  const secureOk = existsSync(bridge);
  const evidenceOk = existsSync(evidence);
  checks.push({
    id: "cwl-sibling",
    ok: cwlOk || !requireHelix,
    detail: cwlOk ? cwlRoot.replace(/\\/g, "/") : "missing chrysalis-cwl — SKIP",
  });
  checks.push({
    id: "secure-sibling",
    ok: secureOk || !requireHelix,
    detail: secureOk ? secureRoot.replace(/\\/g, "/") : "missing chrysalis-security — SKIP",
  });
  checks.push({
    id: "cwl-ut-evidence-script",
    ok: evidenceOk || !cwlOk,
    detail: evidenceOk
      ? "ut-evidence-pack.mjs (preferred consumer path)"
      : cwlOk
        ? "missing ut-evidence-pack — fall back to smoke:ut-spine"
        : "n/a",
  });

  let skipped = false;
  let spineOk = false;
  let token = "CWL_HELIX_CUTOVER_FAIL";
  /** @type {"ut-evidence" | "ut-spine" | "skip"} */
  let mode = "skip";

  if (!cwlOk || !secureOk) {
    skipped = true;
    token = "CWL_HELIX_CUTOVER_SKIP";
    spineOk = !requireHelix;
    mode = "skip";
  } else {
    const useEvidence = evidenceOk;
    mode = useEvidence ? "ut-evidence" : "ut-spine";
    const script = useEvidence ? evidence : spine;
    const args = ["--require-helix"];
    const r = spawnSync(process.execPath, [script, ...args], {
      cwd: cwlRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CHRYSALIS_CWL_ROOT: cwlRoot,
        CHRYSALIS_SECURITY_ROOT: secureRoot,
      },
      timeout: 180_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const out = r.stdout || "";
    spineOk = useEvidence
      ? r.status === 0 && /UT_EVIDENCE_OK/.test(out)
      : r.status === 0 && /UT_SPINE_OK/.test(out);
    checks.push({
      id: useEvidence ? "cwl-smoke-ut-evidence" : "cwl-smoke-ut-spine",
      ok: spineOk,
      detail: spineOk
        ? useEvidence
          ? "UT_EVIDENCE_OK (owned by chrysalis-cwl; includes spine + ingest matrix)"
          : "UT_SPINE_OK (owned by chrysalis-cwl)"
        : (r.stderr || out).slice(-500),
    });
    token = spineOk ? "CWL_HELIX_CUTOVER_OK" : "CWL_HELIX_CUTOVER_FAIL";
  }

  const ok = skipped ? !requireHelix : spineOk && checks.every((c) => c.ok);
  const report = {
    kind: "chrysalis.hub.cwl-helix-cutover-smoke",
    schemaVersion: 2,
    ok,
    skipped,
    token,
    mode,
    owner: "chrysalis-cwl (Convert consumes only)",
    invariant:
      "Convert must not fork DNA cutover — spawn smoke:ut-evidence or smoke:ut-spine",
    checks,
    generatedAt: new Date().toISOString(),
  };

  const outDir = join(ROOT, "reports/pilot-kit");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "cwl-helix-cutover-smoke.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

async function main() {
  const requireHelix = process.argv.includes("--require-helix");
  const r = await runCwlHelixCutoverSmoke({ requireHelix });
  console.log(JSON.stringify(r, null, 2));
  console.log(r.token);
  if (!r.ok) process.exit(1);
}

if (process.argv[1]?.includes("hub-cwl-helix-cutover-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
