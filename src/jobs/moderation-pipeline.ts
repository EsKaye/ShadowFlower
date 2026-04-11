/**
 * Moderation job pipeline for processing content
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ModerationItem, 
  ModerationInput, 
  ModerationOutput, 
  ModerationResult,
  ProviderConfig 
} from '../types';
import { GameDinClient } from '../lib/gamedin-client';
import { providerRegistry } from '../providers';
import { getConfig } from '../config';

export interface ModerationJobOptions {
  dryRun?: boolean;
  batchSize?: number;
  provider?: string;
  model?: string;
}

export class ModerationPipeline {
  private gamedinClient: GameDinClient;
  private config = getConfig();

  constructor(gamedinClient: GameDinClient) {
    this.gamedinClient = gamedinClient;
  }

  /**
   * Run a moderation job
   */
  async runJob(options: ModerationJobOptions = {}): Promise<ModerationOutput> {
    const jobId = uuidv4();
    const startedAt = new Date().toISOString();
    
    const {
      dryRun = this.config.moderation.dryRunDefault,
      batchSize = this.config.moderation.defaultBatchSize,
      provider = this.config.moderation.defaultProvider,
      model = this.config.moderation.defaultModel,
    } = options;

    console.log(`Starting moderation job ${jobId} with provider: ${provider}, model: ${model}, dryRun: ${dryRun}`);

    try {
      // Fetch moderation items from GameDin
      const queue = await this.gamedinClient.fetchModerationQueue({
        limit: batchSize,
      });

      if (queue.items.length === 0) {
        return this.createEmptyOutput(jobId, startedAt, provider, model, dryRun);
      }

      // Initialize provider
      const providerInstance = providerRegistry.getProvider(provider);
      if (!providerInstance) {
        throw new Error(`Provider '${provider}' not found`);
      }

      const providerConfig: ProviderConfig = {
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

      return {
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

    } catch (error) {
      console.error(`Moderation job ${jobId} failed:`, error);
      throw error;
    }
  }

  /**
   * Process moderation items through the provider
   */
  private async processItems(
    items: ModerationItem[], 
    provider: any
  ): Promise<ModerationResult[]> {
    const results: ModerationResult[] = [];

    for (const item of items) {
      try {
        const providerResponse = await provider.analyzeItem(item);
        const result: ModerationResult = {
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
      } catch (error) {
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
  private async sendResultsToGameDin(
    results: ModerationResult[],
    jobId: string,
    startedAt: string,
    provider: string,
    model: string
  ): Promise<void> {
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
  private calculateSummary(results: ModerationResult[]) {
    return results.reduce(
      (acc, result) => {
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
      },
      {
        totalProcessed: 0,
        approved: 0,
        escalated: 0,
        removed: 0,
        needsReview: 0,
      }
    );
  }

  /**
   * Create empty output for no items
   */
  private createEmptyOutput(
    jobId: string,
    startedAt: string,
    provider: string,
    model: string,
    dryRun: boolean
  ): ModerationOutput {
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
  private createFailedResult(itemId: string, error: string): ModerationResult {
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
  private getProviderApiKey(provider: string): string {
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
