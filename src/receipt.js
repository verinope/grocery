import { uid } from './domain.js';

// Receipt prices are integer IDR, accepting Indonesian and comma-grouped formats.
export function parseRupiah(input) {
  let value = String(input).replace(/rp\.?/ig, '').replace(/\s/g, '').trim();
  if (!/^-?\d[\d.,]*$/.test(value)) return null;
  if (/[.,]\d{2}$/.test(value)) value = value.slice(0, -3);
  const number = Number(value.replace(/[.,]/g, ''));
  return Number.isSafeInteger(number) && Math.abs(number) <= 1000000000 ? number : null;
}
const ignored = /\b(sub\s*total|total|jumlah|tunai|cash|kembali|change|bayar|payment|debit|kredit|visa|mastercard|ppn|pajak|tax|diskon|discount|hemat|service|layanan)\b/i;
const totalLine = /\b(grand\s*total|total\s*(bayar|belanja|pembayaran)?|jumlah\s*bayar|amount\s*due)\b/i;
const currencyToken = /(?:Rp\.?\s*)?-?\d+(?:[.,]\d+)*(?:\s*,-)?/ig;

export function parseReceipt(rawText) {
  const products = []; let totalPayment = null; let adjustment = 0; let pendingName = '';
  for (const raw of String(rawText).split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, ' ');
    if (!line) continue;
    const tokens = [...line.matchAll(currencyToken)];
    const last = tokens.at(-1);
    const price = last ? parseRupiah(last[0].replace(/,-$/, '')) : null;
    if (ignored.test(line)) {
      if (price !== null && totalLine.test(line) && !/\b(sub\s*total|total\s*(item|qty|barang)|diskon)\b/i.test(line)) totalPayment = price;
      if (price !== null && /diskon|discount|hemat/i.test(line)) adjustment -= Math.abs(price);
      else if (price !== null && /ppn|pajak|tax|service|layanan/i.test(line)) adjustment += Math.abs(price);
      pendingName = ''; continue;
    }
    if (/\b(tanggal|kasir|operator|transaksi|invoice|receipt|alamat|telepon|telp|member|terima\s*kasih|selamat|www|http)\b/i.test(line) || /\d{1,2}[/:]\d{1,2}[/:]\d{2,4}/.test(line)) { pendingName = ''; continue; }
    if (price !== null && price >= 0 && last) {
      let name = line.slice(0, last.index).trim();
      name = name.replace(/\s+\d+(?:[.,]\d+)?\s*[xX@]\s*[\d.,]+\s*$/, '').trim();
      // For a separate "2 x 12.500 25.000" line, use the preceding product label.
      if (!/[a-z]/i.test(name) || /^\d+\s*[xX@]/.test(name)) name = pendingName;
      name = name.replace(/^\d{6,}\s+/, '').trim();
      if (name && /[a-z]/i.test(name) && name.length <= 120) {
        products.push({ id: uid(), name, price, source: line }); pendingName = ''; continue;
      }
    }
    if (/[a-z]/i.test(line) && !/\b(toko|supermarket|market|store|jalan|jl\.)\b/i.test(line) && line.length <= 120) pendingName = line;
    else pendingName = '';
  }
  const sum = products.reduce((total, item) => total + item.price, 0);
  return { products, totalPayment: totalPayment !== null && totalPayment >= 0 ? totalPayment : Math.max(0, sum + adjustment), rawText: String(rawText) };
}
