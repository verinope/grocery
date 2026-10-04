// Produce the local recipe asset from the approved, attributed collection.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { groceries } from '../src/catalog.js';

const extras = ['Air', 'Air kelapa', 'Air jeruk lemon', 'Air jeruk nipis', 'Air jeruk limau', 'Air jeruk', 'Air asam jawa', 'Air asam', 'Ayam kampung', 'Daging kambing', 'Daging kerbau', 'Lidah sapi', 'Jantung sapi', 'Usus sapi', 'Limpa sapi', 'Tulang sapi', 'Iga sapi', 'Daging tetelan sapi', 'Kikil sapi', 'Hati sapi', 'Sengkel sapi', 'Daging ayam', 'Dada ayam', 'Lemak ayam', 'Kulit ayam', 'Ikan mas', 'Ikan kakap', 'Kepala ikan kakap', 'Ikan tongkol', 'Ikan patin', 'Ikan peda', 'Ikan cakalang', 'Cakalang fufu', 'Ikan asin', 'Ikan teri', 'Teri', 'Cumi asin', 'Cumi', 'Ebi', 'Telur ayam', 'Telur bebek', 'Telur rebus', 'Kuning telur', 'Putih telur', 'Tahu putih', 'Tahu goreng', 'Tempe', 'Oncom', 'Kelapa', 'Kelapa parut', 'Santan cair', 'Santan kental', 'Daun pandan', 'Daun kunyit', 'Daun kemangi', 'Daun kari', 'Daun salam koja', 'Daun melinjo', 'Daun singkong', 'Seledri', 'Kacang panjang', 'Kacang tanah', 'Kacang merah', 'Kedelai', 'Lobak', 'Tauge', 'Rebung', 'Nangka muda', 'Labu siam', 'Pakis', 'Oyong', 'Daun kelor', 'Terong', 'Tomat hijau', 'Jagung muda', 'Jagung manis', 'Buncis', 'Melindjo', 'Petai', 'Jeruk lemon', 'Jeruk nipis', 'Jeruk limau', 'Jeruk purut', 'Jeruk kunci', 'Belimbing wuluh', 'Asam jawa', 'Asam kandis', 'Asam gelugur', 'Asam hawa', 'Andaliman', 'Kecombrang', 'Lokio', 'Bawang batak', 'Cabai merah keriting', 'Cabai merah besar', 'Cabai hijau', 'Cabai rawit merah', 'Cabai rawit hijau', 'Cabai bubuk', 'Cabai giling', 'Kemiri', 'Jintan', 'Adas', 'Pala', 'Kayu manis', 'Cengkih', 'Kapulaga', 'Kluwek', 'Kencur', 'Temu kunci', 'Lada', 'Ketumbar bubuk', 'Terasi', 'Petis udang', 'Gula merah', 'Gula jawa', 'Minyak kelapa', 'Minyak sayur', 'Minyak wijen', 'Minyak goreng', 'Mentega', 'Margarin', 'Kaldu ayam', 'Kaldu sapi', 'Kaldu udang', 'Kaldu jamur', 'Kaldu bubuk', 'Penyedap', 'Saus tiram', 'Kecap manis', 'Kecap asin', 'Cuka', 'Tepung beras', 'Tepung sagu', 'Tepung kanji', 'Tepung panir', 'Tepung maizena', 'Tepung terigu', 'Beras ketan', 'Beras', 'Nasi putih', 'Nasi', 'Bubur', 'Soun', 'Bihun', 'Mi kuning', 'Mi basah', 'Mi telur', 'Mi', 'Lontong', 'Cakwe', 'Emping', 'Kerupuk udang', 'Kerupuk', 'Bawang goreng', 'Daun pisang', 'Aluminium foil', 'Tusuk sate', 'Ubi', 'Ubi jalar', 'Labu kuning', 'Daun gedi'];
const names=[...new Set([...groceries,...extras])].sort((a,b)=>b.length-a.length);
const aliases=[[/\bcabe\b/g,'cabai'],[/\blombok\b/g,'cabai'],[/\blaos\b/g,'lengkuas'],[/\bkunjit\b/g,'kunyit'],[/\bketimoen\b|\bketimun\b|\bmentimun\b/g,'timun'],[/\bkemangi\b/g,'daun kemangi'],[/\bsereh\b/g,'serai'],[/\btoge\b|\btouge\b/g,'tauge'],[/\bdaun ubi\b/g,'daun singkong'],[/\bmie\b/g,'mi'],[/\bjinten\b/g,'jintan'],[/\bbombay\b|\bbombai\b|\bbombai\b/g,'bombai'],[/\bkluwak\b|\bkeluwek\b|\bkeluak\b/g,'kluwek'],[/\bmelindjo\b/g,'melinjo'],[/\bpetai\b/g,'petai'],[/\bjeruk limau\b/g,'jeruk limau'],[/\bvetsin\b|\bmsg\b/g,'penyedap']];
const norm = s => aliases.reduce((s,[pattern,replacement])=>s.replace(pattern,replacement),s.toLocaleLowerCase('id'));
function shoppingName(raw) {
  if (/^[-_=\s]+$/.test(raw) || /\bdibumbui\b/.test(raw)) return null;
  let text=norm(raw).replace(/\([^)]*\)/g,' ').split(/(?<!\d)[,;]|,(?!\d)/)[0].replace(/\s+/g,' ').trim();
  // Keep alternatives visible; choose an ingredient rather than a preparation action.
  text=text.split(/\s+(?:atau|dan\/atau)\s+/)[0];
  const matched=names.find(name=>new RegExp(`(?:^|\\s)${norm(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|[\\s./])`,'i').test(text));
  if(matched) return ({'Daging ayam':'Ayam','Telur ayam':'Telur','Telur rebus':'Telur','Air jeruk lemon':'Jeruk lemon','Air jeruk nipis':'Jeruk nipis','Air jeruk limau':'Jeruk limau','Air jeruk':'Jeruk','Air asam jawa':'Asam jawa','Lada':'Merica','Gula jawa':'Gula merah','Minyak sayur':'Minyak goreng','Tepung kanji':'Tepung tapioka','Mi':'Mie'})[matched] || matched;
  text=text.replace(/^[\d\s½¼¾⅓⅔.,/–-]+\s*/,'').replace(/^(?:kg|gr\.?|gram|g|ml|cc|liter|lt|l|sdm\.?|sdt\.?|sendok makan|sendok teh|butir|buah|siung|ekor|potong|lembar|batang|ikat|gelas|cangkir|genggam|ons|ruas(?: jari)?|biji|helai|lebar)\s+/,'')
    .replace(/\s+(?:secukupnya|sesuai selera|untuk|yang|iris|potong|kupas|cuci|haluskan|dicincang|dihaluskan|dimemarkan|sangrai|goreng|rebus|rendam|dipotong|dibelah|dibersihkan).*$/,'')
    .replace(/\s+[\d½¼¾].*$/,'').replace(/[.]+$/,'').trim();
  if(!text || text.length>120) throw new Error(`Ingredient requires curation: ${raw}`);
  return text[0].toLocaleUpperCase('id')+text.slice(1);
}
const input=JSON.parse(await readFile('artifacts/recipes/indonesian-recipes.json','utf8'));
const manual=JSON.parse(await readFile('scripts/recipe-name-overrides.json','utf8'));
const recipes=input.recipes.map(recipe=>({...recipe,ingredientGroups:recipe.ingredientGroups.map(group=>({...group,items:group.items.map(item=>({...item,name:Object.hasOwn(manual,item.text) ? manual[item.text] : shoppingName(item.text)})).filter(item=>item.name)})),source:{...recipe.source,changes:recipe.source.changes+' Shopping names extracted and spelling normalized; preparation-only notes and separators excluded. Shopping quantities left to the user.'}}));
await mkdir('public/data',{recursive:true});
await writeFile('public/data/recipes.json',JSON.stringify({...input,status:'initial-collection',recipes}));
await mkdir('.test-output',{recursive:true});
const audit=Object.fromEntries(recipes.flatMap(r=>r.ingredientGroups.flatMap(g=>g.items.map(i=>[i.text,i.name]))));
await writeFile('.test-output/recipe-name-audit.json',JSON.stringify(audit,null,2));
console.log(`Local recipe asset ready: ${recipes.length} recipes, ${new Set(Object.values(audit)).size} shopping names.`);
