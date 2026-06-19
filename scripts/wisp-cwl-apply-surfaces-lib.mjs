/** Shared helpers for WISP Phase 13 CWL surface apply scripts (POC harness → CWL language). */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const fixtureDir = join(scriptRoot, "fixtures/hub-wisp-management");
export const routesPath = join(fixtureDir, "routes.cwl");
export const previewPath = join(fixtureDir, "cwl-preview.json");

/** @param {string} html */
export function cwlHtmlReturn(html) {
  const escaped = html
    .replace(/\r\n/g, "\n")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
  return `return html "${escaped}";`;
}

/** @param {string} text @param {string[]} routeLines @param {string} replacement */
export function replaceRouteHandlerBlock(text, routeLines, replacement) {
  const lines = Array.isArray(routeLines) ? routeLines : [routeLines];
  let start = -1;
  for (const routeLine of lines) {
    start = text.indexOf(routeLine);
    if (start >= 0) break;
  }
  if (start < 0) {
    if (text.includes(replacement.split("\n")[0])) return { text, ok: true, skipped: true };
    return { text, ok: false, skip: `missing-${lines[0]}` };
  }
  const brace = text.indexOf("{", start);
  if (brace < 0) return { text, ok: false, skip: `malformed-${lines[0]}` };
  let depth = 0;
  let end = -1;
  for (let i = brace; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return { text, ok: false, skip: `unclosed-${lines[0]}` };
  return { text: text.slice(0, start) + replacement + text.slice(end), ok: true };
}

/** @param {string} path @param {(route: Record<string, unknown>) => void} patch */
export function patchPreviewRoute(path, patch) {
  if (!existsSync(previewPath)) return { ok: false, skip: "missing-cwl-preview" };
  const json = JSON.parse(readFileSync(previewPath, "utf8"));
  const routes = json.routes ?? [];
  const route = routes.find((r) => r.path === path);
  if (!route) return { ok: false, skip: `missing-preview-route-${path}` };
  patch(route);
  json.generatedAt = new Date().toISOString();
  writeFileSync(previewPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  return { ok: true, previewPath };
}
