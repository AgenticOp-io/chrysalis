import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFile } from "@chrysalis/parser-bridge";
import { effectTagsSorted, ModuleBuilder, countHoles } from "@chrysalis/webir";
import { buildHelperLiftAliasMap, buildCallEffectMap, ingestDirectory } from "../src/index.js";
import { convertPhpStatementsToBlock } from "../src/convert.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-sql-same-twin");

describe("ingest: lift-helper-sql-same-twin (B5.3 v3 positive)", () => {
  it("semantic lift aliases effectful helpers with identical SQL literals", async () => {
    const builder = new ModuleBuilder({ sourceApp: "sql-same-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["sql_same_alpha.php", "sql_same_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.get("chrysalis_sql_same_beta")).toBe("chrysalis_sql_same_alpha");
  });

  it("ingests with semantic lift flags and zero holes", async () => {
    const mod = await ingestDirectory(FIXTURE, {
      liftSharedHelpers: true,
      liftSharedHelpersSemantic: true,
      dedupeStructuralSubgraphs: true,
    });
    expect(mod.roots.length).toBe(2);
    expect(countHoles(mod)).toBe(0);
  });

  it("buildCallEffectMap agrees on effect tags for aliased SQL twins", async () => {
    const effects = await buildCallEffectMap(FIXTURE, undefined, {
      liftSharedHelpers: true,
      liftSharedHelpersSemantic: true,
    });
    const alpha = effects.get("chrysalis_sql_same_alpha") ?? [];
    const beta = effects.get("chrysalis_sql_same_beta") ?? [];
    expect(effectTagsSorted(alpha)).toEqual(effectTagsSorted(beta));
    expect(effectTagsSorted(alpha).some((t) => t.includes("db"))).toBe(true);
  });
});
