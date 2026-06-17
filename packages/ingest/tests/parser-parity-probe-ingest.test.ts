import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countHoles, ModuleBuilder } from "@chrysalis/webir";
import { parseFile } from "@chrysalis/parser-bridge";
import { convertPhpStatementsToBlock, ingestHandler } from "../src/convert.js";
import { loadRouteManifest } from "../src/routes.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/parser-parity-probe");

describe("ingest: parser-parity-probe arrow/match lowering (G2280)", () => {
  for (const page of [
    "arrow_fn.php",
    "match_expr.php",
    "named_args.php",
    "attributes.php",
    "first_class_callable.php",
    "enum_decl.php",
    "readonly_class.php",
    "constructor_promotion.php",
    "union_type.php",
    "intersection_type.php",
    "readonly_class_keyword.php",
    "never_type.php",
    "enum_methods.php",
    "mixed_type.php",
    "unit_enum.php",
    "trait_methods.php",
    "int_enum.php",
    "interface_methods.php",
    "static_property.php",
    "heredoc.php",
    "abstract_class.php",
    "final_class.php",
    "throw_expr.php",
    "void_return.php",
    "callable_hint.php",
    "list_destruct.php",
    "spread_array.php",
    "class_const.php",
    "clone_expr.php",
    "coalesce_return.php",
    "nullable_type.php",
    "parent_call.php",
    "instanceof_expr.php",
    "bool_type.php",
    "visibility_methods.php",
    "static_return.php",
    "variadic_param.php",
    "variadic_call.php",
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

  it("preserves named arg metadata on strlen call (G2283)", async () => {
    const ast = await parseFile(resolve(FIXTURE, "pages", "named_args.php"));
    const builder = new ModuleBuilder({ sourceApp: "parity", chrysalisVersion: "1.0.0" });
    const body = ast.statements.filter((s) => s.kind !== "FunctionDecl");
    convertPhpStatementsToBlock(builder, ast.file, body);
    const mod = builder.finish();
    const strlenCalls = [...mod.nodes.values()].filter(
      (n) => n.dialect === "data" && n.op === "call" && String(n.attrs.callee) === "strlen",
    );
    expect(strlenCalls.length).toBeGreaterThan(0);
    expect((strlenCalls[0]!.attrs as { argNames?: ReadonlyArray<string | null> }).argNames).toEqual([
      "string",
    ]);
  });

  it("preserves PHP attributes on tagged call (G2284)", async () => {
    const ast = await parseFile(resolve(FIXTURE, "pages", "attributes.php"));
    const builder = new ModuleBuilder({ sourceApp: "parity", chrysalisVersion: "1.0.0" });
    const body = ast.statements.filter((s) => s.kind !== "FunctionDecl");
    const manifest = await loadRouteManifest(FIXTURE);
    const route = manifest.routes.find((r) => r.path === "/attributes")!;
    ingestHandler(builder, ast, route);
    const mod = builder.finish();
    const taggedCalls = [...mod.nodes.values()].filter(
      (n) => n.dialect === "data" && n.op === "call" && String(n.attrs.callee) === "tagged",
    );
    expect(taggedCalls.length).toBeGreaterThan(0);
    const phpAttributes = (taggedCalls[0]!.attrs as {
      phpAttributes?: ReadonlyArray<{ name: string; args: ReadonlyArray<unknown> }>;
    }).phpAttributes;
    expect(phpAttributes).toEqual([{ name: "\\Chrysalis\\Probe", args: ["parity"] }]);
  });
});
