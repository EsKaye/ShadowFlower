/**
 * Health check API endpoint
 * Minimal operational status only - no version or detailed service info exposed
 */
import { GameDinClient } from '../../lib/gamedin-client';
import { providerRegistry } from '../../providers';
import { getConfig } from '../../config';
export default async function handler(_req, res) {
    const startTime = Date.now();
    try {
        const config = getConfig();
        // Check GameDin connectivity using new handshake method
        let gamedinStatus = 'disconnected';
        try {
            const clientConfig = {
                baseUrl: config.environment.gamedinBaseUrl,
                apiKey: config.environment.gamedinShadowflowerApiKey,
                timeout: 5000,
            };
            // Only add signingSecret if it exists
            if (config.environment.shadowflowerSigningSecret) {
                clientConfig.signingSecret = config.environment.shadowflowerSigningSecret;
            }
            const gamedinClient = new GameDinClient(clientConfig);
            // Try the new handshake method
            await gamedinClient.fetchReviewableReports();
            gamedinStatus = 'connected';
        }
        catch (error) {
            gamedinStatus = 'disconnected';
        }
        // Check provider connectivity
        const providerHealth = await providerRegistry.healthCheckAll();
        const providerStatus = Object.values(providerHealth).some(healthy => healthy) ? 'connected' : 'disconnected';
        const response = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                gamedin: gamedinStatus,
                provider: providerStatus,
            },
        };
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.status(200).json(response);
    }
    catch (error) {
        const response = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
                gamedin: 'disconnected',
                provider: 'disconnected',
            },
        };
        res.status(503).json(response);
    }
}
//# sourceMappingURL=health.js.map