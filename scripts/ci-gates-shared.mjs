import fs from "node:fs";
import { resolve } from "node:path";

export function fail(msg) {
  console.error(msg);
  process.exit(1);
}

/** Strip UTF-8 BOM so JSON.parse works if a tool wrote the file with BOM. */
export function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/**
 * Read a JSON artifact for CI gates: resolve path, optional existence check,
 * and SyntaxError-safe parse with a consistent operator-facing prefix.
 *
 * @param {string} gatePrefix e.g. "tiny-n1-insight"
 * @param {string} path
 * @param {{ missingLabel?: string, missingHint?: string[], assumeExists?: boolean }} [options]
 */
export function readJsonGateArtifact(gatePrefix, path, options = {}) {
  const { missingLabel = "file missing", missingHint = [], assumeExists = false } = options;
  const abs = resolve(path);
  if (!assumeExists && !fs.existsSync(abs)) {
    fail([`${gatePrefix}: ${missingLabel}: ${abs}`, ...missingHint].join("\n"));
  }
  try {
    return JSON.parse(stripBom(fs.readFileSync(abs, "utf8")));
  } catch (e) {
    if (e instanceof SyntaxError) {
      fail(`${gatePrefix}: invalid JSON in ${abs}: ${e.message}`);
    }
    const msg = e instanceof Error ? e.message : String(e);
    fail(`${gatePrefix}: could not read ${abs}: ${msg}`);
  }
}

export function readStdinUtf8() {
  return stripBom(fs.readFileSync(0, "utf8"));
}
