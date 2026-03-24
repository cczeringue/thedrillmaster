import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto('file://' + resolve(__dirname, 'og-template.html'));
// Wait for fonts to load
await page.waitForTimeout(2000);
await page.screenshot({ path: resolve(__dirname, 'public/og-image.png'), type: 'png' });
await browser.close();
console.log('Generated public/og-image.png (1200x630)');
