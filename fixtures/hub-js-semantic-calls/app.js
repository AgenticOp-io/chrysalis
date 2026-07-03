const express = require("express");
const app = express();

app.use(express.json());

app.get("/n", (req, res) => {
  res.json({ n: parseInt(req.query.n, 10) });
});

module.exports = app;
