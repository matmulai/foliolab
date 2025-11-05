import express, { type Request, Response, NextFunction, Router, type Express } from "express";
import { createServer } from "http";
import githubRoutes from "./routes/github.js";
import deployRoutes from "./routes/deploy.js";
import userRoutes from "./routes/user.js";

// Validate required environment variables at startup
function validateEnvironment(): void {
  const required = [
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'OPENAI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file or environment configuration.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  // Validate optional but recommended variables
  const recommended = ['APP_URL', 'OPENAI_API_MODEL'];
  const missingRecommended = recommended.filter(key => !process.env[key]);

  if (missingRecommended.length > 0) {
    console.warn('⚠️  Optional environment variables not set:');
    missingRecommended.forEach(key => console.warn(`   - ${key}`));
    console.warn('   Using default values.\n');
  }

  console.log('✅ Environment validation passed\n');
}

// Validate environment before starting server
validateEnvironment();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  // Define allowed origins based on environment
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.APP_URL].filter(Boolean)
    : ['http://localhost:5000', 'http://localhost:5173']; // Vite dev server

  // Check if request origin is allowed
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  } else if (process.env.NODE_ENV === 'development') {
    // In development, allow any origin for flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  // In production, if origin not allowed, don't set the header (request will be rejected)

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

async function registerRoutes(app: Express) {
  const router = Router();
  router.use(githubRoutes);
  router.use(deployRoutes);
  router.use(userRoutes);
  app.use(router);
  const httpServer = createServer(app);
  return httpServer;
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });

    // Log error instead of throwing to prevent server crash
    console.error('Error handled:', {
      status,
      message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
  });

  // In production, serve static files from the dist directory
  if (process.env.NODE_ENV === "production") {
    app.use(express.static("dist/public"));
    // Serve index.html for client-side routing
    app.get("*", (_req, res) => {
      res.sendFile("dist/public/index.html", { root: "." });
    });
  } else {
    // Only import and setup Vite in development
    const { setupVite } = await import("./vite.ts");
    await setupVite(app, server);
  }

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`serving on port ${port}`);
  });
})();