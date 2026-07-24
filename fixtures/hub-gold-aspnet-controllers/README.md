# hub-gold-aspnet-controllers

Gold fixture for **ASP.NET controller** attribute routes as a C# secondary dialect
(secondary to Minimal API `hub-flagship-csharp` D6448-ST). Route surface only —
no DI / filter pipeline / Razor invent (**D6447**).

## Files

- `Controllers/AppController.cs` — 20 routes: `[ApiController]` + `[Route]` +
  `[HttpGet|Post|…]`, `{id}` paths, query defaults, `Results.Json` + `statusCode:`.

## Smoke

```bash
pnpm run hub:aspnet-controllers-smoke
```

Expect 20/20 hole-free CWL projection.
