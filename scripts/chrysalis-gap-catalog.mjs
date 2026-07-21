#!/usr/bin/env node
/**
 * Build a language-neutral gap catalog from inventory + optional diff.
 *
 * Usage:
 *   node scripts/chrysalis-gap-catalog.mjs --inventory reports/chrysalis/site-inventory.json
 *   node scripts/chrysalis-gap-catalog.mjs --inventory ... --diff reports/chrysalis/site-inventory-diff.json
 *   node scripts/chrysalis-gap-catalog.mjs --inventory ... --policy reports/chrysalis/inventory-policy.json
 *
 * Kind: chrysalis.gap-catalog.v1
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_INV = join(ROOT, "reports/chrysalis/site-inventory.json");
const DEFAULT_DIFF = join(ROOT, "reports/chrysalis/site-inventory-diff.json");
const DEFAULT_OUT = join(ROOT, "reports/chrysalis/gap-catalog.json");
const DEFAULT_POLICY = join(ROOT, "reports/chrysalis/inventory-policy.json");

function parseArgs(argv) {
  let inventory = DEFAULT_INV;
  let diff = ""; // only when --diff passed or inventory embeds .diff
  let policy = ""; // require --policy for site-specific honest-skip / origin-dead
  let out = DEFAULT_OUT;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--inventory" && argv[i + 1]) inventory = argv[++i];
    else if (argv[i] === "--diff" && argv[i + 1]) diff = argv[++i];
    else if (argv[i] === "--policy" && argv[i + 1]) policy = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i];
  }
  return {
    inventory: resolve(inventory),
    diff: diff ? resolve(diff) : "",
    policy: policy ? resolve(policy) : "",
    out: resolve(out),
  };
}

function load(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const opts = parseArgs(process.argv);
  if (!existsSync(opts.inventory)) {
    console.error(`Missing inventory: ${opts.inventory}`);
    process.exit(2);
  }
  const inv = load(opts.inventory);
  const diff =
    opts.diff && existsSync(opts.diff)
      ? load(opts.diff)
      : inv.diff && typeof inv.diff === "object"
        ? inv.diff
        : {};
  // Site-local policy only: do not apply WISP POC originDead lists to other apps
  // unless --policy is passed (or inventory-policy.json exists and inventory is the default combined).
  const policy =
    opts.policy && existsSync(opts.policy)
      ? load(opts.policy)
      : { honestSkip: [], originDead: [] };
  // Only emit honest-skip gap rows when policy was explicitly supplied.
  const emitPolicyRows = Boolean(opts.policy);

  const gaps = [];
  const honest = new Set(policy.honestSkip || []);
  const originDead = new Set(policy.originDead || []);

  for (const page of inv.live?.pages || []) {
    for (const o of page.orphanToggles || []) {
      const status = honest.has(o) ? "honest-skip" : originDead.has(o) ? "origin-dead" : "open";
      gaps.push({
        priority: status === "open" ? "P1" : "P3",
        id: `orphan-toggle:${page.path}:${o}`,
        page: page.path,
        gates: [o],
        issue: "Toggle has no matching data-cwl-shell-key",
        status,
        classification: status,
      });
    }
    if ((page.slotSiblings || 0) > 0) {
      gaps.push({
        priority: "P1",
        id: `slot-siblings:${page.path}`,
        page: page.path,
        gates: [],
        issue: `${page.slotSiblings} raw slot= siblings (fold via structural lift)`,
        status: "open",
        classification: "slot-leak",
      });
    }
  }

  for (const g of diff.originGatesWithoutLiveShellKey || []) {
    if (honest.has(g) || originDead.has(g)) continue;
    gaps.push({
      priority: "P2",
      id: `missing-shell:${g}`,
      page: "*",
      gates: [g],
      issue: "Origin gate has no live shell-key (lift/stamp or origin-dead)",
      status: "open",
      classification: "missing-shell",
    });
  }

  // When live pages exist but diff did not list missing shells, derive from inventory.
  if (
    (!diff.originGatesWithoutLiveShellKey || diff.originGatesWithoutLiveShellKey.length === 0) &&
    (inv.live?.pages || []).some((p) => p.status === 200)
  ) {
    const liveKeys = new Set();
    for (const p of inv.live.pages) for (const k of p.keys || []) liveKeys.add(k);
    const originGates = [
      ...(inv.origin?.gates || []),
      ...(inv.origin?.showGates || []),
      ...(inv.origin?.isOpenGates || []),
    ];
    for (const g of [...new Set(originGates)]) {
      if (liveKeys.has(g) || honest.has(g) || originDead.has(g)) continue;
      gaps.push({
        priority: "P2",
        id: `missing-shell:${g}`,
        page: "*",
        gates: [g],
        issue: "Origin gate has no live shell-key (lift/stamp or origin-dead)",
        status: "open",
        classification: "missing-shell",
      });
    }
  }

  if (emitPolicyRows) {
    for (const g of honest) {
      gaps.push({
        priority: "P3",
        id: `honest-skip:${g}`,
        page: "*",
        gates: [g],
        issue: "No origin chrome to stamp (policy honest-skip)",
        status: "honest-skip",
        classification: "honest-skip",
      });
    }
  }

  const counts = {
    open: gaps.filter((g) => g.status === "open").length,
    "honest-skip": gaps.filter((g) => g.status === "honest-skip").length,
    "origin-dead": gaps.filter((g) => g.status === "origin-dead").length,
    fixed: gaps.filter((g) => g.status === "fixed").length,
  };

  const doc = {
    kind: "chrysalis.gap-catalog.v1",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    method: "docs/UNIVERSAL-CONVERSION-METHOD.md §2C",
    framework: inv.origin?.framework || inv.adapter || "unknown",
    inventoryPath: opts.inventory,
    counts,
    gaps,
    next: [
      "Close P0/P1 open gaps with structural lift + shell stamp (language adapter)",
      "Mark origin-dead / honest-skip in inventory-policy.json — do not invent UI",
      "Re-inventory after deploy; expect open → 0 or only policy skips",
    ],
  };

  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        out: opts.out,
        framework: doc.framework,
        counts,
        openSample: gaps.filter((g) => g.status === "open").slice(0, 10).map((g) => g.id),
      },
      null,
      2,
    ),
  );
}

main();
