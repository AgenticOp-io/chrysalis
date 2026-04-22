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
});
