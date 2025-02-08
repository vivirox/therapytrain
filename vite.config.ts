/// <reference types="node" />
import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';
import rehypePrism from 'rehype-prism-plus';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 3000,
    },
    plugins: [
        react({
            jsxRuntime: 'automatic',
            jsxImportSource: 'react',
            include: /\.(mdx|js|jsx|ts|tsx)$/,
            babel: {
                plugins: [
                    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
                ]
            }
        }),
        mdx({
            providerImportSource: "@mdx-js/react",
            remarkPlugins: [remarkGfm],
            rehypePlugins: [rehypePrism],
            jsxRuntime: "automatic",
            jsxImportSource: "react",
            development: process.env.NODE_ENV === 'development',
            jsx: true,
            format: 'mdx'
        }),
        visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true,
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'react': path.resolve(__dirname, './node_modules/react'),
            'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
            'react-router-dom': path.resolve(__dirname, './node_modules/react-router-dom'),
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.mdx']
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    css: {
        postcss: './postcss.config.cjs'
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: [
                        'react',
                        'react-dom',
                        'react-router-dom',
                        '@radix-ui/react-alert-dialog',
                        '@radix-ui/react-avatar',
                        '@radix-ui/react-checkbox',
                        '@radix-ui/react-dialog',
                        '@radix-ui/react-hover-card',
                        '@radix-ui/react-menubar',
                        '@radix-ui/react-navigation-menu',
                        '@radix-ui/react-select',
                        '@radix-ui/react-tabs',
                        '@radix-ui/react-tooltip',
                    ],
                },
            },
        },
        sourcemap: true,
        target: 'esnext',
    },
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@mdx-js/react'
        ],
        esbuildOptions: {
            loader: {
                '.mdx': 'jsx'
            }
        }
    }
});
