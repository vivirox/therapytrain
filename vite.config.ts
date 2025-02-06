/// <reference types="node" />

import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import * as path from "node:path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      },
      jsxRuntime: 'automatic',
      jsxImportSource: 'react'
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom')
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
      preserveEntrySignatures: 'strict',
      output: {
        format: 'es',
        inlineDynamicImports: false,
        manualChunks: undefined
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      target: 'esnext'
    }
  }
}))
