var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => Results.Json(new { ok = true }));
app.MapGet("/meta", () => Results.Json(new { service = "hub-gold-csharp-structured", version = 1 }));

app.Run();
