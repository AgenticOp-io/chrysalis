/** Shared pilot charter loader (Phase 24, G7401). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultCharterPath = join(scriptRoot, "fixtures/hub-pilot-customer-slice/chrysalis.pilot-charter.v1.json");

/**
 * @param {string} [charterPath]
 */
export function loadPilotCharter(charterPath = defaultCharterPath) {
  if (!existsSync(charterPath)) {
    return { ok: false, skip: "missing-pilot-charter", path: charterPath };
  }
  try {
    const charter = JSON.parse(readFileSync(charterPath, "utf8"));
    if (charter.kind !== "chrysalis.cwl.pilot-charter") {
      return { ok: false, skip: "invalid-pilot-charter-kind", path: charterPath };
    }
    return { ok: true, charter, path: charterPath };
  } catch (e) {
    return { ok: false, skip: "invalid-pilot-charter-json", detail: String(e).slice(0, 120) };
  }
}

/**
 * @param {object} charter
 */
export function resolvePilotCwlFixture(charter) {
  return join(scriptRoot, charter.cwlFixture ?? "fixtures/hub-flagship-cwl-fullstack");
}
