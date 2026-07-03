var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/item/{id}", (string id) =>
{
    connection.Execute("SELECT id FROM items WHERE id = ?", id);
    return Results.Json(new { ok = true });
});

app.MapGet("/users/{id}", (string id) =>
{
    connection.Query("SELECT name FROM users WHERE id = ?", id);
    return Results.Json(new { ok = true });
});

app.Run();
