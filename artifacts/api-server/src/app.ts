import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    autoLogging: process.env.NODE_ENV !== "production",
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Static frontend (same-host production only) ───────────────────────────────
const separateFrontend = !!process.env.CORS_ORIGIN;
const staticDir =
  !separateFrontend && process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "artifacts/nutter-xmd/dist")
    : null;

if (staticDir) {
  app.use(express.static(staticDir));
}

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));

// ── Common middleware ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check (no auth needed) ────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── SPA fallback (same-host production only) ──────────────────────────────────
if (staticDir) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(staticDir!, "index.html"));
  });
}

export default app;
