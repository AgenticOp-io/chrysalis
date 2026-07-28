import Fastify, { type FastifyInstance } from "fastify";

// hub-gold-fastify-prefix — 20-route Fastify encapsulated plugin prefix peel (G10072 / D6534).
// Mirrors hub-gold-fastify surface under `register(…, { prefix: '/api' })` path join.
// No invented plugin runtime / hooks / schema (**D6447**).

const fastify: FastifyInstance = Fastify();

fastify.register(
  async function (app) {
    app.get("/health", () => true);
    app.get("/ping", () => 42);
    app.get("/version", () => 1);
    app.get("/ready", () => "ok");
    app.get("/count", () => 3);
    app.get("/flag", () => "chrysalis");
    app.get("/build", () => 2026);
    app.get("/tier", () => "gold");

    app.get("/meta", (_req, reply) => reply.send({ service: "hub-gold-fastify-prefix", version: 1 }));

    app.post("/echo", (_req, reply) => reply.send({ echo: true }));

    app.get("/items", () => true);
    app.get<{ Params: { id: string } }>("/items/:id", (req, reply) =>
      reply.send({ id: req.params.id }),
    );
    app.post("/items", (_req, reply) => reply.code(201).send({ created: true }));
    app.get<{ Querystring: { q?: string } }>("/search", (req, reply) =>
      reply.send({ q: req.query.q ?? "" }),
    );
    app.put<{ Params: { id: string } }>("/items/:id", (req, reply) =>
      reply.send({ updated: true, id: req.params.id }),
    );
    app.delete("/items/:id", () => true);
    app.patch<{ Params: { id: string } }>("/items/:id", (req, reply) =>
      reply.send({ patched: true, id: req.params.id }),
    );
    app.get<{ Params: { userId: string } }>("/users/:userId", (req, reply) =>
      reply.send(req.params.userId),
    );
    app.get("/stats", () => 3);
    app.post("/notify", (_req, reply) => reply.code(202).send({ ok: true }));
  },
  { prefix: "/api" },
);

export default fastify;
