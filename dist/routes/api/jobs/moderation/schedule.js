/**
 * Scheduler-triggered moderation job endpoint
 * Supports both Vercel cron and external schedulers (e.g., QStash)
 * Scheduler-agnostic - can be called by any authorized scheduler
 */
import { ModerationPipeline } from '../../../../jobs/moderation-pipeline';
import { GameDinClient } from '../../../../lib/gamedin-client';
import { getConfig } from '../../../../config';
import { requireAuth } from '../../../../security/auth';
async function handler(req, res) {
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
        const body = req.body;
        const config = getConfig();
        // Generate idempotency key from scheduler ID and timestamp if not provided
        let idempotencyKey;
        if (body.idempotencyKey) {
            idempotencyKey = body.idempotencyKey;
        }
        else if (body.schedulerId) {
            idempotencyKey = `${body.schedulerId}:${Date.now()}`;
        }
        // Parse request options
        const options = {
            dryRun: body.dryRun ?? config.moderation.dryRunDefault,
            batchSize: body.batchSize ?? config.moderation.defaultBatchSize,
            provider: body.provider ?? config.moderation.defaultProvider,
            model: body.model ?? config.moderation.defaultModel,
            skipLock: body.skipLock ?? false,
        };
        if (idempotencyKey) {
            options.idempotencyKey = idempotencyKey;
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
        // Run the moderation job
        const result = await pipeline.runJob(options);
        const response = {
            success: true,
            data: result,
            jobId: result.job.id,
        };
        console.log(`[Scheduler] Job completed: ${result.job.id}, items: ${result.summary.totalProcessed}`);
        res.status(200).json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            jobId: 'unknown',
        };
        console.error('[Scheduler] Job failed:', error);
        res.status(500).json(response);
    }
}
// Apply auth middleware for scheduler protection
// Note: Distributed rate limiting can be added here using distributedRateLimit middleware
export default requireAuth(handler);
//# sourceMappingURL=schedule.js.map