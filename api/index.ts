// Vercel Serverless Function wrapper for Express app
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import the Express app
// Note: This will be transpiled by Vercel's build process
const app = require('../server/src/index.ts').default;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Pass request to Express app
  return app(req, res);
}
