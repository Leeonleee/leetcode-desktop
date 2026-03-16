import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { authRoutes } from "./routes/auth-routes.js";
import { problemsRoutes } from "./routes/problems-routes.js";
import { submissionsRoutes } from "./routes/submissions-routes.js";
import { codeStorageRoutes } from "./routes/code-storage-routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.frontendOrigin
    })
  );

  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, now: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/problems", problemsRoutes);
  app.use("/api/submissions", submissionsRoutes);
  app.use("/api/code", codeStorageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
