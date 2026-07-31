/**
 * COBOL residual ledger (G10090) — D6448-shaped hole backlog from origin inventory.
 * Kind: chrysalis.cobol.residual.v1
 *
 * Aggregates proprietary COPY, missing COPY, and unresolved runtime ops across a
 * COBOL tree. Does not invent runtimes or IBM books — catalogs honest residuals only.
 *
 * Usage:
 *   node scripts/hub-ingest/cobol-residual-ledger.mjs --origin fixtures/hub-cobol-clbs-mini
 *   node scripts/hub-ingest/cobol-residual-ledger.mjs --origin ... --out reports/cobol/residual-ledger.json
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inventoryOriginRoot } from "../lib/site-inventory/index.mjs";
import {
  inventoryCobolSource,
  isProprietaryCobolCopybook,
  resolveCobolCopybooks,
} from "./cobol-pattern-lift.mjs";
import { readText, relPath, walk } from "../lib/site-inventory/shared.mjs";
import { COBOL_INVENTORY_EXT } from "../lib/site-inventory/cobol.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Priority for a residual classification.
 * @param {string} classification
 */
export function residualPriority(classification) {
  switch (classification) {
    case "proprietary-copy":
      return "P0";
    case "runtime-hole":
      return "P1";
    case "missing-copy":
    case "file-io-hole":
      return "P2";
    default:
      return "P3";
  }
}

/**
 * Build residual ledger for a COBOL origin root.
 * @param {string} originRoot
 * @param {{ framework?: string }} [opts]
 */
export function buildCobolResidualLedger(originRoot, opts = {}) {
  const root = resolve(originRoot);
  const { adapter, origin } = inventoryOriginRoot(root, {
    framework: opts.framework || "cobol",
  });

  /** @type {Map<string, { id: string, priority: string, classification: string, status: string, issue: string, files: Set<string>, ops?: Set<string> }>} */
  const byId = new Map();

  /**
   * @param {string} id
   * @param {{ classification: string, issue: string, file?: string, status?: string, op?: string }} row
   */
  function add(id, row) {
    const priority = residualPriority(row.classification);
    let hit = byId.get(id);
    if (!hit) {
      hit = {
        id,
        priority,
        classification: row.classification,
        status: row.status || "open",
        issue: row.issue,
        files: new Set(),
        ops: new Set(),
      };
      byId.set(id, hit);
    }
    if (row.file) hit.files.add(row.file);
    if (row.op) hit.ops.add(row.op);
    // Licensed drop closes proprietary rows; never reopen once closed.
    if (row.status === "closed") {
      hit.status = "closed";
      if (row.issue) hit.issue = row.issue;
    }
  }

  const copyDirs = [
    join(root, "copybook"),
    join(root, "cpy"),
    join(root, "_upstream"),
  ].filter((d) => existsSync(d));

  const files = walk(root, [], COBOL_INVENTORY_EXT);
  /** @type {string[]} */
  const allCopy = [];

  for (const file of files) {
    if (!/\.(cbl|cob)$/i.test(file)) continue;
    const r = relPath(root, file);
    const inv = inventoryCobolSource(readText(file), r);
    const books = [
      ...(inv.copybooks || []),
      ...(inv.execSqlIncludes || []),
    ];
    for (const cpy of books) {
      allCopy.push(cpy);
      if (isProprietaryCobolCopybook(cpy)) {
        const upper = String(cpy).toUpperCase();
        const hit = resolveCobolCopybooks([upper], copyDirs)[0];
        const closed = Boolean(hit?.resolved);
        add(`copy:${upper}`, {
          classification: "proprietary-copy",
          issue: closed
            ? `IBM/MQ proprietary COPY ${cpy} — licensed drop present at ${hit.resolved}`
            : `IBM/MQ proprietary COPY ${cpy} — licensed SDFHCOB/CMQ* drop only; do not invent`,
          file: r,
          status: closed ? "closed" : "open",
        });
      }
    }
    for (const op of inv.unresolved || []) {
      const classification =
        op === "file-io" ||
        op === "indexed-file" ||
        op === "record-key" ||
        op === "alternate-record-key" ||
        op === "invalid-key"
          ? "file-io-hole"
          : "runtime-hole";
      add(`op:${op}`, {
        classification,
        issue: `Unresolved COBOL op '${op}' — structural catalog only until real runtime/oracle`,
        file: r,
        op,
        status: "open",
      });
    }
  }

  const uniqueCopy = [...new Set(allCopy.map((c) => String(c).toUpperCase()))];
  const resolved = resolveCobolCopybooks(uniqueCopy, copyDirs.length ? copyDirs : [root]);
  /** @type {Map<string, string[]>} */
  const missingFiles = new Map();
  for (const file of files) {
    if (!/\.(cbl|cob)$/i.test(file)) continue;
    const r = relPath(root, file);
    const inv = inventoryCobolSource(readText(file), r);
    const books = [
      ...(inv.copybooks || []),
      ...(inv.execSqlIncludes || []),
    ].map((c) => String(c).toUpperCase());
    for (const name of books) {
      if (!name || isProprietaryCobolCopybook(name)) continue;
      const hit = resolved.find((x) => String(x?.name || "").toUpperCase() === name);
      if (hit && !hit.resolved) {
        if (!missingFiles.has(name)) missingFiles.set(name, []);
        missingFiles.get(name).push(r);
      }
    }
  }
  for (const hit of resolved) {
    const name = String(hit?.name || "").toUpperCase();
    if (!name || hit.resolved || isProprietaryCobolCopybook(name)) continue;
    const refs = missingFiles.get(name) || [];
    add(`missing-copy:${name}`, {
      classification: "missing-copy",
      issue: `COPY/INCLUDE ${name} not found under copybook/cpy/_upstream`,
      status: "open",
      file: refs[0],
    });
    for (const f of refs.slice(1, 20)) {
      add(`missing-copy:${name}`, {
        classification: "missing-copy",
        issue: `COPY/INCLUDE ${name} not found under copybook/cpy/_upstream`,
        status: "open",
        file: f,
      });
    }
  }

  for (const name of origin.proprietaryCopy || []) {
    const upper = String(name).toUpperCase();
    const hit = resolveCobolCopybooks([upper], copyDirs)[0];
    const closed = Boolean(hit?.resolved);
    add(`copy:${upper}`, {
      classification: "proprietary-copy",
      issue: closed
        ? `IBM/MQ proprietary COPY ${name} — licensed drop present at ${hit.resolved}`
        : `IBM/MQ proprietary COPY ${name} — licensed drop only; do not invent`,
      status: closed ? "closed" : "open",
    });
  }

  const items = [...byId.values()]
    .map((row) => ({
      priority: row.priority,
      id: row.id,
      classification: row.classification,
      status: row.status,
      issue: row.issue,
      files: [...row.files].sort().slice(0, 50),
      fileCount: row.files.size,
      ops: row.ops.size ? [...row.ops].sort() : undefined,
    }))
    .sort((a, b) => {
      const p = String(a.priority).localeCompare(String(b.priority));
      return p !== 0 ? p : String(a.id).localeCompare(String(b.id));
    });

  const byPriority = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byStatus = { open: 0, closed: 0 };
  for (const it of items) {
    if (byPriority[it.priority] != null) byPriority[it.priority] += 1;
    if (it.status === "closed") byStatus.closed += 1;
    else byStatus.open += 1;
  }

  return {
    kind: "chrysalis.cobol.residual.v1",
    schemaVersion: 1,
    adapter,
    origin: root.replace(/\\/g, "/"),
    generatedAt: new Date().toISOString(),
    summary: {
      itemCount: items.length,
      byPriority,
      byStatus,
      programCount: origin.programCount ?? origin.programs?.length ?? 0,
      proprietaryCopy: [...(origin.proprietaryCopy || [])].sort(),
      gates: [...(origin.gates || [])].slice(0, 50),
    },
    items,
    note:
      "Honest residual ledger from COBOL site-inventory + inventoryCobolSource. P0 = proprietary COPY (closed when licensed drop present); P1 = runtime holes; no façades.",
  };
}

function parseArgs(argv) {
  let origin = join(ROOT, "fixtures/hub-cobol-clbs-mini");
  let out = "";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  return { origin: resolve(origin), out: out ? resolve(out) : "" };
}

function main() {
  const opts = parseArgs(process.argv);
  if (!existsSync(opts.origin)) {
    console.error(`Missing origin: ${opts.origin}`);
    process.exit(2);
  }
  const ledger = buildCobolResidualLedger(opts.origin);
  const json = JSON.stringify(ledger, null, 2);
  if (opts.out) {
    mkdirSync(dirname(opts.out), { recursive: true });
    writeFileSync(opts.out, `${json}\n`, "utf8");
  }
  console.log(json);
  process.exit(0);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main();
