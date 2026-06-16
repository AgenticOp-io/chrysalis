import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { countHoles, effectTagsSorted } from "@chrysalis/webir";
import { ModuleBuilder } from "@chrysalis/webir";
import { parseFile } from "@chrysalis/parser-bridge";
import {
  buildCallEffectMap,
  buildHelperLiftAliasMap,
  ingestDirectory,
} from "../src/index.js";
import { convertPhpStatementsToBlock } from "../src/convert.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-param-twin");

describe("ingest: lift-helper-param-twin (IR helper lifting B5 v0)", () => {
  it("ingests two routes with no holes", async () => {
    const mod = await ingestDirectory(FIXTURE);
    expect(mod.roots.length).toBe(2);
    expect(countHoles(mod)).toBe(0);
  });

  it("direct-return helpers share effect signatures", async () => {
    const effects = await buildCallEffectMap(FIXTURE, undefined);
    const alphaFx = effectTagsSorted(effects.get("chrysalis_direct_alpha") ?? []);
    const betaFx = effectTagsSorted(effects.get("chrysalis_direct_beta") ?? []);
    expect(alphaFx).toEqual(betaFx);
  });

  it("semantic lift aliases direct-return twins differing only by parameter names (B5 v0)", async () => {
    const builder = new ModuleBuilder({ sourceApp: "param-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["direct_alpha.php", "direct_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.get("chrysalis_direct_beta")).toBe("chrysalis_direct_alpha");
  });

  it("semantic lift aliases arithmetic scale-by-2 twins (B5.2)", async () => {
    const builder = new ModuleBuilder({ sourceApp: "param-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["arith_alpha.php", "arith_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.get("chrysalis_arith_beta")).toBe("chrysalis_arith_alpha");
  });

  it("semantic lift does not alias non-equivalent arithmetic twins (B5.2 guard)", async () => {
    const builder = new ModuleBuilder({ sourceApp: "param-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["arith_gamma.php", "arith_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.size).toBe(0);
  });

  it("semantic lift aliases commutative add twins (B5.2 v2)", async () => {
    const builder = new ModuleBuilder({ sourceApp: "param-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, import("@chrysalis/webir").NodeId>();
    for (const file of ["comm_alpha.php", "comm_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.get("chrysalis_comm_beta")).toBe("chrysalis_comm_alpha");
  });

  it("liftSharedHelpersSemantic widens call-effect map for arithmetic twins", async () => {
    const base = await buildCallEffectMap(FIXTURE, undefined, { liftSharedHelpers: true });
    const semantic = await buildCallEffectMap(FIXTURE, undefined, {
      liftSharedHelpers: true,
      liftSharedHelpersSemantic: true,
    });
    expect(base.get("chrysalis_direct_alpha")).toBeDefined();
    expect(base.get("chrysalis_direct_beta")).toBeDefined();
    expect(semantic.get("chrysalis_direct_alpha")).toBeDefined();
    expect(semantic.get("chrysalis_direct_beta")).toBeDefined();
    expect(effectTagsSorted(semantic.get("chrysalis_direct_alpha") ?? [])).toEqual(
      effectTagsSorted(semantic.get("chrysalis_direct_beta") ?? []),
    );
    expect(effectTagsSorted(semantic.get("chrysalis_arith_alpha") ?? [])).toEqual(
      effectTagsSorted(semantic.get("chrysalis_arith_beta") ?? []),
    );
  });
});
