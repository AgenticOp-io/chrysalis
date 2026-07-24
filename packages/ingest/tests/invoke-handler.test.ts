import { describe, expect, it } from "vitest";
import type { PhpNode } from "@chrysalis/parser-bridge";
import { ModuleBuilder } from "@chrysalis/webir";
import { ingestHandler, selectRouteHandlerStatements } from "../src/convert.js";
import type { RouteSpec } from "../src/routes.js";

const POS = { line: 1, column: 1, offset: 0 };

function noop(): PhpNode {
  return { kind: "Noop", pos: POS };
}

function headerCall(): PhpNode {
  return {
    kind: "ExpressionStatement",
    expr: {
      kind: "Call",
      callee: { kind: "name", name: "header" },
      args: [{ kind: "Literal", literalKind: "string", value: "Content-Type: text/plain", pos: POS }],
      pos: POS,
    },
    pos: POS,
  };
}

function invokeDecl(body: PhpNode[], name = "App\\Controller\\HealthController::__invoke"): PhpNode {
  return { kind: "FunctionDecl", name, params: [], returnHint: null, body, pos: POS };
}

describe("selectRouteHandlerStatements (__invoke body lift)", () => {
  it("prefers top-level executable statements over __invoke", () => {
    const top = headerCall();
    const stmts: PhpNode[] = [top, invokeDecl([noop()])];
    expect(selectRouteHandlerStatements(stmts)).toEqual([top]);
  });

  it("falls back to the __invoke body when there are no top-level executable statements", () => {
    const inner = headerCall();
    const stmts: PhpNode[] = [noop(), invokeDecl([inner])];
    expect(selectRouteHandlerStatements(stmts)).toEqual([inner]);
  });

  it("ignores ClassDecl so final-class __invoke controllers lift their method body", () => {
    const inner = headerCall();
    const classDecl: PhpNode = {
      kind: "ClassDecl",
      name: "App\\Controller\\EchoController",
      properties: [],
      final: true,
      pos: POS,
    };
    const stmts: PhpNode[] = [noop(), classDecl, invokeDecl([inner])];
    expect(selectRouteHandlerStatements(stmts)).toEqual([inner]);
  });

  it("returns the (Noop-only) top-level list when neither executable statements nor __invoke exist", () => {
    const only = noop();
    expect(selectRouteHandlerStatements([only])).toEqual([only]);
  });

  it("lifts the __invoke body into a non-empty WebIR handler block", () => {
    const echo: PhpNode = {
      kind: "Echo",
      values: [{ kind: "Literal", literalKind: "string", value: "ok", pos: POS }],
      pos: POS,
    };
    const ast = { file: "src/Controller/HealthController.php", statements: [noop(), invokeDecl([echo])] };
    const b = new ModuleBuilder({ sourceApp: "t" });
    const route: RouteSpec = { file: "src/Controller/HealthController.php", method: "GET", path: "/health", pathParams: [] };
    ingestHandler(b, ast, route);
    const m = b.finish();
    const hasEcho = [...m.nodes.values()].some((n) => n.dialect === "effect" && n.op === "echo");
    expect(hasEcho).toBe(true);
  });
});
