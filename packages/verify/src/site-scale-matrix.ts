/**
 * Site-scale conversion verify matrix (DESIGN D6366, G9440).
 *
 * Composes UI asset/markup artifact integrity, traced API index coverage, and
 * CWL `load` bind evidence for one project tree. Missing layers are skips
 * (honest partial), not silent passes — a layer that is present but failing
 * fails the matrix.
 *
 * CSS/markup selector parity (`verifyUiRouteStyleParity` /
 * `verifyUiRouteMarkupParity`) remains the in-memory lift gate; this matrix
 * checks on-disk project artifacts after convert (map ↔ bundle files).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readCorpus } from "@chrysalis/oracle";
import { parseUiRouteMarkupMapJson, parseUiRouteStyleMapJson } from "@chrysalis/webir";

export const SITE_SCALE_MATRIX_KIND = "chrysalis.verify.site-scale-matrix" as const;
export const SITE_SCALE_MATRIX_SCHEMA_VERSION = 1 as const;

export interface SiteScaleLayerResult {
  readonly layer: "ui-css" | "ui-markup" | "api-traces" | "load-bind";
  readonly ok: boolean;
  readonly skip: string | null;
  readonly detail: Record<string, unknown>;
}

export interface SiteScaleMatrixReportV1 {
  readonly kind: typeof SITE_SCALE_MATRIX_KIND;
  readonly schemaVersion: typeof SITE_SCALE_MATRIX_SCHEMA_VERSION;
  readonly ok: boolean;
  readonly projectDir: string;
  readonly layers: ReadonlyArray<SiteScaleLayerResult>;
  readonly layersChecked: number;
  readonly layersFailed: number;
  readonly layersSkipped: number;
}

export interface VerifySiteScaleMatrixOptions {
  readonly projectDir: string;
  /** Defaults: `.chrysalis/migration.cwl`, `generated/cwl/routes.cwl`, `routes.cwl`. */
  readonly cwlPaths?: readonly string[];
  /** Defaults to `projectDir/traces`. */
  readonly tracesDir?: string;
}

function defaultCwlPaths(projectDir: string): string[] {
  return [
    join(projectDir, ".chrysalis", "migration.cwl"),
    join(projectDir, "generated", "cwl", "routes.cwl"),
    join(projectDir, "routes.cwl"),
  ].filter((p) => existsSync(p));
}

function hrefToLocalFile(bundleDir: string, href: string): string {
  const name = href.split("/").pop() ?? href;
  return join(bundleDir, name);
}

function verifyCssArtifacts(uiAssetsDir: string): SiteScaleLayerResult {
  const mapPath = join(uiAssetsDir, "ui-route-style-map.json");
  if (!existsSync(mapPath)) {
    return { layer: "ui-css", ok: true, skip: "no-ui-assets", detail: {} };
  }
  const parsed = parseUiRouteStyleMapJson(readFileSync(mapPath, "utf8"));
  if (!parsed.ok) {
    return { layer: "ui-css", ok: false, skip: null, detail: { error: parsed.error } };
  }
  const bundleDir = join(uiAssetsDir, "original-css");
  if (!existsSync(bundleDir)) {
    return { layer: "ui-css", ok: false, skip: null, detail: { error: "missing-original-css-dir" } };
  }
  const hrefs = [
    ...parsed.map.routes.map((r) => r.href),
    ...(parsed.map.fallbackHref !== null ? [parsed.map.fallbackHref] : []),
  ];
  const missing: string[] = [];
  const empty: string[] = [];
  for (const href of hrefs) {
    const file = hrefToLocalFile(bundleDir, href);
    if (!existsSync(file)) missing.push(href);
    else if (statSync(file).size === 0) empty.push(href);
  }
  const ok = missing.length === 0 && empty.length === 0 && hrefs.length > 0;
  return {
    layer: "ui-css",
    ok,
    skip: null,
    detail: {
      framework: parsed.map.framework,
      routeCount: parsed.map.routes.length,
      missing,
      empty,
    },
  };
}

function verifyMarkupArtifacts(uiMarkupDir: string): SiteScaleLayerResult {
  const mapPath = join(uiMarkupDir, "ui-route-markup-map.json");
  if (!existsSync(mapPath)) {
    return { layer: "ui-markup", ok: true, skip: "no-ui-markup", detail: {} };
  }
  const parsed = parseUiRouteMarkupMapJson(readFileSync(mapPath, "utf8"));
  if (!parsed.ok) {
    return { layer: "ui-markup", ok: false, skip: null, detail: { error: parsed.error } };
  }
  const bundleDir = join(uiMarkupDir, "original-html");
  if (!existsSync(bundleDir)) {
    return {
      layer: "ui-markup",
      ok: false,
      skip: null,
      detail: { error: "missing-original-html-dir" },
    };
  }
  const missing: string[] = [];
  const empty: string[] = [];
  for (const route of parsed.map.routes) {
    const file = hrefToLocalFile(bundleDir, route.href);
    if (!existsSync(file)) missing.push(route.href);
    else if (statSync(file).size === 0) empty.push(route.href);
  }
  // Also accept files present under original-html even if naming differs slightly —
  // require every map entry to resolve.
  const onDisk = readdirSync(bundleDir).filter((n) => n.endsWith(".html")).length;
  const ok = missing.length === 0 && empty.length === 0 && parsed.map.routes.length > 0;
  return {
    layer: "ui-markup",
    ok,
    skip: null,
    detail: {
      framework: parsed.map.framework,
      routeCount: parsed.map.routes.length,
      htmlFilesOnDisk: onDisk,
      missing,
      empty,
    },
  };
}

function indexApiGetPaths(tracesDir: string): Set<string> {
  const paths = new Set<string>();
  if (!existsSync(tracesDir)) return paths;
  const corpus = readCorpus({ root: tracesDir });
  for (const trace of corpus.traces) {
    let reqPath: string | null = null;
    let reqMethod: string | null = null;
    for (const ev of trace.events) {
      if (ev.type === "http.request") {
        reqPath = ev.path;
        reqMethod = ev.method.toUpperCase();
      } else if (ev.type === "http.response" && reqPath !== null && reqMethod === "GET") {
        if (ev.status >= 200 && ev.status < 300 && reqPath.startsWith("/api")) {
          paths.add(reqPath);
        }
        reqPath = null;
        reqMethod = null;
      }
    }
  }
  return paths;
}

function extractPageApiBindings(cwlSource: string): Array<{ httpPath: string; apiPath: string }> {
  const out: Array<{ httpPath: string; apiPath: string }> = [];
  const pageRe = /@page\s+GET\s+"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = pageRe.exec(cwlSource)) !== null) {
    const httpPath = m[1];
    if (httpPath === undefined) continue;
    const start = m.index;
    const brace = cwlSource.indexOf("{", start);
    if (brace < 0) continue;
    let depth = 0;
    let end = -1;
    for (let i = brace; i < cwlSource.length; i++) {
      const ch = cwlSource[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) continue;
    const block = cwlSource.slice(start, end + 1);
    const loadApi = /load\s*\{[^}]*\bapiPath:\s*"([^"]+)"/s.exec(block);
    const htmlApi = /data-wisp-api="([^"]+)"/.exec(block);
    const apiPath = loadApi?.[1] ?? htmlApi?.[1] ?? null;
    if (apiPath !== null) out.push({ httpPath, apiPath });
  }
  return out;
}

function pageHasLoadBindEvidence(cwlSource: string, httpPath: string): boolean {
  const marker = `@page GET "${httpPath}"`;
  const start = cwlSource.indexOf(marker);
  if (start < 0) return false;
  const brace = cwlSource.indexOf("{", start);
  if (brace < 0) return false;
  let depth = 0;
  let end = -1;
  for (let i = brace; i < cwlSource.length; i++) {
    const ch = cwlSource[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return false;
  const block = cwlSource.slice(start, end + 1);
  return (
    /\btracedApiStatus\s*:/.test(block) ||
    /\bactiveRecords\s*:/.test(block) ||
    /\bapi_ok\s*:/.test(block) ||
    /\bitemCount\s*:/.test(block)
  );
}

/**
 * Run the site-scale conversion verify matrix against a project directory.
 * Requires at least one non-skipped layer; all present layers must pass.
 */
export function verifySiteScaleMatrix(opts: VerifySiteScaleMatrixOptions): SiteScaleMatrixReportV1 {
  const projectDir = opts.projectDir;
  const layers: SiteScaleLayerResult[] = [
    verifyCssArtifacts(join(projectDir, ".chrysalis", "ui-assets")),
    verifyMarkupArtifacts(join(projectDir, ".chrysalis", "ui-markup")),
  ];

  const tracesDir = opts.tracesDir ?? join(projectDir, "traces");
  const apiPaths = indexApiGetPaths(tracesDir);
  if (!existsSync(tracesDir)) {
    layers.push({ layer: "api-traces", ok: true, skip: "no-traces", detail: {} });
  } else if (apiPaths.size === 0) {
    // Oracle page/route corpora (Open Legacy backend fixtures) are not API GET
    // traces — skip honestly rather than fail whole-site matrix on backend-only ports.
    layers.push({
      layer: "api-traces",
      ok: true,
      skip: "no-api-gets",
      detail: { indexedGetApis: 0, reason: "traces-present-but-no-api-gets" },
    });
  } else {
    layers.push({
      layer: "api-traces",
      ok: true,
      skip: null,
      detail: { indexedGetApis: apiPaths.size, paths: [...apiPaths].sort() },
    });
  }

  const cwlPaths = opts.cwlPaths ?? defaultCwlPaths(projectDir);
  if (cwlPaths.length === 0 || apiPaths.size === 0) {
    layers.push({
      layer: "load-bind",
      ok: true,
      skip: cwlPaths.length === 0 ? "no-cwl" : "no-api-traces-for-bind",
      detail: {},
    });
  } else {
    let pagesWithApi = 0;
    let pagesBound = 0;
    let pagesUnbound = 0;
    for (const cwlPath of cwlPaths) {
      const source = readFileSync(cwlPath, "utf8");
      for (const { httpPath, apiPath } of extractPageApiBindings(source)) {
        if (!apiPaths.has(apiPath)) continue;
        pagesWithApi += 1;
        if (pageHasLoadBindEvidence(source, httpPath)) pagesBound += 1;
        else pagesUnbound += 1;
      }
    }
    if (pagesWithApi === 0) {
      layers.push({
        layer: "load-bind",
        ok: true,
        skip: "no-page-api-overlap",
        detail: { indexedGetApis: apiPaths.size },
      });
    } else {
      layers.push({
        layer: "load-bind",
        ok: pagesUnbound === 0,
        skip: null,
        detail: { pagesWithApi, pagesBound, pagesUnbound },
      });
    }
  }

  const layersSkipped = layers.filter((l) => l.skip !== null).length;
  const layersChecked = layers.filter((l) => l.skip === null).length;
  const layersFailed = layers.filter((l) => l.skip === null && !l.ok).length;
  const ok = layersChecked > 0 && layersFailed === 0;

  return {
    kind: SITE_SCALE_MATRIX_KIND,
    schemaVersion: SITE_SCALE_MATRIX_SCHEMA_VERSION,
    ok,
    projectDir,
    layers,
    layersChecked,
    layersFailed,
    layersSkipped,
  };
}
