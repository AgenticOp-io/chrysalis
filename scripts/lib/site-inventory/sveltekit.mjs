/**
 * SvelteKit origin inventory adapter.
 * Gates: showX / isOpen / {#if show…} / bind:show
 * Slots: slot="content|footer"
 * Routes: src/routes/.../+page.svelte
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

export const name = "sveltekit";

export function detect(root) {
  if (existsSync(join(root, "svelte.config.js")) || existsSync(join(root, "svelte.config.ts"))) {
    return true;
  }
  const routes = join(root, "src", "routes");
  if (!existsSync(routes)) return false;
  const files = walk(routes, [], new Set([".svelte"]));
  return files.some((f) => /[+ ]page\.svelte$/i.test(f) || f.includes("+page.svelte"));
}

export function inventoryOrigin(root) {
  const files = walk(root);
  const b = emptyBuckets();
  const showGates = [];
  const isOpenGates = [];
  const slotMentions = [];

  for (const file of files) {
    const r = relPath(root, file);
    const text = readText(file);
    if (/\/routes\/.*\+page\.svelte$/.test(r)) b.routes.push(r);

    for (const m of text.matchAll(/\b(?:let|const|var|export\s+let)\s+(show[A-Za-z0-9_]+)\b/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/\b(?:let|const|var|export\s+let)\s+(isOpen[A-Za-z0-9_]*)\b/g)) {
      const id = m[1] || "isOpen";
      pushGate(b, id, "dialog", r);
      isOpenGates.push(id);
    }
    for (const m of text.matchAll(/\{#if\s+(show[A-Za-z0-9_]+)/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/\{#if\s+(isOpen[A-Za-z0-9_]*)/g)) {
      pushGate(b, m[1] || "isOpen", "dialog", r);
      isOpenGates.push(m[1] || "isOpen");
    }
    for (const m of text.matchAll(/\bbind:(?:show|open|visible|isOpen)=\{([a-zA-Z_$][\w$]*)\}/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/from\s+['"]([^'"]+\.svelte)['"]/g)) {
      if (/Modal|Wizard|Menu|Map|Editor|Panel|Dialog/i.test(m[1])) b.components.push(m[1]);
    }
    for (const m of text.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
      b.apis.push(m[1].split("?")[0]);
    }
    for (const m of text.matchAll(/\bslot=["'](content|footer)["']/g)) {
      const slot = `${r}#${m[1]}`;
      b.slots.push(slot);
      slotMentions.push(slot);
    }
    for (const m of text.matchAll(/on:([a-z-]+)=/g)) {
      b.events.push(m[1]);
    }
    for (const m of text.matchAll(/@(arcgis|firebase|stripe|paypal|mapbox|googlemaps)\b/gi)) {
      b.vendorIslands.push(m[1].toLowerCase());
    }
  }

  return {
    framework: name,
    root: root.replace(/\\/g, "/"),
    fileCount: files.length,
    routes: uniq(b.routes),
    gates: uniq(b.gates),
    gateKinds: b.gateKinds,
    // Back-compat for older diff scripts / WISP POC
    showGates: uniq(showGates),
    isOpenGates: uniq(isOpenGates),
    components: uniq(b.components).slice(0, 500),
    importedUiHints: uniq(b.components).slice(0, 500),
    apis: uniq(b.apis).slice(0, 500),
    fetchPathHints: uniq(b.apis).slice(0, 500),
    slots: uniq(b.slots),
    slotMentions: uniq(slotMentions),
    events: uniq(b.events),
    eventDirectiveHints: uniq(b.events),
    nests: b.nests,
    vendorIslands: uniq(b.vendorIslands),
    deadControls: b.deadControls,
  };
}
