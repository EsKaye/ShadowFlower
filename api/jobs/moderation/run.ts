/**
 * Moderation job API endpoint
 */

import { VercelResponse } from '@vercel/node';
import { ModerationJobRequest, ModerationJobResponse } from '../../../src/types';
import { ModerationPipeline } from '../../../src/jobs/moderation-pipeline';
import { GameDinClient } from '../../../src/lib/gamedin-client';
import { getConfig } from '../../../src/config';
import { requireAuth, AuthenticatedRequest } from '../../../src/security/auth';

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

    // Parse request options
    const options = {
      dryRun: body.dryRun ?? config.moderation.dryRunDefault,
      batchSize: body.batchSize ?? config.moderation.defaultBatchSize,
      provider: body.provider ?? config.moderation.defaultProvider,
      model: body.model ?? config.moderation.defaultModel,
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

    // Run the moderation job
    const result = await pipeline.runJob(options);

    const response: ModerationJobResponse = {
      success: true,
      data: result,
      jobId: result.job.id,
    };

    res.status(200).json(response);

  } catch (error) {
    const response: ModerationJobResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      jobId: 'unknown',
    };

    res.status(500).json(response);
  }
}

export default requireAuth(handler);
