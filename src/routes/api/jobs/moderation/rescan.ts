/**
 * Targeted rescan moderation job API endpoint
 * Allows rescanning specific items or applying incremental filters
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
    const body = req.body as ModerationJobRequest & {
      unscanned?: boolean;
      changedSince?: string;
      reportedSince?: string;
    };
    const config = getConfig();

    // Parse request options
    const options: {
      dryRun: boolean;
      batchSize: number;
      provider: string;
      model: string;
      unscanned?: boolean;
      changedSince?: string;
      reportedSince?: string;
    } = {
      dryRun: body.dryRun ?? config.moderation.dryRunDefault,
      batchSize: body.batchSize ?? config.moderation.defaultBatchSize,
      provider: body.provider ?? config.moderation.defaultProvider,
      model: body.model ?? config.moderation.defaultModel,
    };

    // Add optional parameters only if provided
    if (body.unscanned !== undefined) {
      options.unscanned = body.unscanned;
    }
    if (body.changedSince !== undefined) {
      options.changedSince = body.changedSince;
    }
    if (body.reportedSince !== undefined) {
      options.reportedSince = body.reportedSince;
    }

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

    // Run the targeted rescan moderation job
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

// Apply auth middleware for protection
export default requireAuth(handler);
