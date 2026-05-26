/**
 * Walk hub-lifted WebIR modules for HTTP routes and handler body shape.
 */

/**
 * @param {(id: string) => object | undefined} get
 * @param {string} bodyId
 */
export function classifyHubHandlerBody(get, bodyId) {
  const unwrap = (id) => {
    const n = get(id);
    if (!n) return { kind: "hole", reason: "hub:missing-body" };
    if (n.dialect === "legacy" && n.op === "hole") {
      return { kind: "hole", reason: String(n.attrs?.reason ?? "legacy:hole") };
    }
    if (n.dialect === "data" && n.op === "hole") {
      return { kind: "hole", reason: String(n.attrs?.reason ?? "data:hole") };
    }
    if (n.dialect === "data" && n.op === "block") {
      const ops = n.operands ?? [];
      if (ops.length !== 1) return { kind: "hole", reason: "hub:multi-statement-body" };
      return unwrap(ops[0]);
    }
    if (n.dialect === "data" && n.op === "literal") {
      return { kind: "literal", value: n.attrs?.value };
    }
    if (n.dialect === "data" && n.op === "call" && n.attrs?.callee === "__object_literal") {
      const ops = n.operands ?? [];
      const obj = {};
      for (let i = 0; i + 1 < ops.length; i += 2) {
        const keyNode = get(ops[i]);
        const valNode = get(ops[i + 1]);
        const key = keyNode?.attrs?.value;
        if (typeof key !== "string" || valNode?.op !== "literal") {
          return { kind: "hole", reason: "hub:complex-object-literal" };
        }
        obj[key] = valNode.attrs?.value;
      }
      return { kind: "literal", value: obj };
    }
    return { kind: "hole", reason: `hub:unsupported-body:${n.dialect}:${n.op}` };
  };
  return unwrap(bodyId);
}

/**
 * @param {import('@chrysalis/webir').Module} module
 */
export function listHubWebRoutes(module) {
  const get = (id) => module.nodes.get(id);
  const routes = [];
  for (const rid of module.roots) {
    const routeNode = get(rid);
    if (!routeNode || routeNode.dialect !== "web.request" || routeNode.op !== "route") continue;
    const attrs = routeNode.attrs ?? {};
    const method = String(attrs.method ?? "GET").toUpperCase();
    const path = String(attrs.path ?? "/");
    const handlerId = routeNode.operands?.[0];
    if (handlerId === undefined) continue;
    const handler = get(handlerId);
    if (!handler || handler.dialect !== "web.request" || handler.op !== "handler") continue;
    const bodyId = handler.operands?.[0];
    if (bodyId === undefined) continue;
    const handlerName = String(handler.attrs?.name ?? `${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`);
    routes.push({
      method,
      path,
      handlerName,
      body: classifyHubHandlerBody(get, bodyId),
      origin: handler.origin ?? routeNode.origin,
    });
  }
  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
