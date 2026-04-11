/**
 * Configuration management for ShadowFlower service
 */

import { ServiceConfig, EnvironmentConfig, ModerationConfig } from '../types';

function getEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    gamedinBaseUrl: process.env['GAMEDIN_BASE_URL'] || '',
    shadowflowerApiKey: process.env['SHADOWFLOWER_API_KEY'] || '',
    gamedinShadowflowerApiKey: process.env['GAMEDIN_SHADOWFLOWER_API_KEY'] || '',
    geminiApiKey: process.env['GEMINI_API_KEY'],
    nodeEnv: (process.env['NODE_ENV'] as 'development' | 'production') || 'development',
    port: process.env['PORT'] ? parseInt(process.env['PORT'], 10) : undefined,
  };

  // Validate required environment variables
  const requiredVars = ['gamedinBaseUrl', 'shadowflowerApiKey', 'gamedinShadowflowerApiKey'];
  const missingVars = requiredVars.filter(varName => !config[varName as keyof EnvironmentConfig]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return config;
}

function getModerationConfig(): ModerationConfig {
  return {
    defaultBatchSize: parseInt(process.env['DEFAULT_BATCH_SIZE'] || '10', 10),
    defaultProvider: process.env['DEFAULT_PROVIDER'] || 'gemini',
    defaultModel: process.env['DEFAULT_MODEL'] || 'gemini-1.5-flash',
    providerTimeout: parseInt(process.env['PROVIDER_TIMEOUT'] || '30000', 10),
    maxRetries: parseInt(process.env['MAX_RETRIES'] || '3', 10),
    dryRunDefault: process.env['DRY_RUN_DEFAULT'] === 'true',
  };
}

export function getConfig(): ServiceConfig {
  return {
    environment: getEnvironmentConfig(),
    moderation: getModerationConfig(),
  };
}

// Export individual configs for convenience
export { getEnvironmentConfig, getModerationConfig };
