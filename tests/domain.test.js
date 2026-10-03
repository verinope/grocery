import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, addItem, allChecked, beginDraft, archive } from '../src/domain.js';
import { parseReceipt, parseRupiah } from '../src/receipt.js';
import { suggestions } from '../src/catalog.js';
function completedList() { const state = initialState(); addItem(state, { name: 'Mentega', quantity: '2', unit: 'pcs' }); state.items[0].checked = true; return state; }
test('completion requires a nonempty fully checked list', () => {
  const state = initialState(); assert.equal(allChecked(state), false); assert.throws(() => beginDraft(state));
  addItem(state, { name: 'Telur' }); assert.throws(() => beginDraft(state));
  state.items[0].checked = true; assert.equal(allChecked(state), true);
});
test('archive preserves planned items and time, creates a fresh list, and prevents duplicate save', () => {
  const state = completedList(); const listId = state.listId; beginDraft(state);
  const trip = archive(state, false, '2026-10-03T03:00:00.000Z');
  assert.equal(trip.planned[0].name, 'Mentega'); assert.equal(trip.planned[0].quantity, '2');
  assert.equal(trip.completedAt, '2026-10-03T03:00:00.000Z'); assert.equal(trip.actual, null);
  assert.equal(state.items.length, 0); assert.notEqual(state.listId, listId); assert.equal(state.trips.length, 1);
  assert.throws(() => archive(state));
});
test('editing the list during receipt review cannot archive a stale snapshot', () => {
  const state = completedList(); beginDraft(state); state.items[0].quantity = '3';
  assert.throws(() => archive(state), /berubah/); assert.equal(state.items.length, 1); assert.equal(state.trips.length, 0);
});
test('attaching a receipt later preserves shopping date, planned list, and the new active list', () => {
  const state = completedList(); beginDraft(state); const trip = archive(state, false, '2026-10-01T03:00:00.000Z');
  addItem(state, { name: 'Bayam' }); const newList = state.listId; beginDraft(state, trip.id);
  Object.assign(state.draft, { hasPhoto: true, products: [{ name: 'Mentega asin', price: 25000 }], totalPayment: 24000, rawText: 'MENTEGA 25.000\nTOTAL 24.000' });
  archive(state, true, '2026-10-03T05:00:00.000Z');
  assert.equal(state.trips.length, 1); assert.equal(state.trips[0].completedAt, trip.completedAt);
  assert.equal(state.trips[0].actual[0].name, 'Mentega asin'); assert.equal(state.trips[0].planned[0].name, 'Mentega');
  assert.equal(state.items[0].name, 'Bayam'); assert.equal(state.listId, newList); assert.equal(state.trips[0].receiptId, trip.id);
});
test('receipt cannot save missing photos, empty products or invalid price', () => {
  const state = completedList(); beginDraft(state); assert.throws(() => archive(state, true));
  Object.assign(state.draft, { hasPhoto: true, products: [{ name: 'Mentega', price: -1 }], totalPayment: 25000 });
  assert.throws(() => archive(state, true), /harga/); assert.equal(state.items.length, 1);
});
test('item validation rejects duplicates and invalid quantities', () => {
  const state = initialState(); addItem(state, { name: ' Telur ', quantity: '0,5', unit: 'kg' });
  assert.equal(state.items[0].quantity, '0.5'); assert.throws(() => addItem(state, { name: 'telur' }));
  assert.throws(() => addItem(state, { name: 'Susu', quantity: '-1' }));
});
test('autocomplete uses recent input, excludes active items, and deduplicates', () => {
  assert.deepEqual(suggestions('ment', ['Mentega lokal', 'Mentega lokal'], [{ name: 'Mentega' }]), ['Mentega lokal']);
});
test('Rupiah accepts grouping and cents, while rejecting arbitrary text', () => {
  for (const value of ['25000', '25.000', '25,000', 'Rp 25.000,00', '25,000.00']) assert.equal(parseRupiah(value), 25000);
  assert.equal(parseRupiah('gratis'), null); assert.equal(parseRupiah(''), null);
});
test('receipt parser keeps actual products and excludes metadata, tender, tax and discount', () => {
  const result = parseReceipt('TOKO CONTOH\nTanggal 03/10/2026\nMENTEGA 25.000\nSUSU 2 x 15.000 30.000\nBAYAM\n2 x 5.000 10.000\nSUBTOTAL 65.000\nDISKON 5.000\nPPN 6.000\nTOTAL BAYAR 66.000\nTUNAI 100.000\nKEMBALI 34.000');
  assert.deepEqual(result.products.map(p => [p.name, p.price]), [['MENTEGA', 25000], ['SUSU', 30000], ['BAYAM', 10000]]);
  assert.equal(result.totalPayment, 66000);
});
test('parser leaves illegible lines for human review and handles missing total', () => {
  const result = parseReceipt('MENTEGA 25.000\nSUSU 30.000\nDISKON 5.000\nTOTAL ITEM 2\nTERIMA KASIH');
  assert.equal(result.products.length, 2); assert.equal(result.totalPayment, 50000);
  assert.equal(parseReceipt('?? ??').products.length, 0);
});
