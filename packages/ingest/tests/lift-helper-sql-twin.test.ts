import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countHoles } from "@chrysalis/webir";
import { ModuleBuilder } from "@chrysalis/webir";
import { parseFile } from "@chrysalis/parser-bridge";
import { buildHelperLiftAliasMap, ingestDirectory } from "../src/index.js";
import { bodyHasIrEffects } from "../src/lift-shared-helpers.js";
import { convertPhpStatementsToBlock } from "../src/convert.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-sql-twin");

describe("ingest: lift-helper-sql-twin (B5.3 v2)", () => {
  it("ingests routes with no holes", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(2);
    expect(countHoles(mod)).toBe(0);
  });

  it("SQL helper bodies contain IR effects (B5.3 gate)", async () => {
    const builder = new ModuleBuilder({ sourceApp: "sql-twin", chrysalisVersion: "1.0.0" });
    const ast = await parseFile(resolve(FIXTURE, "lib", "sql_alpha.php"));
    let root: import("@chrysalis/webir").NodeId | undefined;
    for (const stmt of ast.statements) {
      if (stmt.kind !== "FunctionDecl") continue;
      root = convertPhpStatementsToBlock(builder, ast.file, stmt.body);
    }
    expect(root).toBeDefined();
    expect(bodyHasIrEffects((id) => builder.get(id), root!)).toBe(true);
  });

  it("semantic lift does not alias SQL literal twins", async () => {
    const builder = new ModuleBuilder({ sourceApp: "sql-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["sql_alpha.php", "sql_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.size).toBe(0);
  });
});
