# hub-gold-tapir

Secondary **Tapir** Scala dialect gold (route-surface). Akka remains Scala D6448-ST; Http4s + Finch stay green.

- Gate: **G10119** / **D6544**
- Smoke: `pnpm run hub:tapir-smoke`
- Peels: `endpoint.get|post|….in("seg").in(path[T]("id")).in(query[T]("q")).out(statusCode(…)).serverLogicSuccess(…)`
- Body authority: `serverLogicSuccess` Map/lit — **not** invented `jsonBody`/`plainBody` codecs
- Honest holes: Http4sServerInterpreter / AkkaHttpServerInterpreter bootstrap, non-literal `.in` — see `fixtures/ci/tapir-honest-skip.json`
