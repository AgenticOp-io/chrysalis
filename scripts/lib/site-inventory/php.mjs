/**
 * PHP plain / Laravel handlers (when Blade not primary) — route + include inventory.
 * Prefer php-blade when resources/views exists; this is a lighter fallback.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  emptyBuckets,
  pushGate,
  readText,
  relPath,
  uniq,
  walk,
} from "./shared.mjs";

export const name = "php";

export function detect(root) {
  if (existsSync(join(root, "composer.json"))) return true;
  return walk(root, [], new Set([".php"])).length > 3;
}

export function inventoryOrigin(root) {
  const files = walk(root, [], new Set([".php", ".html", ".js", ".css"]));
  const b = emptyBuckets();
  const showGates = [];

  for (const file of files) {
    const r = relPath(root, file);
    const text = readText(file);
    if (/\.php$/i.test(r) && !/vendor\//.test(r)) {
      if (/index\.php$|Router|routes\//i.test(r)) b.routes.push(r);
    }
    for (const m of text.matchAll(/\$show([A-Za-z0-9_]+)\s*=/g)) {
      pushGate(b, `show${m[1]}`, "overlay", r);
      showGates.push(`show${m[1]}`);
    }
    for (const m of text.matchAll(/(?:header|Location:)\s*[`'"]([^`'"]+)/gi)) {
      if (m[1].startsWith("/")) b.routes.push(`redirect:${m[1]}`);
    }
    for (const m of text.matchAll(/curl_setopt|file_get_contents\(\s*[`'"](https?:[^`'"]+)/g)) {
      b.apis.push(m[1].split("?")[0]);
    }
    for (const m of text.matchAll(/include(?:_once)?\s*\(?\s*['"]([^'"]+\.php)/g)) {
      b.components.push(m[1]);
    }
  }

  return {
    framework: name,
    root: root.replace(/\\/g, "/"),
    fileCount: files.length,
    routes: uniq(b.routes),
    gates: uniq(b.gates),
    gateKinds: b.gateKinds,
    showGates: uniq(showGates),
    isOpenGates: [],
    components: uniq(b.components).slice(0, 500),
    importedUiHints: uniq(b.components).slice(0, 500),
    apis: uniq(b.apis).slice(0, 500),
    fetchPathHints: uniq(b.apis).slice(0, 500),
    slots: uniq(b.slots),
    slotMentions: uniq(b.slots),
    events: uniq(b.events),
    eventDirectiveHints: uniq(b.events),
    nests: b.nests,
    vendorIslands: uniq(b.vendorIslands),
    deadControls: b.deadControls,
  };
}
