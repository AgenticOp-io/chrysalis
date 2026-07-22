/**
 * Structural-shell PHP Blade template lift (inventory Tier A; markup basic depth).
 * Translate @if($showX) overlays to closed chrome; emit holes for echoes / yields / loops.
 * Never invent Alpine/Livewire runtime (§3 / Tier C residual).
 */
import { finalizeStaticMarkup } from "./ui-markup-static.js";
import { extractHtmlClassNames } from "./ui-markup-svelte.js";
import { maybeStampOverlayGate } from "./ui-markup-overlay-shell.js";

export type BladeMarkupLiftHole = { readonly reason: string; readonly detail: string };

export type BladeMarkupLiftResult = {
  readonly html: string;
  readonly classNames: ReadonlyArray<string>;
  readonly liftMode: "static" | "structural-shell";
  readonly holes: ReadonlyArray<BladeMarkupLiftHole>;
};

export const HOLE_BLADE_IF = "legacy:markup-lift-blade-if";
export const HOLE_BLADE_FOR = "legacy:markup-lift-blade-for";
export const HOLE_BLADE_ECHO = "legacy:markup-lift-blade-echo";
export const HOLE_BLADE_YIELD = "legacy:markup-lift-blade-yield";
export const HOLE_BLADE_INCLUDE = "legacy:markup-lift-blade-include";
export const HOLE_BLADE_ALPINE = "legacy:markup-lift-blade-alpine";
export const HOLE_BLADE_LIVEWIRE = "legacy:markup-lift-blade-livewire";

function holeMarker(reason: string, detail: string, inner = ""): string {
  const safe = detail.replace(/"/g, "'").slice(0, 200);
  if (inner.trim().length > 0) {
    return `<div data-cwl-hole="${reason}" data-cwl-hole-detail="${safe}">${inner}</div>`;
  }
  return `<span data-cwl-hole="${reason}" data-cwl-hole-detail="${safe}"></span>`;
}

function pushHole(holes: BladeMarkupLiftHole[], reason: string, detail: string): void {
  if (!holes.some((h) => h.reason === reason && h.detail === detail)) {
    holes.push({ reason, detail });
  }
}

/**
 * Lift a Blade view to structural-shell HTML.
 * Overlay `@if($showX)` / `@if(showX)` bodies are stamped closed like Svelte gates.
 */
export function liftStructuralBladeTemplateHtml(source: string): BladeMarkupLiftResult | null {
  let html = String(source || "").trim();
  if (!html) return null;

  // Strip Blade comments
  html = html.replace(/\{\{--[\s\S]*?--\}\}/g, "");

  const holes: BladeMarkupLiftHole[] = [];

  // Alpine / Livewire honesty (do not invent runtime)
  if (/\bx-show\s*=/i.test(html) || /\bx-data\s*=/i.test(html)) {
    pushHole(holes, HOLE_BLADE_ALPINE, "x-show|x-data");
  }
  if (/\bwire:/i.test(html)) {
    pushHole(holes, HOLE_BLADE_LIVEWIRE, "wire:*");
  }

  // @yield / @section / @slot → slot holes
  html = html.replace(/@yield\s*\(\s*['"]([^'"]+)['"]\s*\)/gi, (_m, name: string) => {
    pushHole(holes, HOLE_BLADE_YIELD, name);
    return `<div data-cwl-slot="${name}"></div>`;
  });
  html = html.replace(/@slot\s*\(\s*['"]([^'"]+)['"]\s*\)/gi, (_m, name: string) => {
    pushHole(holes, HOLE_BLADE_YIELD, `slot:${name}`);
    return `<div data-cwl-slot="${name}"></div>`;
  });

  // @include / @component
  html = html.replace(/@(?:include|component)\s*\(\s*['"]([^'"]+)['"][^)]*\)/gi, (_m, name: string) => {
    pushHole(holes, HOLE_BLADE_INCLUDE, name);
    return holeMarker(HOLE_BLADE_INCLUDE, name);
  });

  // @foreach / @forelse
  html = html.replace(
    /@foreach\s*\(([^)]+)\)\s*([\s\S]*?)@endforeach/gi,
    (_m, detail: string, body: string) => {
      const d = detail.replace(/\s+/g, " ").trim().slice(0, 120);
      pushHole(holes, HOLE_BLADE_FOR, d);
      return holeMarker(HOLE_BLADE_FOR, d, body.trim());
    },
  );

  // @if ($showX) … @endif — overlay stamp when gate-shaped
  html = html.replace(
    /@if\s*\(\s*\$?((?:show|isOpen|open|visible)[A-Za-z0-9_]*)\s*\)\s*([\s\S]*?)@endif/gi,
    (_m, gate: string, body: string) => {
      pushHole(holes, HOLE_BLADE_IF, gate);
      const stamped = maybeStampOverlayGate(gate, body.trim());
      return stamped ?? holeMarker(HOLE_BLADE_IF, gate, body.trim());
    },
  );

  // Residual @if
  html = html.replace(/@if\s*\(([^)]+)\)\s*([\s\S]*?)@endif/gi, (_m, detail: string, body: string) => {
    const d = detail.replace(/\s+/g, " ").trim().slice(0, 120);
    pushHole(holes, HOLE_BLADE_IF, d);
    const stamped = maybeStampOverlayGate(d, body.trim());
    if (stamped) return stamped;
    return holeMarker(HOLE_BLADE_IF, d, body.trim());
  });

  // {{ $x }} / {!! $x !!}
  html = html.replace(/\{!!\s*([\s\S]*?)!!\}/g, (_m, inner: string) => {
    const detail = `!! ${inner.replace(/\s+/g, " ").trim()}`.slice(0, 120);
    pushHole(holes, HOLE_BLADE_ECHO, detail);
    return holeMarker(HOLE_BLADE_ECHO, detail);
  });
  html = html.replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, (_m, inner: string) => {
    const detail = inner.replace(/\s+/g, " ").trim().slice(0, 120);
    pushHole(holes, HOLE_BLADE_ECHO, detail);
    return holeMarker(HOLE_BLADE_ECHO, detail);
  });

  // Strip remaining Blade directives that are not layout
  html = html.replace(/@(?:csrf|method|error|enderror|auth|guest|php|endphp|verbatim|endverbatim)\b[^\n]*/gi, (m) => {
    pushHole(holes, HOLE_BLADE_IF, m.trim().slice(0, 80));
    return "";
  });
  html = html.replace(/\s+x-(?:show|data|bind|on|text|html|model)=(?:"[^"]*"|'[^']*')/gi, (m) => {
    pushHole(holes, HOLE_BLADE_ALPINE, m.trim().slice(0, 120));
    return "";
  });
  html = html.replace(/\s+wire:[a-z.-]+=(?:"[^"]*"|'[^']*')/gi, (m) => {
    pushHole(holes, HOLE_BLADE_LIVEWIRE, m.trim().slice(0, 120));
    return "";
  });

  html = html.trim();
  if (!html || !/<[a-zA-Z]/.test(html)) {
    if (holes.length === 0) return null;
    return { html: "", classNames: [], liftMode: "structural-shell", holes };
  }

  if (holes.length === 0) {
    const fin = finalizeStaticMarkup(html);
    if (fin) {
      return { html: fin.html, classNames: fin.classNames, liftMode: "static", holes: [] };
    }
  }

  return {
    html,
    classNames: extractHtmlClassNames(html),
    liftMode: "structural-shell",
    holes,
  };
}
