import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor', '@monaco-editor/react'],
          yjs: ['yjs', 'y-websocket', 'y-monaco'],
          livekit: ['livekit-client', '@livekit/components-react'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        configure: (proxy) => {
          // Rewrite Set-Cookie so refresh tokens work on localhost (Vite dev proxy)
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie'];
            if (!cookies) return;
            proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
              cookie
                .replace(/; Secure/gi, '')
                .replace(/; SameSite=None/gi, '; SameSite=Lax'),
            );
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
      },
      '/yjs': {
        target: 'http://localhost:8000',
        ws: true,
      },
    },
  },
});
