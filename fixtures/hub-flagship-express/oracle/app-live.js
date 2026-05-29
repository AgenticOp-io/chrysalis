/**
 * Runnable Express app for live oracle capture (G112). Not ingested — see src/app.js for lift.
 */
const express = require("express");

const app = express();

function emptyOk(_req, res) {
  res.status(200).type("text/plain; charset=UTF-8").send("");
}

app.get("/health", emptyOk);
app.get("/ping", emptyOk);
app.get("/version", emptyOk);
app.get("/ready", emptyOk);
app.get("/count", emptyOk);
app.get("/flag", emptyOk);
app.get("/build", emptyOk);
app.get("/tier", emptyOk);

app.get("/meta", (_req, res) => res.json({ service: "hub-flagship-express", version: 1 }));

app.post("/echo", (_req, res) => res.json({ echo: true }));

// Slice-2 routes: the lift extracts path/query request fields (G137) and the
// hono/fastify emit now returns real JSON bodies + status (G138), so this live
// oracle mirrors the emitted runtime exactly (res.json / res.status().json()).
// Trivial literal routes (/items, /stats) stay empty to match discarded bare returns.
app.get("/items", emptyOk);
app.get("/items/:id", (req, res) => res.json({ id: req.params.id }));
app.post("/items", (_req, res) => res.status(201).json({ created: true }));
app.get("/search", (req, res) => res.json({ q: req.query.q ?? "" }));
app.put("/items/:id", (req, res) => res.json({ updated: true, id: req.params.id }));
app.delete("/items/:id", emptyOk);
app.patch("/items/:id", (req, res) => res.json({ patched: true, id: req.params.id }));
app.get("/users/:userId", (req, res) => res.json(req.params.userId));
app.get("/stats", emptyOk);
app.post("/notify", (_req, res) => res.status(202).json({ ok: true }));

module.exports = app;
