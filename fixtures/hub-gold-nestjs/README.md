# hub-gold-nestjs

Secondary TypeScript origin dialect fixture: **NestJS** `@Controller` +
`@Get`/`@Post`/`@Put`/`@Patch`/`@Delete` (+ `@Param` / `@Query` / `@HttpCode`)
via the shared JS/TS AST lift (TypeScript decorator AST — acorn-after-strip
cannot see Nest decorators).

- Same 20-route express-depth API surface as `hub-flagship-express` /
  `hub-flagship-typescript` / `hub-gold-fastify`.
- Express/TypeScript remain the JS/TS D6448-ST flagships; this is a secondary
  dialect smoke (not ST unless separately proven hole-free with a checklist).
- Prove hole-free lift: `pnpm run hub:nestjs-smoke`
- Distinct from any future Nest emit target (matrix output id only today).
- No invented Nest DI / modules / guards / pipes / interceptors (**D6447**).

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
