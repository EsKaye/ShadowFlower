/**
 * Simple test script for GameDin handshake using exact contract
 * Tests GET /api/private/moderation/reports/reviewable
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const testUrls = [
  'https://api.gamedin.xyz',
  'http://localhost:3000',
  'http://192.168.1.206:3000',
];

const signingSecret = process.env['SHADOWFLOWER_SIGNING_SECRET'] || process.env['GAMEDIN_SIGNING_SECRET'];
const apiKey = process.env['GAMEDIN_SHADOWFLOWER_API_KEY'];

if (!signingSecret) {
  console.error('SHADOWFLOWER_SIGNING_SECRET or GAMEDIN_SIGNING_SECRET is required');
  process.exit(1);
}

if (!apiKey) {
  console.error('GAMEDIN_SHADOWFLOWER_API_KEY is required');
  process.exit(1);
}

/**
 * Generate random nonce
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create HMAC signature for a request using exact GameDin contract
 * Signature format: HMAC-SHA256(SHADOWFLOWER_SIGNING_SECRET, timestamp + ":" + nonce + ":" + body)
 * Base64URL encoding
 */
function createSignature(params) {
  const { timestamp, nonce, body } = params;
  
  // Create the message to sign: timestamp:nonce:body
  const message = `${timestamp}:${nonce}:${body}`;
  
  // Create HMAC-SHA256 signature
  const hmac = crypto.createHmac('sha256', signingSecret);
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
function signRequest(params) {
  const { body } = params;
  const timestamp = Math.floor(Date.now() / 1000).toString(); // Unix seconds
  const nonce = generateNonce();

  const signature = createSignature({
    timestamp,
    nonce,
    body: body,
  });

  return {
    'x-shadowflower-timestamp': timestamp,
    'x-shadowflower-nonce': nonce,
    'x-shadowflower-signature': signature,
  };
}

async function testHandshake() {
  for (const baseUrl of testUrls) {
    console.log(`\n=== Testing handshake with ${baseUrl} ===`);
    
    try {
      const headers = {
        'x-shadowflower-api-key': apiKey,
      };

      // Add HMAC signature
      const body = ''; // Empty body for GET requests
      const signatureHeaders = signRequest({ body });
      Object.entries(signatureHeaders).forEach(([key, value]) => {
        headers[key] = value;
      });

      console.log('Headers:', JSON.stringify(headers, null, 2));

      const response = await axios.get(`${baseUrl}/api/private/moderation/reports/reviewable`, { headers });
      console.log(`✅ Handshake successful with ${baseUrl}`);
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = error.response?.status || 'unknown';
      const responseData = error.response?.data || 'no response data';
      console.error(`❌ Handshake failed with ${baseUrl}`);
      console.error(`Status: ${status}`);
      console.error(`Error: ${message}`);
      console.error(`Response:`, JSON.stringify(responseData, null, 2));
    }
  }
}

testHandshake().catch(console.error);
