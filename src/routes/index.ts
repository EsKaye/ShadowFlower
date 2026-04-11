/**
 * Root route - returns minimal non-informative response
 * ShadowFlower is a private service, not a public website
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  // Return 404 to indicate this is not a public-facing website
  res.status(404).json({
    message: 'Not Found',
  });
}
