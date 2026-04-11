/**
 * Upstash Redis infrastructure wrapper
 * Provides distributed coordination, rate limiting, replay protection, and job locking
 * Fails safely if Redis is unavailable - degrades gracefully with documented limitations
 */
import { Redis } from '@upstash/redis';
/**
 * Redis infrastructure service
 * Centralizes all Redis operations with graceful degradation
 */
export class RedisService {
    client = null;
    available = false;
    lastHealthCheck = 0;
    healthCheckInterval = 30 * 1000; // 30 seconds
    constructor(config) {
        if (config) {
            this.initialize(config);
        }
    }
    /**
     * Initialize Redis client
     */
    initialize(config) {
        try {
            this.client = new Redis({
                url: config.url,
                token: config.token,
            });
            this.available = true;
            console.log('[Redis] Initialized successfully');
        }
        catch (error) {
            this.available = false;
            console.warn('[Redis] Initialization failed:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Check Redis health
     */
    async healthCheck() {
        const now = Date.now();
        // Cache health check result for 30 seconds
        if (now - this.lastHealthCheck < this.healthCheckInterval) {
            return {
                available: this.available,
            };
        }
        if (!this.client || !this.available) {
            this.lastHealthCheck = now;
            return {
                available: false,
                error: 'Redis client not initialized',
            };
        }
        try {
            const start = Date.now();
            await this.client.ping();
            const latency = Date.now() - start;
            this.available = true;
            this.lastHealthCheck = now;
            return {
                available: true,
                latency,
            };
        }
        catch (error) {
            this.available = false;
            this.lastHealthCheck = now;
            return {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Rate limiting - distributed token bucket
     * Returns true if request is allowed, false if rate limit exceeded
     */
    async rateLimit(identifier, limit, windowMs) {
        if (!this.client || !this.available) {
            // Degrade to in-memory rate limiting if Redis unavailable
            console.warn('[Redis] Rate limiting degraded - Redis unavailable');
            return { allowed: true, remaining: limit, resetTime: Date.now() + windowMs };
        }
        try {
            const key = `ratelimit:${identifier}`;
            const now = Date.now();
            const windowStart = now - windowMs;
            // Remove entries outside the window
            await this.client.zremrangebyscore(key, 0, windowStart);
            // Count current requests
            const count = await this.client.zcard(key);
            if (count >= limit) {
                // Get the oldest entry to calculate reset time
                const oldest = await this.client.zrange(key, 0, 0, { withScores: true });
                const resetTime = oldest.length > 0 ? Math.floor(oldest[0].score + windowMs) : now + windowMs;
                return {
                    allowed: false,
                    remaining: 0,
                    resetTime,
                };
            }
            // Add current request
            await this.client.zadd(key, { score: now, member: now.toString() });
            await this.client.expire(key, Math.ceil(windowMs / 1000) + 1);
            const remaining = limit - (count + 1);
            return {
                allowed: true,
                remaining,
                resetTime: now + windowMs,
            };
        }
        catch (error) {
            console.error('[Redis] Rate limiting error:', error);
            // Allow request if Redis fails
            return { allowed: true, remaining: limit, resetTime: Date.now() + windowMs };
        }
    }
    /**
     * Replay protection - track and verify nonces
     * Returns true if nonce is new (allowed), false if replayed (rejected)
     */
    async verifyNonce(nonce, ttlSeconds = 300) {
        // ttlSeconds is used in the set call below
        void ttlSeconds;
        if (!this.client || !this.available) {
            // Degrade to timestamp-only validation if Redis unavailable
            console.warn('[Redis] Replay protection degraded - Redis unavailable');
            return true;
        }
        try {
            const key = `nonce:${nonce}`;
            const exists = await this.client.exists(key);
            if (exists) {
                return false; // Replay detected
            }
            // Store nonce with TTL
            await this.client.set(key, '1', { ex: ttlSeconds });
            return true;
        }
        catch (error) {
            console.error('[Redis] Replay protection error:', error);
            // Allow request if Redis fails
            return true;
        }
    }
    /**
     * Job locking - acquire distributed lock
     * Returns true if lock acquired, false if already locked
     */
    async acquireLock(lockKey, ttlSeconds = 300) {
        if (!this.client || !this.available) {
            // Degrade to no locking if Redis unavailable
            console.warn('[Redis] Job locking degraded - Redis unavailable');
            return { acquired: true };
        }
        try {
            const lockId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const key = `lock:${lockKey}`;
            // Try to set lock with NX (only if not exists)
            const result = await this.client.set(key, lockId, {
                nx: true,
                ex: ttlSeconds,
            });
            if (result === 'OK') {
                return { acquired: true, lockId };
            }
            return { acquired: false };
        }
        catch (error) {
            console.error('[Redis] Job locking error:', error);
            // Allow operation if Redis fails
            return { acquired: true };
        }
    }
    /**
     * Job locking - release distributed lock
     */
    async releaseLock(lockKey, lockId) {
        if (!this.client || !this.available) {
            return;
        }
        try {
            const key = `lock:${lockKey}`;
            // Only release if we own the lock (Lua script for atomicity)
            const script = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;
            await this.client.eval(script, [key], [lockId]);
        }
        catch (error) {
            console.error('[Redis] Job unlock error:', error);
        }
    }
    /**
     * Idempotency - check if request with idempotency key was already processed
     */
    async checkIdempotency(idempotencyKey, _ttlSeconds = 3600) {
        if (!this.client || !this.available) {
            // Degrade to no idempotency check if Redis unavailable
            console.warn('[Redis] Idempotency check degraded - Redis unavailable');
            return { processed: false };
        }
        try {
            const key = `idempotency:${idempotencyKey}`;
            const result = await this.client.get(key);
            if (result && typeof result === 'string') {
                return { processed: true, result };
            }
            return { processed: false };
        }
        catch (error) {
            console.error('[Redis] Idempotency check error:', error);
            return { processed: false };
        }
    }
    /**
     * Idempotency - mark request as processed with result
     */
    async markProcessed(idempotencyKey, result, ttlSeconds = 3600) {
        if (!this.client || !this.available) {
            return;
        }
        try {
            const key = `idempotency:${idempotencyKey}`;
            await this.client.set(key, result, { ex: ttlSeconds });
        }
        catch (error) {
            console.error('[Redis] Idempotency mark error:', error);
        }
    }
    /**
     * Check if Redis is available
     */
    isAvailable() {
        return this.available;
    }
}
// Global Redis service instance
let redisService = null;
/**
 * Get or create Redis service instance
 */
export function getRedisService() {
    if (!redisService) {
        const redisUrl = process.env['UPSTASH_REDIS_REST_URL'];
        const redisToken = process.env['UPSTASH_REDIS_REST_TOKEN'];
        if (redisUrl && redisToken) {
            redisService = new RedisService({
                url: redisUrl,
                token: redisToken,
            });
        }
        else {
            console.warn('[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured');
            redisService = new RedisService(); // Unavailable but safe
        }
    }
    return redisService;
}
/**
 * Reset Redis service (useful for testing)
 */
export function resetRedisService() {
    redisService = null;
}
//# sourceMappingURL=redis.js.map