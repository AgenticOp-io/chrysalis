import {
  ModuleBuilder,
  T,
  dataDialect,
  effectDialect,
  phpLocator,
  webRequest,
  type Module,
  type NodeId,
} from "@chrysalis/webir";

/**
 * Build a single-route `Module` with the given body expression. The route
 * is `GET /x`; callers construct the body inline using the dialect builders
 * exposed on the returned context. Useful for targeted recognizer tests.
 */
export function buildModule(
  build: (ctx: {
    m: ModuleBuilder;
    data: ReturnType<typeof dataDialect.builders>;
    eff: ReturnType<typeof effectDialect.builders>;
    web: ReturnType<typeof webRequest.builders>;
    loc: () => ReturnType<typeof phpLocator>;
  }) => NodeId,
  opts?: { method?: string; path?: string },
): Module {
  const m = new ModuleBuilder({ sourceApp: "test-app" });
  const data = dataDialect.builders(m);
  const eff = effectDialect.builders(m);
  const web = webRequest.builders(m);
  let line = 1;
  const loc = () => phpLocator("test.php", line++, 1);
  const body = build({ m, data, eff, web, loc });
  const handler = web.handler({
    attrs: { name: "test", input: T.unknown, output: T.unknown },
    body,
    effects: [],
    origin: loc(),
  });
  const route = web.route({
    attrs: {
      method: (opts?.method ?? "GET") as "GET",
      path: opts?.path ?? "/x",
      pathParams: [],
    },
    handler,
    origin: loc(),
  });
  m.addRoot(route);
  return m.finish();
}
