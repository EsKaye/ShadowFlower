/**
 * Moderation job pipeline for processing content
 */
import { ModerationOutput } from '../types';
import { GameDinClient } from '../lib/gamedin-client';
export interface ModerationJobOptions {
    dryRun?: boolean;
    batchSize?: number;
    provider?: string;
    model?: string;
    idempotencyKey?: string;
    skipLock?: boolean;
}
export declare class ModerationPipeline {
    private gamedinClient;
    private config;
    private discordNotifier;
    constructor(gamedinClient: GameDinClient);
    /**
     * Run a moderation job
     */
    runJob(options?: ModerationJobOptions): Promise<ModerationOutput>;
    /**
     * Process moderation items through the provider
     */
    private processItems;
    /**
     * Send moderation results back to GameDin
     */
    private sendResultsToGameDin;
    /**
     * Calculate summary statistics
     */
    private calculateSummary;
    /**
     * Create empty output for no items
     */
    private createEmptyOutput;
    /**
     * Create failed result for processing errors
     */
    private createFailedResult;
    /**
     * Get API key for the specified provider
     */
    private getProviderApiKey;
}
//# sourceMappingURL=moderation-pipeline.d.ts.map