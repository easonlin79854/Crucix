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
  { site: '馬鞍山核電廠（台灣）', anom: false, cpm: null, n: 0, lat: 21.96, lon: 120.75 },
  { site: '福島第一核電廠（日本）', anom: false, cpm: null, n: 0, lat: 37.42, lon: 141.03 },
  { site: '柏崎刈羽核電廠（日本）', anom: false, cpm: null, n: 0, lat: 37.43, lon: 138.60 },
  { site: '古里核電廠（韓國）', anom: false, cpm: null, n: 0, lat: 35.32, lon: 129.30 },
  { site: '秦山核電廠（中國）', anom: false, cpm: null, n: 0, lat: 30.44, lon: 120.94 },
  { site: '庫丹庫拉姆核電廠（印度）', anom: false, cpm: null, n: 0, lat: 8.17, lon: 77.71 },
];

const STATIC_ASIAN_NEWS_FALLBACK = [
  { title: '亞洲新聞來源已設定：中央社 CNA 國際、兩岸、財經 RSS', source: 'CNA Taiwan', date: new Date().toISOString(), region: 'Taiwan', lat: 25.033, lon: 121.565 },
  { title: '亞洲新聞來源已設定：CNA Singapore Asia、Business、World RSS', source: 'CNA Singapore', date: new Date().toISOString(), region: 'Singapore', lat: 1.352, lon: 103.820 },
  { title: '亞洲新聞來源已設定：Nikkei Asia RSS', source: 'Nikkei Asia', date: new Date().toISOString(), region: 'Japan', lat: 35.681, lon: 139.767 },
  { title: '亞洲新聞來源已設定：Indian Express 與 The Hindu RSS', source: 'Indian Express', date: new Date().toISOString(), region: 'India', lat: 28.6139, lon: 77.209 },
  { title: '亞洲新聞來源已設定：Bangkok Post Thailand 與 World RSS', source: 'Bangkok Post', date: new Date().toISOString(), region: 'Thailand', lat: 13.756, lon: 100.501 },
];


const STATIC_ASIAN_AIR = [
  { region: 'Taiwan Strait', total: 56, noCallsign: 5, highAlt: 4, top: [['中國', 19], ['台灣', 14], ['韓國', 10], ['日本', 5]] },
  { region: 'South China Sea', total: 115, noCallsign: 5, highAlt: 3, top: [['中國', 56], ['菲律賓', 12], ['馬來西亞', 9], ['日本', 6]] },
  { region: 'Korean Peninsula', total: 8, noCallsign: 0, highAlt: 3, top: [['美國', 4], ['中國', 1], ['日本', 1], ['韓國', 1]] },
  { region: 'East China Sea', total: 42, noCallsign: 3, highAlt: 2, top: [['日本', 18], ['中國', 14], ['台灣', 6]] },
  { region: 'Japan Airspace', total: 74, noCallsign: 2, highAlt: 7, top: [['日本', 49], ['美國', 8], ['韓國', 5]] },
  { region: 'Philippines', total: 38, noCallsign: 2, highAlt: 1, top: [['菲律賓', 20], ['中國', 8], ['日本', 4]] },
  { region: 'Strait of Malacca', total: 63, noCallsign: 4, highAlt: 2, top: [['新加坡', 24], ['馬來西亞', 15], ['印尼', 12]] },
  { region: 'Bay of Bengal', total: 29, noCallsign: 1, highAlt: 1, top: [['印度', 15], ['孟加拉', 5], ['泰國', 3]] },
  { region: 'South Asia', total: 91, noCallsign: 6, highAlt: 4, top: [['印度', 44], ['巴基斯坦', 12], ['孟加拉', 8]] },
  { region: 'Middle East', total: 134, noCallsign: 5, highAlt: 4, top: [['土耳其', 30], ['阿聯', 24], ['卡達', 6]] },
];

const STATIC_ASIAN_THERMAL = [
  { region: 'Taiwan', det: 18, night: 4, hc: 2, fires: [{ lat: 23.5, lon: 121.0, frp: 12.1 }] },
  { region: 'South China Sea', det: 126, night: 22, hc: 8, fires: [{ lat: 14.1, lon: 114.0, frp: 33.4 }] },
  { region: 'East China Sea', det: 35, night: 5, hc: 3, fires: [{ lat: 29.0, lon: 126.0, frp: 15.2 }] },
  { region: 'Korean Peninsula', det: 44, night: 7, hc: 2, fires: [{ lat: 37.0, lon: 127.0, frp: 10.5 }] },
  { region: 'Japan', det: 61, night: 9, hc: 4, fires: [{ lat: 37.4, lon: 141.0, frp: 18.6 }] },
  { region: 'Philippines', det: 98, night: 18, hc: 6, fires: [{ lat: 13.0, lon: 122.0, frp: 26.9 }] },
  { region: 'Myanmar', det: 27005, night: 5285, hc: 384, fires: [{ lat: 17.69662, lon: 97.04257, frp: 541.71 }] },
  { region: 'South Asia', det: 19132, night: 3268, hc: 331, fires: [{ lat: 21.99852, lon: 92.34525, frp: 435.64 }] },
];

const STATIC_ASIAN_CHOKEPOINTS = [
  { label: '台灣海峽', note: '半導體與東亞航運要道', lat: 24, lon: 119 },
  { label: '南海', note: '東亞能源與貨櫃航線集中區', lat: 14, lon: 114 },
  { label: '麻六甲海峽', note: '亞洲能源與貿易咽喉', lat: 2.5, lon: 101.5 },
  { label: '東海', note: '日中韓台交會海域', lat: 29, lon: 126 },
  { label: '孟加拉灣', note: '印度洋與東南亞連接區', lat: 15, lon: 89 },
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
    air: STATIC_ASIAN_AIR,
    thermal: STATIC_ASIAN_THERMAL,
    chokepoints: STATIC_ASIAN_CHOKEPOINTS,
    tSignals: [
      'HIGH INTENSITY FIRES in South China Sea: 8 detections >10MW FRP',
      'ELEVATED NIGHT ACTIVITY in Myanmar: 5285 night detections',
      'HIGH INTENSITY FIRES in South Asia: 12 detections >10MW FRP',
    ],
    nuke: STATIC_ASIAN_NUCLEAR_SITES,
    nukeSignals: ['亞洲核電廠靜態快照已設定；即時 CPM 需使用 Node 掃描伺服器。'],
    news,
    newsFeed: newsToFeed(news),
    ideas: [],
    ideasSource: 'removed',
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
