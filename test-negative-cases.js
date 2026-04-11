/**
 * Test script for negative handshake cases
 * Tests invalid signature and expired timestamp
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const baseUrl = 'http://localhost:3000';
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
  const { body, timestampOverride } = params;
  const timestamp = timestampOverride || Math.floor(Date.now() / 1000).toString(); // Unix seconds
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

async function testInvalidSignature() {
  console.log(`\n=== Testing invalid signature ===`);
  
  try {
    const headers = {
      'x-shadowflower-api-key': apiKey,
    };

    // Add HMAC signature with wrong signature
    const body = '';
    const signatureHeaders = signRequest({ body });
    signatureHeaders['x-shadowflower-signature'] = 'invalid_signature_12345'; // Invalid signature
    Object.entries(signatureHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });

    console.log('Headers:', JSON.stringify(headers, null, 2));

    const response = await axios.get(`${baseUrl}/api/private/moderation/reports/reviewable`, { headers });
    console.error(`❌ Invalid signature test failed - should have returned 401`);
    console.error(`Status: ${response.status}`);
  } catch (error) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data || 'no response data';
    if (status === 401) {
      console.log(`✅ Invalid signature test passed - returned 401 as expected`);
      console.log(`Response:`, JSON.stringify(responseData, null, 2));
    } else {
      console.error(`❌ Invalid signature test failed - expected 401, got ${status}`);
      console.error(`Response:`, JSON.stringify(responseData, null, 2));
    }
  }
}

async function testExpiredTimestamp() {
  console.log(`\n=== Testing expired timestamp ===`);
  
  try {
    const headers = {
      'x-shadowflower-api-key': apiKey,
    };

    // Add HMAC signature with expired timestamp (more than 300 seconds ago)
    const body = '';
    const expiredTimestamp = Math.floor((Date.now() / 1000) - 400).toString(); // 400 seconds ago
    const signatureHeaders = signRequest({ body, timestampOverride: expiredTimestamp });
    Object.entries(signatureHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });

    console.log('Headers:', JSON.stringify(headers, null, 2));

    const response = await axios.get(`${baseUrl}/api/private/moderation/reports/reviewable`, { headers });
    console.error(`❌ Expired timestamp test failed - should have returned 401`);
    console.error(`Status: ${response.status}`);
  } catch (error) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data || 'no response data';
    if (status === 401) {
      console.log(`✅ Expired timestamp test passed - returned 401 as expected`);
      console.log(`Response:`, JSON.stringify(responseData, null, 2));
    } else {
      console.error(`❌ Expired timestamp test failed - expected 401, got ${status}`);
      console.error(`Response:`, JSON.stringify(responseData, null, 2));
    }
  }
}

async function testMissingHeaders() {
  console.log(`\n=== Testing missing signature headers ===`);
  
  try {
    const headers = {
      'x-shadowflower-api-key': apiKey,
      // Missing signature headers
    };

    console.log('Headers:', JSON.stringify(headers, null, 2));

    const response = await axios.get(`${baseUrl}/api/private/moderation/reports/reviewable`, { headers });
    console.error(`❌ Missing headers test failed - should have returned 401`);
    console.error(`Status: ${response.status}`);
  } catch (error) {
    const status = error.response?.status || 'unknown';
    const responseData = error.response?.data || 'no response data';
    if (status === 401) {
      console.log(`✅ Missing headers test passed - returned 401 as expected`);
      console.log(`Response:`, JSON.stringify(responseData, null, 2));
    } else {
      console.error(`❌ Missing headers test failed - expected 401, got ${status}`);
      console.error(`Response:`, JSON.stringify(responseData, null, 2));
    }
  }
}

async function runNegativeTests() {
  await testInvalidSignature();
  await testExpiredTimestamp();
  await testMissingHeaders();
  console.log(`\n=== All negative tests completed ===`);
}

runNegativeTests().catch(console.error);
