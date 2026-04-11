/**
 * Moderation job pipeline for processing content
 */
// Simple UUID generator using crypto
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
import { providerRegistry } from '../providers';
import { getConfig } from '../config';
import { DiscordNotifier } from '../notifications/discord';
import { getRedisService } from '../infrastructure/redis';
export class ModerationPipeline {
    gamedinClient;
    config = getConfig();
    discordNotifier = null;
    constructor(gamedinClient) {
        this.gamedinClient = gamedinClient;
        // Initialize Discord notifier if webhook URL is configured
        const webhookUrl = process.env['DISCORD_WEBHOOK_URL'];
        if (webhookUrl) {
            this.discordNotifier = new DiscordNotifier({ webhookUrl });
        }
    }
    /**
     * Run a moderation job
     */
    async runJob(options = {}) {
        const jobId = generateUUID();
        const startedAt = new Date().toISOString();
        const { dryRun = this.config.moderation.dryRunDefault, batchSize = this.config.moderation.defaultBatchSize, provider = this.config.moderation.defaultProvider, model = this.config.moderation.defaultModel, idempotencyKey, skipLock = false, } = options;
        const redis = getRedisService();
        let lockAcquired = false;
        let lockId;
        try {
            // Check idempotency if key provided
            if (idempotencyKey) {
                const idempotencyCheck = await redis.checkIdempotency(idempotencyKey);
                if (idempotencyCheck.processed && idempotencyCheck.result) {
                    console.log(`[${jobId}] Idempotency check passed - returning cached result`);
                    return JSON.parse(idempotencyCheck.result);
                }
            }
            // Acquire job lock if not skipped
            if (!skipLock) {
                const lockResult = await redis.acquireLock('moderation:job', 300); // 5 minute lock
                if (!lockResult.acquired) {
                    throw new Error('Moderation job already in progress - lock held');
                }
                lockAcquired = true;
                lockId = lockResult.lockId;
                console.log(`[${jobId}] Job lock acquired`);
            }
            console.log(`[${jobId}] Starting moderation job with provider: ${provider}, model: ${model}, dryRun: ${dryRun}`);
            // Fetch moderation items from GameDin
            const queue = await this.gamedinClient.fetchModerationQueue({
                limit: batchSize,
            });
            if (queue.items.length === 0) {
                const emptyOutput = this.createEmptyOutput(jobId, startedAt, provider, model, dryRun);
                // Cache result for idempotency
                if (idempotencyKey) {
                    await redis.markProcessed(idempotencyKey, JSON.stringify(emptyOutput));
                }
                return emptyOutput;
            }
            // Initialize provider
            const providerInstance = providerRegistry.getProvider(provider);
            if (!providerInstance) {
                throw new Error(`Provider '${provider}' not found`);
            }
            const providerConfig = {
                apiKey: this.getProviderApiKey(provider),
                model,
                timeout: this.config.moderation.providerTimeout,
                maxRetries: this.config.moderation.maxRetries,
            };
            await providerRegistry.initializeProvider(provider, providerConfig);
            // Process items
            const results = await this.processItems(queue.items, providerInstance);
            // Send results back to GameDin (unless dry run)
            if (!dryRun) {
                await this.sendResultsToGameDin(results, jobId, startedAt, provider, model);
            }
            const completedAt = new Date().toISOString();
            const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
            const output = {
                results,
                summary: this.calculateSummary(results),
                job: {
                    id: jobId,
                    startedAt,
                    completedAt,
                    duration,
                    provider,
                    model,
                    dryRun,
                },
            };
            // Send Discord notification for batch completion
            if (this.discordNotifier && !dryRun) {
                const summary = this.calculateSummary(results);
                await this.discordNotifier.notifyBatchCompleted({
                    jobId,
                    itemsProcessed: summary.totalProcessed,
                    itemsApproved: summary.approved,
                    itemsReviewed: summary.needsReview,
                    itemsEscalated: summary.escalated,
                    duration,
                }).catch((err) => {
                    console.error('Failed to send Discord batch completion notification:', err);
                });
            }
            // Cache result for idempotency
            if (idempotencyKey) {
                await redis.markProcessed(idempotencyKey, JSON.stringify(output));
            }
            return output;
        }
        catch (error) {
            console.error(`[${jobId}] Moderation job failed:`, error);
            // Send Discord notification for batch failure
            if (this.discordNotifier) {
                await this.discordNotifier.notifyBatchFailed({
                    jobId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    itemsProcessed: 0,
                }).catch((err) => {
                    console.error('Failed to send Discord batch failure notification:', err);
                });
            }
            throw error;
        }
        finally {
            // Release lock if acquired
            if (lockAcquired && lockId) {
                await redis.releaseLock('moderation:job', lockId);
                console.log(`[${jobId}] Job lock released`);
            }
        }
    }
    /**
     * Process moderation items through the provider
     */
    async processItems(items, provider) {
        const results = [];
        for (const item of items) {
            try {
                const providerResponse = await provider.analyzeItem(item);
                const result = {
                    itemId: item.id,
                    aiSummary: providerResponse.summary,
                    aiReason: providerResponse.reasoning,
                    aiConfidence: providerResponse.confidence,
                    aiRecommendedAction: providerResponse.recommendedAction,
                    aiEscalateToAdmin: providerResponse.escalateToAdmin,
                    aiProvider: provider.getProviderInfo().name,
                    aiModel: provider.getProviderInfo().models[0],
                    processedAt: new Date().toISOString(),
                    severity: providerResponse.severity,
                    categories: providerResponse.categories,
                };
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to process item ${item.id}:`, error);
                // Add a failed result
                results.push(this.createFailedResult(item.id, error instanceof Error ? error.message : 'Unknown error'));
            }
        }
        return results;
    }
    /**
     * Send moderation results back to GameDin
     */
    async sendResultsToGameDin(results, jobId, startedAt, provider, model) {
        const payload = {
            results,
            job: {
                id: jobId,
                startedAt,
                completedAt: new Date().toISOString(),
                duration: new Date().getTime() - new Date(startedAt).getTime(),
                provider,
                model,
                dryRun: false,
            },
            sentAt: new Date().toISOString(),
        };
        await this.gamedinClient.sendAdvisoryResults(payload);
    }
    /**
     * Calculate summary statistics
     */
    calculateSummary(results) {
        return results.reduce((acc, result) => {
            acc.totalProcessed++;
            switch (result.aiRecommendedAction) {
                case 'approve':
                    acc.approved++;
                    break;
                case 'escalate':
                    acc.escalated++;
                    break;
                case 'remove':
                    acc.removed++;
                    break;
                case 'review':
                default:
                    acc.needsReview++;
                    break;
            }
            return acc;
        }, {
            totalProcessed: 0,
            approved: 0,
            escalated: 0,
            removed: 0,
            needsReview: 0,
        });
    }
    /**
     * Create empty output for no items
     */
    createEmptyOutput(jobId, startedAt, provider, model, dryRun) {
        const completedAt = new Date().toISOString();
        const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
        return {
            results: [],
            summary: {
                totalProcessed: 0,
                approved: 0,
                escalated: 0,
                removed: 0,
                needsReview: 0,
            },
            job: {
                id: jobId,
                startedAt,
                completedAt,
                duration,
                provider,
                model,
                dryRun,
            },
        };
    }
    /**
     * Create failed result for processing errors
     */
    createFailedResult(itemId, error) {
        return {
            itemId,
            aiSummary: `Processing failed: ${error}`,
            aiReason: 'Unable to analyze content due to system error',
            aiConfidence: 0,
            aiRecommendedAction: 'review',
            aiEscalateToAdmin: true,
            aiProvider: 'shadowflower',
            aiModel: 'error',
            processedAt: new Date().toISOString(),
            severity: 'medium',
            categories: {
                harassment: false,
                hate: false,
                violence: false,
                sexual: false,
                spam: false,
                misinformation: false,
            },
        };
    }
    /**
     * Get API key for the specified provider
     */
    getProviderApiKey(provider) {
        switch (provider.toLowerCase()) {
            case 'gemini':
                if (!this.config.environment.geminiApiKey) {
                    throw new Error('Gemini API key not configured');
                }
                return this.config.environment.geminiApiKey;
            default:
                throw new Error(`No API key configured for provider: ${provider}`);
        }
    }
}
//# sourceMappingURL=moderation-pipeline.js.map