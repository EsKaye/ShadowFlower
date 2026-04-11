/**
 * Logo route - serves logo.png for sf.gamedin.xyz
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoBuffer = fs.readFileSync(logoPath);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(logoBuffer);
  } catch (error) {
    res.status(404).json({ error: 'Logo not found' });
  }
}
