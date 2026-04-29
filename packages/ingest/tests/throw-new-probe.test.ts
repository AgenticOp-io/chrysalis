import { execSync } from "node:child_process";
import { describe, expect, test } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ingestDirectory } from "../src/index.js";
import { walk } from "@chrysalis/webir";

const FIXTURE = resolve(__dirname, "../../../fixtures/throw-new-probe");
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

describe("ingest: throw + new (D193, D194)", () => {
  test("one __throw, FQN __new without ingest hole, unqualified __new", async () => {
    const mod = await ingestDirectory(FIXTURE);
    let throws = 0;
    let news = 0;
    let dynamicNews = 0;
    let fqnNew: string | undefined;
    walk(mod, (n) => {
      if (n.dialect === "data" && n.op === "call") {
        const c = String((n.attrs as { callee?: string }).callee ?? "");
        if (c === "__throw") throws += 1;
        if (c === "__new") {
          news += 1;
          const nameNode = n.operands[0] ? mod.nodes.get(n.operands[0]!) : undefined;
          if (
            nameNode?.dialect === "data" &&
            nameNode.op === "literal" &&
            String((nameNode.attrs as { value?: unknown }).value ?? "").includes("\\")
          ) {
            fqnNew = String((nameNode.attrs as { value?: unknown }).value);
          }
        }
        if (c === "__new_dynamic") dynamicNews += 1;
      }
    });
    expect(throws).toBe(1);
    // throw.php, newok.php, nsnew.php each contain one static-name new-expression
    expect(news).toBe(3);
    expect(dynamicNews).toBe(2);
    expect(fqnNew).toBe("Acme\\Namespaced\\Thing");
    const holes: string[] = [];
    walk(mod, (n) => {
      if (n.dialect === "data" && n.op === "hole") {
        holes.push(String((n.attrs as { reason?: string }).reason ?? ""));
      }
    });
    expect(holes.length).toBe(0);
  });

  (nikicRunnable ? test : test.skip)(
    "parser-provider=nikic keeps throw/new coverage parity",
    async () => {
      const mod = await ingestDirectory(FIXTURE, { parserProvider: "nikic" });
      let throws = 0;
      let news = 0;
      let dynamicNews = 0;
      walk(mod, (n) => {
        if (n.dialect === "data" && n.op === "call") {
          const c = String((n.attrs as { callee?: string }).callee ?? "");
          if (c === "__throw") throws += 1;
          if (c === "__new") news += 1;
          if (c === "__new_dynamic") dynamicNews += 1;
        }
      });
      expect(throws).toBe(1);
      expect(news).toBe(3);
      expect(dynamicNews).toBe(2);
    },
  );
});
