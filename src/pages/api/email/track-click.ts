import { NextApiRequest, NextApiResponse } from 'next';
import { EmailTrackingService } from '@/lib/email/email-tracking';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email_id, recipient, url } = req.query;

  if (!email_id || !recipient || !url) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Get client information
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.headers['x-forwarded-for']?.toString() || 
                     req.socket.remoteAddress;

    // Track the click event
    await EmailTrackingService.trackClick(
      email_id.toString(),
      recipient.toString(),
      url.toString(),
      userAgent,
      ipAddress
    );

    // Redirect to the original URL
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.redirect(302, url.toString());
  } catch (error) {
    console.error('Error tracking email click:', error);
    // Still redirect to avoid breaking the user experience
    return res.redirect(302, url.toString());
  }
} 