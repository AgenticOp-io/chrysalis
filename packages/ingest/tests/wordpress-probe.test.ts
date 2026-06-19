import { describe, expect, test } from "vitest";
import { resolve } from "node:path";
import { ingestDirectory } from "../src/index.js";
import { walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/wordpress-probe");

function collectWpCalls(mod: Awaited<ReturnType<typeof ingestDirectory>>): string[] {
  const calls: string[] = [];
  walk(mod, (n) => {
    if (n.dialect === "data" && n.op === "call") {
      const callee = String((n.attrs as { callee?: string }).callee ?? "");
      if (/^(add_action|apply_filters|get_bloginfo|wp_head|wp_footer)$/.test(callee)) {
        calls.push(callee);
      }
    }
  });
  return calls;
}

describe("ingest: wordpress-probe fixture", () => {
  test("one route records wp_* as unsupported calls (honest vertical entry slice)", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(1);
    expect(collectWpCalls(mod).sort()).toEqual([
      "add_action",
      "apply_filters",
      "get_bloginfo",
      "wp_footer",
      "wp_head",
    ]);
  });
});
