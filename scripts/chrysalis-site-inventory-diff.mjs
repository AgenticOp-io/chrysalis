#!/usr/bin/env node
/**
 * Diff origin gates vs live shell keys from chrysalis site-inventory artifacts.
 *
 * Usage:
 *   node scripts/chrysalis-site-inventory-diff.mjs
 *   node scripts/chrysalis-site-inventory-diff.mjs --a reports/chrysalis/site-inventory-gce.json --b reports/chrysalis/site-inventory-firebase.json
 *   node scripts/chrysalis-site-inventory-diff.mjs --inventory reports/chrysalis/site-inventory.json
 *   node scripts/chrysalis-site-inventory-diff.mjs --policy reports/chrysalis/inventory-policy.json
 *
 * Kind: chrysalis.site-inventory-diff.v1
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_POLICY = join(ROOT, "reports/chrysalis/inventory-policy.json");
const DEFAULT_A = join(ROOT, "reports/chrysalis/site-inventory-gce.json");
const DEFAULT_B = join(ROOT, "reports/chrysalis/site-inventory-firebase.json");
const DEFAULT_COMBINED = join(ROOT, "reports/chrysalis/site-inventory.json");
const DEFAULT_DIFF = join(ROOT, "reports/chrysalis/site-inventory-diff.json");

function parseArgs(argv) {
  let a = "";
  let b = "";
  let inventory = "";
  let policy = existsSync(DEFAULT_POLICY) ? DEFAULT_POLICY : "";
  let outDiff = DEFAULT_DIFF;
  let outCombined = DEFAULT_COMBINED;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--a" && argv[i + 1]) a = argv[++i];
    else if (argv[i] === "--b" && argv[i + 1]) b = argv[++i];
    else if (argv[i] === "--inventory" && argv[i + 1]) inventory = argv[++i];
    else if (argv[i] === "--policy" && argv[i + 1]) policy = argv[++i];
    else if (argv[i] === "--out-diff" && argv[i + 1]) outDiff = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) outCombined = argv[++i];
  }
  return {
    a: resolve(a || DEFAULT_A),
    b: b ? resolve(b) : existsSync(DEFAULT_B) ? DEFAULT_B : "",
    inventory: inventory ? resolve(inventory) : "",
    policy: policy ? resolve(policy) : "",
    outDiff: resolve(outDiff),
    outCombined: resolve(outCombined),
  };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadPolicy(path) {
  if (!path || !existsSync(path)) {
    return {
      honestSkip: ["showUpgradeModal"],
      originDead: [],
      actionableNext: [
        "Close orphan toggles with shell stamps or mark honest-skip/origin-dead in policy",
        "Structural lift missing gates via language markup adapter",
        "Do not invent UI for origin-dead gates",
      ],
    };
  }
  return loadJson(path);
}

function originGateSet(inv) {
  const o = inv.origin || {};
  return new Set([...(o.gates || []), ...(o.showGates || []), ...(o.isOpenGates || [])]);
}

function liveKeySet(inv) {
  const keys = new Set();
  const orphans = new Set();
  const lifts = new Set();
  const pages = inv.live?.pages || inv.liveGce?.pages || [];
  for (const p of pages) {
    for (const k of p.keys || []) keys.add(k);
    for (const o of p.orphanToggles || []) orphans.add(`${p.path}:${o}`);
    for (const l of p.lifts || []) lifts.add(l);
  }
  return { keys, orphans, lifts };
}

function main() {
  const opts = parseArgs(process.argv);
  const policy = loadPolicy(opts.policy);

  let primary;
  let secondary = null;
  if (opts.inventory) {
    primary = loadJson(opts.inventory);
  } else {
    if (!existsSync(opts.a)) {
      console.error(`Missing inventory A: ${opts.a}`);
      process.exit(2);
    }
    primary = loadJson(opts.a);
    if (opts.b && existsSync(opts.b)) secondary = loadJson(opts.b);
  }

  const originGates = originGateSet(primary);
  const liveA = liveKeySet(primary);
  const liveB = secondary ? liveKeySet(secondary) : null;

  const honest = new Set(policy.honestSkip || []);
  const originDead = new Set(policy.originDead || []);

  const gatesMissing = [...originGates]
    .filter((g) => !liveA.keys.has(g) && !honest.has(g) && !originDead.has(g))
    .sort();

  const residual = {
    kind: "chrysalis.site-inventory-diff.v1",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    framework: primary.origin?.framework || primary.adapter || "unknown",
    orphanToggles: [...liveA.orphans].filter((o) => {
      const gate = o.split(":").slice(1).join(":");
      return !honest.has(gate);
    }).sort(),
    originGatesWithoutLiveShellKey: gatesMissing.slice(0, 200),
    originGatesWithoutLiveShellKeyCount: gatesMissing.length,
    honestSkipExpected: [...honest],
    originDeadHintsPresent: [...originDead].filter((g) => originGates.has(g)),
    dualHost: liveB
      ? {
          sameOrphans:
            JSON.stringify([...liveA.orphans].sort()) === JSON.stringify([...liveB.orphans].sort()),
          aLiftCount: liveA.lifts.size,
          bLiftCount: liveB.lifts.size,
          missingOnBVsAKeys: [...liveA.keys].filter((k) => !liveB.keys.has(k)).sort(),
        }
      : null,
    actionableNext: policy.actionableNext || [],
  };

  const combined = {
    kind: "chrysalis.site-inventory.v1",
    schemaVersion: primary.schemaVersion || 2,
    generatedAt: new Date().toISOString(),
    method: "docs/UNIVERSAL-CONVERSION-METHOD.md",
    adapter: primary.adapter || primary.origin?.framework,
    origin: primary.origin,
    live: primary.live || primary.liveGce,
    liveSecondary: secondary?.live || null,
    summary: {
      ...(primary.summary || {}),
      secondaryPagesOk: secondary?.summary?.livePagesOk,
    },
    diff: residual,
    status: "inventory-diff",
  };

  mkdirSync(dirname(opts.outDiff), { recursive: true });
  writeFileSync(opts.outDiff, `${JSON.stringify(residual, null, 2)}\n`);
  writeFileSync(opts.outCombined, `${JSON.stringify(combined, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        framework: residual.framework,
        originGates: originGates.size,
        liveKeys: liveA.keys.size,
        originGatesMissingShellKey: residual.originGatesWithoutLiveShellKeyCount,
        orphans: residual.orphanToggles.slice(0, 20),
        outDiff: opts.outDiff,
        outCombined: opts.outCombined,
      },
      null,
      2,
    ),
  );
}

main();
