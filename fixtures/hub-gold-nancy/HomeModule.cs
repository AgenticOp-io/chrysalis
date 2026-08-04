using Nancy;
using Nancy.Responses;

// hub-gold-nancy — 20-route Nancy FX NancyModule dialect (secondary to Minimal API ST).
// Peels constructor Get|Post|Put|Patch|Delete route lambdas + Response.AsJson / HttpStatusCode /
// parameters.id / Request.Query (G10114 / D6540). No NancyHost / DI invent (**D6447**).

public class HomeModule : NancyModule
{
    public HomeModule()
    {
        Get("/health", _ => true);
        Get("/ping", _ => 42);
        Get("/version", _ => 1);
        Get("/ready", _ => "ok");
        Get("/count", _ => 3);
        Get("/flag", _ => "chrysalis");
        Get("/build", _ => 2026);
        Get("/tier", _ => "gold");
        Get("/meta", _ => Response.AsJson(new { service = "hub-gold-nancy", version = 1 }));
        Post("/echo", _ => Response.AsJson(new { echo = true }));
        Get("/items", _ => true);
        Get("/items/{id}", parameters => Response.AsJson(new { id = (string)parameters.id }));
        Post("/items", _ => Response.AsJson(new { created = true }).WithStatusCode(HttpStatusCode.Created));
        Get("/search", _ => Response.AsJson(new { q = (string)Request.Query.q }));
        Put("/items/{id}", parameters => Response.AsJson(new { updated = true, id = (string)parameters.id }));
        Delete("/items/{id}", _ => true);
        Patch("/items/{id}", parameters => Response.AsJson(new { patched = true, id = (string)parameters.id }));
        Get("/users/{userId}", parameters => (string)parameters.userId);
        Get("/stats", _ => 3);
        Post("/notify", _ => Response.AsJson(new { ok = true }).WithStatusCode(HttpStatusCode.Accepted));
    }
}
