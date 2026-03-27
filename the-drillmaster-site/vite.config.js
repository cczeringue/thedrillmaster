import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        caleb: resolve(__dirname, 'caleb-zeringue.html'),
        jenny: resolve(__dirname, 'jenny-zigrino.html'),
      },
    },
  },
  server: {
    open: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://www.thedrillmaster.gay',
        changeOrigin: true,
      },
    },
  },
});
