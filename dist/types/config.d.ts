/**
 * Configuration types for ShadowFlower service
 */
export interface EnvironmentConfig {
    gamedinBaseUrl: string;
    shadowflowerApiKey: string;
    gamedinShadowflowerApiKey: string;
    geminiApiKey?: string;
    nodeEnv: 'development' | 'production';
    port?: number;
}
export interface ModerationConfig {
    defaultBatchSize: number;
    defaultProvider: string;
    defaultModel: string;
    providerTimeout: number;
    maxRetries: number;
    dryRunDefault: boolean;
}
export interface ServiceConfig {
    environment: EnvironmentConfig;
    moderation: ModerationConfig;
}
//# sourceMappingURL=config.d.ts.map