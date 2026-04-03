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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", router);

// In production (Render), serve the built React frontend as static files.
// The build process outputs the frontend to artifacts/nutter-xmd/dist/public.
if (process.env.NODE_ENV === "production") {
  const staticDir = path.join(process.cwd(), "artifacts/nutter-xmd/dist/public");
  app.use(express.static(staticDir));
  // SPA fallback: serve index.html for all non-API routes (Express v5 requires app.use for wildcards)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/__clerk")) {
      return next();
    }
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
