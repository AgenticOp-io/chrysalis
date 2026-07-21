/**
 * Angular origin inventory adapter.
 * Gates: *ngIf="showX", [hidden], signal/boolean fields, MatDialog
 * Routes: *.component.html (+ optional routes in *.routes.ts)
 * Slots: ng-content / ng-template
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

export const name = "angular";

export function detect(root) {
  if (existsSync(join(root, "angular.json"))) return true;
  const pkg = join(root, "package.json");
  if (existsSync(pkg)) {
    try {
      const j = JSON.parse(readText(pkg));
      const deps = { ...j.dependencies, ...j.devDependencies };
      if (deps?.["@angular/core"]) return true;
    } catch {
      /* ignore */
    }
  }
  return walk(join(root, "src"), [], new Set([".html"])).some((f) =>
    f.includes(".component.html"),
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
    if (/\.component\.html$/i.test(r)) b.routes.push(r);
    if (/\.routes\.ts$/i.test(r)) {
      for (const m of text.matchAll(/path:\s*['"]([^'"]+)['"]/g)) {
        b.routes.push(`route:${m[1]}`);
      }
    }

    for (const m of text.matchAll(/\*ngIf\s*=\s*["'](show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/\[ngIf\]\s*=\s*["'](show[A-Za-z0-9_]+)/g)) {
      pushGate(b, m[1], "overlay", r);
      showGates.push(m[1]);
    }
    for (const m of text.matchAll(/\b(show[A-Za-z0-9_]+|isOpen[A-Za-z0-9_]*)\s*=\s*(?:signal\s*\()?false/g)) {
      pushGate(b, m[1], "overlay", r);
      if (/isOpen/i.test(m[1])) isOpenGates.push(m[1]);
      else showGates.push(m[1]);
    }
    for (const m of text.matchAll(/MatDialog|mat-dialog|dialog\.open\s*\(/gi)) {
      b.components.push("MatDialog");
      void m;
    }
    for (const m of text.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) {
      b.apis.push(m[1].split("?")[0]);
    }
    for (const m of text.matchAll(/this\.http\.(?:get|post|put|delete)\(\s*[`'"]([^`'"]+)/g)) {
      b.apis.push(m[1].split("?")[0]);
    }
    if (/<ng-content\b/i.test(text)) b.slots.push(`${r}#ng-content`);
    for (const m of text.matchAll(/<ng-template\b[^>]*#(\w+)/g)) {
      b.slots.push(`${r}#${m[1]}`);
    }
    for (const m of text.matchAll(/\((click|submit|change)\)=/g)) {
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
