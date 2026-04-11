/**
 * Authentication and security middleware for ShadowFlower service
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { getConfig } from '../config';

export interface AuthenticatedRequest extends VercelRequest {
  authenticated?: boolean;
  requestId?: string;
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate API key from request headers
 */
export function validateApiKey(request: VercelRequest): boolean {
  const config = getConfig();
  const providedKey = request.headers['x-shadowflower-api-key'];
  
  if (!providedKey) {
    return false;
  }

  return providedKey === config.environment.shadowflowerApiKey;
}

/**
 * Authentication middleware for protected routes
 */
export function requireAuth(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    const requestId = generateRequestId();
    req.requestId = requestId;

    // Add CORS headers - restrict to specific origin in production
    const allowedOrigin = process.env['ALLOWED_ORIGIN'] || 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-shadowflower-api-key');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Validate API key
    if (!validateApiKey(req)) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid API key required',
        timestamp: new Date().toISOString(),
        requestId,
      });
      return;
    }

    req.authenticated = true;
    await handler(req, res);
  };
}

/**
 * Rate limiting middleware (simple implementation)
 */
export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
}) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: VercelResponse, next: () => void): void => {
    const clientId = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     'unknown';
    
    const now = Date.now();
    const clientRequests = requests.get(clientId);

    if (!clientRequests || now > clientRequests.resetTime) {
      requests.set(clientId, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      next();
      return;
    }

    if (clientRequests.count >= options.maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
      return;
    }

    clientRequests.count++;
    next();
  };
}

/**
 * Request logging middleware
 */
export function requestLogger(req: AuthenticatedRequest, res: VercelResponse, next: () => void): void {
  const start = Date.now();
  const requestId = req.requestId || generateRequestId();

  console.log(`[${requestId}] ${req.method} ${req.url} - Started`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${requestId}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(
  error: Error,
  req: AuthenticatedRequest,
  res: VercelResponse,
  _next: (err?: Error) => void
): void {
  const requestId = req.requestId || generateRequestId();
  
  console.error(`[${requestId}] Error:`, error);

  // Don't expose internal error details in production
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'An error occurred while processing your request',
    timestamp: new Date().toISOString(),
    requestId,
  });
}
