/**
 * Structural-shell Angular template + DI lift (G9926 / D6419).
 * Preserve layout; emit named holes for *ngIf/*ngFor/interp/events/binds/components
 * and companion .ts inject()/constructor DI. Never invent live data (§3).
 */
import { finalizeStaticMarkup } from "./ui-markup-static.js";
import { extractHtmlClassNames } from "./ui-markup-svelte.js";

export type AngularMarkupLiftHole = { readonly reason: string; readonly detail: string };

export type AngularMarkupLiftResult = {
  readonly html: string;
  readonly classNames: ReadonlyArray<string>;
  readonly liftMode: "static" | "structural-shell";
  readonly holes: ReadonlyArray<AngularMarkupLiftHole>;
};

export const HOLE_ANGULAR_IF = "legacy:markup-lift-angular-if";
export const HOLE_ANGULAR_FOR = "legacy:markup-lift-angular-for";
export const HOLE_ANGULAR_INTERP = "legacy:markup-lift-angular-interp";
export const HOLE_ANGULAR_EVENT = "legacy:markup-lift-angular-event";
export const HOLE_ANGULAR_BIND = "legacy:markup-lift-angular-bind";
export const HOLE_ANGULAR_COMPONENT = "legacy:markup-lift-angular-component";
export const HOLE_ANGULAR_DI = "legacy:markup-lift-angular-di";
export const HOLE_ANGULAR_ASYNC = "legacy:markup-lift-angular-async";

function holeMarker(reason: string, detail: string, inner = ""): string {
  const safe = detail.replace(/"/g, "'").slice(0, 200);
  if (inner.trim().length > 0) {
    return `<div data-cwl-hole="${reason}" data-cwl-hole-detail="${safe}">${inner}</div>`;
  }
  return `<span data-cwl-hole="${reason}" data-cwl-hole-detail="${safe}"></span>`;
}

function pushHole(holes: AngularMarkupLiftHole[], reason: string, detail: string): void {
  if (!holes.some((h) => h.reason === reason && h.detail === detail)) {
    holes.push({ reason, detail });
  }
}

/** Scan Angular component/service TypeScript for DI surface. */
export function scanAngularTsForDiHoles(source: string): AngularMarkupLiftHole[] {
  const holes: AngularMarkupLiftHole[] = [];
  if (/\binject\s*\(/.test(source)) {
    pushHole(holes, HOLE_ANGULAR_DI, "inject()");
  }
  if (/\bconstructor\s*\([^)]*:\s*[A-Z][A-Za-z0-9_]*/.test(source)) {
    pushHole(holes, HOLE_ANGULAR_DI, "constructor injection");
  }
  if (/@Injectable\b/.test(source)) {
    pushHole(holes, HOLE_ANGULAR_DI, "@Injectable");
  }
  if (/@Inject\s*\(/.test(source)) {
    pushHole(holes, HOLE_ANGULAR_DI, "@Inject");
  }
  return holes;
}

/** Structural-shell lift for an Angular component template (HTML). */
export function liftStructuralAngularTemplateHtml(source: string): AngularMarkupLiftResult | null {
  const trimmed = source.trim();
  if (!trimmed || !/<[a-zA-Z]/.test(trimmed)) return null;

  const staticTry = finalizeStaticMarkup(trimmed);
  if (staticTry !== null) {
    return {
      html: staticTry.html,
      classNames: staticTry.classNames,
      liftMode: "static",
      holes: [],
    };
  }

  let html = trimmed;
  const holes: AngularMarkupLiftHole[] = [];

  // Custom elements / components (app-*, lib-*, or unknown hyphenated tags)
  html = html.replace(
    /<(app|lib|shared)-([a-z][\w-]*)\b([^>]*)\/>/gi,
    (_m, pfx: string, name: string) => {
      const tag = `${pfx}-${name}`;
      pushHole(holes, HOLE_ANGULAR_COMPONENT, tag);
      return holeMarker(HOLE_ANGULAR_COMPONENT, tag);
    },
  );
  html = html.replace(
    /<(app|lib|shared)-([a-z][\w-]*)\b([^>]*)>([\s\S]*?)<\/\1-\2>/gi,
    (_m, pfx: string, name: string, _a: string, inner: string) => {
      const tag = `${pfx}-${name}`;
      pushHole(holes, HOLE_ANGULAR_COMPONENT, tag);
      return holeMarker(HOLE_ANGULAR_COMPONENT, tag, inner);
    },
  );

  // Interps before control wraps so item.label markers sit inside *ngFor holes.
  html = html.replace(/\{\{[\s\S]*?\}\}/g, (m) => {
    const detail = m.replace(/\s+/g, " ").slice(0, 120);
    if (/\|\s*async\b/.test(m)) {
      pushHole(holes, HOLE_ANGULAR_ASYNC, detail);
    }
    pushHole(holes, HOLE_ANGULAR_INTERP, detail);
    return holeMarker(
      /\|\s*async\b/.test(m) ? HOLE_ANGULAR_ASYNC : HOLE_ANGULAR_INTERP,
      detail,
    );
  });

  // Classic *ngFor / *ngIf — wrap element for shared load-bind (G9927).
  html = html.replace(
    /<([a-z][\w-]*)([^>]*?\*ngFor=(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_m, tag: string, attrs: string, inner: string) => {
      const m = /\*ngFor=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const detail = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "ngFor").trim();
      pushHole(holes, HOLE_ANGULAR_FOR, detail);
      const clean = attrs
        .replace(/\s+\*ngFor=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s+\[ngForOf\]=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      return holeMarker(HOLE_ANGULAR_FOR, detail, `<${tag}${clean}>${inner}</${tag}>`);
    },
  );

  html = html.replace(
    /<([a-z][\w-]*)([^>]*?\*ngIf=(?:"[^"]*"|'[^']*'|[^\s>]+)[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_m, tag: string, attrs: string, inner: string) => {
      const m = /\*ngIf=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const detail = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "ngIf").trim();
      pushHole(holes, HOLE_ANGULAR_IF, detail);
      const clean = attrs.replace(/\s+\*ngIf=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      return holeMarker(HOLE_ANGULAR_IF, detail, `<${tag}${clean}>${inner}</${tag}>`);
    },
  );

  // Angular control-flow (@if / @for) — comment markers only (block body not HTML-shaped).
  html = html.replace(/@(?:if|else if|else|for|switch|case|default)\b[^{]*\{/g, (m) => {
    const kind = /@for\b/.test(m) ? HOLE_ANGULAR_FOR : HOLE_ANGULAR_IF;
    pushHole(holes, kind, m.trim().slice(0, 120));
    return `<!--${kind}-->`;
  });

  html = html.replace(/\s+\*ng(?:If|For|SwitchCase|SwitchDefault)\b(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, (m) => {
    const kind = /\*ngFor/i.test(m) ? HOLE_ANGULAR_FOR : HOLE_ANGULAR_IF;
    pushHole(holes, kind, m.trim().slice(0, 120));
    return "";
  });

  html = html.replace(/\s+\([A-Za-z][\w.-]*\)(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, (m) => {
    pushHole(holes, HOLE_ANGULAR_EVENT, m.trim().slice(0, 120));
    return "";
  });

  html = html.replace(/\s+\[[A-Za-z@][\w.-]*\](?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, (m) => {
    pushHole(holes, HOLE_ANGULAR_BIND, m.trim().slice(0, 120));
    return "";
  });

  html = html.replace(/\s+\[\([A-Za-z][\w.-]*\)\](?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g, (m) => {
    pushHole(holes, HOLE_ANGULAR_BIND, m.trim().slice(0, 120));
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

/** Lift Angular `.component.ts` as DI hole carrier (no layout HTML). */
export function liftStructuralAngularComponentTs(source: string): AngularMarkupLiftResult | null {
  const holes = scanAngularTsForDiHoles(source);
  if (holes.length === 0) return null;
  return {
    html: "",
    classNames: [],
    liftMode: "structural-shell",
    holes,
  };
}

function looksLikeAngularTs(source: string): boolean {
  return (
    /@Component\b/.test(source) ||
    /@Injectable\b/.test(source) ||
    /\binject\s*\(/.test(source) ||
    /\bconstructor\s*\(/.test(source)
  );
}

/** Dispatch structural lift for template HTML or companion TS. */
export function liftStructuralAngularSource(source: string): AngularMarkupLiftResult | null {
  if (looksLikeAngularTs(source) && !/<[a-zA-Z][^>]*>/.test(source.slice(0, 200))) {
    return liftStructuralAngularComponentTs(source);
  }
  if (looksLikeAngularTs(source) && /template\s*:/.test(source)) {
    // Inline template in @Component — extract if present
    const m = /template\s*:\s*`([\s\S]*?)`/.exec(source) ?? /template\s*:\s*'([\s\S]*?)'/.exec(source);
    const diHoles = scanAngularTsForDiHoles(source);
    if (m?.[1]) {
      const lifted = liftStructuralAngularTemplateHtml(m[1]);
      if (lifted === null) {
        return diHoles.length > 0
          ? { html: "", classNames: [], liftMode: "structural-shell", holes: diHoles }
          : null;
      }
      return {
        ...lifted,
        liftMode: diHoles.length > 0 || lifted.holes.length > 0 ? "structural-shell" : lifted.liftMode,
        holes: [...lifted.holes, ...diHoles],
      };
    }
    return diHoles.length > 0
      ? { html: "", classNames: [], liftMode: "structural-shell", holes: diHoles }
      : null;
  }
  return liftStructuralAngularTemplateHtml(source);
}
