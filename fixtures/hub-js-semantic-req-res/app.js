const express = require("express");
const app = express();

app.get("/user/:id", (req, res) => {
  res.json({
    id: req.params.id,
    q: req.query.q,
    bodyKey: req.body.key,
    hdr: req.headers["x-test"],
    cookie: req.cookies.sid,
    accept: req.get("accept"),
  });
});

module.exports = app;
