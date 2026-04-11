/**
 * Authentication and security middleware for ShadowFlower service
 */
import { getConfig } from '../config';
/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Validate API key from request headers
 */
export function validateApiKey(request) {
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
export function requireAuth(handler) {
    return async (req, res) => {
        const requestId = generateRequestId();
        req.requestId = requestId;
        // Add CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
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
export function rateLimit(options) {
    const requests = new Map();
    return (req, res, next) => {
        const clientId = req.headers['x-forwarded-for'] ||
            req.headers['x-real-ip'] ||
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
export function requestLogger(req, res, next) {
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
export function errorHandler(error, req, res, _next) {
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
//# sourceMappingURL=auth.js.map