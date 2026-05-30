import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { ingestDirectory } from "../src/index.js";
import { countHoles, walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/laravel-auth-probe");
const NIKIC_VENDOR = resolve(__dirname, "../../parser-bridge/vendor/autoload.php");

function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const nikicRunnable = existsSync(NIKIC_VENDOR) && phpOnPath();

function literalValues(mod: Awaited<ReturnType<typeof ingestDirectory>>): unknown[] {
  const values: unknown[] = [];
  walk(mod, (n) => {
    if (n.dialect === "data" && n.op === "literal") {
      values.push((n.attrs as { value?: unknown }).value);
    }
  });
  return values;
}

function hasJsonEncodeWithObjectLiteral(mod: Awaited<ReturnType<typeof ingestDirectory>>): boolean {
  let found = false;
  walk(mod, (n) => {
    if (n.dialect !== "data" || n.op !== "call") return;
    const callee = (n.attrs as { callee?: string }).callee;
    if (callee !== "json_encode") return;
    const argId = n.operands[0];
    if (argId == null) return;
    const arg = mod.nodes.get(argId);
    if (arg?.dialect === "data" && arg.op === "call") {
      const inner = (arg.attrs as { callee?: string }).callee;
      if (inner === "__object_literal") found = true;
    }
  });
  return found;
}

describe("ingest: laravel-auth-probe (M6A Sanctum/OAuth/Socialite/Fortify)", () => {
  test("two probe routes, hole-free, deterministic auth-boundary literals", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(2);
    expect(countHoles(mod)).toBe(0);

    const values = literalValues(mod);
    expect(values).toContain(true);
    expect(values).toContain("oauth-probe-ok");
    expect(values).toContain("socialite-probe-ok");
    expect(values).toContain("fortify-probe-ok");
    expect(hasJsonEncodeWithObjectLiteral(mod)).toBe(true);
  });

  (nikicRunnable ? test : test.skip)("nikic matches glayzzle on laravel-auth-probe", async () => {
    const gz = await ingestDirectory(FIXTURE);
    const nk = await ingestDirectory(FIXTURE, { parserProvider: "nikic" });
    expect(countHoles(nk)).toBe(countHoles(gz));
    expect(nk.roots.length).toBe(gz.roots.length);
    expect(literalValues(nk).sort()).toEqual(literalValues(gz).sort());
  });
});
