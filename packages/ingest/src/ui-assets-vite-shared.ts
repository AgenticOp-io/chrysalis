/**
 * Shared Vite build-manifest helpers for UI asset lift adapters (D6365).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type ViteManifestEntry = {
  readonly css?: ReadonlyArray<string>;
  readonly imports?: ReadonlyArray<string>;
};

export function readViteManifest(buildRoot: string): Record<string, ViteManifestEntry> {
  const candidates = [
    join(buildRoot, ".vite/manifest.json"),
    join(buildRoot, "dist/.vite/manifest.json"),
    join(buildRoot, "dist/manifest.json"),
    join(buildRoot, "manifest.json"),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (path === undefined) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, ViteManifestEntry>;
}

export function kebabCase(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

export function collectManifestCss(
  manifest: Record<string, ViteManifestEntry>,
  key: string,
  seen = new Set<string>(),
): string[] {
  if (seen.has(key)) return [];
  seen.add(key);
  const entry = manifest[key];
  if (entry === undefined) return [];
  const sheets: string[] = [];
  for (const imp of entry.imports ?? []) {
    for (const s of collectManifestCss(manifest, imp, seen)) {
      if (!sheets.includes(s)) sheets.push(s);
    }
  }
  for (const c of entry.css ?? []) {
    if (!sheets.includes(c)) sheets.push(c);
  }
  return sheets;
}

/** Post-strip validation shared by Vue and CSS Modules adapters. */
export function cleanupDescopedSelector(selector: string): string | null {
  let stripped = selector
    .replace(/,\s*,/g, ",")
    .replace(/\(\s*,\s*/g, "(")
    .replace(/,\s*\)/g, ")")
    .replace(/:(?:where|is|not|has)\(\s*\)/g, "");
  const parts = stripped.split(/(\s+|\s*[>+~]\s*)/);
  for (const part of parts) {
    const p = part.trim();
    if (p === "" || /^[>+~]$/.test(p)) continue;
    if (/^::?[a-zA-Z-]/.test(p)) return null;
  }
  const cleaned = stripped.replace(/\s{2,}/g, " ").trim();
  if (cleaned.length === 0) return null;
  if (/^[>+~]/.test(cleaned) || /[>+~]$/.test(cleaned)) return null;
  return cleaned;
}

export function manifestHasCssModuleSheets(manifest: Record<string, ViteManifestEntry>): boolean {
  const isModuleRef = (ref: string) => ref.includes(".module");
  for (const entry of Object.values(manifest)) {
    for (const css of entry.css ?? []) {
      if (isModuleRef(css)) return true;
    }
    for (const imp of entry.imports ?? []) {
      if (isModuleRef(imp)) return true;
    }
  }
  return false;
}
