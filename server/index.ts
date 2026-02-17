import express, { type Request, Response, NextFunction, Router, type Express } from "express";
import { createServer } from "http";
import githubRoutes from "./routes/github.js";
import deployRoutes from "./routes/deploy.js";
import userRoutes from "./routes/user.js";
import healthRoutes from "./routes/health.js";
import sourcesRoutes from "./routes/sources.js";

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

// Add request ID for tracing
app.use((req, res, next) => {
  // Use existing request ID from header or generate new one
  const requestId = req.headers['x-request-id'] as string ||
                    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store on request and response
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
});

// Add security headers
app.use((_req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (basic)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );
  }

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

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
  router.use(healthRoutes);
  router.use(githubRoutes);
  router.use(deployRoutes);
  router.use(userRoutes);
  router.use('/api/sources', sourcesRoutes);
  app.use(router);
  const httpServer = createServer(app);
  return httpServer;
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = req.id;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `[${requestId}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
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

  // Configure request timeout to prevent hanging connections
  const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000');
  server.setTimeout(REQUEST_TIMEOUT_MS);

  server.on('timeout', (socket) => {
    console.warn('Request timeout', {
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort,
      timestamp: new Date().toISOString()
    });
    socket.destroy();
  });

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