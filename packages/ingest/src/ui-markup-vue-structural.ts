/**
 * Structural-shell Vue template lift (G9924 / D6418; wrap for load-bind G9927 / D6420).
 * Preserve layout; emit named holes for v-if / v-for / interp / events / components.
 * Overlay gates (showX / isOpen / open / visible) stamp closed self-keyed chrome like Svelte.
 * Never invent live data (section 3).
 */
import { finalizeStaticMarkup } from "./ui-markup-static.js";
import { extractHtmlClassNames } from "./ui-markup-svelte.js";
import {
  aliasShellKeyToParent,
  extractVueNamedSlotBodies,
  extractVueParentGate,
  maybeStampOverlayGate,
  wrapSelfGatedOverlayShell,
} from "./ui-markup-overlay-shell.js";

export type VueMarkupLiftHole = { readonly reason: string; readonly detail: string };

export type VueMarkupLiftResult = {
  readonly html: string;
  readonly classNames: ReadonlyArray<string>;
  readonly liftMode: "static" | "structural-shell";
  readonly holes: ReadonlyArray<VueMarkupLiftHole>;
};

export const HOLE_VUE_IF = "legacy:markup-lift-vue-if";
export const HOLE_VUE_FOR = "legacy:markup-lift-vue-for";
export const HOLE_VUE_INTERP = "legacy:markup-lift-vue-interp";
export const HOLE_VUE_EVENT = "legacy:markup-lift-vue-event";
export const HOLE_VUE_BIND = "legacy:markup-lift-vue-bind";
export const HOLE_VUE_COMPONENT = "legacy:markup-lift-vue-component";
export const HOLE_VUE_SLOT = "legacy:markup-lift-vue-slot";

function holeMarker(reason: string, detail: string, inner = ""): string {
  const safe = detail.replace(/"/g, "'").slice(0, 200);
  if (inner.trim().length > 0) {
    return `<div data-cwl-hole="${reason}" data-cwl-hole-detail="${safe}">${inner}</div>`;
  }
  return `<span data-cwl-hole="${reason}" data-cwl-hole-detail="${safe}"></span>`;
}

function pushHole(holes: VueMarkupLiftHole[], reason: string, detail: string): void {
  if (!holes.some((h) => h.reason === reason && h.detail === detail)) {
    holes.push({ reason, detail });
  }
}

/** Extract the root `<template>` body from a Vue SFC (nested slot templates allowed). */
export function extractVueSfcTemplate(source: string): string | null {
  const open = /<template\b[^>]*>/i.exec(source);
  if (open === null) return null;
  const start = open.index + open[0].length;
  // Depth-count so nested <template #slot> does not truncate the SFC root.
  const token = /<\/?template\b[^>]*>/gi;
  token.lastIndex = start;
  let depth = 1;
  let t: RegExpExecArray | null;
  while ((t = token.exec(source)) !== null) {
    if (/^<\//.test(t[0])) depth -= 1;
    else depth += 1;
    if (depth === 0) return source.slice(start, t.index);
  }
  return null;
}

function extractTemplate(source: string): string | null {
  return extractVueSfcTemplate(source);
}

function vueDirValue(attrs: string, name: string): string | null {
  const re = new RegExp(
    `\\s+${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const m = re.exec(attrs);
  if (!m) return null;
  return (m[1] ?? m[2] ?? m[3] ?? "").trim();
}

function stripVueControlAttrs(attrs: string): string {
  return attrs
    .replace(/\s+v-(?:for|if|else-if|else|show)(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, "")
    .replace(/\s+:key=(?:"[^"]*"|'[^']*'|[^\s>]+)/g, "")
    .replace(/\s+v-bind:key=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function liftVueComponent(
  name: string,
  attrs: string,
  inner: string,
  holes: VueMarkupLiftHole[],
): string {
  pushHole(holes, HOLE_VUE_COMPONENT, name);
  const { bodies, residual } = extractVueNamedSlotBodies(inner);
  for (const slotName of Object.keys(bodies)) {
    pushHole(holes, HOLE_VUE_SLOT, `${name}#${slotName}`);
  }
  const slotMarkers = Object.entries(bodies)
    .map(([n, b]) => `<div data-cwl-slot="${n}">${b}</div>`)
    .join("");
  let body = holeMarker(
    HOLE_VUE_COMPONENT,
    name,
    `${residual.trim()}${slotMarkers}`.trim(),
  );
  const parentGate = extractVueParentGate(attrs);
  if (parentGate) {
    body = aliasShellKeyToParent(body, parentGate);
    body = wrapSelfGatedOverlayShell(body, parentGate);
  }
  return body;
}

/** Structural-shell lift for a Vue SFC (or raw template HTML). */
export function liftStructuralVueTemplateHtml(source: string): VueMarkupLiftResult | null {
  const rawTemplate = extractTemplate(source);
  if (rawTemplate === null) return null;

  const staticTry = finalizeStaticMarkup(rawTemplate);
  if (staticTry !== null) {
    return {
      html: staticTry.html,
      classNames: staticTry.classNames,
      liftMode: "static",
      holes: [],
    };
  }

  let html = rawTemplate.trim();
  if (!html || !/<[a-zA-Z]/.test(html)) return null;

  const holes: VueMarkupLiftHole[] = [];

  // Teleport → slot-like honesty marker (do not invent portal target).
  html = html.replace(
    /<Teleport\b([^>]*)>([\s\S]*?)<\/Teleport>/gi,
    (_m, _attrs: string, inner: string) => {
      pushHole(holes, HOLE_VUE_SLOT, "Teleport");
      return `<div data-cwl-slot="teleport">${inner}</div>`;
    },
  );

  html = html.replace(/<([A-Z][A-Za-z0-9_]*)\b([^>]*)\/>/g, (_m, name: string, attrs: string) => {
    return liftVueComponent(name, attrs, "", holes);
  });
  html = html.replace(
    /<([A-Z][A-Za-z0-9_]*)\b([^>]*)>([\s\S]*?)<\/\1>/g,
    (_m, name: string, attrs: string, inner: string) => {
      return liftVueComponent(name, attrs, inner, holes);
    },
  );

  // Interps before control wraps so item.label markers sit inside v-for holes.
  html = html.replace(/\{\{[\s\S]*?\}\}/g, (m) => {
    const detail = m.replace(/\s+/g, " ").slice(0, 120);
    pushHole(holes, HOLE_VUE_INTERP, detail);
    return holeMarker(HOLE_VUE_INTERP, detail);
  });

  html = html.replace(
    /<([a-z][\w-]*)([^>]*?\sv-for=(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_m, tag: string, attrs: string, inner: string) => {
      const detail = vueDirValue(attrs, "v-for") ?? "v-for";
      pushHole(holes, HOLE_VUE_FOR, detail);
      const clean = stripVueControlAttrs(attrs);
      return holeMarker(HOLE_VUE_FOR, detail, `<${tag}${clean}>${inner}</${tag}>`);
    },
  );

  html = html.replace(
    /<([a-z][\w-]*)([^>]*?\sv-(?:if|else-if|show)=(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_m, tag: string, attrs: string, inner: string) => {
      const detail =
        vueDirValue(attrs, "v-if") ??
        vueDirValue(attrs, "v-else-if") ??
        vueDirValue(attrs, "v-show") ??
        "v-if";
      pushHole(holes, HOLE_VUE_IF, detail);
      const clean = stripVueControlAttrs(attrs);
      const el = `<${tag}${clean}>${inner}</${tag}>`;
      const stamped = maybeStampOverlayGate(detail, el);
      if (stamped) return stamped;
      return holeMarker(HOLE_VUE_IF, detail, el);
    },
  );

  // Residual control attrs (e.g. bare v-else) — record + strip, no wrap.
  html = html.replace(
    /\s+v-(?:for|if|else-if|else|show)(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi,
    (m) => {
      const kind = /v-for/i.test(m) ? HOLE_VUE_FOR : HOLE_VUE_IF;
      pushHole(holes, kind, m.trim().slice(0, 120));
      return "";
    },
  );

  html = html.replace(/\s+@[A-Za-z][\w.-]*(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, (m) => {
    pushHole(holes, HOLE_VUE_EVENT, m.trim().slice(0, 120));
    return "";
  });

  html = html.replace(/\s+(?:v-bind:|:)[A-Za-z_][\w.-]*(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, (m) => {
    pushHole(holes, HOLE_VUE_BIND, m.trim().slice(0, 120));
    return "";
  });

  html = html.trim();
  if (!html || !/<[a-zA-Z]/.test(html)) return null;

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
