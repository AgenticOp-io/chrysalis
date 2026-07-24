import type { HubNativeRoute } from "./schema.js";

/** Sinatra: `get "/path"` — first string only. */
const RUBY_SINATRA_VERB_RE =
  /\b(get|post|put|patch|delete|head|options)\s+['"]([^'"]+)['"]/gi;

/**
 * Roda shallow: `r.get "path" do`, `r.get "items", String do |id|`,
 * `r.get "items", :id do |id|` (G10022). Nested `r.on` stays unwired.
 */
const RUBY_RODA_VERB_RE =
  /\b(?:[a-zA-Z_]\w*\.)?(get|post|put|patch|delete|head|options)\s+((?:['"][^'"]+['"]|String|Integer|Hash|:[A-Za-z_]\w*)(?:\s*,\s*(?:['"][^'"]+['"]|String|Integer|Hash|:[A-Za-z_]\w*))*)\s+do(?:\s*\|([^|]+)\|)?/gi;

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

/** True when source is a Roda app (secondary dialect; Sinatra remains Ruby ST). */
export function isRubyRodaSource(source: string): boolean {
  return (
    /\brequire\s+['"]roda['"]/.test(source) ||
    /\bclass\s+\w+\s*<\s*Roda\b/.test(source) ||
    /\broute\s+do\s*\|/.test(source)
  );
}

/**
 * Build a hub path from Roda matcher args + optional block captures.
 * `"health"` → `/health`; `"items", String` + `|id|` → `/items/:id`.
 */
export function buildRodaPath(matcherSrc: string, blockParams?: string): string {
  const captures = (blockParams ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let captureIdx = 0;
  const segments: string[] = [];

  const tokenRe = /['"]([^'"]+)['"]|:(?:[A-Za-z_]\w*)|String|Integer|Hash/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(matcherSrc)) !== null) {
    if (m[1] !== undefined) {
      const raw = m[1];
      for (const part of raw.split("/").filter(Boolean)) {
        segments.push(part.startsWith(":") ? part : part);
      }
    } else if (m[0].startsWith(":")) {
      segments.push(m[0]);
    } else {
      const name = captures[captureIdx] ?? "id";
      captureIdx += 1;
      segments.push(`:${name}`);
    }
  }

  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

export function parseRubyRoutes(source: string): HubNativeRoute[] {
  const routes: HubNativeRoute[] = [];
  const seen = new Set<string>();
  const roda = isRubyRodaSource(source);

  function push(method: string, path: string, index: number) {
    const key = `${method}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    routes.push({
      method,
      path,
      line: lineAt(source, index),
      name: `r_${routes.length}`,
    });
  }

  if (roda) {
    RUBY_RODA_VERB_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RUBY_RODA_VERB_RE.exec(source)) !== null) {
      const method = (m[1] ?? "get").toUpperCase();
      const path = buildRodaPath(m[2] ?? "", m[3]);
      push(method, path, m.index);
    }
    return routes;
  }

  RUBY_SINATRA_VERB_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RUBY_SINATRA_VERB_RE.exec(source)) !== null) {
    push((m[1] ?? "get").toUpperCase(), m[2] ?? "/", m.index);
  }
  return routes;
}
