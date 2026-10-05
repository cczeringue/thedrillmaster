import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const site = fileURLToPath(new URL('../', import.meta.url));
const eventPath = '/shows/the-elysian-october-13-2026/';
const origin = 'https://www.thedrillmaster.gay';
const read = (path) => readFileSync(resolve(site, path), 'utf8');

test('duplicate event URLs permanently redirect to the sitemap canonical in either deployment layout', () => {
  for (const file of ['../vercel.json', 'vercel.json']) {
    const config = JSON.parse(read(file));
    for (const source of [eventPath.slice(0, -1), `${eventPath}index.html`]) {
      assert.ok(config.redirects?.some(rule => rule.source === source && rule.destination === eventPath && rule.permanent), `${file}: missing canonical redirect for ${source}`);
    }
  }
});

test('public event metadata is complete, parseable and consistent with its canonical URL', () => {
  const html = read(`${eventPath.slice(1)}index.html`);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const nodes = blocks.flatMap(block => block['@graph'] || [block]);
  const event = nodes.find(n => [].concat(n['@type']).includes('TheaterEvent'));
  assert.ok(event);
  assert.ok([].concat(event['@type']).includes('ComedyEvent'));
  assert.equal(event.url, origin + eventPath);
  assert.equal(event.location.address.addressLocality, 'Los Angeles');
  assert.equal(event.startDate, '2026-10-13T19:30:00-07:00');
  assert.match(event.offers.url, /^https:\/\/app\.opendate\.io\//);
  assert.ok(!('price' in event.offers), 'do not retain a stale price in search results');
  assert.ok(nodes.some(n => n['@type'] === 'WebPage' && n.mainEntity?.['@id'] === event['@id']));
  assert.match(html, new RegExp(`<link rel="canonical" href="${event.url}"`));
});

test('VIP stays excluded while public canonical pages remain discoverable', () => {
  const sitemap = read('public/sitemap.xml');
  assert.ok(sitemap.includes(origin + eventPath));
  assert.doesNotMatch(sitemap, /\/vip/i);
  assert.match(read('VIP/index.html'), /name="robots" content="[^"]*noindex/);
  for (const file of ['../vercel.json', 'vercel.json']) {
    const config = JSON.parse(read(file));
    for (const source of ['/VIP', '/vip']) {
      assert.ok(config.headers.some(rule => rule.source === source && rule.headers.some(h => h.key === 'X-Robots-Tag' && h.value.includes('noindex'))));
    }
  }
});
