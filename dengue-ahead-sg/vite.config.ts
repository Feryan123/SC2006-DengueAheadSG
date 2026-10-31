// - Run the React frontend locally.
// - Use the existing deployed address-search API during local UI checks.
// - Production continues to use this repository's own server functions.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/onemap-search': {
        target: 'https://dengue-ahead-sg-three.vercel.app',
        changeOrigin: true,
      },
    },
  },
});
