import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        tsconfigPaths({ projects: ['tsconfig.app.json', 'tsconfig.node.json', 'tsconfig.test.json'] }),
        tailwindcss(),
        react({
            babel: {
                plugins: [['babel-plugin-react-compiler']],
            },
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id: string) => {
                    const CHUNK_RULES: [string[], string][] = [
                        [['node_modules/react', 'node_modules/react-dom', 'node_modules/react-router-dom'], 'vendor-react'],
                        [['node_modules/framer-motion', 'node_modules/@radix-ui'], 'vendor-ui'],
                        [['node_modules/@reduxjs/toolkit', 'node_modules/react-redux'], 'vendor-state'],
                        [['node_modules/i18next', 'node_modules/react-i18next'], 'vendor-i18n'],
                        [['node_modules/pusher-js', 'node_modules/laravel-echo'], 'vendor-realtime'],
                    ];

                    for (const [patterns, chunk] of CHUNK_RULES) {
                        const isMatch = patterns.some(p => id.includes(p));
                        if (isMatch) {
                            return chunk;
                        }
                    }
                },
            },
        },
    },
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.{ts,tsx}'],
        setupFiles: ['tests/setup.ts'],
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        watch: {
            usePolling: false,
            ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/tests/**'],
        },
        proxy: {
            '/api': {
                target: 'http://backend:8000',
                changeOrigin: true,
                configure: (proxy) => {
                    proxy.on('proxyRes', (proxyRes, req) => {
                        const location = proxyRes.headers['location'];
                        const hasLocation = typeof location === 'string';
                        if (hasLocation) {
                            proxyRes.headers['location'] = location.replace(
                                /^https?:\/\/[^/]+/,
                                `http://${req.headers.host}`,
                            );
                        }
                    });
                },
            },
            '/sanctum': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
            '/storage': {
                target: 'http://caddy',
                changeOrigin: true,
            },
            '/app': {
                target: 'ws://reverb:8080',
                ws: true,
                changeOrigin: true,
            },
        },
    },
    preview: {
        host: '0.0.0.0',
        port: 4173,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
            '/sanctum': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
            '/storage': {
                target: 'http://caddy',
                changeOrigin: true,
            },
            '/app': {
                target: 'ws://reverb:8080',
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
