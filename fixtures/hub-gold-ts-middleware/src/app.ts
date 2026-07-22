import express from "express";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/ready", (_req, res) => res.json({ ready: true }));
app.post("/echo", (req, res) => res.json({ ok: true, key: req.body.key }));

export default app;
