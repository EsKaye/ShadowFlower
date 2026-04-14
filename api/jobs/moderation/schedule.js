/**
 * Vercel cron entrypoint for scheduled moderation jobs
 * Thin deployment wrapper that calls the shared moderation pipeline logic
 * Supports GET for Vercel cron execution and POST for manual testing
 */

import { requireCronAuth } from '../../security/auth';

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
    // Minimal test response to diagnose runtime issues
    const response = {
      success: true,
      message: 'Cron route is working with auth',
      method: req.method,
      authenticated: req.authenticated,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Scheduler] Test handler executed: ${req.method}, authenticated: ${req.authenticated}`);

    res.status(200).json(response);

  } catch (error) {
    const response = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    };

    console.error('[Scheduler] Test handler failed:', error);

    res.status(500).json(response);
  }
}

export default requireCronAuth(handler);
