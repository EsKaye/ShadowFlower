/**
 * Health check API endpoint
 * Minimal operational status only - no version or detailed service info exposed
 */
import { GameDinClient } from '../dist/lib/gamedin-client';
import { getConfig } from '../dist/config';

export default async function handler(_req, res) {
    const startTime = Date.now();
    try {
        const config = getConfig();
        // Check GameDin connectivity using health check method
        let gamedinStatus = 'disconnected';
        try {
            const clientConfig = {
                baseUrl: config.environment.gamedinBaseUrl,
                signingSecret: config.environment.shadowflowerSigningSecret,
                timeout: 5000,
            };
            const gamedinClient = new GameDinClient(clientConfig);
            // Use health check method to test GameDin connectivity
            const isHealthy = await gamedinClient.healthCheck();
            gamedinStatus = isHealthy ? 'connected' : 'disconnected';
        }
        catch (error) {
            gamedinStatus = 'disconnected';
        }
        const response = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                gamedin: gamedinStatus,
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
            },
        };
        res.status(503).json(response);
    }
}