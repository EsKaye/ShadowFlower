/**
 * HMAC signing and verification for inter-service requests
 * Provides stronger server-to-server request verification than static API keys alone
 * Includes Redis-based replay protection for nonce tracking
 */
import crypto from 'crypto';
import { getRedisService } from '../infrastructure/redis';
/**
 * Generate a random nonce for request signing
 */
export function generateNonce() {
    return crypto.randomBytes(16).toString('hex');
}
/**
 * Create HMAC signature for a request using exact GameDin contract
 * Signature format: HMAC-SHA256(SHADOWFLOWER_SIGNING_SECRET, timestamp + ":" + nonce + ":" + body)
 * Base64URL encoding
 */
export function createSignature(config, params) {
    const { timestamp, nonce, body } = params;
    // Create the message to sign: timestamp:nonce:body
    const message = `${timestamp}:${nonce}:${body}`;
    // Create HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', config.secretKey);
    hmac.update(message);
    // Return Base64URL encoded signature (not hex)
    const signature = hmac.digest('base64');
    // Convert Base64 to Base64URL (replace + with -, / with _, remove = padding)
    return signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/**
 * Sign a request with timestamp, nonce, and signature using exact GameDin contract
 * Timestamp is Unix seconds (not milliseconds)
 * Body is the exact string to be signed (empty string for GET requests)
 */
export function signRequest(config, params) {
    const timestamp = Math.floor(Date.now() / 1000).toString(); // Unix seconds
    const nonce = generateNonce();
    const signature = createSignature(config, {
        timestamp,
        nonce,
        body: params.body,
    });
    return {
        'x-shadowflower-timestamp': timestamp,
        'x-shadowflower-nonce': nonce,
        'x-shadowflower-signature': signature,
    };
}
/**
 * Verify a request signature using exact GameDin contract
 * Returns true if signature is valid and timestamp is within allowed delta
 * Checks nonce against Redis for replay protection
 * Timestamp is Unix seconds, max delta is 300 seconds
 */
export async function verifySignature(config, params) {
    const { body, headers } = params;
    const timestamp = headers['x-shadowflower-timestamp'];
    const nonce = headers['x-shadowflower-nonce'];
    const providedSignature = headers['x-shadowflower-signature'];
    // Check all required headers are present
    if (!timestamp || !nonce || !providedSignature) {
        return { valid: false, reason: 'Missing required signature headers' };
    }
    // Check timestamp is within allowed delta (replay protection)
    // Timestamp is Unix seconds, convert to milliseconds for comparison
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    const timeDelta = Math.abs(now - requestTime);
    if (isNaN(requestTime) || timeDelta > 300) {
        return { valid: false, reason: 'Timestamp outside allowed window' };
    }
    // Check nonce for replay protection using Redis
    const redis = getRedisService();
    const nonceValid = await redis.verifyNonce(nonce, 300); // 300 second TTL for nonces
    if (!nonceValid) {
        return { valid: false, reason: 'Replay detected - nonce already used' };
    }
    // Recreate the signature using new format
    const expectedSignature = createSignature(config, {
        timestamp,
        nonce,
        body,
    });
    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
        return { valid: false, reason: 'Invalid signature' };
    }
    return { valid: true };
}
/**
 * Extract signature headers from request
 */
export function extractSignatureHeaders(request) {
    const headers = request.headers;
    const getHeaderValue = (key) => {
        const value = headers[key];
        if (Array.isArray(value)) {
            return value[0] || '';
        }
        return value || '';
    };
    return {
        'x-shadowflower-timestamp': getHeaderValue('x-shadowflower-timestamp'),
        'x-shadowflower-nonce': getHeaderValue('x-shadowflower-nonce'),
        'x-shadowflower-signature': getHeaderValue('x-shadowflower-signature'),
    };
}
//# sourceMappingURL=signing.js.map