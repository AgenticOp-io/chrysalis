// hub-gold-deno-serve — 20-route Deno.serve pathname+method dialect
// (secondary to Express/TS D6448-ST; Oak / Bun.serve / itty / CF Workers stay green).
// Peels Deno.serve(handler) + switch on `${req.method} ${url.pathname}` +
// Response.json (+ `{ status: N }`) + searchParams.get (G10118 / D6543).
// Reuses CF Workers control-flow peels (G10063) — does NOT invent Deno.serve({ routes })
// (**D6447** / D6522). URLPattern / @std/http route / dynamic :id stay honest holes.
// Literal `/items/id` stands in for path params.

Deno.serve((req: Request): Response => {
  const url = new URL(req.url);
  switch (`${req.method} ${url.pathname}`) {
    case "GET /health":
      return Response.json(true);
    case "GET /ping":
      return Response.json(42);
    case "GET /version":
      return Response.json(1);
    case "GET /ready":
      return Response.json("ok");
    case "GET /count":
      return Response.json(3);
    case "GET /flag":
      return Response.json("chrysalis");
    case "GET /build":
      return Response.json(2026);
    case "GET /tier":
      return Response.json("gold");
    case "GET /meta":
      return Response.json({ service: "hub-gold-deno-serve", version: 1 });
    case "POST /echo":
      return Response.json({ echo: true });
    case "GET /items":
      return Response.json(true);
    case "GET /items/id":
      return Response.json({ id: "id" });
    case "POST /items":
      return Response.json({ created: true }, { status: 201 });
    case "GET /search":
      return Response.json({ q: url.searchParams.get("q") ?? "" });
    case "PUT /items/id":
      return Response.json({ updated: true, id: "id" });
    case "DELETE /items/id":
      return Response.json(true);
    case "PATCH /items/id":
      return Response.json({ patched: true, id: "id" });
    case "GET /users/userId":
      return Response.json("userId");
    case "GET /stats":
      return Response.json(3);
    case "POST /notify":
      return Response.json({ ok: true }, { status: 202 });
    default:
      return new Response("Not Found", { status: 404 });
  }
});
