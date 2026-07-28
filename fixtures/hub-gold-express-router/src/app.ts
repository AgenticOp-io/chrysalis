import express, { type Express, type Request, type Response } from "express";

// hub-gold-express-router — 20-route Express Router mount peel (G10067 / D6529).
// `express.Router()` + `router.get|post|…` + `app.use('/api', router)` literal
// path join. Empty pass-through `app.use` peels as `js.passthrough` (G9959).
// Complex `use(prefix, mw, router)` stays honest hole. Express/TS remain D6448-ST.

const app: Express = express();
const router = express.Router();

// Empty pass-through shell — peel as `js.passthrough` (no invented onion).
app.use((_req: Request, _res: Response, next: () => void) => {
  next();
});

router.get("/health", (_req: Request, _res: Response) => true);
router.get("/ping", (_req: Request, _res: Response) => 42);
router.get("/version", (_req: Request, _res: Response) => 1);
router.get("/ready", (_req: Request, _res: Response) => "ok");
router.get("/count", (_req: Request, _res: Response) => 3);
router.get("/flag", (_req: Request, _res: Response) => "chrysalis");
router.get("/build", (_req: Request, _res: Response) => 2026);
router.get("/tier", (_req: Request, _res: Response) => "gold");

router.get("/meta", (_req: Request, res: Response) =>
  res.json({ service: "hub-gold-express-router", version: 1 }),
);

router.post("/echo", (_req: Request, res: Response) => res.json({ echo: true }));

router.get("/items", (_req: Request, _res: Response) => true);
router.get("/items/:id", (req: Request, res: Response) => res.json({ id: req.params.id }));
router.post("/items", (_req: Request, res: Response) =>
  res.status(201).json({ created: true }),
);
router.get("/search", (req: Request, res: Response) => res.json({ q: req.query.q ?? "" }));
router.put("/items/:id", (req: Request, res: Response) =>
  res.json({ updated: true, id: req.params.id }),
);
router.delete("/items/:id", (_req: Request, _res: Response) => true);
router.patch("/items/:id", (req: Request, res: Response) =>
  res.json({ patched: true, id: req.params.id }),
);
router.get("/users/:userId", (req: Request, res: Response) => res.json(req.params.userId));
router.get("/stats", (_req: Request, _res: Response) => 3);
router.post("/notify", (_req: Request, res: Response) =>
  res.status(202).json({ ok: true }),
);

// Literal mount — peel joins `/api` + router paths (not a middleware hole).
app.use("/api", router);

export default app;
