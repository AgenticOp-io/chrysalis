/**
 * Structural-shell Next.js App Router page lift (G9925 / D6418; loading/fonts G9944 / D6429).
 * Do not silently strip `{…}` — emit named holes for interp / client / RSC / components /
 * loading.tsx / next/font. Overlay gates stamp closed chrome like Svelte.
 * Never invent @font-face or skeleton UI (§3).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { finalizeStaticMarkup } from "./ui-markup-static.js";
import { extractHtmlClassNames } from "./ui-markup-svelte.js";
import {
  aliasShellKeyToParent,
  extractJsxParentGate,
  extractOverlayGateIdent,
  maybeStampOverlayGate,
  stampOverlayGate,
  wrapSelfGatedOverlayShell,
} from "./ui-markup-overlay-shell.js";

export type NextMarkupLiftHole = { readonly reason: string; readonly detail: string };

export type NextMarkupLiftResult = {
  readonly html: string;
  readonly classNames: ReadonlyArray<string>;
  readonly liftMode: "static" | "structural-shell";
  readonly holes: ReadonlyArray<NextMarkupLiftHole>;
};

export const HOLE_NEXT_INTERP = "legacy:markup-lift-next-interp";
export const HOLE_NEXT_COMPONENT = "legacy:markup-lift-next-component";
export const HOLE_NEXT_CLIENT = "legacy:markup-lift-next-client";
export const HOLE_NEXT_RSC = "legacy:markup-lift-next-rsc";
export const HOLE_NEXT_LOADING = "legacy:markup-lift-next-loading";
export const HOLE_NEXT_FONT = "legacy:markup-lift-next-font";
export const HOLE_NEXT_IF = "legacy:markup-lift-next-if";

function holeMarker(reason: string, detail: string, inner = ""): string {
  const safe = detail.replace(/"/g, "'").slice(0, 200);
  if (inner.trim().length > 0) {
    return `<div data-cwl-hole="${reason}" data-cwl-hole-detail="${safe}">${inner}</div>`;
  }
  return `<span data-cwl-hole="${reason}" data-cwl-hole-detail="${safe}"></span>`;
}

function pushHole(holes: NextMarkupLiftHole[], reason: string, detail: string): void {
  if (!holes.some((h) => h.reason === reason && h.detail === detail)) {
    holes.push({ reason, detail });
  }
}

function extractReturnJsx(source: string): string | null {
  const m =
    /return\s*\(\s*([\s\S]*?)\s*\);\s*(?:\}|$)/.exec(source) ??
    /return\s+([\s\S]*?);\s*(?:\}|$)/.exec(source);
  if (m === null || m[1] === undefined) return null;
  return m[1].trim();
}

/** Detect next/font imports (honesty hole — do not invent @font-face). */
export function scanNextFontHoles(source: string): NextMarkupLiftHole[] {
  const holes: NextMarkupLiftHole[] = [];
  const re = /from\s+['"](next\/font(?:\/[a-z]+)?)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    pushHole(holes, HOLE_NEXT_FONT, m[1]!);
  }
  if (/\bnext\/font\b/.test(source) && holes.length === 0) {
    pushHole(holes, HOLE_NEXT_FONT, "next/font");
  }
  return holes;
}

/**
 * Companion route files + font imports for a page (G9944).
 * Emits loading.tsx / font holes without inventing UI or @font-face.
 */
export function scanNextCompanionHoles(opts: {
  readonly pageSource: string;
  readonly pageAbsPath?: string;
}): NextMarkupLiftHole[] {
  const holes = scanNextFontHoles(opts.pageSource);
  if (opts.pageAbsPath) {
    const dir = dirname(opts.pageAbsPath);
    for (const name of ["loading.tsx", "loading.jsx", "loading.ts", "loading.js"]) {
      const abs = join(dir, name);
      if (existsSync(abs)) {
        pushHole(holes, HOLE_NEXT_LOADING, name);
        break;
      }
    }
    // Ancestor layout fonts (root → page) — honesty only.
    let cur = dir;
    for (let i = 0; i < 12; i++) {
      for (const name of ["layout.tsx", "layout.jsx", "layout.ts", "layout.js"]) {
        const abs = join(cur, name);
        if (!existsSync(abs)) continue;
        try {
          for (const h of scanNextFontHoles(readFileSync(abs, "utf8"))) {
            if (!holes.some((x) => x.reason === h.reason && x.detail === h.detail)) {
              holes.push(h);
            }
          }
        } catch {
          /* ignore */
        }
        break;
      }
      const parent = dirname(cur);
      if (parent === cur) break;
      cur = parent;
    }
  }
  return holes;
}

function liftNextComponent(
  name: string,
  attrs: string,
  inner: string,
  holes: NextMarkupLiftHole[],
): string {
  pushHole(holes, HOLE_NEXT_COMPONENT, name);
  let body = holeMarker(HOLE_NEXT_COMPONENT, name, inner);
  const parentGate = extractJsxParentGate(attrs);
  if (parentGate) {
    body = aliasShellKeyToParent(body, parentGate);
    body = wrapSelfGatedOverlayShell(body, parentGate);
  }
  return body;
}

/** Structural-shell lift for a Next.js page module. */
export function liftStructuralNextPageJsx(
  source: string,
  fileAbsPath?: string,
): NextMarkupLiftResult | null {
  const holes: NextMarkupLiftHole[] = [
    ...scanNextCompanionHoles(
      fileAbsPath
        ? { pageSource: source, pageAbsPath: fileAbsPath }
        : { pageSource: source },
    ),
  ];
  if (/["']use client["']/.test(source)) {
    pushHole(holes, HOLE_NEXT_CLIENT, "use client");
  }
  if (/\basync\s+function\b/.test(source) || /\bexport\s+default\s+async\b/.test(source)) {
    pushHole(holes, HOLE_NEXT_RSC, "async server component");
  }

  let jsx = extractReturnJsx(source);
  if (!jsx) return null;

  jsx = jsx.replace(/\bclassName=/g, "class=");

  const hasJsxDynamics =
    holes.length > 0 || /\{[^{}]+\}/.test(jsx) || /<\/?[A-Z][A-Za-z0-9_]*/.test(jsx);

  if (!hasJsxDynamics) {
    const fin = finalizeStaticMarkup(jsx);
    if (fin) {
      return { html: fin.html, classNames: fin.classNames, liftMode: "static", holes: [] };
    }
  }

  // Overlay short-circuit: {showX && (<div>…</div>)} / {showX ? (…) : null}
  jsx = jsx.replace(
    /\{((?:show|isOpen|open|visible)[A-Za-z0-9_]*)\s*&&\s*\(([\s\S]*?)\)\}/g,
    (_m, gate: string, inner: string) => {
      pushHole(holes, HOLE_NEXT_IF, gate);
      return stampOverlayGate(inner.trim(), gate);
    },
  );
  jsx = jsx.replace(
    /\{((?:show|isOpen|open|visible)[A-Za-z0-9_]*)\s*\?\s*\(([\s\S]*?)\)\s*:\s*(?:null|undefined|false)\}/g,
    (_m, gate: string, inner: string) => {
      pushHole(holes, HOLE_NEXT_IF, gate);
      return stampOverlayGate(inner.trim(), gate);
    },
  );

  jsx = jsx.replace(/<([A-Z][A-Za-z0-9_]*)\b([^>]*)\/>/g, (_m, name: string, attrs: string) => {
    return liftNextComponent(name, attrs, "", holes);
  });
  jsx = jsx.replace(
    /<([A-Z][A-Za-z0-9_]*)\b([^>]*)>([\s\S]*?)<\/\1>/g,
    (_m, name: string, attrs: string, inner: string) => {
      return liftNextComponent(name, attrs, inner, holes);
    },
  );

  // Native elements with open={showX} (dialogs)
  jsx = jsx.replace(
    /<(dialog|div|section|aside)\b([^>]*?\s(?:open|isOpen|visible|show)\s*=\s*\{[^{}]*\}[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_m, tag: string, attrs: string, inner: string) => {
      const gate = extractJsxParentGate(attrs);
      const clean = attrs
        .replace(/\s(?:open|isOpen|visible|show)\s*=\s*\{[^{}]*\}/gi, "")
        .replace(/\s(?:open|isOpen|visible|show)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
      const el = `<${tag}${clean}>${inner}</${tag}>`;
      if (gate) {
        pushHole(holes, HOLE_NEXT_IF, gate);
        return stampOverlayGate(el, gate);
      }
      return el;
    },
  );

  jsx = jsx.replace(/\{([^{}]*)\}/g, (_m, inner: string) => {
    const detail = String(inner).replace(/\s+/g, " ").trim().slice(0, 120) || "expr";
    const gate = extractOverlayGateIdent(detail);
    if (gate) {
      pushHole(holes, HOLE_NEXT_IF, detail);
      // Bare {showX} boolean paint — honesty hole (no body to stamp).
      return holeMarker(HOLE_NEXT_IF, detail);
    }
    // Conditional with nested markup already handled; residual && without paren
    const andM = /^(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)\s*&&\s*(.+)$/.exec(detail);
    if (andM) {
      pushHole(holes, HOLE_NEXT_IF, andM[1]!);
      const stamped = maybeStampOverlayGate(andM[1]!, andM[2]!);
      if (stamped) return stamped;
    }
    pushHole(holes, HOLE_NEXT_INTERP, detail);
    return holeMarker(HOLE_NEXT_INTERP, detail);
  });

  jsx = jsx.trim();
  if (!jsx || !/<[a-zA-Z]/.test(jsx)) return null;

  if (holes.length === 0) {
    const fin = finalizeStaticMarkup(jsx);
    if (fin) {
      return { html: fin.html, classNames: fin.classNames, liftMode: "static", holes: [] };
    }
  }

  return {
    html: jsx,
    classNames: extractHtmlClassNames(jsx),
    liftMode: "structural-shell",
    holes,
  };
}
