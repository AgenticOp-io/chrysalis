/**
 * COBOL origin inventory adapter (G10089).
 * Detects PROGRAM-ID / .cbl|.cob|.cpy|.bms trees; inventories via inventoryCobolSource
 * so site-inventory Step 1 matches hub COBOL hole catalogs (D6448 inventory-first).
 * Does not invent DFHAID/DFHBMSCA/EXTFMAP/CMQ* or Db2/IMS/MQ/CICS runtimes.
 */
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import {
  inventoryBmsSource,
  inventoryCobolSource,
  isProprietaryCobolCopybook,
  resolveCobolCopybooks,
} from "../../hub-ingest/cobol-pattern-lift.mjs";
import {
  emptyBuckets,
  pushGate,
  readText,
  relPath,
  uniq,
  walk,
} from "./shared.mjs";

export const name = "cobol";

/** COBOL / BMS / copybook extensions (walk filter). */
export const COBOL_INVENTORY_EXT = new Set([
  ".cbl",
  ".cob",
  ".cpy",
  ".copy",
  ".bms",
]);

/**
 * @param {string} root
 */
export function detect(root) {
  if (!existsSync(root)) return false;
  if (existsSync(join(root, "copybook")) || existsSync(join(root, "cpy"))) {
    const sample = walk(root, [], COBOL_INVENTORY_EXT);
    if (sample.some((f) => /\.(cbl|cob)$/i.test(f))) return true;
  }
  const files = walk(root, [], COBOL_INVENTORY_EXT);
  if (files.length === 0) return false;
  let programs = 0;
  for (const file of files) {
    if (!/\.(cbl|cob)$/i.test(file)) continue;
    const text = readText(file);
    if (/\bPROGRAM-ID\s*\./i.test(text)) {
      programs += 1;
      if (programs >= 1) return true;
    }
  }
  return false;
}

/**
 * @param {string} root
 */
export function inventoryOrigin(root) {
  const files = walk(root, [], COBOL_INVENTORY_EXT);
  const b = emptyBuckets();
  /** @type {string[]} */
  const showGates = [];
  /** @type {object[]} */
  const programs = [];
  /** @type {object[]} */
  const bmsMaps = [];
  /** @type {string[]} */
  const proprietaryCopy = [];
  /** @type {string[]} */
  const copyNames = [];

  const copyDirs = [
    join(root, "copybook"),
    join(root, "cpy"),
    join(root, "_upstream"),
  ].filter((d) => existsSync(d));

  for (const file of files) {
    const r = relPath(root, file);
    const text = readText(file);
    const ext = extname(file).toLowerCase();

    if (ext === ".bms") {
      const bms = inventoryBmsSource(text, r);
      bmsMaps.push(bms);
      for (const map of bms.maps || []) b.components.push(`bms-map:${map}`);
      for (const ms of bms.mapsets || []) b.components.push(`bms-mapset:${ms}`);
      if ((bms.dfhmdi || 0) > 0 || (bms.dfhmdf || 0) > 0) {
        pushGate(b, "bms-map", "overlay", r);
        showGates.push("bms-map");
      }
      continue;
    }

    if (ext === ".cpy" || ext === ".copy") {
      b.components.push(r);
      continue;
    }

    if (!/\.(cbl|cob)$/i.test(file)) continue;

    const inv = inventoryCobolSource(text, r);
    programs.push({
      file: r,
      programIds: inv.programIds,
      unresolved: inv.unresolved,
      copybooks: inv.copybooks,
      routeCount: inv.routeCount,
    });

    for (const pid of inv.programIds || []) {
      b.routes.push(`cobol:${pid}`);
    }
    for (const route of inv.routes || []) {
      if (route?.path) b.routes.push(`${route.method || "GET"} ${route.path}`);
    }
    for (const cpy of inv.copybooks || []) {
      copyNames.push(cpy);
      b.components.push(`copy:${cpy}`);
      if (isProprietaryCobolCopybook(cpy)) {
        proprietaryCopy.push(cpy);
        b.vendorIslands.push(`proprietary-copy:${cpy}`);
      }
    }
    for (const op of inv.unresolved || []) {
      pushGate(b, op, "runtime-hole", r);
      showGates.push(op);
    }
    for (const prog of inv.execCicsLinkPrograms || []) {
      b.apis.push(`cics-link:${prog}`);
      b.nests.push({ parent: r, child: `LINK:${prog}`, kind: "cics-link" });
    }
    for (const prog of inv.execCicsXctlPrograms || []) {
      b.apis.push(`cics-xctl:${prog}`);
      b.nests.push({ parent: r, child: `XCTL:${prog}`, kind: "cics-xctl" });
    }
    for (const mq of inv.ibmMqCallOps || []) {
      b.apis.push(`ibm-mq:${mq}`);
    }
    for (const map of inv.execCicsMaps || []) {
      b.components.push(`cics-map:${map}`);
    }
  }

  const uniqueCopy = uniq(copyNames);
  const resolved = resolveCobolCopybooks(uniqueCopy, copyDirs.length ? copyDirs : [root]);
  const missingCopy = resolved.filter((h) => !h.resolved && !isProprietaryCobolCopybook(h.name));
  for (const miss of missingCopy) {
    b.deadControls.push({ id: `missing-copy:${miss.name}`, reason: "copybook-not-in-tree" });
  }

  return {
    framework: name,
    root: root.replace(/\\/g, "/"),
    fileCount: files.length,
    programCount: programs.length,
    programs: programs.slice(0, 500),
    bmsMaps: bmsMaps.slice(0, 200),
    proprietaryCopy: uniq(proprietaryCopy),
    copybooks: uniqueCopy,
    routes: uniq(b.routes).slice(0, 500),
    gates: uniq(b.gates).slice(0, 500),
    gateKinds: b.gateKinds,
    showGates: uniq(showGates).slice(0, 500),
    isOpenGates: [],
    components: uniq(b.components).slice(0, 500),
    importedUiHints: uniq(b.components).slice(0, 500),
    apis: uniq(b.apis).slice(0, 500),
    fetchPathHints: uniq(b.apis).slice(0, 500),
    slots: [],
    slotMentions: [],
    events: uniq(b.events),
    eventDirectiveHints: uniq(b.events),
    nests: b.nests.slice(0, 500),
    vendorIslands: uniq(b.vendorIslands),
    deadControls: b.deadControls.slice(0, 200),
  };
}
