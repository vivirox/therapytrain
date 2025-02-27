import { useEffect, useState } from 'react';
import Redis from 'ioredis';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
}

const defaultConfig: RedisConfig = {
  host: process.env.NEXT_PUBLIC_REDIS_HOST || 'localhost',
  port: parseInt(process.env.NEXT_PUBLIC_REDIS_PORT || '6379'),
  password: process.env.NEXT_PUBLIC_REDIS_PASSWORD,
  tls: process.env.NEXT_PUBLIC_REDIS_TLS === 'true'
};

export function useRedis(config: RedisConfig = defaultConfig) {
  const [redis, setRedis] = useState<Redis | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      tls: config.tls ? {} : undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    client.on('error', (err) => {
      console.error('Redis client error:', err);
      setError(err);
    });

    client.on('connect', () => {
      console.log('Redis client connected');
      setError(null);
    });

    setRedis(client);

    return () => {
      client.disconnect();
    };
  }, [config.host, config.port, config.password, config.tls]);

  return { redis, error };
} 