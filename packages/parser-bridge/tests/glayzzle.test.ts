import { describe, expect, test } from "vitest";
import { SCHEMA_VERSION, parseSource } from "../src/index.js";

describe("parser-bridge glayzzle provider", () => {
  test("emits the schema version in output", async () => {
    const ast = await parseSource("<?php $x = 1;");
    expect(ast.schemaVersion).toBe(SCHEMA_VERSION);
  });

  test("unwraps assign into a statement", async () => {
    const ast = await parseSource("<?php $x = 42;");
    expect(ast.statements).toHaveLength(1);
    const s = ast.statements[0];
    expect(s?.kind).toBe("Assign");
  });

  test("detects superglobal indexed access", async () => {
    const ast = await parseSource("<?php $u = $_POST['username'];");
    const assign = ast.statements[0];
    expect(assign?.kind).toBe("Assign");
    if (assign?.kind !== "Assign") return;
    expect(assign.value.kind).toBe("ArrayAccess");
    if (assign.value.kind !== "ArrayAccess") return;
    expect(assign.value.target.kind).toBe("Superglobal");
  });

  test("if/else structure", async () => {
    const ast = await parseSource("<?php if ($a) { echo 'y'; } else { echo 'n'; }");
    const ifNode = ast.statements[0];
    expect(ifNode?.kind).toBe("If");
    if (ifNode?.kind !== "If") return;
    expect(ifNode.then).toHaveLength(1);
    expect(ifNode.else).not.toBeNull();
    expect(ifNode.else?.length).toBe(1);
  });

  test("foreach with key and value", async () => {
    const ast = await parseSource("<?php foreach ($xs as $k => $v) { echo $v; }");
    const fe = ast.statements[0];
    expect(fe?.kind).toBe("Foreach");
    if (fe?.kind !== "Foreach") return;
    expect(fe.keyName).toBe("k");
    expect(fe.valueName).toBe("v");
  });

  test("empty() lowers to a bare __empty call (no spurious negation)", async () => {
    const ast = await parseSource("<?php if (empty($xs)) { echo 'n'; }");
    const ifNode = ast.statements[0];
    expect(ifNode?.kind).toBe("If");
    if (ifNode?.kind !== "If") return;
    // The condition must be a Call to __empty — NOT a UnaryOp("!") around it.
    // A negation here silently flips `if (empty($x))` and `if (!empty($x))`
    // to the same emitted condition.
    expect(ifNode.cond.kind).toBe("Call");
    if (ifNode.cond.kind !== "Call") return;
    expect(ifNode.cond.callee.kind === "name" && ifNode.cond.callee.name).toBe("__empty");
  });

  test("!empty() lowers to UnaryOp('!') wrapping __empty", async () => {
    const ast = await parseSource("<?php if (!empty($xs)) { echo 'y'; }");
    const ifNode = ast.statements[0];
    if (ifNode?.kind !== "If") throw new Error("expected If");
    expect(ifNode.cond.kind).toBe("UnaryOp");
    if (ifNode.cond.kind !== "UnaryOp") return;
    expect(ifNode.cond.operator).toBe("!");
    expect(ifNode.cond.operand.kind).toBe("Call");
  });

  test("declare(strict_types=1) becomes a Noop statement", async () => {
    const ast = await parseSource("<?php\ndeclare(strict_types=1);\n\$x = 1;");
    const kinds = ast.statements.map((s) => s.kind);
    expect(kinds).toContain("Noop");
    expect(kinds).toContain("Assign");
  });

  test("namespace prefixes FunctionDecl names", async () => {
    const ast = await parseSource(`<?php
namespace Acme\\Helpers;

function row_from_users() {
  return 1;
}
`);
    const fn = ast.statements.find((s) => s.kind === "FunctionDecl");
    expect(fn?.kind).toBe("FunctionDecl");
    if (fn?.kind !== "FunctionDecl") return;
    expect(fn.name).toBe("Acme\\Helpers\\row_from_users");
  });

  test("nested namespace composes names", async () => {
    const ast = await parseSource(`<?php
namespace A\\B {
  function f1() {}
  namespace C\\D {
    function f2() {}
  }
}
`);
    const names = ast.statements
      .filter((s): s is Extract<typeof s, { kind: "FunctionDecl" }> => s.kind === "FunctionDecl")
      .map((s) => s.name)
      .sort();
    expect(names).toEqual(["A\\B\\C\\D\\f2", "A\\B\\f1"]);
  });

  test("namespace with usegroup keeps following FunctionDecl", async () => {
    const ast = await parseSource(`<?php
namespace X;
use Y\\Z;
function g() { return 1; }
`);
    const kinds = ast.statements.map((s) => s.kind);
    expect(kinds).toContain("Noop");
    const fn = ast.statements.find((s) => s.kind === "FunctionDecl");
    expect(fn?.kind).toBe("FunctionDecl");
    if (fn?.kind !== "FunctionDecl") return;
    expect(fn.name).toBe("X\\g");
  });

  test("top-level static class methods become qualified FunctionDecl entries", async () => {
    const ast = await parseSource(`<?php
namespace Acme\\Repo;

class UserRepo {
  public static function row($id) {
    return query_one("SELECT id FROM users WHERE id = 1", []);
  }
  public function instanceOnly() {
    return 1;
  }
}
`);
    const names = ast.statements
      .filter((s): s is Extract<typeof s, { kind: "FunctionDecl" }> => s.kind === "FunctionDecl")
      .map((s) => s.name)
      .sort();
    expect(names).toEqual(["Acme\\Repo\\UserRepo::row"]);
  });
});
