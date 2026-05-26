const express = require("express");
const app = express();

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/items", (req, res) => {
  res.status(201).json({ id: 1 });
});

module.exports = app;
