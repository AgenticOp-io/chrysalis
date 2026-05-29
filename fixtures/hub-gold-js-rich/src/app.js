/**
 * Rich Express handlers exercising the JavaScript lift's request-field and
 * status support (G137): path params (`req.params.x`), query params with `??`
 * defaults (`req.query.q ?? ""`), object/text bodies, and explicit response
 * status (`res.status(n).json(...)`). Projects to a hole-free, fidelity-rich
 * CWL contract (status + params + defaults + content-type).
 */
const express = require("express");

const app = express();

app.get("/items/:id", (req) => ({ id: req.params.id }));
app.put("/items/:id", (req) => ({ updated: true, id: req.params.id }));
app.patch("/items/:id", (req) => ({ patched: true, id: req.params.id }));
app.get("/users/:userId", (req) => req.params.userId);
app.get("/search", (req) => ({ q: req.query.q ?? "" }));
app.post("/items", (req, res) => res.status(201).json({ created: true }));
app.post("/notify", (req, res) => res.status(202).json({ ok: true }));

module.exports = app;
