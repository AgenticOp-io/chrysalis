# hub-gold-carter

Gold fixture for **Carter** `ICarterModule` route modules as a C# secondary dialect
(secondary to Minimal API `hub-flagship-csharp` D6448-ST). Carter modules register
routes with `void AddRoutes(IEndpointRouteBuilder app)` via the same
`app.MapGet|MapPost|…("/path", …)` surface as Minimal API — **reuses Minimal API
Map\* peels**; no `MapCarter` / DI / filter invent (**D6447**).

## Files

- `HubModule.cs` — 20 routes: `ICarterModule` + `AddRoutes` + `app.Map*`, `{id}`
  paths, query defaults, `Results.Json` + `statusCode:` (same shape as
  `hub-flagship-csharp`; Carter-labeled module wrapper).

## Smoke

```bash
pnpm run hub:carter-smoke
```

Expect 20/20 hole-free CWL projection via existing Minimal API lift path.
Leadership claim: Carter route surface via Minimal API Map\* peels (**D6503** / **G10041**).
ASP.NET controllers remain the first C# secondary (`hub:aspnet-controllers-smoke`).
