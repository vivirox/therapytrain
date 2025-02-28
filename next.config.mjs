/** @type {import('next').NextConfig} */
import webpack from 'webpack';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sentry/nextjs'],
  webpack: (config) => {
    // Add ESM support
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };

    // Add ProvidePlugin configuration
    config.plugins.push(
      new webpack.ProvidePlugin({
        React: 'react',
      })
    );
    config.resolve.alias = {
      ...config.resolve.alias,
      stream: false,
      crypto: false,
      net: false,
    };
    return config;
  },
  // Enable analytics and speed insights
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  env: {
    PORT: process.env.PORT || '3000',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.sentry.io; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.sentry.io https://vitals.vercel-insights.com;`,
          },
        ],
      },
    ];
  },
};

// Export the appropriate configuration based on environment
const config = process.env.NODE_ENV === 'test'
  ? nextConfig
  : withSentryConfig(
      nextConfig,
      {
        // Sentry config options
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: true,
        hideSourceMaps: true,
        automaticVercelMonitors: true,
      },
      {
        // Additional config options for the Sentry webpack plugin
        silent: true,
      }
    );

export default config;
