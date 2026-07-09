import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.PORT) || 3000;

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    host: true,
  },
  preview: {
    port,
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
});
