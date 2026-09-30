// Checks hover fan-out, case overlay and mobile layout.
import puppeteer from 'puppeteer-core';
const out = process.argv[2];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:5500/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 7000));
await page.screenshot({ path: `${out}/i0-hero.png` });
const y = await page.evaluate(() => document.querySelector('.project').getBoundingClientRect().top + scrollY - 120);
await page.evaluate((y) => scrollTo(0, y), y);
await new Promise((r) => setTimeout(r, 2500));
const box = await (await page.$('.project .project__frame')).boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${out}/i1-hover.png` });
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await new Promise((r) => setTimeout(r, 2200));
await page.screenshot({ path: `${out}/i2-case.png` });
await page.keyboard.press('ArrowRight');
await new Promise((r) => setTimeout(r, 900));
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${out}/i3-closed.png` });
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5500/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 7000));
const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const ow = await page.evaluate(() => document.documentElement.scrollWidth);
console.log('mobile scrollWidth', ow);
for (const f of [0, 0.2, 0.4, 0.55, 0.8, 1]) {
  await page.evaluate((y) => scrollTo(0, y), Math.round(max * f));
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${out}/m-${Math.round(f * 100)}.png` });
}
await browser.close();
