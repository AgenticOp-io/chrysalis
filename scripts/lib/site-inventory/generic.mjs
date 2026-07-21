/**
 * Generic / unknown origin — best-effort multi-pattern scan.
 * Used when no framework adapter detects. Prefer a named adapter.
 */
import {
  emptyBuckets,
  pushGate,
  readText,
  relPath,
  uniq,
  walk,
} from "./shared.mjs";

export const name = "generic";

export function detect() {
  return true;
}

export function inventoryOrigin(root) {
  const files = walk(root);
  const b = emptyBuckets();
  const showGates = [];
  const isOpenGates = [];

  for (const file of files) {
    const r = relPath(root, file);
    const text = readText(file);
    if (/\/(routes|pages|views|app)\//.test(r)) b.routes.push(r);

    for (const m of text.matchAll(/\b(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)\b/g)) {
      if (m[1].length > 20) continue;
      pushGate(b, m[1], "overlay", r);
      if (/^isOpen/i.test(m[1])) isOpenGates.push(m[1]);
      else showGates.push(m[1]);
    }
    for (const m of text.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
      b.apis.push(m[1].split("?")[0]);
    }
    for (const m of text.matchAll(/\bslot=["']([^"']+)["']/g)) {
      b.slots.push(`${r}#${m[1]}`);
    }
  }

  return {
    framework: name,
    root: root.replace(/\\/g, "/"),
    fileCount: files.length,
    routes: uniq(b.routes).slice(0, 500),
    gates: uniq(b.gates).slice(0, 500),
    gateKinds: b.gateKinds,
    showGates: uniq(showGates).slice(0, 500),
    isOpenGates: uniq(isOpenGates).slice(0, 200),
    components: [],
    importedUiHints: [],
    apis: uniq(b.apis).slice(0, 500),
    fetchPathHints: uniq(b.apis).slice(0, 500),
    slots: uniq(b.slots).slice(0, 200),
    slotMentions: uniq(b.slots).slice(0, 200),
    events: [],
    eventDirectiveHints: [],
    nests: [],
    vendorIslands: [],
    deadControls: [],
  };
}
