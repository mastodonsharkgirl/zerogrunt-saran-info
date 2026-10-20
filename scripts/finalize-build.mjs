import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const html = await readFile('dist/index.html', 'utf8');
const hashes = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map((match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
await writeFile('dist/_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' ${hashes.join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
`);
await sharp('public/social.svg').resize(1200, 630).png().toFile('dist/social.png');
await writeFile('dist/robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://zerogrunt.saran.info/sitemap.xml\n');
await writeFile('dist/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://zerogrunt.saran.info/</loc></url></urlset>\n');
