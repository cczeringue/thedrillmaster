// Render a share card using the original poster and website wordmark, without cropping either.
// Run from the site directory: node scripts/render-vip-preview.mjs
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const publicDir = new URL('../public/', import.meta.url);
const asset = async (path, type) => `data:${type};base64,${(await readFile(new URL(path, publicDir))).toString('base64')}`;
const poster = await asset('VIP/assets/elysian-announcement.png', 'image/png');
const logo = await asset('brand/title-black.svg', 'image/svg+xml');
const output = new URL('VIP/assets/', publicDir);
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; display: grid; grid-template-columns: 504px 696px; background: #1f1618; color: #1f1618; font-family: Palatino, Georgia, serif; }
    .poster { width: 480px; height: 600px; object-fit: contain; margin: 15px 12px; }
    .invitation { background: #e8e0d2; padding: 32px 42px 28px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-left: 2px solid #a68b5b; }
    .wordmark { width: 410px; height: auto; display: block; }
    .premise { margin: 15px 0 20px; font-size: 31px; font-style: italic; font-weight: bold; line-height: 1.15; }
    .event { width: 100%; padding-top: 20px; border-top: 1px solid #a68b5b; }
    .format { margin: 0 0 7px; font-size: 25px; font-style: italic; color: #4a353c; }
    .date { margin: 0 0 3px; font-size: 47px; font-weight: bold; line-height: 1.15; }
    .venue { margin: 0 0 7px; font-size: 35px; font-weight: bold; line-height: 1.2; }
    .city { margin: 0; font-size: 22px; color: #4a353c; }
    .list { margin: 22px 0 0; padding-top: 14px; border-top: 3px solid #c45f56; font-size: 24px; line-height: 1.2; font-weight: bold; }
  </style><body><img class="poster" src="${poster}" alt="The complete Elysian announcement poster"><section class="invitation"><img class="wordmark" src="${logo}" alt="The Drillmaster"><p class="premise">America’s GAYEST<br>founding Daddy.</p><div class="event"><p class="format">A developmental preview</p><p class="date">Oct 13 · 7:30 PM</p><p class="venue">The Elysian</p><p class="city">Los Angeles · 2026</p></div><p class="list">Creator's list · Tickets at no charge</p></section></body></html>`);
  await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); await document.fonts.ready; });
  const screenshot = await page.screenshot({ type: 'png' });
  await sharp(screenshot).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(new URL('vip-invitation-preview-20261013-v1.jpg', output).pathname);
} finally {
  await browser.close();
}

await sharp(new URL('brand/face-icon.svg', publicDir).pathname, { density: 192 })
  .resize(156, 156, { fit: 'contain', background: '#6b9a92' })
  .extend({ top: 18, bottom: 18, left: 18, right: 18, background: '#6b9a92' })
  .flatten({ background: '#6b9a92' }).png()
  .toFile(new URL('apple-touch-icon.png', output).pathname);
