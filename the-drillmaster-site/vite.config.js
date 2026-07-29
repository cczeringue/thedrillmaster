import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { subscribeEmail } from './api/subscribe.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function localSubscribeApi() {
  return {
    name: 'local-subscribe-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0];
        if (path !== '/api/subscribe') return next();

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString('utf8');
          const body = raw ? JSON.parse(raw) : {};
          const env = loadEnv(server.config.mode, __dirname, '');
          const result = await subscribeEmail(body.email, {
            ...process.env,
            ...env,
          });
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.body));
        } catch (err) {
          console.error('Local subscribe API error', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Subscription failed. Please try again.' }));
        }
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [localSubscribeApi()],
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
  },
});
