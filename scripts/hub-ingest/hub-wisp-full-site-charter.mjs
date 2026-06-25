/**
 * Load WISP full-site CWL charter (Phase 27).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultPath = join(
  scriptRoot,
  "fixtures/hub-wisp-full-site-slice/chrysalis.wisp-full-site.v1.json",
);

/**
 * @param {string} [charterPath]
 */
export function loadWispFullSiteCharter(charterPath = defaultPath) {
  if (!existsSync(charterPath)) {
    return { ok: false, skip: "missing-wisp-full-site-charter", path: charterPath };
  }
  let charter;
  try {
    charter = JSON.parse(readFileSync(charterPath, "utf8"));
  } catch (e) {
    return { ok: false, skip: "invalid-wisp-full-site-charter", detail: String(e) };
  }
  const ok =
    charter.kind === "chrysalis.wisp.full-site-cwl" &&
    charter.schemaVersion === 1 &&
    charter.charterId === "wisp-full-site-v1" &&
    charter.requiresProgramClosed === "G7690" &&
    charter.backendConversionTarget === "native-cwl-handlers" &&
    Array.isArray(charter.disallowedAtClose) &&
    charter.disallowedAtClose.includes("hub-cwl:upstream-proxy");
  return { ok, charter, path: charterPath };
}
