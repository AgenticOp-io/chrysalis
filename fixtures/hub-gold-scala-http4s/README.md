# hub-gold-scala-http4s

Secondary Scala dialect fixture: **Http4s** `HttpRoutes.of` / `case METHOD -> Root / … => Ok|Created|Accepted(…)`.

- Same 20-route API surface as `hub-flagship-scala` (Akka remains the D6448-ST flagship).
- Prove hole-free lift: `pnpm run hub:scala-http4s-smoke`
- No invented product UI (**D6447**).
