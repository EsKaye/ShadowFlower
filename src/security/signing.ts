/**
 * HMAC signing and verification for inter-service requests
 * Provides stronger server-to-server request verification than static API keys alone
 */

import crypto from 'crypto';

export interface SignatureHeaders {
  'x-shadowflower-timestamp': string;
  'x-shadowflower-nonce': string;
  'x-shadowflower-signature': string;
}

export interface SigningConfig {
  secretKey: string;
  maxTimestampDelta: number; // Maximum allowed timestamp difference in milliseconds
}

/**
 * Generate a random nonce for request signing
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create HMAC signature for a request
 * Signature covers: method + path + timestamp + nonce + body
 */
export function createSignature(config: SigningConfig, params: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  body: string;
}): string {
  const { method, path, timestamp, nonce, body } = params;
  
  // Create the message to sign
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}`;
  
  // Create HMAC-SHA256 signature
  const hmac = crypto.createHmac('sha256', config.secretKey);
  hmac.update(message);
  
  return hmac.digest('hex');
}

/**
 * Sign a request with timestamp, nonce, and signature
 */
export function signRequest(config: SigningConfig, params: {
  method: string;
  path: string;
  body: string;
}): SignatureHeaders {
  const timestamp = Date.now().toString();
  const nonce = generateNonce();
  
  const signature = createSignature(config, {
    method: params.method,
    path: params.path,
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
 * Verify a request signature
 * Returns true if signature is valid and timestamp is within allowed delta
 */
export function verifySignature(config: SigningConfig, params: {
  method: string;
  path: string;
  body: string;
  headers: SignatureHeaders;
}): { valid: boolean; reason?: string } {
  const { method, path, body, headers } = params;
  
  const timestamp = headers['x-shadowflower-timestamp'];
  const nonce = headers['x-shadowflower-nonce'];
  const providedSignature = headers['x-shadowflower-signature'];
  
  // Check all required headers are present
  if (!timestamp || !nonce || !providedSignature) {
    return { valid: false, reason: 'Missing required signature headers' };
  }
  
  // Check timestamp is within allowed delta (replay protection)
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  const timeDelta = Math.abs(now - requestTime);
  
  if (isNaN(requestTime) || timeDelta > config.maxTimestampDelta) {
    return { valid: false, reason: 'Timestamp outside allowed window' };
  }
  
  // Recreate the signature
  const expectedSignature = createSignature(config, {
    method,
    path,
    timestamp,
    nonce,
    body,
  });
  
  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedSignature)
  )) {
    return { valid: false, reason: 'Invalid signature' };
  }
  
  return { valid: true };
}

/**
 * Extract signature headers from request
 */
export function extractSignatureHeaders(request: {
  headers: Record<string, string | string[] | undefined>;
}): SignatureHeaders {
  const headers = request.headers;

  const getHeaderValue = (key: string): string => {
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
