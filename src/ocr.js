import { parseReceipt } from './receipt.js';
import { isNative } from './platform.js';
let script;
function loadTesseract() {
  if (globalThis.Tesseract) return Promise.resolve();
  if (script) return script;
  script = new Promise((resolve, reject) => {
    const tag = document.createElement('script'); tag.src = '/vendor/tesseract.min.js';
    tag.onload = resolve; tag.onerror = () => { script = null; tag.remove(); reject(new Error('Mesin scan belum tersedia. Buka aplikasi saat online terlebih dahulu.')); };
    document.head.append(tag);
  });
  return script;
}
async function decode(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image(); image.src = url; await image.decode(); return image;
  } catch { throw new Error('Foto belum bisa dibaca. Pilih foto JPG atau PNG.'); }
  finally { URL.revokeObjectURL(url); }
}
export async function preparePhoto(blob, rotate = false) {
  if (blob.size > 25 * 1024 * 1024) throw new Error('Foto terlalu besar. Pilih foto di bawah 25 MB.');
  const image = await decode(blob);
  const ratio = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.round(image.naturalWidth * ratio); const height = Math.round(image.naturalHeight * ratio);
  const canvas = document.createElement('canvas'); canvas.width = rotate ? height : width; canvas.height = rotate ? width : height;
  const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  if (rotate) { context.translate(canvas.width, 0); context.rotate(Math.PI / 2); }
  context.drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Gagal menyiapkan foto.')), 'image/jpeg', 0.9));
}
export async function recognizeReceipt(photo, onProgress, signal) {
  let worker;
  const abort = () => { worker?.terminate().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  const check = () => { if (signal?.aborted) throw new DOMException('Scan dibatalkan', 'AbortError'); };
  try {
    await loadTesseract(); check();
    worker = await globalThis.Tesseract.createWorker('eng', 1, {
      workerPath: `${location.origin}/vendor/worker.min.js`,
      corePath: `${location.origin}/vendor/core`,
      langPath: `${location.origin}/vendor/lang`,
      // AAPT expands .gz assets and removes that suffix inside Android APKs.
      gzip: !isNative,
      logger: message => { if (!signal?.aborted) onProgress(message.status === 'recognizing text' ? message.progress : 0, message.status); },
      errorHandler: () => {},
    }); check();
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(photo); check();
    return { ...parseReceipt(data.text), confidence: data.confidence };
  } finally {
    signal?.removeEventListener('abort', abort);
    if (worker) await worker.terminate().catch(() => {});
  }
}
