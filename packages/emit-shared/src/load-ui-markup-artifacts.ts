/**
 * Load UI markup lift artifacts from `.chrysalis/ui-markup/`.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { UiMarkupBundle, UiRouteMarkupMapV1 } from "@chrysalis/webir";
import { parseUiRouteMarkupMapJson, UI_ROUTE_MARKUP_MAP_KIND } from "@chrysalis/webir";

export interface LoadedUiMarkupArtifacts {
  readonly map: UiRouteMarkupMapV1;
  readonly bundles: ReadonlyArray<UiMarkupBundle>;
  readonly mapPath: string;
  readonly bundleDir: string;
}

/** Read map JSON + HTML bundle files from a lift output directory. */
export function loadUiMarkupLiftArtifacts(uiMarkupDir: string): LoadedUiMarkupArtifacts | null {
  const mapPath = join(uiMarkupDir, "ui-route-markup-map.json");
  if (!existsSync(mapPath)) return null;
  const parsed = parseUiRouteMarkupMapJson(readFileSync(mapPath, "utf8"));
  if (!parsed.ok) return null;

  const bundleDir = join(uiMarkupDir, "original-html");
  if (!existsSync(bundleDir)) return null;

  const byHref = new Map<string, string>();
  for (const ent of readdirSync(bundleDir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith(".html")) continue;
    const href = `/assets/original-html/${ent.name}`;
    byHref.set(href, readFileSync(join(bundleDir, ent.name), "utf8"));
  }

  const bundles: UiMarkupBundle[] = [];
  for (const route of parsed.map.routes) {
    const html = byHref.get(route.href);
    if (html === undefined) continue;
    const classNames: string[] = [];
    const re = /class\s*=\s*(['"])([^'"]+)\1/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const raw = m[2];
      if (raw === undefined) continue;
      for (const part of raw.split(/\s+/)) {
        const c = part.trim();
        if (c.length > 0 && !classNames.includes(c)) classNames.push(c);
      }
    }
    classNames.sort();
    bundles.push({
      routeId: route.routeId,
      href: route.href,
      html,
      classNames,
      sourceFiles: [],
      provenance: [
        {
          source: "ui-markup-lift",
          locator: { kind: "asset", file: basename(route.href) },
          reason: `loaded markup bundle for route ${route.routeId}`,
        },
      ],
    });
  }

  if (bundles.length === 0) return null;
  if (parsed.map.kind !== UI_ROUTE_MARKUP_MAP_KIND) return null;

  return { map: parsed.map, bundles, mapPath, bundleDir };
}
