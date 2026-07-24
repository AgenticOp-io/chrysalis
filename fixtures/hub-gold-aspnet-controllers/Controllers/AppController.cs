using Microsoft.AspNetCore.Mvc;

// hub-gold-aspnet-controllers — 20-route ASP.NET controller dialect (secondary to Minimal API ST).
// [ApiController] + [Route] + [HttpGet|Post|…] in ONE file; mirrors hub-flagship-csharp route set.
// No DI / filter pipeline / Razor invented (**D6447**).

[ApiController]
[Route("")]
public class AppController : ControllerBase
{
    [HttpGet("health")]
    public bool Health() => true;

    [HttpGet("ping")]
    public int Ping() => 42;

    [HttpGet("version")]
    public int Version() => 1;

    [HttpGet("ready")]
    public string Ready() => "ok";

    [HttpGet("count")]
    public int Count() => 3;

    [HttpGet("flag")]
    public string Flag() => "chrysalis";

    [HttpGet("build")]
    public int Build() => 2026;

    [HttpGet("tier")]
    public string Tier() => "gold";

    [HttpGet("meta")]
    public IActionResult Meta() => Results.Json(new { service = "hub-gold-aspnet-controllers", version = 1 });

    [HttpPost("echo")]
    public IActionResult Echo() => Results.Json(new { echo = true });

    [HttpGet("search")]
    public IActionResult Search(string q = "") => Results.Json(new { q });

    [HttpGet("users/{userId}")]
    public string User(string userId) => userId;

    [HttpGet("stats")]
    public int Stats() => 3;

    [HttpPost("notify")]
    public IActionResult Notify() => Results.Json(new { ok = true }, statusCode: 202);
}

[ApiController]
[Route("items")]
public class ItemsController : ControllerBase
{
    [HttpGet]
    public bool List() => true;

    [HttpGet("{id}")]
    public IActionResult One(string id) => Results.Json(new { id });

    [HttpPost]
    public IActionResult Create() => Results.Json(new { created = true }, statusCode: 201);

    [HttpPut("{id}")]
    public IActionResult Update(string id) => Results.Json(new { updated = true, id });

    [HttpDelete("{id}")]
    public bool Remove() => true;

    [HttpPatch("{id}")]
    public IActionResult Patch(string id) => Results.Json(new { patched = true, id });
}
