/**
 * Health check API endpoint
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { HealthResponse } from '../src/types';
import { GameDinClient } from '../src/lib/gamedin-client';
import { providerRegistry } from '../src/providers';
import { getConfig } from '../src/config';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const startTime = Date.now();
  
  try {
    const config = getConfig();
    const uptime = process.uptime ? Math.floor(process.uptime()) : 0;

    // Check GameDin connectivity
    let gamedinStatus: 'connected' | 'disconnected' = 'disconnected';
    try {
      const gamedinClient = new GameDinClient({
        baseUrl: config.environment.gamedinBaseUrl,
        apiKey: config.environment.gamedinShadowflowerApiKey,
        timeout: 5000,
      });
      
      gamedinStatus = await gamedinClient.healthCheck() ? 'connected' : 'disconnected';
    } catch (error) {
      gamedinStatus = 'disconnected';
    }

    // Check provider connectivity
    const providerHealth = await providerRegistry.healthCheckAll();
    const providerStatus = Object.values(providerHealth).some(healthy => healthy) ? 'connected' : 'disconnected';

    const response: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime,
      services: {
        gamedin: gamedinStatus,
        provider: providerStatus,
      },
    };

    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.status(200).json(response);

  } catch (error) {
    const response: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime ? Math.floor(process.uptime()) : 0,
      services: {
        gamedin: 'disconnected',
        provider: 'disconnected',
      },
    };

    res.status(503).json(response);
  }
}
