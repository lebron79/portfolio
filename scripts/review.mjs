// Scrolls the local site and saves screenshots for visual review.
// Usage: node scripts/review.mjs <outDir> [width] [height] [fractions...]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const [out, W = '1440', H = '900', ...fr] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: +W, height: +H });
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://localhost:5500/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 4500));
const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
console.log('scroll max', max);
const stops = fr.length ? fr.map(Number) : [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];
for (const [i, f] of stops.entries()) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(max * f));
  await new Promise((r) => setTimeout(r, 1600));
  await page.screenshot({ path: `${out}/s${String(i).padStart(2, '0')}-${Math.round(f * 100)}.png` });
}
await browser.close();
