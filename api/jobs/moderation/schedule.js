/**
 * Vercel cron entrypoint for scheduled moderation jobs
 * Thin deployment wrapper that calls the shared moderation pipeline logic
 * Supports GET for Vercel cron execution and POST for manual testing
 *
 * NOTE: Due to Vercel import resolution issues with the api/ directory structure,
 * this route currently serves as a minimal authentication test endpoint.
 * Full moderation pipeline integration requires restructuring the import paths
 * or moving this file to the src/routes/ directory for proper TypeScript compilation.
 */

// Inline auth middleware to avoid import issues
function requireCronAuth(handler) {
  return async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;
    const clientId = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';

    // Validate auth based on method
    if (req.method === 'GET') {
      // GET requests: validate CRON_SECRET from Authorization: Bearer header (Vercel native)
      const cronSecret = process.env['CRON_SECRET'];
      if (!cronSecret) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid cron secret required',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }

      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid cron secret required',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }

      // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
      const expectedAuth = `Bearer ${cronSecret}`;
      if (authHeader !== expectedAuth) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid cron secret required',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
      console.log(`[Auth] GET request authenticated with Bearer token`);
    } else if (req.method === 'POST') {
      // POST requests: validate API key from header
      const apiKey = process.env['SHADOWFLOWER_API_KEY'];
      if (!apiKey) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid API key required',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }

      const providedKey = req.headers['x-shadowflower-api-key'];
      if (!providedKey || providedKey !== apiKey) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid API key required',
          timestamp: new Date().toISOString(),
          requestId,
        });
        return;
      }
      console.log(`[Auth] POST request authenticated with API key`);
    }

    req.authenticated = true;
    await handler(req, res);
  };
}

async function handler(req, res) {
  // Support GET for Vercel cron execution and POST for manual testing
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET and POST requests are supported',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
    return;
  }

  try {
    // Minimal response to validate authentication works
    // Full moderation pipeline integration requires fixing import resolution
    const response = {
      success: true,
      message: 'Cron authentication validated successfully',
      method: req.method,
      authenticated: req.authenticated,
      timestamp: new Date().toISOString(),
      note: 'Full moderation pipeline pending import resolution fix',
    };

    console.log(`[Scheduler] Auth test passed: ${req.method}, authenticated: ${req.authenticated}`);

    res.status(200).json(response);

  } catch (error) {
    const response = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    };

    console.error('[Scheduler] Handler failed:', error);

    res.status(500).json(response);
  }
}

export default requireCronAuth(handler);
