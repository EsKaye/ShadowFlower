/**
 * Authentication and security middleware for ShadowFlower service
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
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
export declare function getCorsConfig(): CorsConfig;
/**
 * Apply CORS headers to response
 * Returns false if origin is not allowed
 */
export declare function applyCorsHeaders(req: VercelRequest, res: VercelResponse): boolean;
/**
 * Generate a unique request ID for tracking
 */
export declare function generateRequestId(): string;
/**
 * Validate API key from request headers
 */
export declare function validateApiKey(request: VercelRequest): boolean;
/**
 * Authentication middleware for protected routes
 */
export declare function requireAuth(handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void> | void): (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>;
/**
 * Rate limiting middleware (simple in-memory implementation)
 * NOTE: This is a lightweight/dev-grade rate limiter that resets on function restart
 * For production-grade rate limiting, use distributedRateLimit with Redis
 */
export declare function rateLimit(options: {
    windowMs: number;
    maxRequests: number;
}): (req: AuthenticatedRequest, res: VercelResponse, next: () => void) => void;
/**
 * Distributed rate limiting middleware using Redis
 * Provides production-grade rate limiting across function instances
 * Falls back to allowing requests if Redis is unavailable
 */
export declare function distributedRateLimit(options: {
    windowMs: number;
    maxRequests: number;
}): (req: AuthenticatedRequest, res: VercelResponse, next: () => void) => Promise<void>;
/**
 * Request logging middleware
 */
export declare function requestLogger(req: AuthenticatedRequest, res: VercelResponse, next: () => void): void;
/**
 * Error handling middleware
 */
export declare function errorHandler(error: Error, req: AuthenticatedRequest, res: VercelResponse, _next: (err?: Error) => void): void;
/**
 * Validate admin key from request headers
 */
export declare function validateAdminKey(request: VercelRequest): boolean;
/**
 * Admin gate middleware for protected admin routes
 * Returns 404 instead of 401 if key is invalid to avoid revealing admin endpoints
 */
export declare function requireAdmin(handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void> | void): (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>;
/**
 * Optional HMAC signature verification middleware
 * Verifies HMAC-SHA256 signatures for enhanced inter-service security
 * Returns 401 if signature verification fails
 */
export declare function requireSignature(handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void> | void): (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map