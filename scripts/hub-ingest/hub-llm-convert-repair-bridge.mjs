#!/usr/bin/env node
/** Bridge hub convert apply → @chrysalis/repair hole-closure when traces + verify env available. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliBin = join(scriptRoot, "packages/cli/dist/bin.js");

export const HUB_CONVERT_REPAIR_BRIDGE_KIND = "chrysalis.hub.convert-repair-bridge";

/**
 * @param {string} projectDir
 * @param {object} artifact
 * @param {object} [opts]
 */
export function runConvertRepairBridge(projectDir, artifact, opts = {}) {
  const dir = resolve(projectDir);
  const tracesDir = join(dir, ".chrysalis", "traces");
  const baseUrl = process.env.CHRYSALIS_HUB_VERIFY_BASE_URL?.trim() ?? "";
  const proposals = artifact?.proposals ?? [];
  const closureProposals = proposals.filter(
    (p) => p?.patch && typeof p.patch === "object" && p.patch.kind === "hole-closure" && p.patch.holeId,
  );

  if (closureProposals.length === 0) {
    return {
      kind: HUB_CONVERT_REPAIR_BRIDGE_KIND,
      ok: true,
      skipped: "no-hole-closure-patches",
      repairs: [],
    };
  }
  if (!existsSync(tracesDir)) {
    return {
      kind: HUB_CONVERT_REPAIR_BRIDGE_KIND,
      ok: true,
      skipped: "no-traces",
      repairs: closureProposals.map((p) => ({ id: p.id, skipped: "no-traces" })),
    };
  }
  if (!baseUrl) {
    return {
      kind: HUB_CONVERT_REPAIR_BRIDGE_KIND,
      ok: true,
      skipped: "no-CHRYSALIS_HUB_VERIFY_BASE_URL",
      repairs: closureProposals.map((p) => ({ id: p.id, skipped: "no-base-url" })),
    };
  }
  if (!existsSync(cliBin)) {
    return {
      kind: HUB_CONVERT_REPAIR_BRIDGE_KIND,
      ok: false,
      skipped: "cli-not-built",
      repairs: [],
    };
  }

  mkdirSync(join(dir, ".chrysalis"), { recursive: true });
  /** @type {Array<object>} */
  const repairs = [];
  let allOk = true;

  for (const p of closureProposals) {
    const patch = p.patch;
    const patchPath = join(dir, ".chrysalis", `hub-convert.hole-patch-${p.id ?? "x"}.json`);
    const body = {
      holeId: patch.holeId,
      replacementRootId: patch.replacementRootId,
      nodesToAdd: patch.nodesToAdd,
      signOff: patch.signOff ?? { signer: opts.signer ?? "hub-convert-apply", note: p.hole ?? null },
    };
    writeFileSync(patchPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
    const writeModule = join(dir, ".chrysalis", `hub-convert.repaired-${p.id ?? "x"}.webir.json`);
    const r = spawnSync(
      process.execPath,
      [
        cliBin,
        "repair",
        tracesDir,
        "--base-url",
        baseUrl,
        "--project",
        dir,
        "--hole-patch",
        patchPath,
        "--write-module",
        writeModule,
      ],
      { cwd: scriptRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    const ok = (r.status ?? 1) === 0;
    if (!ok) allOk = false;
    repairs.push({
      id: p.id,
      ok,
      patchPath,
      writeModule: ok ? writeModule : null,
      exitCode: r.status ?? 1,
    });
  }

  return {
    kind: HUB_CONVERT_REPAIR_BRIDGE_KIND,
    ok: allOk,
    skipped: null,
    repairs,
  };
}

/** @param {string} projectDir */
export function readConvertAppliedArtifact(projectDir) {
  const path = join(resolve(projectDir), ".chrysalis", "hub-convert.hole-proposals.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}
