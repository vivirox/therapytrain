/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const { withSentryConfig } = require('@sentry/nextjs');
const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const NodeProtocolPlugin = require('./src/mocks/node-protocol-handler');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sentry/nextjs', 'app'],
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
    
    // Add Node.js polyfills (but exclude ones we'll handle separately)
    const nodePolyfillPlugin = new NodePolyfillPlugin({
      excludeAliases: ['dns', 'net', 'tls', 'fs', 'os', 'child_process', 'cluster']
    });
    config.plugins.push(nodePolyfillPlugin);
    
    // Add buffer polyfill
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      })
    );
    
    // Use our custom mocks
    config.resolve.alias = {
      ...config.resolve.alias,
      dns: path.resolve(__dirname, 'src/mocks/dns.js'),
      net: path.resolve(__dirname, 'src/mocks/net.js'),
      tls: path.resolve(__dirname, 'src/mocks/tls.js'),
      fs: path.resolve(__dirname, 'src/mocks/fs.js'),
      os: path.resolve(__dirname, 'src/mocks/os.js'),
      child_process: false,
      cluster: path.resolve(__dirname, 'src/mocks/cluster.js'),
    };
    
    // Add our custom node: protocol resolver
    config.resolve.plugins = config.resolve.plugins || [];
    config.resolve.plugins.push(new NodeProtocolPlugin());
    
    return config;
  },
  // Enable analytics and speed insights
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  env: {
    PORT: '3000',
  },
  headers: () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
  ],
};

// Export the appropriate configuration based on environment
const config = process.env.NODE_ENV === 'test'
  ? nextConfig
  : withSentryConfig(
      nextConfig,
      {
        // For all available options, see:
        // https://github.com/getsentry/sentry-webpack-plugin#options
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: true, // Suppresses all logs
      },
      {
        // For all available options, see:
        // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
        // Upload source maps in production
        disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
        disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
      }
    );

module.exports = config;
