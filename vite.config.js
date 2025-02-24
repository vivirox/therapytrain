import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig(async () => {
  const tailwindcss = (await import('tailwindcss')).default
  const autoprefixer = (await import('autoprefixer')).default

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss(),
          autoprefixer(),
        ],
      },
      build: {
        cssMinify: {
          format: { comments: false },
          preset: ['default', {
            discardComments: { removeAll: true },
            normalizeWhitespace: false,
          }]
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': [
              'react',
              'react-dom',
              'react-router-dom',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-tabs',
              '@radix-ui/react-progress',
              '@radix-ui/react-select',
              '@radix-ui/react-label',
              '@radix-ui/react-switch',
              '@vercel/analytics',
              '@vercel/speed-insights',
            ],
          },
        },
      },
    },
  }
}) 