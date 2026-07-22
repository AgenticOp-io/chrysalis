var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/ready", () => Results.Json(new { ready = true }));
app.MapPost("/echo", () => Results.Json(new { ok = true }));

app.Run();
