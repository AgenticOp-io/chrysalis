/**
 * @chrysalis/cwl — language surface pin package.
 * Parser/CLI live in the pillar tree; this package carries the version consumers pin.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** npm package version (must ≡ LANGUAGE_VERSION.md). */
export const VERSION = require('./package.json').version;

/**
 * Absolute path to the chrysalis-cwl pillar root (parent of packages/).
 */
export function pillarRoot() {
  return join(HERE, '..', '..');
}

/**
 * Absolute path to this package directory.
 */
export function packageRoot() {
  return HERE;
}

/**
 * Language version from LANGUAGE_VERSION.md table (fallback: package VERSION).
 */
export function languageVersion() {
  try {
    const md = readFileSync(join(pillarRoot(), 'LANGUAGE_VERSION.md'), 'utf8');
    const m = md.match(/\|\s*\*\*Version\*\*\s*\|\s*`([^`]+)`/);
    if (m) return m[1];
  } catch {
    /* pin may be registry-only without docs tree */
  }
  return VERSION;
}

export default { VERSION, languageVersion, pillarRoot, packageRoot };
