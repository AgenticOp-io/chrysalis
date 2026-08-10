import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { resolveWptpRepoRoot } from "../../../scripts/lib/wptp-siblings.mjs";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const GOLD = resolve(ROOT, "scripts/hub-ingest/hub-gold-verify.mjs");
const emitNextJsRoot = resolveWptpRepoRoot(ROOT, "wptp-emit-nextjs");
const env = { ...process.env, WPTP_EMIT_NEXTJS_ROOT: emitNextJsRoot };

const ASSET_NEXTJS = ["sql-literal-nextjs", "html-literal-nextjs", "json-literal-nextjs", "vue-literal-nextjs"] as const;

test("hub gold: asset and vue literal nextjs (G66)", () => {
  for (const suite of ASSET_NEXTJS) {
    const r = spawnSync(process.execPath, [GOLD, "--suite", suite], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
      env,
    });
    expect(r.status, r.stderr || r.stdout).toBe(0);
  }
}, 360_000);
