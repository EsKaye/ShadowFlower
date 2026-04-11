/**
 * Provider abstraction interface for AI moderation providers
 */
import { ModerationItem, ProviderResponse, ProviderConfig } from '../types';
export interface IModerationProvider {
    /**
     * Initialize the provider with configuration
     */
    initialize(config: ProviderConfig): Promise<void>;
    /**
     * Analyze a single moderation item
     */
    analyzeItem(item: ModerationItem): Promise<ProviderResponse>;
    /**
     * Analyze multiple moderation items in batch
     */
    analyzeBatch(items: ModerationItem[]): Promise<ProviderResponse[]>;
    /**
     * Check if the provider is healthy and ready
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get provider name and capabilities
     */
    getProviderInfo(): {
        name: string;
        models: string[];
        maxBatchSize: number;
        supportedTypes: string[];
    };
}
//# sourceMappingURL=interface.d.ts.map