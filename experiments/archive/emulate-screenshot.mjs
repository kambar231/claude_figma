import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Set viewport to iPhone 14 Pro logical pixels at 2x scale
  await page.setViewport({
    width: 393,
    height: 852,
    deviceScaleFactor: 2,
  });

  // Load the HTML file
  const htmlPath = path.join(__dirname, 'emulate-dev.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 15000 });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
  // Extra wait for font rendering
  await new Promise(r => setTimeout(r, 1000));

  // Take screenshot
  const outputPath = path.join(__dirname, 'emulate-dev-screenshot.png');
  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 393, height: 852 },
  });

  console.log(`Screenshot saved to: ${outputPath}`);
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
