#!/usr/bin/env node
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'dashboard', 'public');

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// Cloudflare Pages serves / from index.html. The dashboard source is named
// jarvis.html for local/server mode, so publish it as the static entrypoint.
copyFileSync(join(PUBLIC, 'jarvis.html'), join(DIST, 'index.html'));
copyFileSync(join(PUBLIC, 'jarvis.html'), join(DIST, 'jarvis.html'));
copyFileSync(join(PUBLIC, 'loading.html'), join(DIST, 'loading.html'));

// Keep deep links on the static dashboard instead of showing a Pages 404.
writeFileSync(join(DIST, '_redirects'), '/* /index.html 200\n');

console.log('Cloudflare Pages static build written to dist/');
