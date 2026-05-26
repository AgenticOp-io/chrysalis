import express from "express";

const app = express();

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/meta", (_req, res) => res.json({ service: "hub-gold-ts-structured", version: 1 }));

export default app;
