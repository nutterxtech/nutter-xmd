import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const isVercel = !!process.env.VERCEL;
const isBuild = process.argv.includes("build");

const port = Number(process.env.PORT ?? "3000");
if (!process.env.PORT && !isVercel && !isBuild) {
  throw new Error(
    "PORT environment variable is required but was not provided. " +
      "It is set automatically by Replit for each artifact.",
  );
}

const basePath = process.env.BASE_PATH ?? "/";
if (!process.env.BASE_PATH && !isVercel && !isBuild) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided. " +
      "It is set automatically by Replit for each artifact.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
