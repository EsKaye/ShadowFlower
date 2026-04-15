/**
 * Configuration management for ShadowFlower service
 */

import { ServiceConfig, EnvironmentConfig, ModerationConfig } from '../types';

/**
 * Validate secret strength
 * Ensures secrets meet minimum security requirements
 */
function validateSecretStrength(secret: string, secretName: string): void {
  const minLength = 32;

  if (secret.length < minLength) {
    throw new Error(
      `${secretName} must be at least ${minLength} characters long (current: ${secret.length})`
    );
  }

  // Check for reasonable complexity (at least two of: lowercase, uppercase, numbers, special chars)
  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /\d/.test(secret);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(secret);

  const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

  if (complexityScore < 2) {
    throw new Error(
      `${secretName} must have at least two of: uppercase, lowercase, numbers, or special characters`
    );
  }
}

function getEnvironmentConfig(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    gamedinBaseUrl: process.env['GAMEDIN_BASE_URL'] || 'https://gamedin.xyz',
    shadowflowerApiKey: process.env['SHADOWFLOWER_API_KEY'] || '',
    shadowflowerSigningSecret: process.env['SHADOWFLOWER_SIGNING_SECRET'] || '',
    nodeEnv: (process.env['NODE_ENV'] as 'development' | 'production') || 'development',
  };

  // Conditionally add optional properties
  if (process.env['NVIDIA_API_KEY']) {
    config.nvidiaApiKey = process.env['NVIDIA_API_KEY'];
  }

  if (process.env['ALLOWED_ORIGIN']) {
    config.allowedOrigin = process.env['ALLOWED_ORIGIN'];
  }

  if (process.env['UPSTASH_REDIS_REST_URL']) {
    config.upstashRedisRestUrl = process.env['UPSTASH_REDIS_REST_URL'];
  }

  if (process.env['UPSTASH_REDIS_REST_TOKEN']) {
    config.upstashRedisRestToken = process.env['UPSTASH_REDIS_REST_TOKEN'];
  }

  if (process.env['GEMINI_API_KEY']) {
    config.geminiApiKey = process.env['GEMINI_API_KEY'];
  }

  if (process.env['ENABLE_DISCORD_INTERACTIONS']) {
    config.enableDiscordInteractions = process.env['ENABLE_DISCORD_INTERACTIONS'] === 'true';
  }
  if (process.env['PORT']) {
    config.port = parseInt(process.env['PORT'], 10);
  }
  if (process.env['GAMEDIN_SIGNING_SECRET']) {
    config.gamedinSigningSecret = process.env['GAMEDIN_SIGNING_SECRET'];
  }

  // Validate required environment variables
  const requiredVars = ['gamedinBaseUrl', 'shadowflowerApiKey', 'shadowflowerSigningSecret'];
  const missingVars = requiredVars.filter(varName => !config[varName as keyof EnvironmentConfig]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate secret strength
  try {
    validateSecretStrength(config.shadowflowerApiKey, 'SHADOWFLOWER_API_KEY');
    validateSecretStrength(config.shadowflowerSigningSecret, 'SHADOWFLOWER_SIGNING_SECRET');
  } catch (error) {
    if (process.env['NODE_ENV'] === 'production') {
      throw error;
    }
    // In development, warn but don't fail
    console.warn(`Secret validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate optional admin key if configured
  if (process.env['SHADOWFLOWER_ADMIN_KEY']) {
    try {
      validateSecretStrength(process.env['SHADOWFLOWER_ADMIN_KEY'], 'SHADOWFLOWER_ADMIN_KEY');
    } catch (error) {
      if (process.env['NODE_ENV'] === 'production') {
        throw error;
      }
      console.warn(`Secret validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate optional Gamedin signing secret if configured
  if (process.env['GAMEDIN_SIGNING_SECRET']) {
    try {
      validateSecretStrength(process.env['GAMEDIN_SIGNING_SECRET'], 'GAMEDIN_SIGNING_SECRET');
    } catch (error) {
      if (process.env['NODE_ENV'] === 'production') {
        throw error;
      }
      console.warn(`Secret validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate SHADOWFLOWER_SIGNING_SECRET as per GameDin contract
  if (process.env['SHADOWFLOWER_SIGNING_SECRET']) {
    try {
      validateSecretStrength(process.env['SHADOWFLOWER_SIGNING_SECRET'], 'SHADOWFLOWER_SIGNING_SECRET');
    } catch (error) {
      if (process.env['NODE_ENV'] === 'production') {
        throw error;
      }
      console.warn(`Secret validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate Discord bot token if configured (production only)
  if (process.env['DISCORD_BOT_TOKEN']) {
    try {
      validateSecretStrength(process.env['DISCORD_BOT_TOKEN'], 'DISCORD_BOT_TOKEN');
    } catch (error) {
      if (process.env['NODE_ENV'] === 'production') {
        throw error;
      }
      console.warn(`Discord bot token validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate Discord public key format if configured
  if (process.env['DISCORD_PUBLIC_KEY']) {
    const publicKey = process.env['DISCORD_PUBLIC_KEY'];
    // Discord public keys are 64 hex characters (32 bytes)
    if (!/^[a-fA-F0-9]{64}$/.test(publicKey)) {
      const error = new Error('DISCORD_PUBLIC_KEY must be a 64-character hex string');
      if (process.env['NODE_ENV'] === 'production') {
        throw error;
      }
      console.warn(`Discord public key validation warning: ${error.message}`);
    }
  }

  // Discord bot configuration (optional)
  if (process.env['DISCORD_APPLICATION_ID']) {
    config.discordApplicationId = process.env['DISCORD_APPLICATION_ID'];
  }
  if (process.env['DISCORD_PUBLIC_KEY']) {
    config.discordPublicKey = process.env['DISCORD_PUBLIC_KEY'];
  }
  if (process.env['DISCORD_BOT_TOKEN']) {
    config.discordBotToken = process.env['DISCORD_BOT_TOKEN'];
  }
  if (process.env['DISCORD_ALLOWED_GUILD_ID']) {
    config.discordAllowedGuildId = process.env['DISCORD_ALLOWED_GUILD_ID'];
  }
  if (process.env['DISCORD_ALLOWED_CHANNEL_IDS']) {
    config.discordAllowedChannelIds = process.env['DISCORD_ALLOWED_CHANNEL_IDS'];
  }
  if (process.env['DISCORD_ALLOWED_ROLE_IDS']) {
    config.discordAllowedRoleIds = process.env['DISCORD_ALLOWED_ROLE_IDS'];
  }
  if (process.env['DISCORD_ALLOWED_USER_IDS']) {
    config.discordAllowedUserIds = process.env['DISCORD_ALLOWED_USER_IDS'];
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
export { getEnvironmentConfig, getModerationConfig, validateSecretStrength };
