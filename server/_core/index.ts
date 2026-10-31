import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { uploadRouter } from "./upload";
import { registerAiTranscribeRoute } from "../analyzer/aiTranscribeLatino";
import { appRouter } from "../routers";
import { createContext } from "./context";
// Production static file serving - no dev dependencies, safe to bundle
import { serveStatic } from "./static";

const isDev = process.env.NODE_ENV === "development";

// Port scanning only needed in development (multiple processes)
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Health check endpoint for Cloud Run / load balancers
  app.get("/_health", (_req, res) => {
    res.status(200).send("OK");
  });

  // CORS per i font: la cornice dinamica (embed su Blogger/siti esterni)
  // carica OpenDyslexic cross-origin da /fonts/* — senza questo header il
  // browser bloccherebbe il @font-face (richiesta cross-origin).
  app.use("/fonts", (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // File upload/delete via multipart form
  app.use(uploadRouter);
  // Trascrizione IA delle foto (route condivisa col Widget metacognitivo:
  // POST /api/ai/transcribe { image, kind:"photo" } -> { text }; 503 senza chiave)
  registerAiTranscribeRoute(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Development mode uses Vite HMR, production mode uses static files
  if (isDev) {
    // Dynamic import - vite.ts is only loaded in development
    // This prevents bundling vite and devDependencies in production
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // In production (Cloud Run), PORT is set by the platform - use it directly
  // In development, scan for available port if preferred port is busy
  const preferredPort = parseInt(process.env.PORT || "3000");
  let port = preferredPort;

  if (isDev) {
    port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
