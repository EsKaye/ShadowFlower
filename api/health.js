/**
 * Health check API endpoint
 * Minimal operational status only - no version or detailed service info exposed
 */

export default async function handler(_req, res) {
  const startTime = Date.now();

  try {
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        gamedin: 'connected',
        provider: 'connected',
      },
    };

    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.status(200).json(response);

  } catch (error) {
    const response = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        gamedin: 'disconnected',
        provider: 'disconnected',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    res.status(503).json(response);
  }
}
