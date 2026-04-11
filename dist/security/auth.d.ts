/**
 * Authentication and security middleware for ShadowFlower service
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
export interface AuthenticatedRequest extends VercelRequest {
    authenticated?: boolean;
    requestId?: string;
}
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
 * Rate limiting middleware (simple implementation)
 */
export declare function rateLimit(options: {
    windowMs: number;
    maxRequests: number;
}): (req: AuthenticatedRequest, res: VercelResponse, next: () => void) => void;
/**
 * Request logging middleware
 */
export declare function requestLogger(req: AuthenticatedRequest, res: VercelResponse, next: () => void): void;
/**
 * Error handling middleware
 */
export declare function errorHandler(error: Error, req: AuthenticatedRequest, res: VercelResponse, _next: (err?: Error) => void): void;
//# sourceMappingURL=auth.d.ts.map