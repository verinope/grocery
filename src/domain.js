export const uid = () => globalThis.crypto.randomUUID();
export const rupiah = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
export const fullDate = value => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
export const shortTime = value => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
export const monthLabel = value => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(value));
export const quantityLabel = item => [item.quantity, item.unit].filter(Boolean).join(' ');

export function initialState() {
  return { version: 1, revision: 0, listId: uid(), items: [], trips: [], recent: [], draft: null };
}
export function validateItem({ name, quantity = '', unit = '' }) {
  const clean = String(name).trim();
  if (!clean || clean.length > 120) throw new Error('Isi nama barang (maksimal 120 karakter).');
  const qty = String(quantity).trim().replace(',', '.');
  if (qty && (!Number.isFinite(Number(qty)) || Number(qty) <= 0 || Number(qty) > 100000)) throw new Error('Jumlah harus lebih besar dari 0.');
  return { name: clean, quantity: qty, unit: String(unit).slice(0, 30) };
}
export function addItem(state, input) {
  const clean = validateItem(input);
  if (state.items.some(item => item.name.toLocaleLowerCase('id') === clean.name.toLocaleLowerCase('id'))) throw new Error('Barang ini sudah ada di daftar. Kamu bisa mengubah jumlahnya.');
  state.items.push({ id: uid(), ...clean, checked: false });
  state.recent = [clean.name, ...state.recent.filter(name => name !== clean.name)].slice(0, 100);
}
export const allChecked = state => state.items.length > 0 && state.items.every(item => item.checked);
export const listFingerprint = items => JSON.stringify(items);
export function beginDraft(state, targetTripId = null) {
  if (targetTripId) {
    const trip = state.trips.find(t => t.id === targetTripId);
    if (!trip) throw new Error('Riwayat belanja tidak ditemukan.');
    state.draft = { targetTripId, planned: structuredClone(trip.planned), listId: null, products: [], totalPayment: null, rawText: '', hasPhoto: false };
  } else {
    if (!allChecked(state)) throw new Error('Centang semua barang sebelum menyelesaikan belanja.');
    state.draft = { targetTripId: null, planned: structuredClone(state.items), listId: state.listId, fingerprint: listFingerprint(state.items), products: [], totalPayment: null, rawText: '', hasPhoto: false };
  }
}
export function archive(state, withReceipt = false, now = new Date().toISOString()) {
  const draft = state.draft;
  if (!draft) throw new Error('Belum ada belanja yang siap disimpan.');
  if (!draft.targetTripId && (draft.listId !== state.listId || !allChecked(state) || draft.fingerprint !== listFingerprint(state.items))) throw new Error('Daftar belanja berubah. Mulai ulang proses selesai belanja sebelum menyimpan.');
  if (withReceipt) {
    if (!draft.hasPhoto || !draft.products.length) throw new Error('Tambahkan foto dan setidaknya satu produk.');
    if (!draft.products.every(p => String(p.name).trim() && Number.isSafeInteger(p.price) && p.price >= 0)) throw new Error('Periksa nama dan harga semua produk.');
    if (!Number.isSafeInteger(draft.totalPayment) || draft.totalPayment < 0) throw new Error('Periksa total bayar.');
  }
  const existing = draft.targetTripId ? state.trips.find(t => t.id === draft.targetTripId) : null;
  if (draft.targetTripId && !existing) throw new Error('Riwayat belanja tidak ditemukan.');
  const trip = {
    id: existing?.id || uid(), completedAt: existing?.completedAt || now,
    planned: existing?.planned || structuredClone(draft.planned),
    actual: withReceipt ? structuredClone(draft.products) : null,
    totalPayment: withReceipt ? draft.totalPayment : null,
    rawText: withReceipt ? draft.rawText : '', receiptId: withReceipt ? (existing?.id || null) : null,
    reviewedAt: withReceipt ? now : null,
  };
  trip.receiptId = withReceipt ? trip.id : null;
  if (existing) state.trips[state.trips.findIndex(t => t.id === existing.id)] = trip;
  else {
    state.trips.unshift(trip);
    state.items = []; state.listId = uid();
  }
  state.draft = null;
  return trip;
}
