# hub-flagship-scala

Twenty-route **Akka HTTP** app mirroring `hub-flagship-express` / kotlin / java / go (scalar + `Map` JSON + path/query + `StatusCodes`). No invented product UI (**D6447**).

Http4s dialect (same surface, secondary): `fixtures/hub-gold-scala-http4s` → `pnpm run hub:scala-http4s-smoke`.

## Prove

```bash
pnpm run hub:scala-flagship
pnpm run hub:complete-conversion-prove:scala
```

Expect `stGreen`+`stClosed` (`proveProfile: cwl-api`).
