/**
 * Angular DI graph walk (G9931 / D6423; providedIn/providers G9941 / D6426).
 * Resolve inject()/constructor/providers targets via relative imports; emit named holes
 * for edges and services. External packages stay unresolved (§3 — no invented graphs).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import {
  HOLE_ANGULAR_DI,
  type AngularMarkupLiftHole,
} from "./ui-markup-angular-structural.js";

export const HOLE_ANGULAR_DI_EDGE = "legacy:markup-lift-angular-di-edge";
export const HOLE_ANGULAR_DI_SERVICE = "legacy:markup-lift-angular-di-service";
export const HOLE_ANGULAR_DI_PROVIDED_IN = "legacy:markup-lift-angular-di-provided-in";
export const HOLE_ANGULAR_DI_PROVIDERS = "legacy:markup-lift-angular-di-providers";
export const HOLE_ANGULAR_DI_NGMODULE = "legacy:markup-lift-angular-di-ngmodule";

export type AngularDiEdge = {
  readonly from: string;
  readonly to: string;
  readonly kind: "inject" | "constructor" | "providers" | "ngmodule";
};

export type AngularDiProvidedIn = {
  readonly className: string;
  /** `root` | `platform` | `any` | imported class name | bare token. */
  readonly scope: string;
};

export type AngularDiGraph = {
  readonly nodes: ReadonlyArray<string>;
  readonly edges: ReadonlyArray<AngularDiEdge>;
  readonly providedIn: ReadonlyArray<AngularDiProvidedIn>;
  readonly holes: ReadonlyArray<AngularMarkupLiftHole>;
  /** Tokens from non-relative imports (e.g. @angular/common/http). */
  readonly unresolved: ReadonlyArray<string>;
  readonly entryClass: string | null;
};

function pushHole(holes: AngularMarkupLiftHole[], reason: string, detail: string): void {
  if (!holes.some((h) => h.reason === reason && h.detail === detail)) {
    holes.push({ reason, detail });
  }
}

function parseLocalImports(source: string): Map<string, string> {
  const map = new Map<string, string>();
  const re =
    /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const names = m[1]!
      .split(",")
      .map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()!.trim())
      .filter(Boolean);
    const spec = m[2]!;
    for (const name of names) map.set(name, spec);
  }
  const def = /import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+['"](\.[^'"]+)['"]/g;
  while ((m = def.exec(source)) !== null) {
    map.set(m[1]!, m[2]!);
  }
  return map;
}

function parseExternalInjectTokens(source: string): string[] {
  const local = parseLocalImports(source);
  const tokens: string[] = [];
  const injectRe = /\binject\s*<\s*([A-Z][A-Za-z0-9_]*)\s*>\s*\(|\binject\s*\(\s*([A-Z][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = injectRe.exec(source)) !== null) {
    const name = m[1] ?? m[2];
    if (name && !local.has(name)) tokens.push(name);
  }
  return [...new Set(tokens)];
}

function extractInjectedTypes(source: string): { name: string; kind: "inject" | "constructor" }[] {
  const out: { name: string; kind: "inject" | "constructor" }[] = [];
  const injectRe = /\binject\s*<\s*([A-Z][A-Za-z0-9_]*)\s*>\s*\(|\binject\s*\(\s*([A-Z][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = injectRe.exec(source)) !== null) {
    const name = m[1] ?? m[2];
    if (name) out.push({ name, kind: "inject" });
  }
  const ctor = /\bconstructor\s*\(([^)]*)\)/.exec(source);
  if (ctor?.[1]) {
    for (const part of ctor[1].split(",")) {
      const tm = /:\s*([A-Z][A-Za-z0-9_]*)/.exec(part);
      if (tm?.[1]) out.push({ name: tm[1], kind: "constructor" });
    }
  }
  return out;
}

/** Parse `@Injectable({ providedIn: … })` scope when present. */
export function parseAngularProvidedIn(source: string): string | null {
  const str = /@Injectable\s*\(\s*\{[\s\S]*?providedIn\s*:\s*['"]([^'"]+)['"]/.exec(source);
  if (str?.[1]) return str[1];
  const id = /@Injectable\s*\(\s*\{[\s\S]*?providedIn\s*:\s*([A-Z][A-Za-z0-9_]*)/.exec(source);
  if (id?.[1]) return id[1];
  return null;
}

/** Parse `providers: [A, B]` identifiers from @Component / @NgModule metadata. */
export function parseAngularProvidersList(source: string): string[] {
  const m = /\bproviders\s*:\s*\[([^\]]*)\]/.exec(source);
  if (!m?.[1]) return [];
  const names: string[] = [];
  const re = /\b([A-Z][A-Za-z0-9_]*)\b/g;
  let t: RegExpExecArray | null;
  while ((t = re.exec(m[1])) !== null) {
    names.push(t[1]!);
  }
  return [...new Set(names)];
}

function extractClassName(source: string): string | null {
  const m =
    /export\s+class\s+([A-Z][A-Za-z0-9_]*)/.exec(source) ??
    /class\s+([A-Z][A-Za-z0-9_]*)/.exec(source);
  return m?.[1] ?? null;
}

function resolveImportPath(fromFile: string, spec: string): string | null {
  const base = join(dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
  ];
  for (const c of candidates) {
    const n = normalize(c);
    if (existsSync(n)) return n;
  }
  return null;
}

/**
 * Walk DI from a component/service entry file along relative imports.
 * Does not invent services — unresolved package tokens are listed separately.
 */
export function buildAngularDiGraph(opts: {
  readonly entryFile: string;
  readonly maxDepth?: number;
}): AngularDiGraph {
  const maxDepth = opts.maxDepth ?? 3;
  const nodes = new Set<string>();
  const edges: AngularDiEdge[] = [];
  const providedIn: AngularDiProvidedIn[] = [];
  const holes: AngularMarkupLiftHole[] = [];
  const unresolved = new Set<string>();
  const visited = new Set<string>();

  let entryClass: string | null = null;

  function walk(fileAbs: string, depth: number): void {
    const key = normalize(fileAbs);
    if (visited.has(key) || depth > maxDepth) return;
    if (!existsSync(key)) return;
    visited.add(key);

    let source: string;
    try {
      source = readFileSync(key, "utf8");
    } catch {
      return;
    }

    const className = extractClassName(source) ?? `file:${key}`;
    if (entryClass === null) entryClass = className;
    nodes.add(className);

    if (/@Injectable\b/.test(source)) {
      pushHole(holes, HOLE_ANGULAR_DI_SERVICE, `@Injectable ${className}`);
      const scope = parseAngularProvidedIn(source);
      if (scope) {
        providedIn.push({ className, scope });
        pushHole(holes, HOLE_ANGULAR_DI_PROVIDED_IN, `${className} providedIn:${scope}`);
      } else {
        pushHole(holes, HOLE_ANGULAR_DI_PROVIDED_IN, `${className} providedIn:(none)`);
      }
    }
    if (/\binject\s*\(/.test(source)) {
      pushHole(holes, HOLE_ANGULAR_DI, `inject() in ${className}`);
    }
    if (/\bconstructor\s*\([^)]*:\s*[A-Z]/.test(source)) {
      pushHole(holes, HOLE_ANGULAR_DI, `constructor injection in ${className}`);
    }

    for (const tok of parseExternalInjectTokens(source)) {
      unresolved.add(tok);
      pushHole(holes, HOLE_ANGULAR_DI, `unresolved inject(${tok})`);
    }

    const imports = parseLocalImports(source);

    for (const depName of parseAngularProvidersList(source)) {
      nodes.add(depName);
      edges.push({ from: className, to: depName, kind: "providers" });
      pushHole(holes, HOLE_ANGULAR_DI_PROVIDERS, `${className} providers:${depName}`);
      pushHole(holes, HOLE_ANGULAR_DI_EDGE, `${className}→${depName}`);
      const spec = imports.get(depName);
      if (!spec) {
        unresolved.add(depName);
        continue;
      }
      const resolved = resolveImportPath(key, spec);
      if (resolved) walk(resolved, depth + 1);
      else unresolved.add(depName);
    }

    for (const dep of extractInjectedTypes(source)) {
      nodes.add(dep.name);
      edges.push({ from: className, to: dep.name, kind: dep.kind });
      pushHole(holes, HOLE_ANGULAR_DI_EDGE, `${className}→${dep.name}`);
      pushHole(holes, HOLE_ANGULAR_DI, `${dep.kind}(${dep.name})`);

      const spec = imports.get(dep.name);
      if (!spec) {
        unresolved.add(dep.name);
        continue;
      }
      const resolved = resolveImportPath(key, spec);
      if (resolved) walk(resolved, depth + 1);
      else unresolved.add(dep.name);
    }
  }

  walk(opts.entryFile, 0);

  // Companion NgModule in the same folder (G9945) — providers without inventing services.
  if (opts.entryFile) {
    const dir = dirname(opts.entryFile);
    try {
      for (const name of readdirSync(dir)) {
        if (!/\.module\.ts$/i.test(name)) continue;
        const modAbs = join(dir, name);
        if (visited.has(normalize(modAbs))) continue;
        let modSource = "";
        try {
          modSource = readFileSync(modAbs, "utf8");
        } catch {
          continue;
        }
        if (!/@NgModule\b/.test(modSource)) continue;
        const modClass = extractClassName(modSource) ?? name;
        nodes.add(modClass);
        pushHole(holes, HOLE_ANGULAR_DI_NGMODULE, `@NgModule ${modClass}`);
        const imports = parseLocalImports(modSource);
        for (const depName of parseAngularProvidersList(modSource)) {
          nodes.add(depName);
          edges.push({ from: modClass, to: depName, kind: "ngmodule" });
          pushHole(holes, HOLE_ANGULAR_DI_PROVIDERS, `${modClass} providers:${depName}`);
          pushHole(holes, HOLE_ANGULAR_DI_EDGE, `${modClass}→${depName}`);
          const spec = imports.get(depName);
          if (!spec) {
            unresolved.add(depName);
            continue;
          }
          const resolved = resolveImportPath(modAbs, spec);
          if (resolved) walk(resolved, 1);
          else unresolved.add(depName);
        }
        visited.add(normalize(modAbs));
      }
    } catch {
      /* ignore */
    }
  }

  return {
    nodes: [...nodes].sort(),
    edges,
    providedIn,
    holes,
    unresolved: [...unresolved].sort(),
    entryClass,
  };
}

/** Merge DI-graph holes into a component TS lift when the file path is known. */
export function liftAngularComponentTsWithDiGraph(
  source: string,
  fileAbsPath: string | undefined,
): { holes: AngularMarkupLiftHole[]; graph: AngularDiGraph | null } {
  if (!fileAbsPath) {
    return { holes: [], graph: null };
  }
  const graph = buildAngularDiGraph({ entryFile: fileAbsPath });
  return { holes: [...graph.holes], graph };
}
