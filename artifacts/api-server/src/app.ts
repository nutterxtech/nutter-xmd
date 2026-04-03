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

// ── Static frontend (production only) ────────────────────────────────────────
// Serve BEFORE auth middleware so the React SPA loads even if Clerk keys are
// misconfigured.  Express.static handles cache headers, 304s, etc.
const staticDir =
  process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "artifacts/nutter-xmd/dist/public")
    : null;

if (staticDir) {
  app.use(express.static(staticDir));
}

// ── Common middleware ─────────────────────────────────────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
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

// ── SPA fallback (production only) ───────────────────────────────────────────
// Any non-API, non-clerk path returns index.html so client-side routing works.
if (staticDir) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/__clerk")) {
      return next();
    }
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
