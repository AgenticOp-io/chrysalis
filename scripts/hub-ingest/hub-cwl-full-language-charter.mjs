/** Shared full web language charter loader (Phase 25, G7501). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultCharterPath = join(
  scriptRoot,
  "fixtures/hub-full-web-language-slice/chrysalis.full-language-charter.v1.json",
);

/**
 * @param {string} [charterPath]
 */
export function loadFullLanguageCharter(charterPath = defaultCharterPath) {
  if (!existsSync(charterPath)) {
    return { ok: false, skip: "missing-full-language-charter", path: charterPath };
  }
  try {
    const charter = JSON.parse(readFileSync(charterPath, "utf8"));
    if (charter.kind !== "chrysalis.cwl.full-language-charter") {
      return { ok: false, skip: "invalid-full-language-charter-kind", path: charterPath };
    }
    return { ok: true, charter, path: charterPath };
  } catch (e) {
    return { ok: false, skip: "invalid-full-language-charter-json", detail: String(e).slice(0, 120) };
  }
}
