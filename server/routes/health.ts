import { Router } from 'express';

const router = Router();

/**
 * Basic health check endpoint
 * Returns server status and uptime
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Readiness check endpoint
 * Validates that all required dependencies are configured
 */
router.get('/health/ready', (_req, res) => {
  try {
    const checks = {
      github: {
        configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
        status: (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) ? 'ready' : 'not configured'
      },
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        status: process.env.OPENAI_API_KEY ? 'ready' : 'not configured'
      },
      vercel: {
        configured: !!(process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET),
        status: (process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET) ? 'ready' : 'optional - not configured',
        required: false
      }
    };

    // Check if all required services are ready
    const allReady = checks.github.configured && checks.openai.configured;

    // In production, only return aggregate status (don't leak which services are configured)
    if (process.env.NODE_ENV === 'production') {
      res.status(allReady ? 200 : 503).json({
        status: allReady ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(allReady ? 200 : 503).json({
        status: allReady ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
        checks
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Liveness check endpoint
 * Simple check that the server is running
 */
router.get('/health/live', (_req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export default router;
