const express = require("express");
const app = express();

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/meta", (req, res) => res.json({ service: "hub-gold-js-structured", version: 1 }));

module.exports = app;
