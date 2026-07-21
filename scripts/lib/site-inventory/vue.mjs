/**
 * Vite + Vue / Nuxt origin inventory adapter.
 * Gates: ref/reactive showX, v-if="showX", v-model dialogs, :visible
 * Routes: src/views|pages/.../*.vue
 * Slots: named slot / Teleport
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

export const name = "vite-vue";

export function detect(root) {
  if (existsSync(join(root, "nuxt.config.ts")) || existsSync(join(root, "nuxt.config.js"))) {
    return true;
  }
  const pkg = join(root, "package.json");
  if (existsSync(pkg)) {
    try {
      const j = JSON.parse(readText(pkg));
      const deps = { ...j.dependencies, ...j.devDependencies };
      if (deps?.vue || deps?.nuxt) return true;
    } catch {
      /* ignore */
    }
  }
  return (
    existsSync(join(root, "src", "views")) ||
    existsSync(join(root, "src", "pages")) ||
    walk(join(root, "src"), [], new Set([".vue"])).length > 0
  );
}

export function inventoryOrigin(root) {
  const files = walk(root);
  const b = emptyBuckets();
  const showGates = [];
  const isOpenGates = [];

  for (const file of files) {
    const r = relPath(root, file);
    const text = readText(file);
    if (/\.(vue)$/i.test(r) && /\/(views|pages|layouts)\//.test(r)) b.routes.push(r);

    for (const m of text.matchAll(
      /\b(?:const|let|ref|reactive)\s*\(?\s*(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)\b/g,
    )) {
      const id = m[1];
      const kind = /^isOpen/i.test(id) ? "dialog" : "overlay";
      pushGate(b, id, kind, r);
      if (/^isOpen/i.test(id)) isOpenGates.push(id);
      else showGates.push(id);
    }
    for (const m of text.matchAll(/\bv-if\s*=\s*["'](show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/\bv-show\s*=\s*["'](show[A-Za-z0-9_]+|visible[A-Za-z0-9_]*)/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/:(?:visible|show|open)\s*=\s*["']([^"']+)["']/g)) {
      const id = m[1].replace(/^!/, "").trim();
      if (/^[a-zA-Z_$]/.test(id)) {
        pushGate(b, id, "dialog", r);
        showGates.push(id);
      }
    }
    for (const m of text.matchAll(/import\s+(\w+)\s+from\s+['"][^'"]+\.vue['"]/g)) {
      if (/Modal|Wizard|Menu|Map|Editor|Panel|Dialog/i.test(m[1])) b.components.push(m[1]);
    }
    for (const m of text.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
      b.apis.push(m[1].split("?")[0]);
    }
    for (const m of text.matchAll(/<slot\b[^>]*\bname=["']([^"']+)["']/g)) {
      b.slots.push(`${r}#${m[1]}`);
    }
    if (/<Teleport\b/i.test(text)) b.slots.push(`${r}#teleport`);
    for (const m of text.matchAll(/@(click|submit|change|input)=/g)) {
      b.events.push(m[1]);
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
