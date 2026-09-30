// Grabs frames from a local video with headless Chrome.
// Usage: node scripts/frames.mjs <video> <outPrefix> <count>
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';

const [video, prefix, count = '12'] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(pathToFileURL(video).href);
await page.addStyleTag({ content: 'body{margin:0;background:#000} video{width:100vw;height:100vh;object-fit:contain}' });
const dur = await page.evaluate(() => new Promise((r) => {
  const v = document.querySelector('video');
  v.pause(); v.controls = false;
  if (v.readyState >= 1) r(v.duration); else v.onloadedmetadata = () => r(v.duration);
}));
console.log('duration', dur);
// count is either a frame count (evenly spaced) or a comma-separated list of seconds
const times = count.includes(',') ? count.split(',').map(Number) : [...Array(Number(count))].map((_, i) => (dur * (i + 0.5)) / Number(count));
for (const [i, t] of times.entries()) {
  await page.evaluate((t) => new Promise((r) => {
    const v = document.querySelector('video');
    v.onseeked = () => r();
    v.currentTime = t;
  }), t);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${prefix}-${String(i).padStart(2, '0')}.png` });
}
await browser.close();
