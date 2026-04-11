/**
 * Full reindex moderation job API endpoint
 * WARNING: This performs a full database reindex and should be used with caution
 * Protected route for manual full reindex operations
 */

import { VercelResponse } from '@vercel/node';
import { ModerationJobRequest, ModerationJobResponse } from '../../../../types';
import { ModerationPipeline } from '../../../../jobs/moderation-pipeline';
import { GameDinClient } from '../../../../lib/gamedin-client';
import { getConfig } from '../../../../config';
import { requireAuth, AuthenticatedRequest } from '../../../../security/auth';

async function handler(req: AuthenticatedRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
    return;
  }

  try {
    const body = req.body as ModerationJobRequest;
    const config = getConfig();

    // Parse request options - force full reindex mode
    const options = {
      dryRun: body.dryRun ?? config.moderation.dryRunDefault,
      batchSize: body.batchSize ?? config.moderation.defaultBatchSize,
      provider: body.provider ?? config.moderation.defaultProvider,
      model: body.model ?? config.moderation.defaultModel,
      fullReindex: true, // Force full reindex mode
    };

    // Validate options
    if (options.batchSize < 1 || options.batchSize > 100) {
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

    // Run the full reindex moderation job
    const result = await pipeline.runJob(options);

    const response: ModerationJobResponse = {
      success: true,
      data: result,
      jobId: result.job.id,
    };

    console.log(`[Full Reindex] Job completed: ${result.job.id}, items: ${result.summary.totalProcessed}`);

    res.status(200).json(response);

  } catch (error) {
    const response: ModerationJobResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      jobId: 'unknown',
    };

    console.error('[Full Reindex] Job failed:', error);

    res.status(500).json(response);
  }
}

// Apply auth middleware for protection
export default requireAuth(handler);
