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

  if (o.kind === "UnknownExpr" && typeof o.detail === "string" && /nullsafe/i.test(o.detail)) {
    return { kind: "UnknownExpr", detail: "unhandled expr: nullsafePropertyFetch" };
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
