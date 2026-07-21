/**
 * Source-authoritative UI conversion (DESIGN D6443).
 *
 * The true method: read the origin project’s markup + styles + vendor islands,
 * preserve class names and per-route CSS, and refuse overlay sheets that
 * redefine the same selectors as lifted original CSS.
 */
export const UI_SOURCE_AUTHORITY_KIND = "chrysalis.ui.source-authority";
export const UI_SOURCE_AUTHORITY_SCHEMA_VERSION = 1;

/** Ordered convert steps — agents and pipelines must follow this sequence. */
export const SOURCE_AUTHORITY_CONVERT_STEPS = [
  "read-all-source-files",
  "lift-per-route-css-from-origin",
  "lift-markup-preserving-class-names",
  "preserve-vendor-client-islands",
  "forbid-overlay-redefine-of-origin-selectors",
  "bind-origin-behavior-or-emit-hole",
] as const;

export type SourceAuthorityConvertStep = (typeof SOURCE_AUTHORITY_CONVERT_STEPS)[number];

/** Extract simple `.classname` tokens from a CSS document (best-effort). */
export function collectCssClassSelectors(css: string): Set<string> {
  const out = new Set<string>();
  const re = /\.([A-Za-z_][\w-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    out.add(m[1]!);
  }
  return out;
}

/**
 * Overlay CSS may only style CWL-only chrome. Intersection with original
 * class names (excluding known island-host aliases) is a fidelity violation.
 */
export function findOverlayRedefinedOriginClasses(
  originalCss: string,
  overlayCss: string,
  opts?: { readonly allow?: ReadonlySet<string> },
): string[] {
  const allow = opts?.allow ?? new Set<string>();
  const origin = collectCssClassSelectors(originalCss);
  const overlay = collectCssClassSelectors(overlayCss);
  const hits: string[] = [];
  for (const name of overlay) {
    if (allow.has(name)) continue;
    if (origin.has(name)) hits.push(name);
  }
  return hits.sort();
}

export interface SourceAuthorityReport {
  readonly kind: typeof UI_SOURCE_AUTHORITY_KIND;
  readonly schemaVersion: typeof UI_SOURCE_AUTHORITY_SCHEMA_VERSION;
  readonly ok: boolean;
  readonly steps: ReadonlyArray<SourceAuthorityConvertStep>;
  readonly overlayRedefinitions: ReadonlyArray<string>;
  readonly detail?: string | undefined;
}

export function evaluateSourceAuthorityStyles(opts: {
  readonly originalCss: string;
  readonly overlayCss: string;
  readonly allow?: ReadonlySet<string>;
}): SourceAuthorityReport {
  const overlayRedefinitions = findOverlayRedefinedOriginClasses(
    opts.originalCss,
    opts.overlayCss,
    opts.allow !== undefined ? { allow: opts.allow } : undefined,
  );
  const base = {
    kind: UI_SOURCE_AUTHORITY_KIND,
    schemaVersion: UI_SOURCE_AUTHORITY_SCHEMA_VERSION,
    ok: overlayRedefinitions.length === 0,
    steps: SOURCE_AUTHORITY_CONVERT_STEPS,
    overlayRedefinitions,
  } as const;
  if (overlayRedefinitions.length === 0) return base;
  return {
    ...base,
    detail: `overlay redefines origin classes: ${overlayRedefinitions.slice(0, 20).join(",")}`,
  };
}
