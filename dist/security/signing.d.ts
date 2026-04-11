/**
 * HMAC signing and verification for inter-service requests
 * Provides stronger server-to-server request verification than static API keys alone
 * Includes Redis-based replay protection for nonce tracking
 */
export interface SignatureHeaders {
    'x-shadowflower-timestamp': string;
    'x-shadowflower-nonce': string;
    'x-shadowflower-signature': string;
}
export interface SigningConfig {
    secretKey: string;
    maxTimestampDelta: number;
}
/**
 * Generate a random nonce for request signing
 */
export declare function generateNonce(): string;
/**
 * Create HMAC signature for a request using exact GameDin contract
 * Signature format: HMAC-SHA256(SHADOWFLOWER_SIGNING_SECRET, timestamp + ":" + nonce + ":" + body)
 * Base64URL encoding
 */
export declare function createSignature(config: SigningConfig, params: {
    timestamp: string;
    nonce: string;
    body: string;
}): string;
/**
 * Sign a request with timestamp, nonce, and signature using exact GameDin contract
 * Timestamp is Unix seconds (not milliseconds)
 * Body is the exact string to be signed (empty string for GET requests)
 */
export declare function signRequest(config: SigningConfig, params: {
    body: string;
}): SignatureHeaders;
/**
 * Verify a request signature using exact GameDin contract
 * Returns true if signature is valid and timestamp is within allowed delta
 * Checks nonce against Redis for replay protection
 * Timestamp is Unix seconds, max delta is 300 seconds
 */
export declare function verifySignature(config: SigningConfig, params: {
    body: string;
    headers: SignatureHeaders;
}): Promise<{
    valid: boolean;
    reason?: string;
}>;
/**
 * Extract signature headers from request
 */
export declare function extractSignatureHeaders(request: {
    headers: Record<string, string | string[] | undefined>;
}): SignatureHeaders;
//# sourceMappingURL=signing.d.ts.map