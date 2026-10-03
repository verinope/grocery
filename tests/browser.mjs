import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage(); const errors = []; const missing = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) missing.push(`${response.status()} ${response.url()}`); });
await mkdir('.test-output', { recursive: true });
const url = process.env.TEST_URL || 'http://localhost:5173';
const click = async name => {
  const scope = await page.locator('#sheet').evaluate(dialog => dialog.open) ? page.locator('#sheet') : page;
  await scope.getByRole('button', { name, exact: true }).click();
};
async function add(name, quantity = '', unit = '') {
  await click((await page.getByRole('button', { name: 'Tambah barang pertama' }).count()) ? 'Tambah barang pertama' : 'Tambah');
  await page.getByLabel('Nama barang', { exact: true }).fill(name);
  if (quantity) await page.locator('#item-quantity').fill(quantity);
  if (unit) await page.getByLabel('Satuan', { exact: true }).selectOption(unit);
  await click('Tambah ke list'); await page.locator('#sheet').waitFor({ state: 'hidden' });
}
try {
  await page.goto(url); await page.getByRole('heading', { name: 'List Belanja' }).waitFor();
  await page.screenshot({ path: '.test-output/empty.png', fullPage: true });
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 720;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 720);
    ctx.fillStyle = '#111'; ctx.font = '34px monospace';
    ['TOKO CONTOH', 'Tanggal 03/10/2026', '', 'MENTEGA          25.000', 'SUSU             30.000', 'BAYAM            10.000', '', 'TOTAL BAYAR      65.000', 'TUNAI           100.000', 'KEMBALI          35.000', '', 'TERIMA KASIH'].forEach((line, i) => ctx.fillText(line, 40, 60 + i * 50));
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await writeFile('.test-output/receipt.png', Buffer.from(fixture, 'base64'));
  await add('Mentega', '2', 'pcs'); await add('Susu'); await add('Bayam');
  assert.equal(await page.getByRole('button', { name: 'Selesai belanja', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: 'Centang Mentega', exact: true }).click();
  await page.getByRole('button', { name: 'Centang Susu', exact: true }).click();
  await page.getByRole('button', { name: 'Batalkan ceklis Susu', exact: true }).waitFor();
  await page.screenshot({ path: '.test-output/shopping.png', fullPage: true });
  await page.reload(); await page.getByRole('button', { name: 'Batalkan ceklis Mentega' }).waitFor();
  await page.getByRole('button', { name: 'Centang Bayam', exact: true }).click();
  await click('Selesai belanja'); await click('Simpan tanpa struk');
  await page.getByRole('heading', { name: 'Detail belanja' }).waitFor();
  assert.equal(await page.locator('.planned-row').count(), 3);
  const firstTrip = new URL(page.url()).hash;
  await page.getByRole('link', { name: 'List Belanja' }).click(); await add('Roti tawar');
  await page.goto(url + firstTrip); await click('Scan struk belanja'); await click('Scan struk belanja');
  await page.getByRole('heading', { name: 'Scan struk', exact: true }).waitFor();
  await page.locator('#gallery-input').setInputFiles('.test-output/receipt.png');
  await page.getByRole('heading', { name: 'Periksa hasil scan' }).waitFor({ timeout: 120000 });
  assert.equal(await page.locator('.actual-row').count(), 3);
  assert.match(await page.locator('.actual-list').innerText(), /MENTEGA/);
  assert.match(await page.locator('.total-line').innerText(), /65\.000/);
  await page.screenshot({ path: '.test-output/review.png', fullPage: true });
  await page.locator('.actual-row').first().click();
  await page.getByLabel('Nama produk', { exact: true }).fill('Mentega asin');
  await page.getByLabel('Harga produk (Rp)', { exact: true }).fill('25000'); await click('Simpan produk');
  await page.reload(); await page.getByText('Mentega asin', { exact: true }).waitFor();
  await click('Simpan ke riwayat'); await page.getByRole('heading', { name: 'Detail belanja' }).waitFor();
  assert.equal(await page.locator('.actual-row').count(), 3);
  await page.getByRole('tab', { name: 'List awal' }).click(); assert.equal(await page.locator('.planned-row').count(), 3);
  await page.getByRole('tab', { name: 'Aktual dibeli' }).click(); await click('Lihat struk');
  await page.locator('#full-receipt img').waitFor(); assert.equal(await page.locator('#full-receipt img').evaluate(async img => { await img.decode(); return img.naturalWidth; }), 800);
  await click('Tutup');
  await page.getByRole('link', { name: 'List Belanja' }).click(); await page.getByRole('button', { name: 'Centang Roti tawar' }).waitFor();
  assert.equal(await page.locator('.item-row').count(), 1);
  // Failed image commit must roll back the history write AND the list clearing.
  const rollback = await page.evaluate(async () => {
    const { loadState, commit } = await import('/src/storage.js'); const { beginDraft, archive } = await import('/src/domain.js');
    const before = await loadState(); const next = structuredClone(before); next.items[0].checked = true; beginDraft(next);
    Object.assign(next.draft, { hasPhoto: true, products: [{ name: 'Roti tawar', price: 20000 }], totalPayment: 20000 });
    const saved = archive(next, true); let failed = false;
    try { await commit(next, { archiveId: saved.id }); } catch { failed = true; }
    const after = await loadState(); return { failed, same: JSON.stringify(before) === JSON.stringify(after) };
  });
  assert.deepEqual(rollback, { failed: true, same: true });
  // Wait until installation has cached every local asset, then reload without a network.
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })); });
  await context.setOffline(true); await page.reload(); await page.getByRole('button', { name: 'Centang Roti tawar' }).waitFor();
  await page.getByRole('link', { name: 'Riwayat' }).click(); await page.locator('.trip-card').click();
  await click('Lihat struk'); await page.locator('#full-receipt img').waitFor(); await click('Tutup');
  await page.screenshot({ path: '.test-output/history-detail.png', fullPage: true });
  // Exercise the real WASM OCR again after a full offline reload.
  await page.getByRole('link', { name: 'List Belanja' }).click(); await page.getByRole('button', { name: 'Centang Roti tawar' }).click();
  await click('Selesai belanja'); await click('Scan struk belanja');
  await page.locator('#gallery-input').setInputFiles('.test-output/receipt.png');
  await page.getByRole('heading', { name: 'Periksa hasil scan' }).waitFor({ timeout: 120000 });
  assert.equal(await page.locator('.actual-row').count(), 3);
  await click('Simpan ke riwayat'); await page.getByRole('heading', { name: 'Detail belanja' }).waitFor();
  await page.getByRole('link', { name: 'Riwayat' }).click();
  await page.locator('.trip-card').nth(1).waitFor();
  assert.equal(await page.locator('.trip-card').count(), 2);
  assert.deepEqual(errors, []); assert.deepEqual(missing, []);
  for (const width of [320, 390, 430, 1000]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); assert.equal(overflow, false, `horizontal overflow at ${width}px`);
  }
  console.log('PASS: list, reload, history, attachment, real OCR, correction, photo persistence, atomic rollback, offline OCR, responsive widths.');
} finally { await browser.close(); }
