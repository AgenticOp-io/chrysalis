var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/health", () => true);
app.MapGet("/ping", () => 42);

app.Run();
