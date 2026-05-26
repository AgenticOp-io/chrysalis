import type { Module, NodeBase } from "@chrysalis/webir";

export interface HubMiddlewareEmitPlan {
  readonly hono: {
    readonly serverImports: string;
    readonly beforeTapeLines: string;
  };
  readonly fastify: {
    readonly registrationLines: string;
  };
  readonly hasJson: boolean;
  readonly hasUrlencoded: boolean;
}

function middlewareNodes(m: Module): NodeBase[] {
  const out: NodeBase[] = [];
  for (const [, n] of m.nodes) {
    if (n.dialect === "web.request" && n.op === "middleware") out.push(n);
  }
  out.sort(
    (a, b) =>
      Number((a.attrs as { order?: number }).order ?? 0) -
      Number((b.attrs as { order?: number }).order ?? 0),
  );
  return out;
}

function presetFromMiddleware(m: Module, node: NodeBase): string | null {
  const bodyId = node.operands[0];
  if (!bodyId) return null;
  const body = m.nodes.get(bodyId);
  if (!body || body.op !== "literal") return null;
  const value = (body.attrs as { value?: unknown }).value;
  if (value && typeof value === "object" && value !== null && "preset" in value) {
    return String((value as { preset?: string }).preset ?? "");
  }
  return null;
}

function mountLiteral(mount: string): string {
  return mount === "*" ? '"*"' : JSON.stringify(mount);
}

/** Plan lowered hub `web.request.middleware` nodes for Hono / Fastify emit. */
export function planHubMiddlewareEmit(m: Module): HubMiddlewareEmitPlan {
  const honoLines: string[] = [];
  const fastifyLines: string[] = [];
  let hasJson = false;
  let hasUrlencoded = false;

  for (const node of middlewareNodes(m)) {
    const kind = String((node.attrs as { kind?: string }).kind ?? "");
    const mount = String((node.attrs as { mount?: string }).mount ?? "*");
    const preset = presetFromMiddleware(m, node);
    const effective = preset ?? kind;
    if (effective === "express.json") {
      hasJson = true;
      honoLines.push(`app.use(${mountLiteral(mount)}, chrysalisJsonBodyMiddleware);`);
      fastifyLines.push(
        "  // Chrysalis hub: express.json() — Fastify default JSON parser (no extra plugin).",
      );
    } else if (effective === "express.urlencoded") {
      hasUrlencoded = true;
      honoLines.push(`app.use(${mountLiteral(mount)}, chrysalisUrlencodedBodyMiddleware);`);
      fastifyLines.push(
        "  // Chrysalis hub: express.urlencoded() — covered by @fastify/formbody.",
      );
    }
  }

  const beforeTapeLines = honoLines.length > 0 ? `${honoLines.join("\n")}\n` : "";
  const importNames: string[] = [];
  if (hasJson) importNames.push("chrysalisJsonBodyMiddleware");
  if (hasUrlencoded) importNames.push("chrysalisUrlencodedBodyMiddleware");
  const serverImports =
    importNames.length > 0
      ? `import { ${importNames.join(", ")} } from "./db.js";\n`
      : "";

  return {
    hono: { serverImports, beforeTapeLines },
    fastify: {
      registrationLines: fastifyLines.length > 0 ? `${fastifyLines.join("\n")}\n` : "",
    },
    hasJson,
    hasUrlencoded,
  };
}
