/**
 * HMAC signing and verification for inter-service requests
 * Provides stronger server-to-server request verification than static API keys alone
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
 * Create HMAC signature for a request
 * Signature covers: method + path + timestamp + nonce + body
 */
export declare function createSignature(config: SigningConfig, params: {
    method: string;
    path: string;
    timestamp: string;
    nonce: string;
    body: string;
}): string;
/**
 * Sign a request with timestamp, nonce, and signature
 */
export declare function signRequest(config: SigningConfig, params: {
    method: string;
    path: string;
    body: string;
}): SignatureHeaders;
/**
 * Verify a request signature
 * Returns true if signature is valid and timestamp is within allowed delta
 */
export declare function verifySignature(config: SigningConfig, params: {
    method: string;
    path: string;
    body: string;
    headers: SignatureHeaders;
}): {
    valid: boolean;
    reason?: string;
};
/**
 * Extract signature headers from request
 */
export declare function extractSignatureHeaders(request: {
    headers: Record<string, string | string[] | undefined>;
}): SignatureHeaders;
//# sourceMappingURL=signing.d.ts.map