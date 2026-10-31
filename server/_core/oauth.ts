/**
 * Auth routes using Better Auth
 */
import type { Express } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

export function registerOAuthRoutes(app: Express) {
  if (!auth) {
    // Auth not available - return error for auth endpoints
    app.all("/api/auth/*", (_req, res) => {
      res.status(503).json({
        error: "Auth service unavailable",
        message: "Database is not configured. Set DATABASE_URL to enable authentication.",
      });
    });
    return;
  }

  // Mount Better Auth handler at /api/auth/*
  // This handles all auth endpoints: sign-in, sign-up, sign-out, session, etc.
  app.all("/api/auth/*", toNodeHandler(auth));
}
