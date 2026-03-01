import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            '@context': resolve(__dirname, 'src/context'),
            '@components': resolve(__dirname, 'src/components'),
            '@ui': resolve(__dirname, 'src/components/ui'),
            '@pages': resolve(__dirname, 'src/pages'),
            '@styles': resolve(__dirname, 'src/styles'),
        },
    },
    plugins: [
        react({
            babel: {
                plugins: [['babel-plugin-react-compiler']],
            },
        }),
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
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
        },
    },
});
