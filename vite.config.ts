/// <reference types="node" />

import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import * as path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      'Permissions-Policy': 'attribution-reporting=(), run-ad-auction=(), private-state-token-redemption=(), private-state-token-issuance=(), join-ad-interest-group=(), browsing-topics=()'
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  css: {
    postcss: './postcss.config.js'
  },
  build: {
    target: 'esnext',
    minify: mode === 'production' ? 'esbuild' : false,
    cssMinify: mode === 'production',
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
    sourcemap: true,
    modulePreload: {
      polyfill: true
    },
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react';
            }
            if (id.includes('@vercel/')) {
              return 'vercel';
            }
            return 'vendor';
          }
        }
      }
    }
  }
}))
