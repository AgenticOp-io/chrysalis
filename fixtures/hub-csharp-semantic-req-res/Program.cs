var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/user/{id}", (HttpRequest req, string id) =>
    Results.Json(new { id, q = req.Query["q"].ToString(), hdr = req.Headers["X-Test"].ToString(), cookie = req.Cookies["sid"] }));

app.Run();
