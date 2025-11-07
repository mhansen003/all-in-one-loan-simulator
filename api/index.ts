// Vercel Serverless Function wrapper for Express app
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/src/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Pass request to Express app
  return app(req, res);
}
