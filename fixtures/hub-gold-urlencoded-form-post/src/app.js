const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

app.get("/signup", (_req, res) => {
  res.type("html").send(
    '<form method="post" action="/signup"><input name="email"/><input name="name"/><button>Join</button></form>',
  );
});

app.post("/signup", (req, res) => {
  res.json({ ok: true, email: req.body.email, name: req.body.name });
});

module.exports = app;
