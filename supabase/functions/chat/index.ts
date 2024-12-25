import express from 'express';
const router = express.Router();

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

import { Request, Response, RequestHandler } from 'express';

const chatHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req || !req.headers || !req.headers.authorization) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { messages, apiKey } = req.body;

    if (!apiKey || !messages) {
      throw new Error('Invalid input parameters');
    }

    // Your chat logic here

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

router.post('/chat', chatHandler);

export default router;