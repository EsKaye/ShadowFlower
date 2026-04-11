/**
 * Provider registry for managing moderation providers
 */
import { IModerationProvider } from './interface';
import { ProviderConfig } from '../types';
export declare class ProviderRegistry {
    private providers;
    constructor();
    registerProvider(name: string, provider: IModerationProvider): void;
    getProvider(name: string): IModerationProvider | undefined;
    initializeProvider(name: string, config: ProviderConfig): Promise<void>;
    getAvailableProviders(): string[];
    healthCheckAll(): Promise<Record<string, boolean>>;
}
export declare const providerRegistry: ProviderRegistry;
//# sourceMappingURL=registry.d.ts.map