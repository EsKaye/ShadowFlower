/**
 * Upstash Redis infrastructure wrapper
 * Provides distributed coordination, rate limiting, replay protection, and job locking
 * Fails safely if Redis is unavailable - degrades gracefully with documented limitations
 */
export interface RedisConfig {
    url: string;
    token: string;
}
export interface RedisHealth {
    available: boolean;
    latency?: number;
    error?: string;
}
/**
 * Redis infrastructure service
 * Centralizes all Redis operations with graceful degradation
 */
export declare class RedisService {
    private client;
    private available;
    private lastHealthCheck;
    private healthCheckInterval;
    constructor(config?: RedisConfig);
    /**
     * Initialize Redis client
     */
    initialize(config: RedisConfig): void;
    /**
     * Check Redis health
     */
    healthCheck(): Promise<RedisHealth>;
    /**
     * Rate limiting - distributed token bucket
     * Returns true if request is allowed, false if rate limit exceeded
     */
    rateLimit(identifier: string, limit: number, windowMs: number): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
    /**
     * Replay protection - track and verify nonces
     * Returns true if nonce is new (allowed), false if replayed (rejected)
     */
    verifyNonce(nonce: string, ttlSeconds?: number): Promise<boolean>;
    /**
     * Job locking - acquire distributed lock
     * Returns true if lock acquired, false if already locked
     */
    acquireLock(lockKey: string, ttlSeconds?: number): Promise<{
        acquired: boolean;
        lockId?: string;
    }>;
    /**
     * Job locking - release distributed lock
     */
    releaseLock(lockKey: string, lockId: string): Promise<void>;
    /**
     * Idempotency - check if request with idempotency key was already processed
     */
    checkIdempotency(idempotencyKey: string, _ttlSeconds?: number): Promise<{
        processed: boolean;
        result?: string;
    }>;
    /**
     * Idempotency - mark request as processed with result
     */
    markProcessed(idempotencyKey: string, result: string, ttlSeconds?: number): Promise<void>;
    /**
     * Check if Redis is available
     */
    isAvailable(): boolean;
}
/**
 * Get or create Redis service instance
 */
export declare function getRedisService(): RedisService;
/**
 * Reset Redis service (useful for testing)
 */
export declare function resetRedisService(): void;
//# sourceMappingURL=redis.d.ts.map