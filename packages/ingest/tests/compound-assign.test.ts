import { describe, expect, it } from "vitest";
import type { PhpAst } from "@chrysalis/parser-bridge";
import { ModuleBuilder } from "@chrysalis/webir";
import { ingestHandler } from "../src/convert.js";
import type { RouteSpec } from "../src/routes.js";

function routeSpec(file: string): RouteSpec {
  return { file, method: "GET", path: "/t", pathParams: [] };
}

describe("compound assignment lowering", () => {
  it("lowers += to binop + on the lhs", () => {
    const ast: PhpAst = {
      file: "sum.php",
      statements: [
        {
          kind: "Assign",
          operator: "=",
          target: { kind: "Variable", name: "sum", pos: { line: 1, column: 1, offset: 0 } },
          value: { kind: "Literal", literalKind: "int", value: 0, pos: { line: 1, column: 1, offset: 0 } },
          pos: { line: 1, column: 1, offset: 0 },
        },
        {
          kind: "Foreach",
          iterable: { kind: "Variable", name: "items", pos: { line: 2, column: 1, offset: 0 } },
          keyName: null,
          valueName: "row",
          body: [
            {
              kind: "Assign",
              operator: "+=",
              target: { kind: "Variable", name: "sum", pos: { line: 3, column: 1, offset: 0 } },
              value: {
                kind: "Literal",
                literalKind: "int",
                value: 1,
                pos: { line: 3, column: 1, offset: 0 },
              },
              pos: { line: 3, column: 1, offset: 0 },
            },
          ],
          pos: { line: 2, column: 1, offset: 0 },
        },
      ],
    };
    const b = new ModuleBuilder({ sourceApp: "t" });
    ingestHandler(b, ast, routeSpec("sum.php"));
    const m = b.finish();
    const foreach = [...m.nodes.values()].find((n) => n.dialect === "data" && n.op === "foreach");
    expect(foreach).toBeDefined();
    const bodyId = foreach!.operands[1]!;
    const body = m.nodes.get(bodyId)!;
    expect(body.op).toBe("block");
    const assignId = body.operands[0]!;
    const assign = m.nodes.get(assignId)!;
    expect(assign.op).toBe("call");
    expect((assign.attrs as { callee?: string }).callee).toBe("__assign");
    const rhsId = assign.operands[1]!;
    const rhs = m.nodes.get(rhsId)!;
    expect(rhs.op).toBe("binop");
    expect((rhs.attrs as { operator?: string }).operator).toBe("+");
  });
});
