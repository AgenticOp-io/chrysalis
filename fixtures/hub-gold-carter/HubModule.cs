using Carter;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

// hub-gold-carter — 20-route Carter ICarterModule dialect (secondary to Minimal API ST).
// AddRoutes peels the same app.MapGet|MapPost|… surface as hub-flagship-csharp.
// No MapCarter / DI / filter invent (**D6447**).

public class HubModule : ICarterModule
{
    public void AddRoutes(IEndpointRouteBuilder app)
    {
        app.MapGet("/health", () => true);
        app.MapGet("/ping", () => 42);
        app.MapGet("/version", () => 1);
        app.MapGet("/ready", () => "ok");
        app.MapGet("/count", () => 3);
        app.MapGet("/flag", () => "chrysalis");
        app.MapGet("/build", () => 2026);
        app.MapGet("/tier", () => "gold");
        app.MapGet("/meta", () => Results.Json(new { service = "hub-gold-carter", version = 1 }));
        app.MapPost("/echo", () => Results.Json(new { echo = true }));
        app.MapGet("/items", () => true);
        app.MapGet("/items/{id}", (string id) => Results.Json(new { id }));
        app.MapPost("/items", () => Results.Json(new { created = true }, statusCode: 201));
        app.MapGet("/search", (string q = "") => Results.Json(new { q }));
        app.MapPut("/items/{id}", (string id) => Results.Json(new { updated = true, id }));
        app.MapDelete("/items/{id}", () => true);
        app.MapPatch("/items/{id}", (string id) => Results.Json(new { patched = true, id }));
        app.MapGet("/users/{userId}", (string userId) => userId);
        app.MapGet("/stats", () => 3);
        app.MapPost("/notify", () => Results.Json(new { ok = true }, statusCode: 202));
    }
}
