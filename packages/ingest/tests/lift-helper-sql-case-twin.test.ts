import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFile } from "@chrysalis/parser-bridge";
import { ModuleBuilder } from "@chrysalis/webir";
import { buildHelperLiftAliasMap } from "../src/index.js";
import { convertPhpStatementsToBlock } from "../src/convert.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-sql-case-twin");

describe("ingest: lift-helper-sql-case-twin (B5.4)", () => {
  it("semantic lift aliases helpers with case-only SQL keyword differences", async () => {
    const builder = new ModuleBuilder({ sourceApp: "sql-case-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["sql_case_alpha.php", "sql_case_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.get("chrysalis_sql_case_beta")).toBe("chrysalis_sql_case_alpha");
  });
});
