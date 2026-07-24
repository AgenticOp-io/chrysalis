# hub-gold-nestjs

Secondary TypeScript origin dialect fixture: **NestJS** `@Controller` +
`@Get`/`@Post`/`@Put`/`@Patch`/`@Delete` (+ `@Param` / `@Query` / `@Body` /
`@Headers` / `@Cookies` / `@HttpCode`)
via the shared JS/TS AST lift (TypeScript decorator AST — acorn-after-strip
cannot see Nest decorators).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify`.
- Express/TypeScript remain the primary JS/TS D6448-ST flagships.
- **Route-surface Nest ST (cwl-api):** `pnpm run hub:nestjs-flagship` then
  `pnpm run hub:complete-conversion-prove:nestjs` → `stGreen`+`stClosed`.
  DI / modules / guards / pipes stay honest unsupported shapes (**D6447** —
  not present in this gold; do not invent Nest runtime).
- Hole-free lift smoke: `pnpm run hub:nestjs-smoke`
- Distinct from any future Nest emit target (matrix output id only today).

## Controllers

| Class | Prefix | Routes |
| --- | --- | --- |
| `AppController` | (none) | health, ping, version, ready, count, flag, build, tier, meta, echo, search, users/:userId, stats, notify |
| `ItemsController` | `items` | list, :id GET/PUT/PATCH/DELETE, POST create |

## Honest holes (unsupported shapes)

| Shape | Hole / status |
| --- | --- |
| `@Module` / providers / DI constructor inject | not lowered (not routes) |
| `@UseGuards` / interceptors / pipes / filters | not lowered |
| `@Res()` / `@Next()` Express escape hatches | not lowered (prefer Nest return values) |
| Dynamic path templates / versioning | not lowered |
| Nest runtime bootstrap (`NestFactory`) | out of scope for route lift |
