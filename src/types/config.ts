/**
 * Configuration types for ShadowFlower service
 */

export interface EnvironmentConfig {
  gamedinBaseUrl: string;
  shadowflowerApiKey: string;
  gamedinShadowflowerApiKey: string;
  nvidiaApiKey?: string;
  nodeEnv: 'development' | 'production';
  port?: number;
  upstashRedisRestUrl?: string;
  upstashRedisRestToken?: string;
  gamedinSigningSecret?: string;
  // Feature flags
  enableDiscordInteractions?: boolean;
  // Discord bot/app configuration
  discordApplicationId?: string;
  discordPublicKey?: string;
  discordBotToken?: string;
  discordAllowedGuildId?: string;
  discordAllowedChannelIds?: string;
  discordAllowedRoleIds?: string;
  discordAllowedUserIds?: string;
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
