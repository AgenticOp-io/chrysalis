/**
 * PHP Blade / Laravel views + Alpine / Livewire gate hints.
 * Routes: resources/views/.../*.blade.php + routes/*.php path hints
 * Gates: @if($showX), x-show, wire:model, Alpine show
 * Slots: @yield / @slot / @section
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

export const name = "php-blade";

export function detect(root) {
  if (existsSync(join(root, "artisan")) || existsSync(join(root, "resources", "views"))) {
    return true;
  }
  return walk(root, [], new Set([".php"])).some((f) => f.toLowerCase().endsWith(".blade.php"));
}

export function inventoryOrigin(root) {
  const files = walk(root);
  const b = emptyBuckets();
  const showGates = [];
  const isOpenGates = [];

  for (const file of files) {
    const r = relPath(root, file);
    const text = readText(file);
    const lower = r.toLowerCase();

    if (lower.endsWith(".blade.php") && /resources\/views\//.test(r)) b.routes.push(r);
    if (/^routes\/.*\.php$/.test(r)) {
      for (const m of text.matchAll(/->(?:get|post|put|patch|delete|any|match)\(\s*['"]([^'"]+)['"]/g)) {
        b.routes.push(`route:${m[1]}`);
      }
      for (const m of text.matchAll(/Route::(?:get|post|put|patch|delete|any|match)\(\s*['"]([^'"]+)['"]/g)) {
        b.routes.push(`route:${m[1]}`);
      }
    }

    for (const m of text.matchAll(/@if\s*\(\s*\$?(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/\bx-show\s*=\s*["']([^"']+)["']/g)) {
      const id = m[1].replace(/^!/, "").trim();
      if (/show|open|visible|modal/i.test(id)) {
        pushGate(b, id, "overlay", r);
        showGates.push(id);
      }
    }
    for (const m of text.matchAll(/\bwire:(?:model|click)\s*=\s*["']([^"']+)["']/g)) {
      if (/show|open|modal|wizard/i.test(m[1])) {
        pushGate(b, m[1], "overlay", r);
        showGates.push(m[1]);
      }
    }
    for (const m of text.matchAll(/@yield\s*\(\s*['"]([^'"]+)['"]/g)) {
      b.slots.push(`${r}#yield:${m[1]}`);
    }
    for (const m of text.matchAll(/@slot\s*\(\s*['"]([^'"]+)['"]/g)) {
      b.slots.push(`${r}#slot:${m[1]}`);
    }
    for (const m of text.matchAll(/@section\s*\(\s*['"]([^'"]+)['"]/g)) {
      b.slots.push(`${r}#section:${m[1]}`);
    }
    for (const m of text.matchAll(/\$this->(?:get|post)\(\s*['"]([^'"]+)/g)) {
      b.apis.push(m[1]);
    }
    for (const m of text.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
      b.apis.push(m[1].split("?")[0]);
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
