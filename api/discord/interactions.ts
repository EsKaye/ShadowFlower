/**
 * Vercel serverless function wrapper for Discord interactions
 * This file is in the api/ directory for Vercel serverless function deployment
 * It dynamically imports the compiled handler from the dist directory at runtime
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Dynamically import the compiled handler at runtime
  // This bypasses TypeScript's module resolution issues
  const distHandler = require('../../dist/routes/api/discord/interactions');
  return distHandler.default(req, res);
}
