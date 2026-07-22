import express from "express";

const app = express();

app.use(express.json());

app.get("/ready", (_req, res) => res.json({ ready: true }));
app.post("/echo", (_req, res) => res.json({ ok: true }));

export default app;
