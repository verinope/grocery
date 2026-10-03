let connection;
export function openDatabase() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open('belanja', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('state');
      request.result.createObjectStore('receipts');
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Tutup tab Belanja lainnya lalu coba lagi.'));
  });
  return connection;
}
export async function loadState() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = db.transaction('state').objectStore('state').get('current');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
export async function readReceipt(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const req = db.transaction('receipts').objectStore('receipts').get(id);
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
// History, the image and clearing the active list commit together, or not at all.
export async function commit(state, receiptOperation = null) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state', 'receipts'], 'readwrite');
    const states = tx.objectStore('state'); const receipts = tx.objectStore('receipts');
    let reason;
    const req = states.get('current');
    req.onsuccess = () => {
      if (req.result && req.result.revision !== state.revision) {
        reason = new Error('Daftar berubah di tab lain. Periksa lagi sebelum melanjutkan.'); tx.abort(); return;
      }
      state.revision += 1; states.put(state, 'current');
      if (receiptOperation?.put) receipts.put(receiptOperation.put.blob, receiptOperation.put.id);
      if (receiptOperation?.archiveId) {
        const photo = receipts.get('draft');
        photo.onsuccess = () => {
          if (!photo.result) { reason = new Error('Foto struk tidak ditemukan. Ambil foto lagi.'); tx.abort(); return; }
          receipts.put(photo.result, receiptOperation.archiveId); receipts.delete('draft');
        };
      }
      if (receiptOperation?.deleteDraft) receipts.delete('draft');
    };
    tx.oncomplete = () => resolve(state);
    tx.onerror = () => reject(reason || tx.error || new Error('Data belum tersimpan. Coba lagi.'));
    tx.onabort = () => reject(reason || tx.error || new Error('Data belum tersimpan. Coba lagi.'));
  });
}
