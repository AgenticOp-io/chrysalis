import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFile } from "@chrysalis/parser-bridge";
import {
  ModuleBuilder,
  T,
  phpLocator,
  webRequest,
  type NodeId,
} from "@chrysalis/webir";
import { buildHelperLiftAliasMap } from "@chrysalis/ingest";
import { convertPhpStatementsToBlock } from "../../ingest/src/convert.js";
import { simulateHandler, type RequestInput } from "../src/simulate.js";

const FIXTURE = resolve(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/lift-helper-sql-same-twin");

const emptyInput: RequestInput = {
  method: "GET",
  path: "/x",
  query: {},
  post: {},
  cookies: {},
  session: {},
  pathParams: {},
};

function routeIdOf(m: { roots: readonly NodeId[] }): NodeId {
  const rootId = m.roots[0];
  if (!rootId) throw new Error("no route in module");
  return rootId;
}

function moduleForHelperBody(
  builder: ModuleBuilder,
  bodyId: NodeId,
  path: string,
) {
  const web = webRequest.builders(builder);
  const origin = phpLocator("sim.php", 1, 0);
  const handler = web.handler({
    attrs: { name: "h", input: T.unknown, output: T.string },
    body: bodyId,
    effects: [],
    origin,
  });
  const route = web.route({
    attrs: { method: "GET", path, pathParams: [] },
    handler,
    origin,
  });
  builder.addRoot(route);
  return builder.finish();
}

describe("simulate: lift-helper-sql-same-twin (B5.3 v4)", () => {
  it("semantic-lifted SQL twin helpers produce identical simulate bodies and db reads", async () => {
    const builder = new ModuleBuilder({ sourceApp: "sql-same-twin", chrysalisVersion: "1.0.0" });
    const bodies = new Map<string, NodeId>();
    for (const file of ["sql_same_alpha.php", "sql_same_beta.php"] as const) {
      const ast = await parseFile(resolve(FIXTURE, "lib", file));
      for (const stmt of ast.statements) {
        if (stmt.kind !== "FunctionDecl") continue;
        bodies.set(stmt.name, convertPhpStatementsToBlock(builder, ast.file, stmt.body));
      }
    }
    const aliases = buildHelperLiftAliasMap(bodies, (id) => builder.get(id), { semantic: true });
    expect(aliases.get("chrysalis_sql_same_beta")).toBe("chrysalis_sql_same_alpha");

    const alphaBuilder = new ModuleBuilder({ sourceApp: "sql-same-twin-alpha", chrysalisVersion: "1.0.0" });
    const betaBuilder = new ModuleBuilder({ sourceApp: "sql-same-twin-beta", chrysalisVersion: "1.0.0" });
    const alphaAst = await parseFile(resolve(FIXTURE, "lib", "sql_same_alpha.php"));
    const betaAst = await parseFile(resolve(FIXTURE, "lib", "sql_same_beta.php"));
    const alphaFn = alphaAst.statements.find((s) => s.kind === "FunctionDecl");
    const betaFn = betaAst.statements.find((s) => s.kind === "FunctionDecl");
    if (alphaFn?.kind !== "FunctionDecl" || betaFn?.kind !== "FunctionDecl") {
      throw new Error("missing helper FunctionDecl");
    }
    const alphaBody = convertPhpStatementsToBlock(alphaBuilder, alphaAst.file, alphaFn.body);
    const betaBody = convertPhpStatementsToBlock(betaBuilder, betaAst.file, betaFn.body);

    const alphaMod = moduleForHelperBody(alphaBuilder, alphaBody, "/alpha");
    const betaMod = moduleForHelperBody(betaBuilder, betaBody, "/beta");
    const alphaRes = simulateHandler(alphaMod, routeIdOf(alphaMod), emptyInput);
    const betaRes = simulateHandler(betaMod, routeIdOf(betaMod), emptyInput);

    expect(alphaRes.errors).toEqual([]);
    expect(betaRes.errors).toEqual([]);
    expect(alphaRes.body).toBe(betaRes.body);
    expect(alphaRes.body.length).toBeGreaterThan(0);
    expect(alphaRes.dbReads.map((e) => e.sql)).toEqual(betaRes.dbReads.map((e) => e.sql));
    expect(alphaRes.dbReads.length).toBeGreaterThan(0);
  });
});
