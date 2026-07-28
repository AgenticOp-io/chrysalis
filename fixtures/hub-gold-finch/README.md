# hub-gold-finch

Secondary Scala dialect fixture: **Finch** `get("path") { Ok(…) }` / `get("items" :: path[String])` / `param[String]("q")`.

- Same 20-route API surface as `hub-flagship-scala` (Akka remains the D6448-ST flagship; Http4s remains first Scala secondary).
- Prove hole-free lift: `pnpm run hub:finch-smoke`
- No invented product UI (**D6447**). Flat peelable combinators only (G10051 / D6513).
