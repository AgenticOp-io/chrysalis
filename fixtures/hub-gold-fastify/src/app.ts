import Fastify, { type FastifyInstance } from "fastify";

// hub-gold-fastify — 20-route Fastify TypeScript dialect (secondary to Express flagship).
// Mirrors hub-flagship-express; `fastify` receiver + reply.send / reply.code (D6447).

const fastify: FastifyInstance = Fastify();

fastify.get("/health", () => true);
fastify.get("/ping", () => 42);
fastify.get("/version", () => 1);
fastify.get("/ready", () => "ok");
fastify.get("/count", () => 3);
fastify.get("/flag", () => "chrysalis");
fastify.get("/build", () => 2026);
fastify.get("/tier", () => "gold");

fastify.get("/meta", (_req, reply) => reply.send({ service: "hub-gold-fastify", version: 1 }));

fastify.post("/echo", (_req, reply) => reply.send({ echo: true }));

fastify.get("/items", () => true);
fastify.get<{ Params: { id: string } }>("/items/:id", (req, reply) =>
  reply.send({ id: req.params.id }),
);
fastify.post("/items", (_req, reply) => reply.code(201).send({ created: true }));
fastify.get<{ Querystring: { q?: string } }>("/search", (req, reply) =>
  reply.send({ q: req.query.q ?? "" }),
);
fastify.put<{ Params: { id: string } }>("/items/:id", (req, reply) =>
  reply.send({ updated: true, id: req.params.id }),
);
fastify.delete("/items/:id", () => true);
fastify.patch<{ Params: { id: string } }>("/items/:id", (req, reply) =>
  reply.send({ patched: true, id: req.params.id }),
);
fastify.get<{ Params: { userId: string } }>("/users/:userId", (req, reply) =>
  reply.send(req.params.userId),
);
fastify.get("/stats", () => 3);
fastify.post("/notify", (_req, reply) => reply.code(202).send({ ok: true }));

export default fastify;
