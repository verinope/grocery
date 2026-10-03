// Runs the Android OCR branch against assets extracted from the actual APK.
// This validates packaging; it does not replace testing Android camera/WebView.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve('.test-output/apk-web');
const types = { '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer(async (req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>APK OCR test</title>'); return; }
  try {
    const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(path); res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage(); const failures = []; const requests = [];
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  page.on('request', req => requests.push(req.url()));
  await page.addInitScript(() => { window.androidBridge = { postMessage() {} }; });
  await page.goto(base);
  const receipt = (await readFile('.test-output/receipt.png')).toString('base64');
  const result = await page.evaluate(async data => {
    const { isNative } = await import('/src/platform.js');
    const { recognizeReceipt } = await import('/src/ocr.js');
    const photo = await (await fetch('data:image/png;base64,' + data)).blob();
    const result = await recognizeReceipt(photo, () => {});
    return { isNative, names: result.products.map(p => p.name), total: result.totalPayment };
  }, receipt);
  assert.equal(result.isNative, true); assert.equal(result.names.length, 3); assert.equal(result.total, 65000);
  assert.deepEqual(failures, []);
  assert.ok(requests.some(url => url.endsWith('/eng.traineddata')));
  assert.ok(!requests.some(url => url.endsWith('/eng.traineddata.gz')));
  assert.ok(requests.every(url => url.startsWith(base) || url.startsWith('blob:') || url.startsWith('data:')));
  const report = JSON.parse(await readFile('artifacts/verification.json', 'utf8'));
  report.androidOcrBranchWithPackagedAssetsTestedInChromium = true;
  await writeFile('artifacts/verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log('PASS: real OCR using APK assets and the Android uncompressed model branch; no external requests.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
