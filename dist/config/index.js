/**
 * Configuration management for ShadowFlower service
 */
/**
 * Validate secret strength
 * Ensures secrets meet minimum security requirements
 */
function validateSecretStrength(secret, secretName) {
    const minLength = 32;
    const hasUpperCase = /[A-Z]/.test(secret);
    const hasLowerCase = /[a-z]/.test(secret);
    const hasNumbers = /\d/.test(secret);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(secret);
    if (secret.length < minLength) {
        throw new Error(`${secretName} must be at least ${minLength} characters long (current: ${secret.length})`);
    }
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new Error(`${secretName} must contain uppercase, lowercase, numbers, and special characters`);
    }
}
function getEnvironmentConfig() {
    const config = {
        gamedinBaseUrl: process.env['GAMEDIN_BASE_URL'] || '',
        shadowflowerApiKey: process.env['SHADOWFLOWER_API_KEY'] || '',
        gamedinShadowflowerApiKey: process.env['GAMEDIN_SHADOWFLOWER_API_KEY'] || '',
        nodeEnv: process.env['NODE_ENV'] || 'development',
    };
    // Conditionally add optional properties
    if (process.env['GEMINI_API_KEY']) {
        config.geminiApiKey = process.env['GEMINI_API_KEY'];
    }
    if (process.env['PORT']) {
        config.port = parseInt(process.env['PORT'], 10);
    }
    if (process.env['UPSTASH_REDIS_REST_URL']) {
        config.upstashRedisRestUrl = process.env['UPSTASH_REDIS_REST_URL'];
    }
    if (process.env['UPSTASH_REDIS_REST_TOKEN']) {
        config.upstashRedisRestToken = process.env['UPSTASH_REDIS_REST_TOKEN'];
    }
    if (process.env['GAMEDIN_SIGNING_SECRET']) {
        config.gamedinSigningSecret = process.env['GAMEDIN_SIGNING_SECRET'];
    }
    // Validate required environment variables
    const requiredVars = ['gamedinBaseUrl', 'shadowflowerApiKey', 'gamedinShadowflowerApiKey'];
    const missingVars = requiredVars.filter(varName => !config[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    // Validate secret strength
    try {
        validateSecretStrength(config.shadowflowerApiKey, 'SHADOWFLOWER_API_KEY');
        validateSecretStrength(config.gamedinShadowflowerApiKey, 'GAMEDIN_SHADOWFLOWER_API_KEY');
    }
    catch (error) {
        if (process.env['NODE_ENV'] === 'production') {
            throw error;
        }
        // In development, warn but don't fail
        console.warn(`Secret validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    // Validate optional signing secret if configured
    if (process.env['SHADOWFLOWER_SIGNING_SECRET']) {
        try {
            validateSecretStrength(process.env['SHADOWFLOWER_SIGNING_SECRET'], 'SHADOWFLOWER_SIGNING_SECRET');
        }
        catch (error) {
            if (process.env['NODE_ENV'] === 'production') {
                throw error;
            }
            console.warn(`Secret validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Validate optional admin key if configured
    if (process.env['SHADOWFLOWER_ADMIN_KEY']) {
        try {
            validateSecretStrength(process.env['SHADOWFLOWER_ADMIN_KEY'], 'SHADOWFLOWER_ADMIN_KEY');
        }
        catch (error) {
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
        }
        catch (error) {
            if (process.env['NODE_ENV'] === 'production') {
                throw error;
            }
            console.warn(`Secret validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
function getModerationConfig() {
    return {
        defaultBatchSize: parseInt(process.env['DEFAULT_BATCH_SIZE'] || '10', 10),
        defaultProvider: process.env['DEFAULT_PROVIDER'] || 'gemini',
        defaultModel: process.env['DEFAULT_MODEL'] || 'gemini-1.5-flash',
        providerTimeout: parseInt(process.env['PROVIDER_TIMEOUT'] || '30000', 10),
        maxRetries: parseInt(process.env['MAX_RETRIES'] || '3', 10),
        dryRunDefault: process.env['DRY_RUN_DEFAULT'] === 'true',
    };
}
export function getConfig() {
    return {
        environment: getEnvironmentConfig(),
        moderation: getModerationConfig(),
    };
}
// Export individual configs for convenience
export { getEnvironmentConfig, getModerationConfig, validateSecretStrength };
//# sourceMappingURL=index.js.map