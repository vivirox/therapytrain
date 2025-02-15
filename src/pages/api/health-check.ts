import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Only allow HEAD and GET requests
    if (req.method !== 'HEAD' && req.method !== 'GET') {
        res.setHeader('Allow', ['HEAD', 'GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // Add any additional health checks here (e.g., database connection)
        const healthCheck = {
            uptime: process.uptime(),
            timestamp: Date.now(),
            status: 'healthy'
        };

        // For HEAD requests, just return the status
        if (req.method === 'HEAD') {
            return res.status(200).end();
        }

        // For GET requests, return the health check data
        res.status(200).json(healthCheck);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 