/**
 * ExpD Phase 2: Extract measurements from the HTML simulation
 * and take a screenshot for reference.
 *
 * Usage: node experiments/expD-extract.mjs
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'expD-chat.html');
const screenshotPath = path.join(__dirname, 'expD-result.png');
const measurementsPath = path.join(__dirname, 'expD-measurements.json');

async function main() {
  console.log('[ExpD] Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });

  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  console.log('[ExpD] Loading:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'load' });

  // Wait a moment for rendering
  await new Promise(r => setTimeout(r, 500));

  // Extract measurements
  const measurements = await page.evaluate(() => {
    return extractMeasurements();
  });

  fs.writeFileSync(measurementsPath, JSON.stringify(measurements, null, 2));
  console.log('[ExpD] Measurements saved to:', measurementsPath);
  console.log(JSON.stringify(measurements, null, 2));

  // Take screenshot
  const phoneEl = await page.$('#phone');
  await phoneEl.screenshot({ path: screenshotPath, type: 'png' });
  console.log('[ExpD] Screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('[ExpD] Done.');
}

main().catch(err => {
  console.error('[ExpD] Error:', err);
  process.exit(1);
});
