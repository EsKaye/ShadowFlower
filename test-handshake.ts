/**
 * Test script for GameDin handshake using exact contract
 * Tests GET /api/private/moderation/reports/reviewable
 */

import { GameDinClient } from './src/lib/gamedin-client.ts';

const testUrls = [
  'https://gamedin.xyz',
  'http://localhost:3000',
  'http://192.168.1.206:3000',
];

async function testHandshake() {
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

  for (const baseUrl of testUrls) {
    console.log(`\n=== Testing handshake with ${baseUrl} ===`);
    
    try {
      const client = new GameDinClient({
        baseUrl,
        apiKey,
        signingSecret,
        timeout: 10000,
      });

      const result = await client.fetchReviewableReports();
      console.log(`✅ Handshake successful with ${baseUrl}`);
      console.log(`Response:`, JSON.stringify(result, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Handshake failed with ${baseUrl}: ${message}`);
    }
  }
}

testHandshake().catch(console.error);
