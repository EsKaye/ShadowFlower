/**
 * Discord interaction signature verification
 * Discord uses Ed25519 for verifying interaction requests from their servers
 */

import crypto from 'crypto';

export interface DiscordVerificationConfig {
  publicKey: string;
}

/**
 * Verify Discord interaction signature using Ed25519
 * Discord sends X-Signature-Ed25519 and X-Signature-Timestamp headers
 * Note: This requires a proper Ed25519 verification library.
 * For now, this is a placeholder that needs @noble/ed25519 or similar library.
 */
export function verifyDiscordSignature(config: DiscordVerificationConfig, params: {
  body: string;
  signature: string;
  timestamp: string;
}): boolean {
  const { body, signature, timestamp } = params;
  const { publicKey } = config;

  try {
    // Discord verification: signature = Ed25519(publicKey, timestamp + body)
    const message = timestamp + body;
    const signatureBytes = Buffer.from(signature, 'hex');

    // Note: Node.js crypto.verify doesn't support Ed25519 directly
    // This requires @noble/ed25519 or similar library for proper verification
    // For now, we'll use a basic HMAC fallback for development
    // TODO: Install @noble/ed25519 and implement proper Ed25519 verification

    // Fallback: Use HMAC-SHA256 for development (not production-secure)
    const hmac = crypto.createHmac('sha256', publicKey);
    hmac.update(message);
    const expectedSignature = hmac.digest('hex');

    // Constant-time comparison
    const expectedBytes = Buffer.from(expectedSignature, 'hex');
    const providedBytes = signatureBytes;

    if (expectedBytes.length !== providedBytes.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expectedBytes.length; i++) {
      const expectedByte = expectedBytes[i] ?? 0;
      const providedByte = providedBytes[i] ?? 0;
      result |= expectedByte ^ providedByte;
    }

    return result === 0;
  } catch (error) {
    console.error('Discord signature verification failed:', error);
    return false;
  }
}

/**
 * Extract Discord verification headers from request
 */
export function extractDiscordHeaders(request: {
  headers: Record<string, string | string[] | undefined>;
}): { signature: string; timestamp: string } | null {
  const headers = request.headers;

  const getHeaderValue = (key: string): string => {
    const value = headers[key];
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  };

  const signature = getHeaderValue('x-signature-ed25519');
  const timestamp = getHeaderValue('x-signature-timestamp');

  if (!signature || !timestamp) {
    return null;
  }

  return { signature, timestamp };
}
