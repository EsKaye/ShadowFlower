/**
 * Dry-run moderation job API endpoint
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
        // Parse request options (always force dryRun = true)
        const options = {
            dryRun: true,
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
        // Run the moderation job in dry-run mode
        const result = await pipeline.runJob(options);
        const response = {
            success: true,
            data: result,
            jobId: result.job.id,
        };
        res.status(200).json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            jobId: 'unknown',
        };
        res.status(500).json(response);
    }
}
export default requireAuth(handler);
//# sourceMappingURL=dry-run.js.map