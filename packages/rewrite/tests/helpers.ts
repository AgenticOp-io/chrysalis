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
 * Build a single-route `Module` for rewrite-engine tests. Mirrors the
 * helper in `@chrysalis/insight`'s test suite but duplicated here so
 * this package has no test-time dep on insight internals.
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
