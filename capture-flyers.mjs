import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const flyers = [
  { file: 'flyer-nerea-1.html', output: 'flyer-nerea-1.png', width: 1080, height: 1920 },
  { file: 'flyer-nerea-2.html', output: 'flyer-nerea-2.png', width: 1080, height: 1920 },
  { file: 'flyer-nerea-3.html', output: 'flyer-nerea-3.png', width: 1080, height: 1920 },
];

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

for (const f of flyers) {
  const page = await browser.newPage();
  await page.setViewport({ width: f.width, height: f.height, deviceScaleFactor: 2 });
  await page.goto(`file://${resolve(__dirname, f.file)}`, { waitUntil: 'networkidle0' });

  const el = await page.$('.flyer');
  await el.screenshot({ path: resolve(__dirname, f.output), type: 'png' });

  console.log(`✓ ${f.output}`);
  await page.close();
}

await browser.close();
console.log('Done!');
