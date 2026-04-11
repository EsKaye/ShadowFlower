/**
 * Authentication and security middleware for ShadowFlower service
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { getConfig } from '../config';
import {
  logAuthSuccess,
  logAuthFailure,
  logCorsRejected,
  logAdminAuthSuccess,
  logAdminAuthFailure,
  logRateLimitExceeded,
  logSignatureVerificationSuccess,
  logSignatureVerificationFailure,
} from './audit-logger';
import {
  verifySignature,
  extractSignatureHeaders,
  type SigningConfig,
} from './signing';
import { getRedisService } from '../infrastructure/redis';

export interface AuthenticatedRequest extends VercelRequest {
  authenticated?: boolean;
  requestId?: string;
}

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;
}

/**
 * Get CORS configuration from environment
 */
export function getCorsConfig(): CorsConfig {
  const allowedOrigin = process.env['ALLOWED_ORIGIN'] || 'http://localhost:3000';
  
  return {
    allowedOrigins: allowedOrigin.split(',').map(origin => origin.trim()),
    allowedMethods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-shadowflower-api-key', 'x-shadowflower-admin-key'],
    allowCredentials: false,
  };
}

/**
 * Apply CORS headers to response
 * Returns false if origin is not allowed
 */
export function applyCorsHeaders(req: VercelRequest, res: VercelResponse): boolean {
  const config = getCorsConfig();
  const origin = req.headers['origin'] as string;

  // If no origin header (non-browser request), no CORS needed
  if (!origin) {
    return true;
  }

  // Check if origin is allowed
  if (!config.allowedOrigins.includes(origin)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  
  if (config.allowCredentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  return true;
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

    const clientId = (req.headers['x-forwarded-for'] as string) ||
                     (req.headers['x-real-ip'] as string) ||
                     'unknown';

    // Apply CORS headers - reject if origin not allowed
    if (!applyCorsHeaders(req, res)) {
      const origin = req.headers['origin'] as string;
      if (origin && req.url) {
        logCorsRejected({ requestId, origin, route: req.url });
      }
      res.status(403).json({
        error: 'Forbidden',
        message: 'Origin not allowed',
        timestamp: new Date().toISOString(),
        requestId,
      });
      return;
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Validate API key
    if (!validateApiKey(req)) {
      logAuthFailure({ requestId, clientId, reason: 'Invalid API key' });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid API key required',
        timestamp: new Date().toISOString(),
        requestId,
      });
      return;
    }

    logAuthSuccess({ requestId, clientId });
    req.authenticated = true;
    await handler(req, res);
  };
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 * NOTE: This is a lightweight/dev-grade rate limiter that resets on function restart
 * For production-grade rate limiting, use distributedRateLimit with Redis
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
      const requestId = req.requestId || generateRequestId();
      if (req.url) {
        logRateLimitExceeded({ requestId, clientId, route: req.url });
      } else {
        logRateLimitExceeded({ requestId, clientId });
      }
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
        requestId,
      });
      return;
    }

    clientRequests.count++;
    next();
  };
}

/**
 * Distributed rate limiting middleware using Redis
 * Provides production-grade rate limiting across function instances
 * Falls back to allowing requests if Redis is unavailable
 */
export function distributedRateLimit(options: {
  windowMs: number;
  maxRequests: number;
}) {
  return async (req: AuthenticatedRequest, res: VercelResponse, next: () => void): Promise<void> => {
    const clientId = req.headers['x-forwarded-for'] as string ||
                     req.headers['x-real-ip'] as string ||
                     'unknown';

    const requestId = req.requestId || generateRequestId();
    const redis = getRedisService();

    try {
      const result = await redis.rateLimit(clientId, options.maxRequests, options.windowMs);

      if (!result.allowed) {
        if (req.url) {
          logRateLimitExceeded({ requestId, clientId, route: req.url });
        } else {
          logRateLimitExceeded({ requestId, clientId });
        }
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          timestamp: new Date().toISOString(),
          requestId,
          resetTime: result.resetTime,
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, allow request but log the error
      console.error('[RateLimit] Redis error, allowing request:', error);
      next();
    }
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

/**
 * Validate admin key from request headers
 */
export function validateAdminKey(request: VercelRequest): boolean {
  const adminKey = process.env['SHADOWFLOWER_ADMIN_KEY'];
  const providedKey = request.headers['x-shadowflower-admin-key'];

  // If admin key is not configured, deny access
  if (!adminKey) {
    return false;
  }

  if (!providedKey) {
    return false;
  }

  return providedKey === adminKey;
}

/**
 * Admin gate middleware for protected admin routes
 * Returns 404 instead of 401 if key is invalid to avoid revealing admin endpoints
 */
export function requireAdmin(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    const requestId = generateRequestId();
    req.requestId = requestId;

    const clientId = (req.headers['x-forwarded-for'] as string) ||
                     (req.headers['x-real-ip'] as string) ||
                     'unknown';

    // Apply CORS headers - reject if origin not allowed
    if (!applyCorsHeaders(req, res)) {
      const origin = req.headers['origin'] as string;
      if (origin && req.url) {
        logCorsRejected({ requestId, origin, route: req.url });
      }
      res.status(404).json({
        message: 'Not Found',
      });
      return;
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Validate admin key - return 404 if invalid to avoid revealing admin endpoints
    if (!validateAdminKey(req)) {
      logAdminAuthFailure({ requestId, clientId });
      res.status(404).json({
        message: 'Not Found',
      });
      return;
    }

    logAdminAuthSuccess({ requestId, clientId });
    await handler(req, res);
  };
}

/**
 * Optional HMAC signature verification middleware
 * Verifies HMAC-SHA256 signatures for enhanced inter-service security
 * Returns 401 if signature verification fails
 */
export function requireSignature(
  handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: AuthenticatedRequest, res: VercelResponse): Promise<void> => {
    const requestId = generateRequestId();
    req.requestId = requestId;

    const clientId = (req.headers['x-forwarded-for'] as string) ||
                     (req.headers['x-real-ip'] as string) ||
                     'unknown';

    const signingSecret = process.env['SHADOWFLOWER_SIGNING_SECRET'];

    // If signing secret is not configured, skip signature verification
    if (!signingSecret) {
      await handler(req, res);
      return;
    }

    // Extract signature headers
    const signatureHeaders = extractSignatureHeaders(req);

    // Get request body for signature verification
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

    // Verify signature
    const signingConfig: SigningConfig = {
      secretKey: signingSecret,
      maxTimestampDelta: 5 * 60 * 1000, // 5 minutes
    };

    const verification = await verifySignature(signingConfig, {
      body,
      headers: signatureHeaders,
    });

    if (!verification.valid) {
      const logParams: { requestId: string; clientId: string; reason?: string } = {
        requestId,
        clientId,
      };
      if (verification.reason) {
        logParams.reason = verification.reason;
      }
      logSignatureVerificationFailure(logParams);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid signature',
        timestamp: new Date().toISOString(),
        requestId,
      });
      return;
    }

    logSignatureVerificationSuccess({ requestId, clientId });
    await handler(req, res);
  };
}
