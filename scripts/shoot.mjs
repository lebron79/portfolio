// Captures screenshots of the showcased projects into public/shots.
// Usage: node scripts/shoot.mjs <jobs.json>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outDir = path.resolve('public/shots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--ignore-certificate-errors'],
});

for (const job of jobs) {
  const page = await browser.newPage();
  await page.setViewport({ width: job.width ?? 1440, height: job.height ?? 900, deviceScaleFactor: 1 });
  if (job.cookie) {
    const [name, value] = job.cookie.split('=');
    await page.setCookie({ name, value, url: new URL(job.url).origin });
  }
  if (job.storage) await page.evaluateOnNewDocument((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, job.storage);
  try {
    await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 60000 });
    for (const step of job.steps ?? []) {
      if (step.click) await page.evaluate((t) => {
        const el = [...document.querySelectorAll('button, a, [role=tab], li, div, span')]
          .find((e) => e.textContent.trim() === t);
        el?.click();
      }, step.click);
      if (step.eval) await page.evaluate(step.eval);
      if (step.css) await page.addStyleTag({ content: step.css });
      if (step.scroll) await page.evaluate((y) => window.scrollTo(0, y), step.scroll);
    }
    if (job.css) await page.addStyleTag({ content: job.css });
    await new Promise((r) => setTimeout(r, job.wait ?? 1500));
    const file = path.join(outDir, `${job.name}.png`);
    await page.screenshot({ path: file });
    console.log('ok', job.name, page.url());
  } catch (e) {
    console.log('fail', job.name, e.message);
  }
  await page.close();
}
await browser.close();
