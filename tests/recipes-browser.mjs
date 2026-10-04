import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage(); const errors = [], missing = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) missing.push(`${response.status()} ${response.url()}`); });
const url = process.env.TEST_URL || 'http://localhost:5173';
const click = name => page.getByRole('button', { name, exact: true }).click();
const state = () => page.evaluate(async () => (await import('/src/storage.js')).loadState());
const choose = name => page.locator('.recipe-pick-row').filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) }).getByRole('checkbox');
await mkdir('.test-output', { recursive: true });
try {
  await page.goto(url); await page.getByRole('heading', { name: 'List Belanja' }).waitFor();
  // Seed genuine stored history and an existing item with user-entered quantity.
  await page.evaluate(async () => {
    const { initialState, addItem, beginDraft, archive } = await import('/src/domain.js');
    const { commit } = await import('/src/storage.js');
    const next = initialState(); addItem(next, { name: 'Susu' }); next.items[0].checked = true; beginDraft(next); archive(next);
    addItem(next, { name: 'Bawang putih', quantity: '2', unit: 'pcs' }); next.items[0].checked = true;
    await commit(next);
  });
  await page.reload(); await page.getByRole('button', { name: 'Batalkan ceklis Bawang putih' }).waitFor();
  const before = await state();
  assert.equal(await page.locator('#navigation a').count(), 2);
  await click('Mau masak apa? Cari resep dan pilih bahan untuk dibeli.');
  await page.getByPlaceholder('Cari nama masakan').waitFor();
  assert.equal(await page.locator('#recipe-count').innerText(), '100 resep Indonesia');
  assert.equal(await page.locator('#navigation').isVisible(), false);
  await page.getByPlaceholder('Cari nama masakan').fill('margarin');
  assert.equal(await page.locator('.recipe-card').count(), 0);
  await page.getByPlaceholder('Cari nama masakan').fill('  AYAM   KECAP ');
  assert.equal(await page.locator('.recipe-card').count(), 1);
  await page.locator('.recipe-card').click(); await page.getByRole('heading', { name: 'Ayam kecap', exact: true }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'CC BY-SA 4.0' }).getAttribute('href'), 'https://creativecommons.org/licenses/by-sa/4.0/');
  await page.screenshot({ path: '.test-output/recipe-detail.png', fullPage: true });
  await click('Pilih bahan untuk dibeli');
  await page.getByRole('heading', { name: 'Pilih bahan', exact: true }).waitFor();
  assert.equal(await choose('Bawang putih').isDisabled(), true);
  assert.equal(await choose('Jeruk lemon').count(), 1);
  assert.equal(await page.locator('.recipe-pick-row').count(), 8);
  assert.equal(await page.locator('[data-action="recipe-add"]').isDisabled(), true);
  await choose('Ayam').check(); await choose('Jeruk lemon').check();
  await click('Ubah Bawang putih'); await page.locator('#item-quantity').fill('4');
  await click('Simpan perubahan'); await page.locator('#sheet').waitFor({ state: 'hidden' });
  before.items[0].quantity = '4';
  assert.equal(await choose('Ayam').isChecked(), true);
  assert.equal(await choose('Jeruk lemon').isChecked(), true);
  assert.match(await page.locator('.recipe-existing').innerText(), /4 pcs/);
  await page.screenshot({ path: '.test-output/recipe-select.png' });
  await click('Tambahkan 2 bahan ke list');
  await page.getByRole('heading', { name: '2 bahan ditambahkan' }).waitFor();
  await click('Lihat list belanja'); await page.getByRole('heading', { name: 'List Belanja' }).waitFor();
  const added = await state();
  assert.equal(added.items.length, 3); assert.deepEqual(added.items[0], before.items[0]);
  assert.deepEqual(added.trips, before.trips); assert.equal(added.listId, before.listId);
  assert.equal(added.items.find(item => item.name === 'Ayam').quantity, '');
  assert.match(added.items.find(item => item.name === 'Jeruk lemon').recipeReference, /2 sdm.*3 sdm/);
  assert.equal(await page.locator('[data-action="finish"]').isDisabled(), true);
  await click('Ubah Ayam');
  assert.match(await page.locator('.recipe-reference').innerText(), /1 ekor ayam/);
  await page.locator('#item-quantity').fill('1.5'); await page.locator('#item-unit').selectOption('kg');
  await click('Simpan perubahan'); await page.locator('#sheet').waitFor({ state: 'hidden' });
  await page.reload(); await page.getByRole('button', { name: 'Centang Ayam', exact: true }).waitFor();
  assert.equal((await state()).items.find(item => item.name === 'Ayam').quantity, '1.5');
  await page.screenshot({ path: '.test-output/recipe-shopping-list.png', fullPage: true });
  // A concurrent storage change causes an atomic rejection, preserves choices, and allows retry.
  await page.goto(url + '/#recipe-pick/ayam-kecap');
  await choose('Garam').waitFor(); await choose('Garam').check(); await choose('Margarin').check();
  await page.evaluate(async () => {
    const { loadState, commit } = await import('/src/storage.js'); const { addItem } = await import('/src/domain.js');
    const next = await loadState(); addItem(next, { name: 'Garam', quantity: '3', unit: 'bungkus' }); await commit(next);
  });
  await click('Tambahkan 2 bahan ke list');
  await page.getByRole('button', { name: 'Tambahkan 1 bahan ke list' }).waitFor();
  assert.equal(await choose('Garam').isDisabled(), true);
  assert.equal(await choose('Margarin').isChecked(), true);
  assert.equal((await state()).items.some(item => item.name === 'Margarin'), false);
  await click('Tambahkan 1 bahan ke list'); await click('Lihat list belanja');
  assert.equal((await state()).items.find(item => item.name === 'Garam').quantity, '3');
  assert.equal((await state()).items.filter(item => item.name === 'Margarin').length, 1);
  // Reload without network: the complete catalog and add-to-list flow must still work.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  await context.setOffline(true); await page.goto(url + '/#recipes'); await page.reload();
  await page.getByPlaceholder('Cari nama masakan').waitFor();
  assert.equal(await page.locator('#recipe-count').innerText(), '100 resep Indonesia');
  await click('Sayur'); assert.equal(await page.locator('#recipe-count').innerText(), '18 resep');
  await click('Semua');
  while (await page.locator('#recipe-more').isVisible()) await click('Lihat resep lainnya');
  assert.equal(await page.locator('.recipe-card').count(), 100);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.test-output/recipe-catalog.png' });
  await page.getByPlaceholder('Cari nama masakan').fill('ayam kecap'); await page.locator('.recipe-card').click();
  await click('Pilih bahan untuk dibeli'); await choose('Bawang bombai').check();
  await click('Tambahkan 1 bahan ke list'); await click('Lihat list belanja');
  assert.equal((await state()).items.find(item => item.name === 'Bawang bombai').quantity, '');
  // Recipe-added items use the unchanged all-checked -> history flow.
  const unchecked = await page.locator('.item-toggle[aria-pressed=false]').count();
  for (let index = 0; index < unchecked; index++) {
    await page.locator('.item-toggle[aria-pressed=false]').first().click();
    await page.waitForFunction(expected => document.querySelectorAll('.item-toggle[aria-pressed=false]').length === expected, unchecked - index - 1);
  }
  await click('Selesai belanja'); await click('Simpan tanpa struk');
  await page.getByRole('heading', { name: 'Detail belanja' }).waitFor();
  assert.equal(await page.locator('.planned-row').count(), 6);
  const finished = await state(); assert.equal(finished.trips.length, 2); assert.equal(finished.items.length, 0);
  assert.equal(finished.trips[0].planned.find(item => item.name === 'Ayam').quantity, '1.5');
  // Check each screen against narrow phones and larger displays.
  for (const hash of ['#list', '#recipes', '#recipe/ayam-kecap', '#recipe-pick/ayam-kecap']) {
    await page.goto(url + '/' + hash); await page.locator('.page-header h1').waitFor();
    if (hash === '#recipes') await page.locator('#recipe-search').waitFor();
    if (hash === '#recipe/ayam-kecap') await page.locator('.recipe-source').waitFor();
    if (hash === '#recipe-pick/ayam-kecap') await page.locator('.recipe-pick-row').first().waitFor();
    for (const width of [320, 390, 430, 1000]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${hash} ${width}`);
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(missing, []);
  await writeFile('.test-output/recipe-verification.json', JSON.stringify({ passed: true, recipes: 100, checks: ['name-only search', 'categories', 'source attribution', 'selection and grouped references', 'unchanged existing quantities and history', 'manual quantity editing and reload', 'atomic concurrent-change rejection and retry', 'offline catalog and additions', 'all-checked archiving', 'responsive 320/390/430/1000px'], errors, missing }, null, 2));
  console.log('PASS: 100 recipes, name search, ingredients, preserved quantities, concurrent retry, offline catalog, history, responsive screens.');
} finally { await browser.close(); }
