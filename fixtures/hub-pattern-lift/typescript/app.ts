import express from "express";
const app = express();
app.get("/health", (_req, res) => res.send("ok"));
app.post("/items", (_req, res) => res.status(201).end());
