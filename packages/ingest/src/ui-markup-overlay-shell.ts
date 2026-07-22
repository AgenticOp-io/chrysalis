/**
 * Shared overlay shell fidelity for multi-origin markup lift.
 * Mirrors SvelteKit: stamp data-cwl-shell-key + closed paint for showX / isOpen / open / visible,
 * and wrap self-gated component chrome when a parent page gate is bound.
 */
import { stampClosedUiChrome } from "./ui-markup-svelte-structural.js";

const GATE_IDENT =
  /^(?:!)?(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*|open[A-Za-z0-9_]*|visible[A-Za-z0-9_]*)$/;

/**
 * Extract a page-level overlay gate ident from a framework expression.
 * Returns null for data predicates (loading, items.length, …).
 */
export function extractOverlayGateIdent(expr: string): string | null {
  const e = String(expr || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\((.*)\)$/, "$1")
    .trim();
  if (!e) return null;
  const bare = GATE_IDENT.exec(e);
  if (bare) return bare[1]!;
  const lead =
    /^(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*|open[A-Za-z0-9_]*|visible[A-Za-z0-9_]*)\s*(?:&&|\|\||===|!==|==|!=)/.exec(
      e,
    );
  if (lead) return lead[1]!;
  const trail =
    /(?:&&|\|\|)\s*(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*|open[A-Za-z0-9_]*|visible[A-Za-z0-9_]*)$/.exec(
      e,
    );
  if (trail) return trail[1]!;
  return null;
}

/** Closed overlay chrome for a gated block (same as Svelte `{#if showX}`). */
export function stampOverlayGate(innerHtml: string, gateKey: string): string {
  return stampClosedUiChrome(innerHtml, gateKey);
}

/**
 * If `expr` is an overlay gate, stamp closed chrome keyed to it.
 * Otherwise return null (caller keeps hole-only path).
 */
export function maybeStampOverlayGate(expr: string, innerHtml: string): string | null {
  const gate = extractOverlayGateIdent(expr);
  if (!gate) return null;
  return stampOverlayGate(innerHtml, gate);
}

/** Wrap overlay body in a closed self-gated shell keyed to the page gate. */
export function wrapSelfGatedOverlayShell(innerHtml: string, gateKey: string): string {
  const key = gateKey.replace(/"/g, "&quot;");
  const stamped = stampClosedUiChrome(innerHtml, gateKey);
  return `<div class="cwl-self-gated-shell" data-cwl-shell-key="${key}" hidden aria-hidden="true">${stamped}</div>`;
}

/** Rewrite local isOpen/show/open/visible shell keys to a parent page gate. */
export function aliasShellKeyToParent(html: string, parentGateKey: string): string {
  if (!parentGateKey) return html;
  const keyEsc = parentGateKey.replace(/"/g, "&quot;");
  return html.replace(
    /\sdata-cwl-shell-key="(?:isOpen|show|open|visible)"/g,
    ` data-cwl-shell-key="${keyEsc}"`,
  );
}

/**
 * Fold named slot / portal bodies into host markup placeholders.
 * Supports: <slot name="x">, markers data-cwl-slot="x".
 */
export function foldNamedSlotBodies(
  hostHtml: string,
  slotBodies: Readonly<Record<string, string>>,
): string {
  let html = hostHtml;
  for (const [name, body] of Object.entries(slotBodies)) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const voidSlot = new RegExp(`<slot\\b[^>]*\\bname=["']${esc}["'][^>]*\\/?>`, "gi");
    const pairSlot = new RegExp(
      `<slot\\b[^>]*\\bname=["']${esc}["'][^>]*>[\\s\\S]*?<\\/slot>`,
      "gi",
    );
    const marker = new RegExp(
      `<[^>]*\\bdata-cwl-slot=["']${esc}["'][^>]*>[\\s\\S]*?<\\/[^>]+>`,
      "gi",
    );
    if (pairSlot.test(html)) html = html.replace(pairSlot, () => body);
    else if (voidSlot.test(html)) html = html.replace(voidSlot, () => body);
    else if (marker.test(html)) html = html.replace(marker, () => body);
  }
  return html;
}

/** Pull Vue `#name` / `v-slot:name` template bodies out of component children. */
export function extractVueNamedSlotBodies(inner: string): {
  readonly bodies: Record<string, string>;
  readonly residual: string;
} {
  const bodies: Record<string, string> = {};
  let residual = inner;
  residual = residual.replace(
    /<template\s+(?:#|v-slot:)([A-Za-z0-9_-]+)[^>]*>([\s\S]*?)<\/template>/gi,
    (_m, name: string, body: string) => {
      bodies[name] = body.trim();
      return "";
    },
  );
  return { bodies, residual };
}

/** Parent gate from Vue `:visible` / `:open` / `:show` / `:is-open` binds. */
export function extractVueParentGate(attrs: string): string | null {
  const m =
    /\s(?::|v-bind:)(?:visible|show|open|is-?open)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(
      attrs,
    );
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? m[3] ?? "").trim();
  return extractOverlayGateIdent(raw) ?? (/^[A-Za-z_$][\w.]*$/.test(raw) ? raw.replace(/^!/, "") : null);
}

/** Parent gate from JSX `open={showX}` / `isOpen={showX}` / `visible={showX}`. */
export function extractJsxParentGate(attrs: string): string | null {
  const m =
    /\s(?:open|isOpen|visible|show)\s*=\s*\{([^{}]*)\}/i.exec(attrs) ??
    /\s(?:open|isOpen|visible|show)\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? m[3] ?? "").trim();
  return extractOverlayGateIdent(raw) ?? (/^[A-Za-z_$][\w.]*$/.test(raw) ? raw.replace(/^!/, "") : null);
}

/** Parent gate from Angular `[isOpen]` / `[visible]` / `[open]` binds. */
export function extractAngularParentGate(attrs: string): string | null {
  const m =
    /\s\[(?:isOpen|visible|open|show)\]\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? m[3] ?? "").trim();
  return extractOverlayGateIdent(raw) ?? (/^[A-Za-z_$][\w.]*$/.test(raw) ? raw.replace(/^!/, "") : null);
}
