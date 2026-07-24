import express, { type Express, type Request, type Response } from "express";

// hub-flagship-typescript — 20-route Express app in TypeScript (real .ts origin).
// Mirrors hub-flagship-express route set; types are origin surface, not a JS rename (D6447).

const app: Express = express();

app.get("/health", (_req: Request, _res: Response) => true);
app.get("/ping", (_req: Request, _res: Response) => 42);
app.get("/version", (_req: Request, _res: Response) => 1);
app.get("/ready", (_req: Request, _res: Response) => "ok");
app.get("/count", (_req: Request, _res: Response) => 3);
app.get("/flag", (_req: Request, _res: Response) => "chrysalis");
app.get("/build", (_req: Request, _res: Response) => 2026);
app.get("/tier", (_req: Request, _res: Response) => "gold");

app.get("/meta", (_req: Request, res: Response) =>
  res.json({ service: "hub-flagship-typescript", version: 1 }),
);

app.post("/echo", (_req: Request, res: Response) => res.json({ echo: true }));

app.get("/items", (_req: Request, _res: Response) => true);
app.get("/items/:id", (req: Request, res: Response) => res.json({ id: req.params.id }));
app.post("/items", (_req: Request, res: Response) => res.status(201).json({ created: true }));
app.get("/search", (req: Request, res: Response) => res.json({ q: req.query.q ?? "" }));
app.put("/items/:id", (req: Request, res: Response) =>
  res.json({ updated: true, id: req.params.id }),
);
app.delete("/items/:id", (_req: Request, _res: Response) => true);
app.patch("/items/:id", (req: Request, res: Response) =>
  res.json({ patched: true, id: req.params.id }),
);
app.get("/users/:userId", (req: Request, res: Response) => res.json(req.params.userId));
app.get("/stats", (_req: Request, _res: Response) => 3);
app.post("/notify", (_req: Request, res: Response) => res.status(202).json({ ok: true }));

export default app;
