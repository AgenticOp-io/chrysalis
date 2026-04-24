/**
 * `effect` dialect — explicit IO operations tagged with their effect set.
 * These are the nodes that verification replays against recorded traces.
 */
import type { Effect, Locator, NodeId, Provenance, WebIRType } from "../index.js";
import { type ModuleBuilder, provenance } from "../builder.js";

export const DIALECT = "effect" as const;

export interface Builders {
  dbQuery(opts: {
    kind: "read" | "write";
    sql: string;
    /**
     * Optional pointer to the expression tree that *built* the SQL, when
     * the call-site SQL wasn't a string literal. Stored as a non-operand
     * attr so db.query's operand contract (params only) is unchanged.
     * Consumed by the `parameterize-sql` rewrite pass to recover
     * attacker inputs and lift them into bound parameters.
     */
    sqlExpr?: NodeId;
    params: ReadonlyArray<NodeId>;
    returns: "rows" | "row-or-null" | "insert-id" | "rowcount";
    /** Tables touched, for effect tagging and archaeology. */
    tables: ReadonlyArray<string>;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  sessionRead(opts: {
    key: string;
    type: WebIRType;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  sessionWrite(opts: {
    key: string;
    value: NodeId;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  timeNow(opts: {
    origin: Locator;
    /**
     * - `iso` — injectable wall clock string (default).
     * - `unix` — PHP `time()` seconds since epoch (`int`).
     * - `epoch_ms` — milliseconds since epoch (`int`), for `uniqid`-style lowerings.
     * - `epoch_float` — seconds with fractional part (`float`), for `microtime(true)`.
     */
    format?: "iso" | "unix" | "epoch_ms" | "epoch_float";
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  random(opts: {
    min: NodeId;
    max: NodeId;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  redirect(opts: {
    location: NodeId;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  httpError(opts: {
    status: number;
    message: NodeId | null;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  echo(opts: {
    value: NodeId;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
}

export function builders(m: ModuleBuilder): Builders {
  return {
    dbQuery({ kind, sql, sqlExpr, params, returns, tables, type, origin, provenance: prov }) {
      const effects: Effect[] = tables.map((t) =>
        kind === "read" ? { kind: "db.read", table: t } : { kind: "db.write", table: t },
      );
      const attrs: Record<string, unknown> = { kind, sql, returns, tables };
      if (sqlExpr !== undefined) attrs["sqlExpr"] = sqlExpr;
      return m.node({
        dialect: DIALECT,
        op: "db.query",
        type,
        effects: Object.freeze(effects),
        operands: params,
        attrs,
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `sql:${kind} ${tables.join(",")}`)],
      });
    },
    sessionRead({ key, type, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "session.read",
        type,
        effects: Object.freeze<Effect[]>([{ kind: "session.read" }]),
        operands: [],
        attrs: { key },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `$_SESSION['${key}']`)],
      });
    },
    sessionWrite({ key, value, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "session.write",
        type: { kind: "void" },
        effects: Object.freeze<Effect[]>([{ kind: "session.write" }]),
        operands: [value],
        attrs: { key },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `$_SESSION['${key}'] = ...`)],
      });
    },
    timeNow({ origin, format = "iso", provenance: prov }) {
      const attrs: Record<string, unknown> = {};
      if (format !== "iso") attrs.format = format;
      const type: WebIRType =
        format === "unix" || format === "epoch_ms"
          ? { kind: "int" }
          : format === "epoch_float"
            ? { kind: "float" }
            : { kind: "string" };
      const defaultReason =
        format === "unix"
          ? "time()"
          : format === "epoch_ms"
            ? "epoch_ms"
            : format === "epoch_float"
              ? "microtime(true)"
              : "time.now";
      return m.node({
        dialect: DIALECT,
        op: "time.now",
        type,
        effects: Object.freeze<Effect[]>([{ kind: "time.now" }]),
        operands: [],
        attrs,
        origin,
        provenance: prov ?? [provenance("php-ast", origin, defaultReason)],
      });
    },
    random({ min, max, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "random",
        type: { kind: "int" },
        effects: Object.freeze<Effect[]>([{ kind: "random" }]),
        operands: [min, max],
        attrs: {},
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "random")],
      });
    },
    redirect({ location, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "redirect",
        type: { kind: "void" },
        effects: [],
        operands: [location],
        attrs: {},
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "header('Location: …')")],
      });
    },
    httpError({ status, message, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "http.error",
        type: { kind: "void" },
        effects: [],
        operands: message ? [message] : [],
        attrs: { status },
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `http ${status}`)],
      });
    },
    echo({ value, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "echo",
        type: { kind: "void" },
        effects: [],
        operands: [value],
        attrs: {},
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "echo")],
      });
    },
  };
}
