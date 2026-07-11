/**
 * Shared static HTML checks for UI markup lift adapters (G9306).
 */
import { extractHtmlClassNames } from "./ui-markup-svelte.js";

/** Reject framework template bindings / directives — static lift only. */
export function isStaticHtmlFragment(html: string): boolean {
  const s = html.trim();
  if (s.length === 0 || !/<[a-z]/i.test(s)) return false;
  if (/\{\{/.test(s)) return false;
  if (/\{[#/@]/.test(s) || /\{[a-zA-Z_]/.test(s)) return false;
  // Framework component tags (PascalCase) are not static HTML.
  if (/<\/?[A-Z][A-Za-z0-9_]*/.test(s)) return false;
  if (/\*ng[A-Za-z]/.test(s)) return false;
  if (/\[[a-zA-Z@]/.test(s)) return false;
  if (/\([a-zA-Z@]/.test(s)) return false;
  return true;
}

/** Normalize lifted static HTML and collect class inventory. */
export function finalizeStaticMarkup(html: string): { html: string; classNames: string[] } | null {
  const trimmed = html.trim();
  if (!isStaticHtmlFragment(trimmed)) return null;
  return { html: trimmed, classNames: extractHtmlClassNames(trimmed) };
}
