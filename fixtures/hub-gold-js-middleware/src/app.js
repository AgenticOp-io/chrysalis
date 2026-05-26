const express = require("express");
const app = express();

app.use(express.json());

app.get("/ready", (req, res) => res.json({ ready: true }));

module.exports = app;
