#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { fetchAllNews } from '../dashboard/inject.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'dashboard', 'public');

const STATIC_ASIAN_NUCLEAR_SITES = [
  { site: 'Maanshan NPP (Taiwan)', anom: false, cpm: null, n: 0, lat: 21.96, lon: 120.75 },
  { site: 'Fukushima Daiichi (Japan)', anom: false, cpm: null, n: 0, lat: 37.42, lon: 141.03 },
  { site: 'Kashiwazaki-Kariwa NPP (Japan)', anom: false, cpm: null, n: 0, lat: 37.43, lon: 138.60 },
  { site: 'Kori NPP (South Korea)', anom: false, cpm: null, n: 0, lat: 35.32, lon: 129.30 },
  { site: 'Qinshan NPP (China)', anom: false, cpm: null, n: 0, lat: 30.44, lon: 120.94 },
  { site: 'Kudankulam NPP (India)', anom: false, cpm: null, n: 0, lat: 8.17, lon: 77.71 },
];

const STATIC_ASIAN_NEWS_FALLBACK = [
  { title: '亞洲新聞來源已設定：中央社 CNA 國際、兩岸、財經 RSS', source: 'CNA Taiwan', date: new Date().toISOString(), region: 'Taiwan', lat: 25.033, lon: 121.565 },
  { title: '亞洲新聞來源已設定：CNA Singapore Asia、Business、World RSS', source: 'CNA Singapore', date: new Date().toISOString(), region: 'Singapore', lat: 1.352, lon: 103.820 },
  { title: '亞洲新聞來源已設定：Nikkei Asia RSS', source: 'Nikkei Asia', date: new Date().toISOString(), region: 'Japan', lat: 35.681, lon: 139.767 },
  { title: '亞洲新聞來源已設定：Indian Express 與 The Hindu RSS', source: 'Indian Express', date: new Date().toISOString(), region: 'India', lat: 28.6139, lon: 77.209 },
  { title: '亞洲新聞來源已設定：Bangkok Post Thailand 與 World RSS', source: 'Bangkok Post', date: new Date().toISOString(), region: 'Thailand', lat: 13.756, lon: 100.501 },
];


function replaceInlineData(html, transformData) {
  return html.replace(/let D = (.*);\n\/\/ === I18N ===/s, (match, json) => {
    const data = JSON.parse(json);
    const nextData = transformData(data);
    return `let D = ${JSON.stringify(nextData)};\n// === I18N ===`;
  });
}

async function loadStaticAsianNews() {
  if (process.env.CRUCIX_STATIC_FETCH_NEWS !== '1') return [];

  try {
    return await fetchAllNews();
  } catch (err) {
    console.warn(`Static Asian news fetch skipped: ${err.message}`);
    return [];
  }
}

function newsToFeed(news) {
  return news.slice(0, 50).map(item => ({
    headline: item.title,
    source: item.source,
    type: 'rss',
    timestamp: item.date,
    region: item.region,
    urgent: false,
    url: item.url,
  }));
}

async function prepareDashboardHtml() {
  const html = readFileSync(join(PUBLIC, 'jarvis.html'), 'utf8');
  const fetchedNews = await loadStaticAsianNews();
  const news = fetchedNews.length ? fetchedNews : STATIC_ASIAN_NEWS_FALLBACK;

  return replaceInlineData(html, data => ({
    ...data,
    nuke: STATIC_ASIAN_NUCLEAR_SITES,
    nukeSignals: ['Asian nuclear plant static snapshot configured; live CPM updates require the Node sweep server.'],
    news,
    newsFeed: newsToFeed(news),
  }));
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// Cloudflare Pages serves / from index.html. The dashboard source is named
// jarvis.html for local/server mode, so publish it as the static entrypoint.
const dashboardHtml = await prepareDashboardHtml();
writeFileSync(join(DIST, 'index.html'), dashboardHtml);
writeFileSync(join(DIST, 'jarvis.html'), dashboardHtml);
copyFileSync(join(PUBLIC, 'loading.html'), join(DIST, 'loading.html'));

// Keep deep links on the static dashboard instead of showing a Pages 404.
writeFileSync(join(DIST, '_redirects'), '/* /index.html 200\n');

console.log('Cloudflare Pages static build written to dist/');
