import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { subscribeEmail } from './api/subscribe.js';
import { handleVipRsvp } from './server/vip-rsvp.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function localVip() {
  return {
    name: 'local-vip',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0];
        if (/^\/VIP(?:\/|$)/.test(path) || path === '/vip' || path === '/vip/') {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
          if (path === '/VIP' || path === '/vip' || path === '/vip/') {
            req.url = req.url.replace(path, '/VIP/index.html');
          }
        }
        if (path !== '/api/vip-rsvp') return next();
        try {
          const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : Readable.toWeb(req);
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method, headers: req.headers, body, duplex: 'half',
          });
          const response = await handleVipRsvp(request, {
            env: { ...process.env, ...loadEnv(server.config.mode, __dirname, '') },
          });
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ error: 'Your RSVP has not been verified. Please try again.' }));
        }
      });
    },
  };
}

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
  plugins: [localSubscribeApi(), localVip()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        caleb: resolve(__dirname, 'caleb-zeringue.html'),
        jenny: resolve(__dirname, 'jenny-zigrino.html'),
        vip: resolve(__dirname, 'VIP/index.html'),
      },
    },
  },
  server: {
    open: true,
    port: 3000,
  },
});
