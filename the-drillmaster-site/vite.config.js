import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: 'index.html',
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
