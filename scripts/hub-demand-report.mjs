#!/usr/bin/env node
/**
 * Summarize the hub's demo-signup and language-pair-demand metadata (see DESIGN D6362/D6363,
 * chrysalis-hub-store.mjs registerHubAccount/recordHubDemandSignal). Read-only, local-only —
 * reads ~/.chrysalis-hub/accounts.json and demand-signals.jsonl (or CHRYSALIS_HUB_ROOT).
 * Usage: node scripts/hub-demand-report.mjs
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const hubRoot = process.env.CHRYSALIS_HUB_ROOT ?? join(homedir(), ".chrysalis-hub");

async function readJsonSafe(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function readJsonlSafe(path) {
  try {
    const raw = await readFile(path, "utf8");
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function topCounts(items, keyFn, limit = 10) {
  const counts = new Map();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

async function main() {
  const accounts = (await readJsonSafe(join(hubRoot, "accounts.json"), { accounts: [] })).accounts ?? [];
  const signals = await readJsonlSafe(join(hubRoot, "demand-signals.jsonl"));

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last24h = accounts.filter((a) => now - Date.parse(a.createdAt) < day).length;
  const last7d = accounts.filter((a) => now - Date.parse(a.createdAt) < 7 * day).length;
  const returning = accounts.filter((a) => (a.loginCount ?? 1) > 1).length;

  console.log(`[hub-demand-report] root=${hubRoot}`);
  console.log(`\nAccounts: ${accounts.length} total, ${last24h} last 24h, ${last7d} last 7d, ${returning} returned at least once`);

  console.log("\nTop referrers:");
  for (const [ref, n] of topCounts(accounts, (a) => a.signupMeta?.referer)) console.log(`  ${n}x  ${ref}`);
  if (accounts.every((a) => !a.signupMeta?.referer)) console.log("  (none captured yet)");

  console.log(`\nLanguage-pair demand signals: ${signals.length} project-creation events`);
  console.log("Top origin -> output pairs:");
  for (const [pair, n] of topCounts(signals, (s) => (s.originLanguage && s.outputLanguage ? `${s.originLanguage} -> ${s.outputLanguage}` : null))) {
    console.log(`  ${n}x  ${pair}`);
  }
  if (signals.length === 0) console.log("  (none yet)");

  console.log("\nEmails (for pilot follow-up):");
  for (const a of accounts) console.log(`  ${a.email}  (created ${a.createdAt}, logins ${a.loginCount ?? 1})`);
}

main().catch((e) => {
  console.error(`[hub-demand-report] ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
