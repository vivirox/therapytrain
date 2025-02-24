import { NextApiRequest, NextApiResponse } from 'next';
import { EmailTrackingService } from '@/lib/email/email-tracking';

// Base64 encoded 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email_id, recipient } = req.query;

  if (!email_id || !recipient) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Get client information
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.headers['x-forwarded-for']?.toString() || 
                     req.socket.remoteAddress;

    // Track the open event
    await EmailTrackingService.trackOpen(
      email_id.toString(),
      recipient.toString(),
      userAgent,
      ipAddress
    );

    // Return a transparent 1x1 GIF
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.send(TRACKING_PIXEL);
  } catch (error) {
    console.error('Error tracking email open:', error);
    // Still return the tracking pixel to avoid breaking email rendering
    res.setHeader('Content-Type', 'image/gif');
    return res.send(TRACKING_PIXEL);
  }
} 