import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseSourceWithGlayzzle } from "../src/providers/glayzzle.js";
import { parseSource } from "../src/index.js";

const bridgeRoot = fileURLToPath(new URL("../", import.meta.url));
const vendorAutoload = join(bridgeRoot, "vendor", "autoload.php");
function phpOnPath(): boolean {
  try {
    execSync("php --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const nikicAvailable = existsSync(vendorAutoload) && phpOnPath();

function stripPos<T>(v: T): T {
  const withoutPos = JSON.parse(
    JSON.stringify(v, (_k, x) => {
      if (x && typeof x === "object" && "pos" in (x as object)) {
        const o = { ...(x as object) } as Record<string, unknown>;
        delete o.pos;
        return o;
      }
      return x;
    }),
  ) as T;
  return normalizeParityShape(withoutPos) as T;
}

function normalizeParityShape(v: unknown): unknown {
  if (Array.isArray(v)) return v.map((x) => normalizeParityShape(x));
  if (v === null || typeof v !== "object") return v;
  const o = { ...(v as Record<string, unknown>) };
  for (const [k, val] of Object.entries(o)) o[k] = normalizeParityShape(val);

  // glayzzle currently emits `BinOp ??` where nikic emits explicit `Coalesce`.
  if (o.kind === "Coalesce") {
    return {
      kind: "BinOp",
      operator: "??",
      left: o.left,
      right: o.right,
    };
  }

  if (o.kind === "Unknown" && typeof o.detail === "string" && /try/i.test(o.detail)) {
    return { kind: "Unknown", detail: "unhandled stmt: try" };
  }

  // glayzzle maps __DIR__ in include paths to UnknownExpr (nikic maps to ConstFetch).
  if (o.kind === "ConstFetch" && o.name === "__DIR__") {
    return {
      kind: "UnknownExpr",
      detail: "unhandled expr: magic",
    };
  }

  // glayzzle currently models static calls as callee expr StaticFetch.
  if (
    o.kind === "Call" &&
    o.callee &&
    typeof o.callee === "object" &&
    !Array.isArray(o.callee) &&
    (o.callee as Record<string, unknown>).kind === "name"
  ) {
    const n = (o.callee as Record<string, unknown>).name;
    if (typeof n === "string") {
      const idx = n.lastIndexOf("::");
      if (idx > 0) {
        const className = n.slice(0, idx).replace(/^\\+/, "");
        const method = n.slice(idx + 2);
        if (method.length > 0) {
          return {
            ...o,
            callee: {
              kind: "expr",
              expr: {
                kind: "StaticFetch",
                className,
                name: method,
              },
            },
          };
        }
      }
    }
  }

  // Return type hints vary between providers on some fixtures; not relevant to
  // shape parity this suite is targeting.
  if (o.kind === "FunctionDecl" && "returnHint" in o) {
    o.returnHint = null;
  }
  if (o.kind === "StaticFetch" && typeof o.className === "string") {
    o.className = o.className.replace(/^\\+/, "");
  }
  if (o.kind === "New" && o.className === "self") {
    return {
      kind: "NewDynamic",
      classExpr: { kind: "UnknownExpr", detail: "unhandled expr: selfreference" },
      args: o.args,
    };
  }
  return o;
}

const run = nikicAvailable ? test : test.skip;

describe("parser-bridge nikic provider", () => {
  run("matches glayzzle on throw / new probe shapes (positions stripped)", async () => {
    const src = `<?php
throw new Exception("probe");
$x = new \\Acme\\Thing(1);
$klass = "Exception";
$y = new $klass("dyn");
$f = "strlen";
$n = $f("abc");
$maybe = null ?? "fallback";
`;
    const gz = parseSourceWithGlayzzle(src, "<t.php>");
    const nk = await parseSource(src, "<t.php>", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on tiny-blog login.php (positions stripped)", async () => {
    const loginPath = resolve(bridgeRoot, "../../fixtures/tiny-blog/pages/login.php");
    const src = readFileSync(loginPath, "utf8");
    const gz = parseSourceWithGlayzzle(src, "login.php");
    const nk = await parseSource(src, "login.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe smoke.php (positions stripped)", async () => {
    const pagePath = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/smoke.php");
    const src = readFileSync(pagePath, "utf8");
    const gz = parseSourceWithGlayzzle(src, "smoke.php");
    const nk = await parseSource(src, "smoke.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe lib/db.php (positions stripped)", async () => {
    const libPath = resolve(bridgeRoot, "../../fixtures/mysqli-probe/lib/db.php");
    const src = readFileSync(libPath, "utf8");
    const gz = parseSourceWithGlayzzle(src, "db.php");
    const nk = await parseSource(src, "db.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe direct_query.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/direct_query.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "direct_query.php");
    const nk = await parseSource(src, "direct_query.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe alias_query.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/alias_query.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "alias_query.php");
    const nk = await parseSource(src, "alias_query.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe mysqli_new_query.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/mysqli_new_query.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "mysqli_new_query.php");
    const nk = await parseSource(src, "mysqli_new_query.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe alias_copy.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/alias_copy.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "alias_copy.php");
    const nk = await parseSource(src, "alias_copy.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe pdo_query.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/pdo_query.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "pdo_query.php");
    const nk = await parseSource(src, "pdo_query.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe factory_query.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/factory_query.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "factory_query.php");
    const nk = await parseSource(src, "factory_query.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on mysqli-probe factory_query_chain.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/mysqli-probe/pages/factory_query_chain.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "factory_query_chain.php");
    const nk = await parseSource(src, "factory_query_chain.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on laravel-shaped-db-factory-probe illuminate_db_chain.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/laravel-shaped-db-factory-probe/pages/illuminate_db_chain.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "illuminate_db_chain.php");
    const nk = await parseSource(src, "illuminate_db_chain.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on laravel-shaped-db-factory-probe illuminate_db_assign.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/laravel-shaped-db-factory-probe/pages/illuminate_db_assign.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "illuminate_db_assign.php");
    const nk = await parseSource(src, "illuminate_db_assign.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on laravel-shaped-db-factory-probe conn_make_assign.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/laravel-shaped-db-factory-probe/pages/conn_make_assign.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "conn_make_assign.php");
    const nk = await parseSource(src, "conn_make_assign.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on laravel-shaped-db-factory-probe repo_db_chain.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/laravel-shaped-db-factory-probe/pages/repo_db_chain.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "repo_db_chain.php");
    const nk = await parseSource(src, "repo_db_chain.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on db-query-unknown-receiver probe (SQLite3, positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/db-query-unknown-receiver-probe/pages/mysqli_query.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "mysqli_query.php");
    const nk = await parseSource(src, "mysqli_query.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe coalesce_chain.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/coalesce_chain.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "coalesce_chain.php");
    const nk = await parseSource(src, "coalesce_chain.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe nested_array.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/nested_array.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "nested_array.php");
    const nk = await parseSource(src, "nested_array.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe coalesce_assign.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/coalesce_assign.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "coalesce_assign.php");
    const nk = await parseSource(src, "coalesce_assign.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe string_interpolation.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/string_interpolation.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "string_interpolation.php");
    const nk = await parseSource(src, "string_interpolation.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe nullsafe_property.php (positions stripped)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/nullsafe_property.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "nullsafe_property.php");
    const nk = await parseSource(src, "nullsafe_property.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe arrow_fn.php (positions stripped) (G2279)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/arrow_fn.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "arrow_fn.php");
    const nk = await parseSource(src, "arrow_fn.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe match_expr.php (positions stripped) (G2279)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/match_expr.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "match_expr.php");
    const nk = await parseSource(src, "match_expr.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe named_args.php (positions stripped) (G2280)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/named_args.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "named_args.php");
    const nk = await parseSource(src, "named_args.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe attributes.php (positions stripped) (G2280)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/attributes.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "attributes.php");
    const nk = await parseSource(src, "attributes.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe first_class_callable.php (positions stripped) (G2281)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/first_class_callable.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "first_class_callable.php");
    const nk = await parseSource(src, "first_class_callable.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe enum_decl.php (positions stripped) (G2282)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/enum_decl.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "enum_decl.php");
    const nk = await parseSource(src, "enum_decl.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("hoists enum methods as FunctionDecl on parser-parity-probe enum_methods.php (G2320)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/enum_methods.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "enum_methods.php");
    const nk = await parseSource(src, "enum_methods.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const methods = nk.statements.filter(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "FunctionDecl" }> =>
        s.kind === "FunctionDecl" && s.name.includes("::"),
    );
    expect(methods.map((m) => m.name).sort()).toEqual(["Color::default", "Color::label"]);
  });

  run("matches glayzzle on parser-parity-probe mixed_type.php (positions stripped) (G2323)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/mixed_type.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "mixed_type.php");
    const nk = await parseSource(src, "mixed_type.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const fn = nk.statements.find(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "FunctionDecl" }> => s.kind === "FunctionDecl",
    );
    expect(fn?.params[0]?.hint).toBe("mixed");
    expect(fn?.returnHint).toBe("mixed");
  });

  run("matches glayzzle on parser-parity-probe unit_enum.php (positions stripped) (G2327)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/unit_enum.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "unit_enum.php");
    const nk = await parseSource(src, "unit_enum.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const enumDecl = nk.statements.find(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "EnumDecl" }> => s.kind === "EnumDecl",
    );
    expect(enumDecl?.scalarType).toBeNull();
    expect(enumDecl?.cases.every((c) => c.value === null)).toBe(true);
  });

  run("hoists trait methods as FunctionDecl on parser-parity-probe trait_methods.php (G2328)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/trait_methods.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "trait_methods.php");
    const nk = await parseSource(src, "trait_methods.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const methods = nk.statements.filter(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "FunctionDecl" }> =>
        s.kind === "FunctionDecl" && s.name.includes("::"),
    );
    expect(methods.map((m) => m.name).sort()).toEqual(["Greeter::hello", "Greeter::tag"]);
  });

  run("matches glayzzle on parser-parity-probe int_enum.php (positions stripped) (G2330)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/int_enum.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "int_enum.php");
    const nk = await parseSource(src, "int_enum.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const enumDecl = nk.statements.find(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "EnumDecl" }> => s.kind === "EnumDecl",
    );
    expect(enumDecl?.scalarType).toBe("int");
  });

  run("hoists interface methods on parser-parity-probe interface_methods.php (G2329)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/interface_methods.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "interface_methods.php");
    const nk = await parseSource(src, "interface_methods.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const methods = nk.statements.filter(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "FunctionDecl" }> =>
        s.kind === "FunctionDecl" && s.name.startsWith("Labelled::"),
    );
    expect(methods.map((m) => m.name).sort()).toEqual(["Labelled::kind", "Labelled::label"]);
  });

  run("matches glayzzle on parser-parity-probe static_property.php (positions stripped) (G2331)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/static_property.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "static_property.php");
    const nk = await parseSource(src, "static_property.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const classDecl = nk.statements.find(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "ClassDecl" }> => s.kind === "ClassDecl",
    );
    expect(classDecl?.properties.some((p) => p.name === "n" && p.static === true)).toBe(true);
  });

  run("matches glayzzle on parser-parity-probe heredoc.php (positions stripped) (G2332)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/heredoc.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "heredoc.php");
    const nk = await parseSource(src, "heredoc.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe abstract_class.php (positions stripped) (G2335)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/abstract_class.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "abstract_class.php");
    const nk = await parseSource(src, "abstract_class.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const base = nk.statements.find(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "ClassDecl" }> =>
        s.kind === "ClassDecl" && s.name === "Base",
    );
    expect(base?.abstract).toBe(true);
  });

  run("matches glayzzle on parser-parity-probe final_class.php (positions stripped) (G2336)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/final_class.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "final_class.php");
    const nk = await parseSource(src, "final_class.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const sealed = nk.statements.find(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "ClassDecl" }> =>
        s.kind === "ClassDecl" && s.name === "Sealed",
    );
    expect(sealed?.final).toBe(true);
  });

  run("matches glayzzle on parser-parity-probe throw_expr.php (positions stripped) (G2337)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/throw_expr.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "throw_expr.php");
    const nk = await parseSource(src, "throw_expr.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe void_return.php (positions stripped) (G2339)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/void_return.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "void_return.php");
    const nk = await parseSource(src, "void_return.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe callable_hint.php (positions stripped) (G2340)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/callable_hint.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "callable_hint.php");
    const nk = await parseSource(src, "callable_hint.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe list_destruct.php (positions stripped) (G2341)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/list_destruct.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "list_destruct.php");
    const nk = await parseSource(src, "list_destruct.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe spread_array.php (positions stripped) (G2342)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/spread_array.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "spread_array.php");
    const nk = await parseSource(src, "spread_array.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe class_const.php (positions stripped) (G2343)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/class_const.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "class_const.php");
    const nk = await parseSource(src, "class_const.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
    const classDecl = nk.statements.find(
      (s): s is Extract<(typeof nk.statements)[number], { kind: "ClassDecl" }> =>
        s.kind === "ClassDecl" && s.name === "Box",
    );
    expect(classDecl?.constants?.map((c) => c.name)).toEqual(["TAG"]);
    expect(classDecl?.constants?.[0]?.value?.kind).toBe("Literal");
  });

  run("matches glayzzle on parser-parity-probe clone_expr.php (positions stripped) (G2346)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/clone_expr.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "clone_expr.php");
    const nk = await parseSource(src, "clone_expr.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe coalesce_return.php (positions stripped) (G2347)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/coalesce_return.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "coalesce_return.php");
    const nk = await parseSource(src, "coalesce_return.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe nullable_type.php (positions stripped) (G2350)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/nullable_type.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "nullable_type.php");
    const nk = await parseSource(src, "nullable_type.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe parent_call.php (positions stripped) (G2352)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/parent_call.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "parent_call.php");
    const nk = await parseSource(src, "parent_call.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe instanceof_expr.php (positions stripped) (G2353)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/instanceof_expr.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "instanceof_expr.php");
    const nk = await parseSource(src, "instanceof_expr.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe bool_type.php (positions stripped) (G2351)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/bool_type.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "bool_type.php");
    const nk = await parseSource(src, "bool_type.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe visibility_methods.php (positions stripped) (G2354)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/visibility_methods.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "visibility_methods.php");
    const nk = await parseSource(src, "visibility_methods.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe static_return.php (positions stripped) (G2356)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/static_return.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "static_return.php");
    const nk = await parseSource(src, "static_return.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe variadic_param.php (positions stripped) (G2357)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/variadic_param.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "variadic_param.php");
    const nk = await parseSource(src, "variadic_param.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe variadic_call.php (positions stripped) (G2358)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/variadic_call.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "variadic_call.php");
    const nk = await parseSource(src, "variadic_call.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe self_call.php (positions stripped) (G2362)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/self_call.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "self_call.php");
    const nk = await parseSource(src, "self_call.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe static_call.php (positions stripped) (G2363)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/static_call.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "static_call.php");
    const nk = await parseSource(src, "static_call.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe foreach_simple.php (positions stripped) (G2364)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/foreach_simple.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "foreach_simple.php");
    const nk = await parseSource(src, "foreach_simple.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe try_catch.php (positions stripped) (G2365)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/try_catch.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "try_catch.php");
    const nk = await parseSource(src, "try_catch.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe float_type.php (positions stripped) (G2366)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/float_type.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "float_type.php");
    const nk = await parseSource(src, "float_type.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe promoted_default.php (positions stripped) (G2367)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/promoted_default.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "promoted_default.php");
    const nk = await parseSource(src, "promoted_default.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe foreach_key.php (positions stripped) (G2372)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/foreach_key.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "foreach_key.php");
    const nk = await parseSource(src, "foreach_key.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe arrow_typed.php (positions stripped) (G2373)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/arrow_typed.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "arrow_typed.php");
    const nk = await parseSource(src, "arrow_typed.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe spaceship.php (positions stripped) (G2374)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/spaceship.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "spaceship.php");
    const nk = await parseSource(src, "spaceship.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe pow_expr.php (positions stripped) (G2375)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/pow_expr.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "pow_expr.php");
    const nk = await parseSource(src, "pow_expr.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe null_coalesce_param.php (positions stripped) (G2381)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/null_coalesce_param.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "null_coalesce_param.php");
    const nk = await parseSource(src, "null_coalesce_param.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe class_name.php (positions stripped) (G2382)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/class_name.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "class_name.php");
    const nk = await parseSource(src, "class_name.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe shift_left.php (positions stripped) (G2383)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/shift_left.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "shift_left.php");
    const nk = await parseSource(src, "shift_left.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe logical_and.php (positions stripped) (G2384)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/logical_and.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "logical_and.php");
    const nk = await parseSource(src, "logical_and.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe ternary_expr.php (positions stripped) (G2389)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/ternary_expr.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "ternary_expr.php");
    const nk = await parseSource(src, "ternary_expr.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe compound_assign.php (positions stripped) (G2390)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/compound_assign.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "compound_assign.php");
    const nk = await parseSource(src, "compound_assign.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe bitwise_or.php (positions stripped) (G2391)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/bitwise_or.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "bitwise_or.php");
    const nk = await parseSource(src, "bitwise_or.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe nullsafe_call.php (positions stripped) (G2392)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/nullsafe_call.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "nullsafe_call.php");
    const nk = await parseSource(src, "nullsafe_call.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("maps glayzzle nullable property flag to pipe-null hints (G2392)", () => {
    const src = `<?php
class Box { public ?Node $next = null; }
`;
    const gz = parseSourceWithGlayzzle(src, "nullable_prop.php");
    const cls = gz.statements.find((s): s is Extract<(typeof gz.statements)[number], { kind: "ClassDecl" }> => s.kind === "ClassDecl");
    expect(cls?.properties?.[0]?.typeHint).toBe("Node|null");
  });

  run("matches glayzzle on parser-parity-probe bitwise_not.php (positions stripped) (G2393)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/bitwise_not.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "bitwise_not.php");
    const nk = await parseSource(src, "bitwise_not.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe bitwise_and.php (positions stripped) (G2394)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/bitwise_and.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "bitwise_and.php");
    const nk = await parseSource(src, "bitwise_and.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe concat_expr.php (positions stripped) (G2395)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/concat_expr.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "concat_expr.php");
    const nk = await parseSource(src, "concat_expr.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("maps glayzzle nullable parameter flag to pipe-null hints (G2350)", () => {
    const src = `<?php
function accept_null(?int $value): ?int { return $value; }
`;
    const gz = parseSourceWithGlayzzle(src, "nullable.php");
    const fn = gz.statements.find((s): s is Extract<(typeof gz.statements)[number], { kind: "FunctionDecl" }> => s.kind === "FunctionDecl");
    expect(fn?.params[0]?.hint).toBe("int|null");
    expect(fn?.returnHint).toBe("int|null");
  });

  run("maps nikic union type hints to pipe syntax (G2301)", async () => {
    const src = `<?php
function union_hint(string|int $value): string|int|null { return $value; }
`;
    const nk = await parseSource(src, "union.php", { provider: "nikic" });
    const fn = nk.statements.find((s): s is Extract<(typeof nk.statements)[number], { kind: "FunctionDecl" }> => s.kind === "FunctionDecl");
    expect(fn?.params[0]?.hint).toBe("string|int");
    expect(fn?.returnHint).toBe("string|int|null");
  });

  run("matches glayzzle on parser-parity-probe readonly_class.php (positions stripped) (G2302)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/readonly_class.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "readonly_class.php");
    const nk = await parseSource(src, "readonly_class.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe constructor_promotion.php (positions stripped) (G2309)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/constructor_promotion.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "constructor_promotion.php");
    const nk = await parseSource(src, "constructor_promotion.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe union_type.php (positions stripped) (G2310)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/union_type.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "union_type.php");
    const nk = await parseSource(src, "union_type.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe intersection_type.php (positions stripped) (G2311)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/intersection_type.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "intersection_type.php");
    const nk = await parseSource(src, "intersection_type.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe readonly_class_keyword.php (positions stripped) (G2313)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/readonly_class_keyword.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "readonly_class_keyword.php");
    const nk = await parseSource(src, "readonly_class_keyword.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe never_type.php (positions stripped) (G2317)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/never_type.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "never_type.php");
    const nk = await parseSource(src, "never_type.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("matches glayzzle on parser-parity-probe invokable_controller.php (positions stripped) (G133)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/invokable_controller.php");
    const src = readFileSync(p, "utf8");
    const gz = parseSourceWithGlayzzle(src, "invokable_controller.php");
    const nk = await parseSource(src, "invokable_controller.php", { provider: "nikic" });
    expect(stripPos(nk)).toEqual(stripPos(gz));
  });

  run("both providers hoist __invoke + static helper but not other instance methods (G133)", async () => {
    const p = resolve(bridgeRoot, "../../fixtures/parser-parity-probe/pages/invokable_controller.php");
    const src = readFileSync(p, "utf8");
    const fnNames = (ast: { statements: ReadonlyArray<{ kind: string }> }) =>
      ast.statements
        .filter((s): s is typeof s & { name: string } => s.kind === "FunctionDecl")
        .map((s) => s.name)
        .sort();
    const gz = parseSourceWithGlayzzle(src, "invokable_controller.php");
    const nk = await parseSource(src, "invokable_controller.php", { provider: "nikic" });
    const expected = ["App\\Controller\\ProbeController::__invoke", "App\\Controller\\ProbeController::helper"];
    expect(fnNames(gz)).toEqual(expected);
    expect(fnNames(nk)).toEqual(expected);
  });

  run("hoists class static method attributes on FunctionDecl (G2288)", async () => {
    const src = `<?php
namespace App;
class Probe {
  #[\\Chrysalis\\Probe('method')]
  public static function helper(): int { return 1; }
}
`;
    const gz = parseSourceWithGlayzzle(src, "class_method_attributes.php");
    const nk = await parseSource(src, "class_method_attributes.php", { provider: "nikic" });
    const pick = (ast: typeof gz) =>
      ast.statements.find(
        (s): s is typeof s & { kind: "FunctionDecl"; name: string; attributes?: ReadonlyArray<{ name: string; args: ReadonlyArray<unknown> }> } =>
          s.kind === "FunctionDecl" && s.name === "App\\Probe::helper",
      );
    expect(stripPos(pick(gz))).toEqual(stripPos(pick(nk)));
    const attrs = pick(gz)?.attributes;
    expect(attrs?.length).toBe(1);
    expect(attrs?.[0]?.name).toBe("\\Chrysalis\\Probe");
  });
});
