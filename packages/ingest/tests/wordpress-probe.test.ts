import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { ingestDirectory } from "../src/index.js";
import { walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/wordpress-probe");

function collectWpEffectCalls(mod: Awaited<ReturnType<typeof ingestDirectory>>): string[] {
  const calls: string[] = [];
  walk(mod, (n) => {
    if (n.dialect === "effect" && n.op === "wp.call") {
      calls.push(String((n.attrs as { callee?: string }).callee ?? ""));
    }
  });
  return calls;
}

describe("ingest: wordpress-probe fixture", () => {
  test("public route lowers manifest wp_* callees to effect.wp.call (G6225)", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(2);
    expect(collectWpEffectCalls(mod).sort()).toEqual([
      "add_action",
      "apply_filters",
      "current_user_can",
      "get_bloginfo",
      "is_admin",
      "wp_create_nonce",
      "wp_die",
      "wp_footer",
      "wp_head",
    ]);
  });
});
