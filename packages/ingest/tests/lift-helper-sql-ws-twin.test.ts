import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFile } from "@chrysalis/parser-bridge";
import { ModuleBuilder } from "@chrysalis/webir";
import { buildHelperLiftAliasMap } from "../src/index.js";
import { convertPhpStatementsToBlock } from "../src/convert.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-sql-ws-twin");

describe("ingest: lift-helper-sql-ws-twin (B5.3 v3)", () => {
  it("semantic lift aliases SQL twins that differ only by whitespace", async () => {
    const builder = new ModuleBuilder({ sourceApp: "sql-ws-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["sql_ws_alpha.php", "sql_ws_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.get("chrysalis_sql_ws_beta")).toBe("chrysalis_sql_ws_alpha");
  });
});
