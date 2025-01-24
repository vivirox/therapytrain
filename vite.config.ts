import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui') || id.includes('@floating-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('snarkjs') || id.includes('ffjavascript')) {
              return 'crypto-vendor';
            }
            if (id.includes('chart.js') || id.includes('d3')) {
              return 'chart-vendor';
            }
            // Group remaining node_modules into a shared vendor chunk
            return 'vendor';
          }
          // Split components into feature-based chunks
          if (id.includes('/components/')) {
            if (id.includes('/ui/')) {
              return 'ui-components';
            }
            if (id.includes('Chat') || id.includes('Message')) {
              return 'chat-components';
            }
            if (id.includes('Analytics') || id.includes('Trends') || id.includes('Patterns')) {
              return 'analytics-components';
            }
          }
          // Split services into their own chunk
          if (id.includes('/services/')) {
            return 'services';
          }
        }
      }
    }
  }
}));
