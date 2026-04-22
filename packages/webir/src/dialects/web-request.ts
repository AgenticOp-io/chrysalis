/**
 * `web.request` dialect — top-level routing and handler shape.
 */
import type { Effect, Locator, NodeId, Provenance, WebIRType } from "../index.js";
import { type ModuleBuilder, mergeEffects, provenance } from "../builder.js";

export const DIALECT = "web.request" as const;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface RouteAttrs {
  readonly method: HttpMethod;
  /** Path template with `:param` placeholders, e.g. `/posts/:id`. */
  readonly path: string;
  /** Ordered parameter names extracted from the path. */
  readonly pathParams: ReadonlyArray<{ name: string; type: WebIRType }>;
}

export interface HandlerAttrs {
  /** Human-readable name; derived from the PHP file path. */
  readonly name: string;
  /** Declared or inferred input/output shapes. */
  readonly input: WebIRType;
  readonly output: WebIRType;
}

export interface ResponseAttrs {
  readonly status: number;
  readonly contentType?: string;
  /** `redirect` | `html` | `json` | `text` — drives the emit backend. */
  readonly kind: "redirect" | "html" | "json" | "text" | "unknown";
}

export interface Builders {
  route(opts: {
    attrs: RouteAttrs;
    handler: NodeId;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  handler(opts: {
    attrs: HandlerAttrs;
    body: NodeId;
    effects: ReadonlyArray<Effect>;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
  response(opts: {
    attrs: ResponseAttrs;
    value?: NodeId;
    origin: Locator;
    provenance?: ReadonlyArray<Provenance>;
  }): NodeId;
}

export function builders(m: ModuleBuilder): Builders {
  return {
    route({ attrs, handler, origin, provenance: prov }) {
      const handlerNode = m.get(handler);
      return m.node({
        dialect: DIALECT,
        op: "route",
        type: { kind: "void" },
        effects: handlerNode.effects,
        operands: [handler],
        attrs: attrs as unknown as Record<string, unknown>,
        origin,
        provenance:
          prov ?? [provenance("php-ast", origin, `route ${attrs.method} ${attrs.path}`)],
      });
    },
    handler({ attrs, body, effects, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "handler",
        type: attrs.output,
        effects: mergeEffects(effects),
        operands: [body],
        attrs: attrs as unknown as Record<string, unknown>,
        origin,
        provenance: prov ?? [provenance("php-ast", origin, `handler ${attrs.name}`)],
      });
    },
    response({ attrs, value, origin, provenance: prov }) {
      return m.node({
        dialect: DIALECT,
        op: "response",
        type: { kind: "void" },
        effects: [],
        operands: value ? [value] : [],
        attrs: attrs as unknown as Record<string, unknown>,
        origin,
        provenance:
          prov ?? [provenance("php-ast", origin, `response ${attrs.status} ${attrs.kind}`)],
      });
    },
  };
}
