/**
 * Static file serving for production
 * This file has NO dev dependencies - safe to bundle for Cloud Run
 */
import fs from "fs";
import path from "path";

import express, { type Express } from "express";

const NO_CACHE_HEADER = "no-cache, no-store, must-revalidate";

export function serveStatic(app: Express): void {
  // In production, static files are in dist/public (relative to dist/index.js)
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Serve static assets with caching (Vite generates hashed filenames for JS/CSS)
  // These can be cached for a long time since the hash changes on content change
  app.use(
    express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      // HTML files need to always be fresh to pick up new asset hashes
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", NO_CACHE_HEADER);
        }
      },
    })
  );

  // Fall through to index.html for SPA routing
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", NO_CACHE_HEADER);
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
