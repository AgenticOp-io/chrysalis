/** Universal translator composer charter loader (Phase 26, G7601). */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultCharterPath = join(
  scriptRoot,
  "fixtures/hub-universal-translator-slice/chrysalis.translator-composer.v1.json",
);

/**
 * @param {string} [charterPath]
 */
export function loadTranslatorComposerCharter(charterPath = defaultCharterPath) {
  if (!existsSync(charterPath)) {
    return { ok: false, skip: "missing-translator-composer-charter", path: charterPath };
  }
  try {
    const charter = JSON.parse(readFileSync(charterPath, "utf8"));
    if (charter.kind !== "chrysalis.cwl.translator-composer") {
      return { ok: false, skip: "invalid-translator-composer-kind", path: charterPath };
    }
    return { ok: true, charter, path: charterPath };
  } catch (e) {
    return { ok: false, skip: "invalid-translator-composer-json", detail: String(e).slice(0, 120) };
  }
}

export { scriptRoot as TRANSLATOR_COMPOSER_SCRIPT_ROOT };
