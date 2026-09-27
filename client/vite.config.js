import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the client calls "/api", which is proxied to the Express server.
// In production set VITE_API_BASE_URL to the deployed API (e.g. https://zodon-api.onrender.com/api).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_DEV_API_PROXY || 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
  },
});
