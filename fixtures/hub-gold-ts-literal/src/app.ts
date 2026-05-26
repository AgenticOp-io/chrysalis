import express from "express";

const app = express();

app.get("/health", () => true);
app.get("/ping", () => 42);

export default app;
