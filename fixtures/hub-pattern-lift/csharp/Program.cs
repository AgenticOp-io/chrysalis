var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => true);
app.MapPost("/items", () => Results.Created());

app.Run();
