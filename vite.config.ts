import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { handleApiRequest } from './server/storage';

try {
  process.loadEnvFile?.();
} catch {
  // .env is optional; the economic calendar has a public fallback provider.
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-storage-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            const handled = handleApiRequest(req, res);
            if (handled) return;
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            const handled = handleApiRequest(req, res);
            if (handled) return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
