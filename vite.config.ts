import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      'Permissions-Policy': 'interest-cohort=()'
    },
  },
  plugins: [
    react(),
    // Removed componentTagger as it was not defined
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id: string) => {
          // Split node_modules into smaller chunks
          if (id.includes('node_modules')) {
            // Core React packages
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'core-react';
            }
            // React ecosystem packages
            if (id.includes('react-router') || id.includes('@tanstack/react-query')) {
              return 'react-ecosystem';
            }
            // UI Framework
            if (id.includes('@radix-ui/') || id.includes('@floating-ui/')) {
              return 'ui-framework';
            }
            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
              return 'form-handling';
            }
            // Data visualization
            if (id.includes('chart.js') || id.includes('react-charts-2') || id.includes('recharts')) {
              return 'data-viz';
            }
            // Utilities
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils';
            }
            // Crypto/Security
            if (id.includes('noble') || id.includes('secp256k1') || id.includes('sha256')) {
              return 'crypto';
            }
            // Animation libraries
            if (id.includes('framer-motion') || id.includes('vaul') || id.includes('embla-carousel')) {
              return 'animations';
            }
            // State management
            if (id.includes('zustand') || id.includes('jotai') || id.includes('valid')) {
              return 'state-management';
            }
            // Remaining node_modules split by first letter to avoid large chunks
            const moduleId = id.split('node_modules/').pop()?.split('/')[0] ?? '';
            return `vendor-${moduleId.charAt(0).toLowerCase()}`;
          }

          // Application code splitting
          if (id.includes('/src/')) {
            // Components by feature
            if (id.includes('/components/')) {
              if (id.includes('/ui/')) {
                return 'app-ui';
              }
              if (id.includes('/auth/')) {
                return 'app-auth';
              }
              if (id.includes('/analytics/')) {
                return 'app-analytics';
              }
              if (id.includes('/education/')) {
                return 'app-education';
              }
              if (id.includes('/analytics/')) {
                return 'app-analytics';
              }
              return 'app-components';
            }
            // Services by domain
            if (id.includes('/services/')) {
              if (id.includes('/ai/')) {
                return 'services-ai';
              }
              if (id.includes('/auth/')) {
                return 'services-auth';
              }
              if (id.includes('/api/')) {
                return 'services-api';
              }
              return 'services-core';
            }
            // Pages
            if (id.includes('/pages/')) {
              return 'pages';
            }
            // Hooks
            if (id.includes('/hooks/')) {
              return 'hooks';
            }
            // Utils
            if (id.includes('/utils/')) {
              return 'utils';
            }
          }
        },
        // Optimize chunk names and reduce filename length
        chunkFileNames: (chunkInfo: { name: string; }) => {
          const name = chunkInfo.name || 'chunk';
          return `assets/${name}-[hash].js`;
        },
        // Optimize asset names
        assetFileNames: (chunkInfo: import('rollup').PreRenderedAsset) => {
          const extType = chunkInfo.name?.split('.').pop();
          if (extType) {
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react-native-web']
  }
}))
