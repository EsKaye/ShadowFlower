/**
 * Discord interaction signature verification
 * Discord uses Ed25519 for verifying interaction requests from their servers
 */

import { verify } from '@noble/ed25519';

export interface DiscordVerificationConfig {
  publicKey: string;
}

/**
 * Verify Discord interaction signature using Ed25519
 * Discord sends X-Signature-Ed25519 and X-Signature-Timestamp headers
 * Uses @noble/ed25519 for proper cryptographic verification
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
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, 'hex');
    const publicKeyBytes = Buffer.from(publicKey, 'hex');

    // Verify using Ed25519
    const isValid = verify(publicKeyBytes, messageBytes, signatureBytes);

    return isValid;
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
