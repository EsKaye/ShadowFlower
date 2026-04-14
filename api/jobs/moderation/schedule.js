/**
 * Vercel cron entrypoint for scheduled moderation jobs
 * Thin deployment wrapper that calls the shared moderation pipeline logic
 * Supports GET for Vercel cron execution and POST for manual testing
 */

const { ModerationPipeline } = require('../../lib/jobs/moderation-pipeline');
const { GameDinClient } = require('../../lib/gamedin-client');
const { getConfig } = require('../../lib/config');
const { requireCronAuth } = require('../../lib/security/auth');

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
    const config = getConfig();

    // For GET requests (cron), use config defaults
    // For POST requests, allow body overrides
    let dryRun;
    let batchSize;
    let provider;
    let model;
    let idempotencyKey;
    let skipLock;

    if (req.method === 'POST') {
      const body = req.body || {};

      dryRun = body.dryRun !== undefined ? body.dryRun : config.moderation.dryRunDefault;
      batchSize = body.batchSize !== undefined ? body.batchSize : config.moderation.defaultBatchSize;
      provider = body.provider !== undefined ? body.provider : config.moderation.defaultProvider;
      model = body.model !== undefined ? body.model : config.moderation.defaultModel;
      skipLock = body.skipLock || false;

      // Generate idempotency key from scheduler ID and timestamp if not provided
      if (body.idempotencyKey) {
        idempotencyKey = body.idempotencyKey;
      } else if (body.schedulerId) {
        idempotencyKey = `${body.schedulerId}:${Date.now()}`;
      }
    } else {
      // GET request (cron) - use config defaults
      dryRun = config.moderation.dryRunDefault;
      batchSize = config.moderation.defaultBatchSize;
      provider = config.moderation.defaultProvider;
      model = config.moderation.defaultModel;
      skipLock = false;
      // No idempotency key for cron jobs
    }

    // Validate options
    if (batchSize < 1 || batchSize > 100) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Batch size must be between 1 and 100',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
      return;
    }

    // Initialize GameDin client
    const gamedinClient = new GameDinClient({
      baseUrl: config.environment.gamedinBaseUrl,
      apiKey: config.environment.gamedinShadowflowerApiKey,
      timeout: 30000,
    });

    // Initialize moderation pipeline
    const pipeline = new ModerationPipeline(gamedinClient);

    // Run the moderation job
    const options = {
      dryRun,
      batchSize,
      provider,
      model,
      skipLock,
    };

    if (idempotencyKey) {
      options.idempotencyKey = idempotencyKey;
    }

    const result = await pipeline.runJob(options);

    const response = {
      success: true,
      data: result,
      jobId: result.job.id,
    };

    console.log(`[Scheduler] Job completed: ${result.job.id}, items: ${result.summary.totalProcessed}, dryRun: ${dryRun}`);

    res.status(200).json(response);

  } catch (error) {
    const response = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      jobId: 'unknown',
    };

    console.error('[Scheduler] Job failed:', error);

    res.status(500).json(response);
  }
}

// Apply cron-safe auth middleware for protection
// GET requests: validates CRON_SECRET from Authorization: Bearer header
// POST requests: validates API key from header
module.exports = requireCronAuth(handler);
