// hub-gold-bun-serve — 20-route Bun.serve TypeScript dialect (secondary to Express flagship).
// `Bun.serve({ routes: { "/path": { GET|POST|…: handler } } })` + `req.params` +
// `new URL(req.url).searchParams` + `Response.json` (+ `{ status: N }`).
// fetch fallback / websocket / plugins stay honest holes (**D6447** — no invented Bun runtime).

const server = Bun.serve({
  routes: {
    "/health": {
      GET: () => Response.json(true),
    },
    "/ping": {
      GET: () => Response.json(42),
    },
    "/version": {
      GET: () => Response.json(1),
    },
    "/ready": {
      GET: () => Response.json("ok"),
    },
    "/count": {
      GET: () => Response.json(3),
    },
    "/flag": {
      GET: () => Response.json("chrysalis"),
    },
    "/build": {
      GET: () => Response.json(2026),
    },
    "/tier": {
      GET: () => Response.json("gold"),
    },
    "/meta": {
      GET: () => Response.json({ service: "hub-gold-bun-serve", version: 1 }),
    },
    "/echo": {
      POST: () => Response.json({ echo: true }),
    },
    "/items": {
      GET: () => Response.json(true),
      POST: () => Response.json({ created: true }, { status: 201 }),
    },
    "/items/:id": {
      GET: (req) => Response.json({ id: req.params.id }),
      PUT: (req) => Response.json({ updated: true, id: req.params.id }),
      DELETE: () => Response.json(true),
      PATCH: (req) => Response.json({ patched: true, id: req.params.id }),
    },
    "/search": {
      GET: (req) =>
        Response.json({ q: new URL(req.url).searchParams.get("q") ?? "" }),
    },
    "/users/:userId": {
      GET: (req) => Response.json(req.params.userId),
    },
    "/stats": {
      GET: () => Response.json(3),
    },
    "/notify": {
      POST: () => Response.json({ ok: true }, { status: 202 }),
    },
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

export default server;
