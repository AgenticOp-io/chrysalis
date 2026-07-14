#!/usr/bin/env node
/**
 * G9973 — Inbound roundtrip / skip codes map to named adapter work items (no silent skip).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectToCwlRoundtripSmoke } from "./hub-project-to-cwl-roundtrip-smoke.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const workItemsPath = join(
  root,
  "fixtures/hub-universal-translator-slice/chrysalis.ut-wave-b-adapter-work-items.v1.json",
);

export const UT_WAVE_B_ROUNDTRIP_WORK_ITEMS_KIND = "chrysalis.ut.wave-b-roundtrip-work-items-smoke";

function loadWorkItems() {
  if (!existsSync(workItemsPath)) return { ok: false, skip: "missing-work-items" };
  try {
    const doc = JSON.parse(readFileSync(workItemsPath, "utf8"));
    if (doc.kind !== "chrysalis.ut.wave-b-adapter-work-items" || !Array.isArray(doc.items)) {
      return { ok: false, skip: "invalid-work-items-kind" };
    }
    return { ok: true, doc };
  } catch (e) {
    return { ok: false, skip: "invalid-work-items-json", detail: String(e).slice(0, 120) };
  }
}

function resolveWorkItem(doc, skipCode) {
  if (!skipCode) return null;
  return doc.items.find((it) => Array.isArray(it.skipCodes) && it.skipCodes.includes(skipCode)) ?? null;
}

export async function runUtWaveBRoundtripWorkItemsGate(opts = {}) {
  const loaded = loadWorkItems();
  if (!loaded.ok) {
    return { kind: UT_WAVE_B_ROUNDTRIP_WORK_ITEMS_KIND, schemaVersion: 1, gate: "G9973", ok: false, workItems: loaded };
  }

  const skipRoundtrip = opts.skipRoundtrip === true || process.env.CHRYSALIS_UT_WAVE_B_SKIP_ROUNDTRIP === "1";
  /** @type {Awaited<ReturnType<typeof runProjectToCwlRoundtripSmoke>> | { ok: true, skip: string, results: [] }} */
  const roundtrip = skipRoundtrip
    ? { ok: true, skip: "roundtrip-deferred-to-g7603", results: [] }
    : await runProjectToCwlRoundtripSmoke();

  /** @type {{ origin: string, skip?: string, workItemId?: string, ok: boolean }[]} */
  const mappings = [];
  let unmapped = 0;

  for (const r of roundtrip.results ?? []) {
    if (r.ok === true && !r.skip) {
      mappings.push({ origin: r.origin, ok: true });
      continue;
    }
    // Successful skip (e.g. missing-fixture previously treated as ok) must still map.
    const skip = r.skip ?? (r.ok === false ? "roundtrip-route-mismatch" : undefined);
    if (!skip) {
      mappings.push({ origin: r.origin, ok: false, skip: "unnamed-failure" });
      unmapped += 1;
      continue;
    }
    const item = resolveWorkItem(loaded.doc, skip);
    if (!item) {
      mappings.push({ origin: r.origin, skip, ok: false });
      unmapped += 1;
    } else {
      mappings.push({ origin: r.origin, skip, workItemId: item.id, ok: true });
    }
  }

  // Taxonomy coverage: every declared refuse / known skip code listed in work items registry.
  const requiredCodes = ["no-wptp-emit-nextjs", "missing-fixture", "cwl-export-failed", "unknown-origin"];
  const missingTaxonomy = requiredCodes.filter((c) => !resolveWorkItem(loaded.doc, c));

  const registryOk = loaded.doc.items.length >= 4 && missingTaxonomy.length === 0;
  const mappingOk = unmapped === 0;
  const ok = registryOk && (skipRoundtrip || (roundtrip.ok === true && mappingOk) || mappingOk);

  // If roundtrip itself failed, still pass G9973 when every failure is named — that is the point.
  const namedFailuresOk = !skipRoundtrip && mappingOk && unmapped === 0;
  const finalOk = registryOk && (skipRoundtrip || namedFailuresOk);

  return {
    kind: UT_WAVE_B_ROUNDTRIP_WORK_ITEMS_KIND,
    schemaVersion: 1,
    gate: "G9973",
    ok: finalOk,
    workItemsPath: "fixtures/hub-universal-translator-slice/chrysalis.ut-wave-b-adapter-work-items.v1.json",
    itemCount: loaded.doc.items.length,
    missingTaxonomy,
    skipRoundtrip,
    roundtripOk: roundtrip.ok === true,
    unmapped,
    mappings,
  };
}

async function main() {
  const gate = await runUtWaveBRoundtripWorkItemsGate();
  console.log(JSON.stringify(gate, null, 2));
  process.exit(gate.ok ? 0 : 1);
}

if (process.argv[1]?.includes("hub-ut-wave-b-roundtrip-work-items-smoke")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
