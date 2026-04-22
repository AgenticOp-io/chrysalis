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
  timeNow(opts: { origin: Locator; provenance?: ReadonlyArray<Provenance> }): NodeId;
  random(opts: { origin: Locator; provenance?: ReadonlyArray<Provenance> }): NodeId;
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
    dbQuery({ kind, sql, params, returns, tables, type, origin, provenance: prov }) {
      const effects: Effect[] = tables.map((t) =>
        kind === "read" ? { kind: "db.read", table: t } : { kind: "db.write", table: t },
      );
      return m.node({
        dialect: DIALECT,
        op: "db.query",
        type,
        effects: Object.freeze(effects),
        operands: params,
        attrs: { kind, sql, returns, tables } as Record<string, unknown>,
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
    timeNow({ origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "time.now",
        type: { kind: "string" },
        effects: Object.freeze<Effect[]>([{ kind: "time.now" }]),
        operands: [],
        attrs: {},
        origin,
        provenance: prov ?? [provenance("php-ast", origin, "time.now")],
      });
    },
    random({ origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "random",
        type: { kind: "int" },
        effects: Object.freeze<Effect[]>([{ kind: "random" }]),
        operands: [],
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
