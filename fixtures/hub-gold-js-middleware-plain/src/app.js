const express = require("express");
const app = express();

app.use(express.json());

app.get("/ready", (req, res) => res.json({ ready: true }));
app.post("/echo", (req, res) => res.json({ ok: true }));

module.exports = app;
