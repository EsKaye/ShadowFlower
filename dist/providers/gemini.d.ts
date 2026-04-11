/**
 * Gemini AI provider implementation for moderation
 */
import { IModerationProvider } from './interface';
import { ModerationItem, ProviderResponse, ProviderConfig } from '../types';
export declare class GeminiProvider implements IModerationProvider {
    private config;
    private readonly baseUrl;
    initialize(config: ProviderConfig): Promise<void>;
    analyzeItem(item: ModerationItem): Promise<ProviderResponse>;
    analyzeBatch(items: ModerationItem[]): Promise<ProviderResponse[]>;
    healthCheck(): Promise<boolean>;
    getProviderInfo(): {
        name: string;
        models: string[];
        maxBatchSize: number;
        supportedTypes: string[];
    };
    private buildModerationPrompt;
    private parseResponse;
    private validateAction;
    private validateSeverity;
    private createDefaultResponse;
}
//# sourceMappingURL=gemini.d.ts.map