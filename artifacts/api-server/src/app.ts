import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import path from "path";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── Static frontend (production only, when frontend is NOT on a separate host) ──
// Skip static serving when CORS_ORIGIN is set — that means the frontend is
// deployed separately (e.g. Vercel) and there is nothing to serve here.
const separateFrontend = !!process.env.CORS_ORIGIN;
const staticDir =
  !separateFrontend && process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "artifacts/nutter-xmd/dist")
    : null;

if (staticDir) {
  app.use(express.static(staticDir));
}

// ── CORS ──────────────────────────────────────────────────────────────────────
// When CORS_ORIGIN is set, only allow those origins (comma-separated list).
// In dev / same-host deployments, reflect all origins so Replit preview works.
const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin:
      corsOrigins.length > 0
        ? (origin, callback) => {
            if (!origin || corsOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error(`CORS: origin "${origin}" not allowed`));
            }
          }
        : true,
  }),
);

// ── Common middleware ─────────────────────────────────────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check (no auth needed) ────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API routes (Clerk auth scoped only here) ──────────────────────────────────
// Applying clerkMiddleware globally was causing 500s on every request whenever
// CLERK_PUBLISHABLE_KEY wasn't set, including requests for the static frontend.
app.use("/api", clerkMiddleware(), router);

// ── SPA fallback (production only, same-host deployment) ─────────────────────
// Only active when the frontend is bundled with this server (no CORS_ORIGIN).
if (staticDir) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/__clerk")) {
      return next();
    }
    res.sendFile(path.join(staticDir!, "index.html"));
  });
}

export default app;
