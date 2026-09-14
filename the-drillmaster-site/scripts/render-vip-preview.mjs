// Use the original poster alone as the share image. Event details live in the page metadata.
// Run from the site directory: node scripts/render-vip-preview.mjs
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const publicDir = new URL('../public/', import.meta.url);
const output = new URL('VIP/assets/', publicDir);
await mkdir(output, { recursive: true });

await sharp(new URL('VIP/assets/elysian-announcement.png', publicDir).pathname)
  .rotate()
  .resize({ width: 960, withoutEnlargement: true })
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile(new URL('vip-poster-preview-20261013-v2.jpg', output).pathname);

await sharp(new URL('brand/face-icon.svg', publicDir).pathname, { density: 192 })
  .resize(156, 156, { fit: 'contain', background: '#6b9a92' })
  .extend({ top: 18, bottom: 18, left: 18, right: 18, background: '#6b9a92' })
  .flatten({ background: '#6b9a92' }).png()
  .toFile(new URL('apple-touch-icon.png', output).pathname);
