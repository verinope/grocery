export const groceries = [
  'Telur', 'Susu', 'Bayam', 'Bayam merah', 'Beras', 'Roti tawar', 'Pisang', 'Mentega',
  'Margarin', 'Minyak goreng', 'Gula pasir', 'Garam', 'Tepung terigu', 'Tepung tapioka',
  'Ayam', 'Daging sapi', 'Ikan', 'Udang', 'Tahu', 'Tempe', 'Keju', 'Yoghurt',
  'Bawang merah', 'Bawang putih', 'Bawang bombai', 'Daun bawang', 'Cabai merah',
  'Cabai rawit', 'Tomat', 'Wortel', 'Kentang', 'Brokoli', 'Kangkung', 'Sawi',
  'Selada', 'Timun', 'Terong', 'Kol', 'Buncis', 'Jamur', 'Jagung', 'Labu siam',
  'Apel', 'Jeruk', 'Mangga', 'Alpukat', 'Pepaya', 'Semangka', 'Melon', 'Anggur',
  'Kecap manis', 'Kecap asin', 'Saus sambal', 'Saus tomat', 'Kaldu', 'Merica',
  'Ketumbar', 'Jahe', 'Kunyit', 'Lengkuas', 'Serai', 'Daun salam', 'Daun jeruk',
  'Santan', 'Mie', 'Pasta', 'Oat', 'Kopi', 'Teh', 'Air mineral', 'Madu', 'Selai',
];
export const units = ['', 'pcs', 'kg', 'gram', 'liter', 'ml', 'ikat', 'tray', 'kotak', 'bungkus', 'botol', 'kaleng', 'pack'];

export function suggestions(query, recent = [], active = []) {
  const q = query.trim().toLocaleLowerCase('id');
  const unique = [...new Set([...recent, ...groceries])];
  const already = new Set(active.map(item => item.name.toLocaleLowerCase('id')));
  return unique.filter(name => (!q || name.toLocaleLowerCase('id').includes(q)) && !already.has(name.toLocaleLowerCase('id')))
    .sort((a, b) => Number(b.toLowerCase().startsWith(q)) - Number(a.toLowerCase().startsWith(q)))
    .slice(0, q ? 5 : 3);
}
