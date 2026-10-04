import { initialState, addItem, validateItem, allChecked, beginDraft, archive, uid, rupiah, fullDate, shortTime, monthLabel, quantityLabel } from './domain.js';
import { suggestions, units } from './catalog.js';
import { loadState, commit, readReceipt } from './storage.js';
import { parseRupiah } from './receipt.js';
import { preparePhoto, recognizeReceipt } from './ocr.js';
import { isNative, selectNativePhoto, initializeNative, minimizeNativeApp } from './platform.js';
import { createRecipeUI } from './recipe-ui.js';

const app = document.querySelector('#app');
const nav = document.querySelector('#navigation');
const sheet = document.querySelector('#sheet');
const toast = document.querySelector('#toast');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="m15 5-7 7 7 7"/>', arrow: '<path d="m9 5 7 7-7 7"/>',
  book: '<path d="M12 5v15M3 4h4a5 5 0 0 1 5 2 5 5 0 0 1 5-2h4v15h-4a5 5 0 0 0-5 2 5 5 0 0 0-5-2H3V4Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>', edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15v5Z"/>',
  camera: '<path d="M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v13H3V7a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 16 5-5 4 4 4-6 5 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>', rotate: '<path d="M4 10a8 8 0 1 1 1 8M4 3v7h7"/>', trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.receipt}</svg>`;
const checkboxArt = checked => `<span class="check-art"><img src="/assets/${checked ? 'checked' : 'unchecked'}.svg" width="24" height="24" alt="">${checked ? icon('check') : ''}</span>`;
let state, mutationQueue = Promise.resolve(), renderId = 0, photoURL, scanController, scanning = false, installEvent, tripTab = 'actual', undoAction;
let offlineReady = isNative;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('belanja-changes') : null;
const route = () => (location.hash.slice(1) || 'list').split('/');
function go(value) { if (location.hash === `#${value}`) render(); else location.hash = value; }
function notify(message, undo) {
  clearTimeout(notify.timer); undoAction = undo; notify.route = location.hash;
  toast.innerHTML = `<span>${escape(message)}</span>${undo ? '<button data-action="undo">Urungkan</button>' : ''}`;
  toast.hidden = false; notify.timer = setTimeout(() => { toast.hidden = true; undoAction = null; }, undo ? 6500 : 4500);
}
function mutate(change, operation = null, repaint = true) {
  const run = async () => {
    const next = structuredClone(state); const result = change(next);
    try {
      await commit(next, typeof operation === 'function' ? operation(next, result) : operation);
      state = next; channel?.postMessage(state.revision);
      if (repaint) render(); return result;
    } catch (error) { state = await loadState() || state; render(); throw error; }
  };
  const result = mutationQueue.then(run); mutationQueue = result.catch(() => {}); return result;
}
const primary = (text, action, extra = '') => `<button class="button primary" data-action="${action}" ${extra}>${text}</button>`;
const secondary = (text, action, extra = '') => `<button class="button secondary" data-action="${action}" ${extra}>${text}</button>`;
const top = (title, subtitle, back = false) => `<header class="page-header">${back ? `<button class="icon-button back" data-action="back" aria-label="Kembali">${icon('back')}</button>` : '<div class="wordmark">belanja<span>.</span></div>'}<h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</header>`;
const recipeUI = createRecipeUI({ app, getState: () => state, mutate, go, escape, top, icon, isCurrent: token => token === renderId });
function back() {
  const [page, id] = route();
  if (page === 'recipe-pick') go(`recipe/${id}`);
  else if (page === 'recipe') go('recipes');
  else if (['recipes', 'recipe-added', 'history'].includes(page)) go('list');
  else if (page === 'review') go('scan');
  else if (page === 'scan') go(state.draft?.targetTripId ? `trip/${state.draft.targetTripId}` : 'list');
  else go('history');
}
function openSheet(title, content) {
  if (sheet.open) sheet.close();
  sheet.innerHTML = `<div class="sheet-handle"></div><div class="sheet-heading"><h2 id="sheet-title">${title}</h2><button class="icon-button" data-action="close-sheet" aria-label="Tutup">${icon('close')}</button></div>${content}`;
  sheet.showModal();
  requestAnimationFrame(() => sheet.querySelector('input:not([type=file])')?.focus());
}
function closeSheet() { sheet.close(); }

function renderList() {
  const done = state.items.filter(item => item.checked); const remaining = state.items.filter(item => !item.checked);
  const rows = items => items.map(item => `<div class="item-row ${item.checked ? 'is-checked' : ''}"><button class="item-toggle" data-action="toggle" data-id="${item.id}" aria-pressed="${item.checked}" aria-label="${item.checked ? 'Batalkan ceklis' : 'Centang'} ${escape(item.name)}">${checkboxArt(item.checked)}<span class="item-copy"><span class="item-name">${escape(item.name)}</span>${quantityLabel(item) || item.recipeReference ? `<small>${escape(quantityLabel(item) || 'Jumlah belum diisi')}</small>` : ''}</span></button><button class="icon-button edit-item" data-action="edit-item" data-id="${item.id}" aria-label="Ubah ${escape(item.name)}">${icon('edit')}</button></div>`).join('');
  app.innerHTML = top('List Belanja', 'Sedikit persiapan, belanja lebih tenang.') +
    (state.draft ? `<button class="draft-card" data-action="resume">${icon('receipt')}<span><strong>Struk belum selesai</strong><small>Lanjutkan pencatatan belanja</small></span>${icon('arrow')}</button>` : '') +
    (state.items.length ? `<div class="list-heading"><span>${remaining.length ? `${remaining.length} barang belum diambil` : 'Semua sudah di troli'}</span><button class="add-button" data-action="add-item">${icon('plus')} Tambah</button></div><div class="item-list">${rows(remaining)}</div>${done.length ? `<div class="section-label">DI TROLI <span>${done.length}</span></div><div class="item-list">${rows(done)}</div>` : ''}<div class="list-footer"><div class="progress-meta"><span>${done.length} dari ${state.items.length} barang</span><strong>${allChecked(state) ? 'Siap selesai' : 'Masuk troli'}</strong></div><div class="progress-track"><span style="width:${100 * done.length / state.items.length}%"></span></div>${primary(`${allChecked(state) ? icon('check') : ''}Selesai belanja`, 'finish', allChecked(state) ? '' : 'disabled')}<p class="footnote">${allChecked(state) ? 'Simpan belanja hari ini ke riwayat.' : 'Centang semua barang untuk menyelesaikan belanja.'}</p></div>` : `<section class="empty-state"><div class="empty-art"><img src="/assets/empty-ring.svg" width="108" height="108" alt=""><img src="/assets/empty-center.svg" width="48" height="48" alt="">${icon('check')}</div><h2>Mau belanja apa hari ini?</h2><p>Tulis barang yang kamu butuhkan.<br>Centang saat sudah masuk troli.</p>${primary(`${icon('plus')}Tambah barang pertama`, 'add-item')}<span class="empty-note">Mulai dari satu barang juga boleh.</span></section>`);
  app.insertAdjacentHTML('beforeend', `<button class="recipe-entry" data-action="recipe-open">${icon('book')}<span><strong>Mau masak apa?</strong><small>Cari resep dan pilih bahan untuk dibeli.</small></span>${icon('arrow')}</button>`);
  app.insertAdjacentHTML('beforeend', `<div class="list-device-info"><div class="storage-note" role="status"><span class="status-dot ${isNative || navigator.onLine ? '' : 'offline'}"></span><span>${isNative || navigator.onLine ? offlineReady ? 'Siap dipakai offline' : 'Menyiapkan akses offline…' : 'Sedang offline'} · Data di perangkat ini</span></div>${isNative ? '' : `<button class="text-button install-link" data-action="install">${installEvent ? 'Pasang aplikasi Belanja' : 'Cara pasang di layar utama'}</button>`}</div>`);
}
function renderHistory() {
  let lastMonth = '';
  const cards = state.trips.map(trip => {
    const month = monthLabel(trip.completedAt); const heading = month === lastMonth ? '' : `<h2 class="month-heading">${month}</h2>`; lastMonth = month;
    return `${heading}<button class="trip-card" data-action="trip" data-id="${trip.id}"><span class="trip-icon">${icon('receipt')}</span><span class="trip-copy"><strong>${escape(fullDate(trip.completedAt))}</strong><small>${shortTime(trip.completedAt)} · ${trip.actual?.length || trip.planned.length} barang</small><span class="tag ${trip.actual ? 'green' : ''}">${trip.actual ? 'Struk tersimpan' : 'Tanpa struk'}</span></span><span class="trip-end">${trip.actual ? `<strong>${rupiah(trip.totalPayment)}</strong>` : ''}${icon('arrow')}</span></button>`;
  }).join('');
  app.innerHTML = top('Riwayat', 'Belanja yang sudah selesai, tersimpan di sini.') + (cards || `<section class="empty-state history-empty"><div class="empty-receipt">${icon('receipt')}</div><h2>Belum ada riwayat</h2><p>Selesaikan daftar belanjamu.<br>Barang dan waktunya akan tercatat di sini.</p>${secondary('Lihat list belanja', 'list')}</section>`);
}
function renderTrip(id) {
  const trip = state.trips.find(t => t.id === id); if (!trip) { go('history'); return; }
  const actual = !!trip.actual && tripTab === 'actual';
  app.innerHTML = top('Detail belanja', `${fullDate(trip.completedAt)} · ${shortTime(trip.completedAt)}`, true) +
    (trip.actual ? `<div class="summary-card"><small>TOTAL BAYAR</small><strong>${rupiah(trip.totalPayment)}</strong><span>${trip.actual.length} produk dari struk</span><button class="text-button" data-action="view-photo" data-id="${trip.id}">${icon('receipt')} Lihat struk</button></div><div class="tabs" role="tablist" aria-label="Jenis daftar"><button role="tab" aria-selected="${actual}" data-action="tab-actual">Aktual dibeli</button><button role="tab" aria-selected="${!actual}" data-action="tab-planned">List awal</button></div>` : `<div class="notice">${icon('receipt')}<div><strong>Belanja tersimpan tanpa struk</strong><p>Scan struk untuk mencatat barang dan harga aktual.</p></div></div>`) +
    (actual ? `<div class="table-heading"><span>Produk</span><span>Harga</span></div><div class="actual-list">${trip.actual.map(p => `<div class="actual-row"><span>${escape(p.name)}</span><strong>${rupiah(p.price)}</strong></div>`).join('')}</div>${totals(trip.actual, trip.totalPayment)}` : `<div class="section-label">${trip.actual ? 'BARANG YANG DIRENCANAKAN' : 'BARANG DARI LIST BELANJA'}</div><div class="item-list">${trip.planned.map(p => `<div class="planned-row"><img src="/assets/checked.svg" width="24" height="24" alt="Sudah diambil"><span><strong>${escape(p.name)}</strong>${quantityLabel(p) ? `<small>${escape(quantityLabel(p))}</small>` : ''}</span></div>`).join('')}</div><p class="footnote left">${trip.actual ? 'List awal disimpan terpisah dari hasil scan struk.' : 'Harga aktual belum dicatat.'}</p>`) +
    (!trip.actual ? `<div class="inline-cta">${primary(`${icon('camera')}Scan struk belanja`, 'attach', `data-id="${trip.id}"`)}</div>` : '');
}
function totals(products, payment) {
  const sum = products.reduce((n, p) => n + p.price, 0); const difference = payment - sum;
  return `<div class="totals"><div><span>Jumlah harga produk</span><span>${rupiah(sum)}</span></div>${difference ? `<div><span>Selisih total struk</span><span>${difference > 0 ? '+' : '−'}${rupiah(Math.abs(difference))}</span></div>` : ''}<div class="total-line"><strong>Total bayar</strong><strong>${rupiah(payment)}</strong></div></div>${difference ? '<p class="footnote left">Selisih bisa berasal dari diskon, pajak, atau hasil scan. Cocokkan dengan struk.</p>' : ''}`;
}
function renderScan() {
  if (!state.draft) { go('list'); return; }
  app.innerHTML = top('Scan struk', 'Catat barang yang benar-benar kamu beli.', true) + `<div class="scan-preview" id="scan-preview"><div class="scan-placeholder">${icon('camera')}<strong>Foto struk belanjamu</strong><p>Letakkan struk di tempat terang.<br>Pastikan seluruh tulisan terlihat jelas.</p></div></div><div class="scan-tools" ${state.draft.hasPhoto ? '' : 'hidden'}><button class="text-button" data-action="rotate">${icon('rotate')} Putar foto</button><button class="text-button" data-action="gallery">${icon('photo')} Ganti foto</button></div><div id="scan-status" class="scan-status" role="status" aria-live="polite">${scanning ? 'Menyiapkan pembaca struk…' : ''}</div><div id="scan-progress" class="progress-track" ${scanning ? '' : 'hidden'}><span style="width:0%"></span></div><div class="scan-actions">${primary(`${icon('camera')}${scanning ? 'Batalkan scan' : state.draft.hasPhoto ? 'Scan foto ini' : 'Ambil foto struk'}`, scanning ? 'cancel-scan' : state.draft.hasPhoto ? 'scan-photo' : 'camera')}${!scanning ? secondary(`${icon('photo')}Pilih dari galeri`, 'gallery') : ''}${state.draft.hasPhoto && !scanning ? '<button class="text-button" data-action="manual-review">Isi atau periksa secara manual</button>' : ''}</div><p class="privacy-note">Foto dibaca langsung di perangkatmu.<br>Periksa hasilnya sebelum disimpan.</p><input id="camera-input" type="file" accept="image/*" capture="environment" hidden><input id="gallery-input" type="file" accept="image/*" hidden>`;
  if (state.draft.hasPhoto) showPhoto('draft', document.querySelector('#scan-preview'));
}
function renderReview() {
  const draft = state.draft; if (!draft?.hasPhoto) { go(draft ? 'scan' : 'list'); return; }
  app.innerHTML = top('Periksa hasil scan', 'Cocokkan nama dan harga dengan struk.', true) + `<button class="receipt-thumb" data-action="view-photo" data-id="draft">${icon('receipt')}<span><strong>Foto struk</strong><small>Lihat foto asli untuk mencocokkan</small></span>${icon('arrow')}</button><div class="notice compact"><span class="notice-dot"></span><p>Hasil scan bisa keliru. Tap produk atau total bayar untuk memperbaikinya.</p></div><div class="table-heading"><span>Produk</span><span>Harga</span></div><div class="actual-list">${draft.products.map(p => `<button class="actual-row editable" data-action="edit-product" data-id="${p.id}"><span>${escape(p.name)}</span><strong>${rupiah(p.price)} ${icon('edit')}</strong></button>`).join('') || '<p class="no-products">Belum ada produk yang terbaca.<br>Tambahkan barang dari struk secara manual.</p>'}</div><button class="add-product" data-action="add-product">${icon('plus')}Tambah produk</button>${totals(draft.products, draft.totalPayment ?? 0)}<button class="text-button edit-total" data-action="edit-total">${icon('edit')} Ubah total bayar</button><div class="review-actions">${primary('Simpan ke riwayat', 'save-receipt', !draft.products.length ? 'disabled' : '')}<span class="footnote">${draft.targetTripId ? 'Melengkapi riwayat belanja yang sudah ada.' : 'List belanja akan dikosongkan setelah tersimpan.'}</span></div>`;
}
function render() {
  if (!state) return;
  renderId++; if (photoURL) { URL.revokeObjectURL(photoURL); photoURL = null; }
  const [page, id] = route(); const recipeFlow = ['recipes', 'recipe', 'recipe-pick', 'recipe-added'].includes(page); const focusFlow = ['scan', 'review'].includes(page) || recipeFlow;
  document.body.classList.toggle('focus-flow', focusFlow);
  app.className = `page page-${page}`;
  nav.hidden = focusFlow;
  nav.innerHTML = `<a href="#list" class="nav-link ${page === 'list' ? 'active' : ''}" ${page === 'list' ? 'aria-current="page"' : ''}><span class="nav-icon list-icon"></span><span>List Belanja</span></a><a href="#history" class="nav-link ${['history', 'trip'].includes(page) ? 'active' : ''}" ${['history', 'trip'].includes(page) ? 'aria-current="page"' : ''}><span class="nav-icon history-icon"></span><span>Riwayat</span></a>`;
  if (recipeFlow) recipeUI.render(page, id, renderId); else if (page === 'history') renderHistory(); else if (page === 'trip') renderTrip(id); else if (page === 'scan') renderScan(); else if (page === 'review') renderReview(); else renderList();
}
async function showPhoto(id, target) {
  const token = renderId; const photo = await readReceipt(id);
  if (token !== renderId || !target.isConnected) return;
  if (!photo) { target.innerHTML = '<p class="error-text">Foto tidak ditemukan. Pilih foto lagi.</p>'; return; }
  photoURL = URL.createObjectURL(photo); target.innerHTML = `<img src="${photoURL}" alt="Foto struk belanja">`;
}
function itemSheet(id) {
  const item = state.items.find(p => p.id === id);
  openSheet(item ? 'Ubah barang' : 'Tambah barang', `<form id="item-form" data-id="${item?.id || ''}"><label for="item-name">Nama barang</label><input id="item-name" name="name" placeholder="Misalnya: telur, susu, bayam" value="${escape(item?.name || '')}" maxlength="120" autocomplete="off" required><div id="suggestions" class="suggestions" aria-label="Saran nama barang"></div><div class="field-pair"><div><label for="item-quantity">Jumlah <span>opsional</span></label><input id="item-quantity" name="quantity" inputmode="decimal" placeholder="Contoh: 1" value="${escape(item?.quantity || '')}"></div><div><label for="item-unit">Satuan</label><select id="item-unit" name="unit">${units.map(unit => `<option value="${unit}" ${item?.unit === unit ? 'selected' : ''}>${unit || 'Pilih satuan'}</option>`).join('')}</select></div></div><p class="form-error" role="alert"></p><button class="button primary" type="submit">${item ? 'Simpan perubahan' : 'Tambah ke list'}</button>${item ? `<button class="text-button danger" type="button" data-action="delete-item" data-id="${item.id}">${icon('trash')} Hapus barang</button>` : ''}</form>`);
  if (!item) updateSuggestions('');
  if (item?.recipeReference) sheet.querySelector('.field-pair').insertAdjacentHTML('afterend', `<p class="field-hint recipe-reference"><strong>Referensi resep</strong><br>${escape(item.recipeReference)}<br>Isi jumlah belanja sesuai kebutuhanmu.</p>`);
}
function updateSuggestions(query) {
  const target = sheet.querySelector('#suggestions'); if (!target || sheet.querySelector('#item-form').dataset.id) return;
  target.innerHTML = suggestions(query, state.recent, state.items).map(name => `<button type="button" data-action="suggestion" data-name="${escape(name)}">${escape(name)}${icon('plus')}</button>`).join('');
}
function finishSheet(targetTripId = null) {
  openSheet(targetTripId ? 'Lengkapi riwayat belanja' : 'Semua sudah di troli!', `<p class="sheet-description">${state.draft ? 'Ada struk yang belum selesai. Lanjutkan, atau mulai pencatatan baru di bawah.' : targetTripId ? 'Scan struk untuk mencatat barang dan harga aktual.' : 'Scan struk untuk mencatat harga aktual, atau simpan list belanjamu sekarang.'}</p>${state.draft ? secondary('Lanjutkan struk sebelumnya', 'resume') : ''}${primary(`${icon('camera')}${state.draft ? 'Mulai scan baru' : 'Scan struk belanja'}`, 'start-scan', `data-id="${targetTripId || ''}"`)}${!targetTripId ? secondary('Simpan tanpa struk', 'save-without') : ''}<p class="footnote">Struk bisa ditambahkan nanti dari Riwayat.</p>`);
}
function productSheet(id) {
  const product = state.draft?.products.find(p => p.id === id);
  openSheet(product ? 'Perbaiki produk' : 'Tambah produk', `<form id="product-form" data-id="${product?.id || ''}"><label for="product-name">Nama produk</label><input id="product-name" name="name" value="${escape(product?.name || '')}" maxlength="120" placeholder="Misalnya: mentega" required><label for="product-price">Harga produk (Rp)</label><input id="product-price" name="price" inputmode="numeric" value="${product?.price ?? ''}" placeholder="25000" required><p class="field-hint">Isi total harga baris ini, termasuk jumlah barangnya.</p><p class="form-error" role="alert"></p><button class="button primary" type="submit">Simpan produk</button>${product ? `<button type="button" class="text-button danger" data-action="delete-product" data-id="${product.id}">${icon('trash')} Hapus produk</button>` : ''}</form>`);
}
async function processPhoto(file, rotate = false, autoScan = true) {
  if (scanning) return;
  const photo = await preparePhoto(file, rotate);
  await mutate(next => { if (!next.draft) throw new Error('Mulai scan dari belanja terlebih dahulu.'); next.draft.hasPhoto = true; next.draft.products = []; next.draft.totalPayment = 0; next.draft.rawText = ''; }, { put: { id: 'draft', blob: photo } });
  if (autoScan) await runScan(photo);
}
async function runScan(photo) {
  if (scanning || !state.draft) return;
  const draftId = state.draft.targetTripId || state.draft.listId;
  scanning = true; const controller = new AbortController(); scanController = controller; render();
  try {
    const result = await recognizeReceipt(photo, (progress, status) => {
      const statusEl = document.querySelector('#scan-status'); const bar = document.querySelector('#scan-progress span');
      if (statusEl) statusEl.textContent = status === 'recognizing text' ? `Membaca struk… ${Math.round(progress * 100)}%` : 'Menyiapkan pembaca struk…';
      if (bar) bar.style.width = `${Math.max(4, progress * 100)}%`;
    }, controller.signal);
    if (controller.signal.aborted) return;
    await mutate(next => {
      if (!next.draft || (next.draft.targetTripId || next.draft.listId) !== draftId) throw new Error('Pencatatan belanja berubah. Mulai scan lagi.');
      Object.assign(next.draft, result);
    }, null, false);
    go('review'); if (!result.products.length) notify('Belum ada produk terbaca. Kamu bisa mengisinya manual.');
  } catch (error) { if (!controller.signal.aborted) notify('Scan belum berhasil. Coba foto lebih jelas atau isi manual.'); }
  finally { if (scanController === controller) { scanning = false; scanController = null; render(); } }
}
async function saveReceipt() {
  const trip = await mutate(next => archive(next, true), (_, saved) => ({ archiveId: saved.id }));
  closeSheet(); tripTab = 'actual'; go(`trip/${trip.id}`); notify('Belanja dan struk tersimpan.');
  navigator.storage?.persist?.().catch(() => {});
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const { action, id } = button.dataset;
  try {
    if (action === 'close-sheet') closeSheet();
    else if (action.startsWith('recipe-')) await recipeUI.action(button);
    else if (action === 'add-item') itemSheet();
    else if (action === 'edit-item') itemSheet(id);
    else if (action === 'suggestion') { sheet.querySelector('#item-name').value = button.dataset.name; sheet.querySelector('#suggestions').innerHTML = ''; sheet.querySelector('#item-quantity').focus(); }
    else if (action === 'toggle') {
      const original = state.items.find(p => p.id === id)?.checked; const listId = state.listId;
      await mutate(next => { const p = next.items.find(p => p.id === id); if (p) p.checked = !p.checked; });
      if (!original) notify('Masuk troli.', async () => { await mutate(next => { const p = next.items.find(p => p.id === id); if (p && next.listId === listId) p.checked = original; }); });
    } else if (action === 'undo') { const undo = undoAction; toast.hidden = true; undoAction = null; await undo?.(); }
    else if (action === 'delete-item') {
      const index = state.items.findIndex(p => p.id === id); const removed = state.items[index]; const listId = state.listId;
      await mutate(next => { next.items = next.items.filter(p => p.id !== id); }); closeSheet();
      notify('Barang dihapus.', async () => { await mutate(next => { if (removed && next.listId === listId && !next.items.some(p => p.name.toLowerCase() === removed.name.toLowerCase())) next.items.splice(Math.min(index, next.items.length), 0, removed); }); });
    } else if (action === 'finish') { if (allChecked(state)) finishSheet(); }
    else if (action === 'attach') finishSheet(id);
    else if (action === 'start-scan') { button.disabled = true; await mutate(next => beginDraft(next, id || null), { deleteDraft: true }); closeSheet(); go('scan'); }
    else if (action === 'save-without') {
      button.disabled = true;
      const trip = await mutate(next => { beginDraft(next); return archive(next); }, { deleteDraft: true });
      closeSheet(); tripTab = 'actual'; go(`trip/${trip.id}`); notify('Belanja tersimpan ke riwayat.');
    } else if (action === 'save-receipt') { button.disabled = true; await saveReceipt(); }
    else if (action === 'resume') { closeSheet(); go(state.draft?.hasPhoto && state.draft.products.length ? 'review' : 'scan'); }
    else if (action === 'trip') { tripTab = 'actual'; go(`trip/${id}`); }
    else if (action === 'tab-actual' || action === 'tab-planned') { tripTab = action === 'tab-actual' ? 'actual' : 'planned'; render(); }
    else if (action === 'list') go('list');
    else if (action === 'back') back();
    else if (action === 'camera' || action === 'gallery') {
      if (isNative) { const photo = await selectNativePhoto(action); if (photo) await processPhoto(photo); }
      else document.querySelector(`#${action === 'camera' ? 'camera' : 'gallery'}-input`).click();
    }
    else if (action === 'scan-photo') { const photo = await readReceipt('draft'); if (!photo) throw new Error('Pilih foto struk terlebih dahulu.'); await runScan(photo); }
    else if (action === 'cancel-scan') { scanController?.abort(); scanning = false; scanController = null; render(); }
    else if (action === 'rotate') { const photo = await readReceipt('draft'); if (photo) await processPhoto(photo, true, false); }
    else if (action === 'manual-review') go('review');
    else if (action === 'edit-product') productSheet(id);
    else if (action === 'add-product') productSheet();
    else if (action === 'delete-product') { await mutate(next => { next.draft.products = next.draft.products.filter(p => p.id !== id); }); closeSheet(); }
    else if (action === 'edit-total') openSheet('Ubah total bayar', `<form id="total-form"><label for="total-payment">Total pada struk (Rp)</label><input id="total-payment" name="total" inputmode="numeric" value="${state.draft.totalPayment ?? ''}" required><p class="field-hint">Gunakan total setelah diskon dan pajak, bukan nominal uang tunai.</p><p class="form-error" role="alert"></p><button class="button primary" type="submit">Simpan total</button></form>`);
    else if (action === 'view-photo') {
      openSheet('Foto struk', '<div class="full-receipt" id="full-receipt"><p>Memuat foto…</p></div>');
      await showPhoto(id, sheet.querySelector('#full-receipt'));
    } else if (action === 'install') {
      if (installEvent) { await installEvent.prompt(); installEvent = null; }
      else openSheet('Pasang Belanja', '<p class="sheet-description">Di iPhone: buka aplikasi ini melalui Safari, tap <strong>Bagikan</strong>, lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</p><p class="sheet-description">Di Android: buka menu browser, lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.</p><p class="footnote left">Saat sudah terpasang, Belanja bisa dibuka seperti aplikasi biasa.</p>');
    }
  } catch (error) { button.disabled = false; notify(error.message || 'Belum berhasil. Coba lagi.'); }
});
document.addEventListener('input', event => { if (event.target.id === 'item-name') updateSuggestions(event.target.value); recipeUI.input(event.target); });
document.addEventListener('change', async event => {
  recipeUI.change(event.target);
  if (['camera-input', 'gallery-input'].includes(event.target.id) && event.target.files[0]) {
    const file = event.target.files[0]; event.target.value = '';
    try { await processPhoto(file); } catch (error) { notify(error.message); }
  }
});
document.addEventListener('submit', async event => {
  const form = event.target; if (!['item-form', 'product-form', 'total-form'].includes(form.id)) return;
  event.preventDefault(); const values = Object.fromEntries(new FormData(form)); const submit = form.querySelector('[type=submit]'); submit.disabled = true;
  try {
    if (form.id === 'item-form') await mutate(next => {
      if (form.dataset.id) {
        const clean = validateItem(values);
        if (next.items.some(p => p.id !== form.dataset.id && p.name.toLowerCase() === clean.name.toLowerCase())) throw new Error('Barang ini sudah ada di daftar.');
        const item = next.items.find(p => p.id === form.dataset.id); if (!item) throw new Error('Barang sudah dihapus.'); Object.assign(item, clean);
      } else addItem(next, values);
    });
    else if (form.id === 'product-form') {
      const price = parseRupiah(values.price); const name = values.name.trim();
      if (price === null || price < 0 || !name) throw new Error('Isi nama produk dan harga yang benar.');
      await mutate(next => {
        if (!next.draft) throw new Error('Pencatatan struk sudah berubah.');
        const product = next.draft.products.find(p => p.id === form.dataset.id);
        if (product) Object.assign(product, { name, price }); else next.draft.products.push({ id: uid(), name, price, source: 'manual' });
      });
    } else {
      const value = parseRupiah(values.total); if (value === null || value < 0) throw new Error('Isi total bayar yang benar.');
      await mutate(next => { if (!next.draft) throw new Error('Pencatatan struk sudah berubah.'); next.draft.totalPayment = value; });
    }
    closeSheet();
  } catch (error) { form.querySelector('.form-error').textContent = error.message; submit.disabled = false; }
});
sheet.addEventListener('click', event => { if (event.target === sheet) { const rect = sheet.getBoundingClientRect(); if (event.clientY < rect.top || event.clientX < rect.left || event.clientX > rect.right) closeSheet(); } });
sheet.addEventListener('close', () => { if (photoURL && sheet.querySelector('#full-receipt')) { URL.revokeObjectURL(photoURL); photoURL = null; } });
window.addEventListener('hashchange', () => {
  closeSheet();
  if (notify.route !== location.hash) { toast.hidden = true; undoAction = null; }
  if (route()[0] !== 'scan' && scanning) { scanController?.abort(); scanController = null; scanning = false; }
  render(); window.scrollTo(0, 0);
});
channel?.addEventListener('message', async () => { await mutationQueue; const latest = await loadState(); if (latest && latest.revision > state.revision) { state = latest; render(); notify('Data diperbarui dari tab lain.'); } });
window.addEventListener('online', render); window.addEventListener('offline', render);
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; if (route()[0] === 'list') render(); });
async function setupOffline() {
  if (isNative || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const showUpdate = () => {
      if (!navigator.serviceWorker.controller || !registration.waiting) return;
      const banner = document.querySelector('#update-banner'); banner.hidden = false;
      banner.innerHTML = '<span>Versi baru tersedia.</span><button>Perbarui</button>';
      banner.querySelector('button').onclick = () => { registration.waiting?.postMessage('SKIP_WAITING'); };
    };
    showUpdate(); registration.addEventListener('updatefound', () => { registration.installing?.addEventListener('statechange', showUpdate); });
    await navigator.serviceWorker.ready; offlineReady = true; if (route()[0] === 'list') render();
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) location.reload(); hadController = true; });
  } catch { offlineReady = false; }
}
try {
  state = await loadState() || initialState(); render(); setupOffline();
  if (isNative) await initializeNative({
    onBack: async () => {
      if (sheet.open) { closeSheet(); return; }
      const [page] = route();
      if (page !== 'list') back();
      else { await mutationQueue; await minimizeNativeApp(); }
    },
    onRestoredPhoto: async (photo, error) => {
      if (error) { notify(error.message); return; }
      if (!state.draft) { notify('Mulai scan dari belanja terlebih dahulu.'); return; }
      go('scan'); await processPhoto(photo);
    },
  }).catch(() => notify('Kontrol Android belum siap. Tutup lalu buka aplikasi lagi.'));
} catch {
  app.innerHTML = top('Data belum bisa dibuka', '') + '<div class="notice"><p>Izinkan penyimpanan di browser ini lalu muat ulang. Belanja memerlukan penyimpanan perangkat untuk mencatat list dan riwayat.</p></div><button class="button primary" onclick="location.reload()">Coba lagi</button>';
}
