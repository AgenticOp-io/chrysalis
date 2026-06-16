import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countHoles, ModuleBuilder } from "@chrysalis/webir";
import { parseFile } from "@chrysalis/parser-bridge";
import { convertPhpStatementsToBlock } from "../src/convert.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/parser-parity-probe");

describe("ingest: parser-parity-probe arrow/match lowering (G2280)", () => {
  for (const page of [
    "arrow_fn.php",
    "match_expr.php",
    "named_args.php",
    "attributes.php",
    "first_class_callable.php",
    "enum_decl.php",
  ] as const) {
    it(`lowers ${page} without expr holes`, async () => {
      const ast = await parseFile(resolve(FIXTURE, "pages", page));
      const builder = new ModuleBuilder({ sourceApp: "parity", chrysalisVersion: "1.0.0" });
      const body = ast.statements.filter((s) => s.kind !== "FunctionDecl");
      convertPhpStatementsToBlock(builder, ast.file, body);
      const mod = builder.finish();
      expect(countHoles(mod)).toBe(0);
      const holeReasons = [...mod.nodes.values()]
        .filter((n) => n.dialect === "data" && n.op === "hole")
        .map((n) => String(n.attrs.reason ?? ""));
      expect(holeReasons.some((r) => r.startsWith("expr:ArrowFunction") || r.startsWith("expr:Match"))).toBe(
        false,
      );
    });
  }

});
