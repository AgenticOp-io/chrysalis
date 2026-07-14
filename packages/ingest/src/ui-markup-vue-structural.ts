/**
 * Structural-shell Vue template lift (G9924 / D6418; wrap for load-bind G9927 / D6420).
 * Preserve layout; emit named holes for v-if / v-for / interp / events / components.
 * v-if / v-for wrap elements in `data-cwl-hole` markers so shared load-bind can hydrate.
 * Never invent live data (§3).
 */
import { finalizeStaticMarkup } from "./ui-markup-static.js";
import { extractHtmlClassNames } from "./ui-markup-svelte.js";

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

function extractTemplate(source: string): string | null {
  const m = /<template[^>]*>([\s\S]*?)<\/template>/i.exec(source);
  if (m === null || m[1] === undefined) return null;
  return m[1];
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

  html = html.replace(/<([A-Z][A-Za-z0-9_]*)\b([^>]*)\/>/g, (_m, name: string) => {
    pushHole(holes, HOLE_VUE_COMPONENT, name);
    return holeMarker(HOLE_VUE_COMPONENT, name);
  });
  html = html.replace(
    /<([A-Z][A-Za-z0-9_]*)\b([^>]*)>([\s\S]*?)<\/\1>/g,
    (_m, name: string, _attrs: string, inner: string) => {
      pushHole(holes, HOLE_VUE_COMPONENT, name);
      return holeMarker(HOLE_VUE_COMPONENT, name, inner);
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
      return holeMarker(HOLE_VUE_IF, detail, `<${tag}${clean}>${inner}</${tag}>`);
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
