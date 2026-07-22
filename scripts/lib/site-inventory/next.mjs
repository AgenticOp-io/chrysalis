/**
 * Next.js App Router / React origin inventory adapter.
 * Gates: useState(showX), open={showX}, {showX && (…)}, Dialog open=
 * Routes: app/.../page.tsx|jsx
 * Slots: createPortal / Dialog children
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

export const name = "next-app";

export function detect(root) {
  if (existsSync(join(root, "next.config.js")) || existsSync(join(root, "next.config.mjs")) || existsSync(join(root, "next.config.ts"))) {
    return true;
  }
  if (existsSync(join(root, "app")) && walk(join(root, "app"), [], new Set([".tsx", ".jsx", ".js"])).some((f) => /page\.(tsx|jsx|js)$/i.test(f))) {
    return true;
  }
  const pkg = join(root, "package.json");
  if (existsSync(pkg)) {
    try {
      const j = JSON.parse(readText(pkg));
      const deps = { ...j.dependencies, ...j.devDependencies };
      if (deps?.next) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export function inventoryOrigin(root) {
  const files = walk(root);
  const b = emptyBuckets();
  const showGates = [];
  const isOpenGates = [];

  for (const file of files) {
    const r = relPath(root, file);
    const text = readText(file);
    if (/^app\/.*\/page\.(tsx|jsx|js)$/.test(r) || /^app\/page\.(tsx|jsx|js)$/.test(r)) {
      b.routes.push(r);
    }

    for (const m of text.matchAll(
      /\b(?:const|let)\s*\[\s*(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*|open[A-Za-z0-9_]*)\s*,/g,
    )) {
      const id = m[1];
      const kind = /open|isOpen/i.test(id) ? "dialog" : "overlay";
      pushGate(b, id, kind, r);
      if (/isOpen/i.test(id)) isOpenGates.push(id);
      else showGates.push(id);
    }
    for (const m of text.matchAll(/\buseState\s*\(\s*(?:false|true)\s*\)/g)) {
      // paired with destructure above; skip bare
      void m;
    }
    for (const m of text.matchAll(/\b(?:open|isOpen|visible|show)\s*=\s*\{?\s*(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*|open[A-Za-z0-9_]*)/g)) {
      pushGate(b, m[1], "dialog", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/\{(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)\s*&&/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/\b(?:const|let)\s+(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)\s*=/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (/Modal|Wizard|Dialog|Drawer|Sheet|Map/i.test(m[1])) b.components.push(m[1]);
    }
    for (const m of text.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
      b.apis.push(m[1].split("?")[0]);
    }
    if (/createPortal\s*\(/.test(text)) b.slots.push(`${r}#portal`);
    if (/Modal|Dialog|showUpgrade|cwl-self-gated/i.test(text)) {
      b.nests.push(`${r}#overlay-nest`);
    }
    for (const m of text.matchAll(/\bon(?:Click|Submit|Change)=\{/g)) {
      b.events.push(m[0].replace(/=.*/, "").replace(/^on/, "").toLowerCase());
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
    isOpenGates: uniq(isOpenGates),
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
