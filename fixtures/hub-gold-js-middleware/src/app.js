const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/ready", (req, res) => res.json({ ready: true }));
app.post("/echo", (req, res) => res.json({ ok: true, key: req.body.key }));

module.exports = app;
