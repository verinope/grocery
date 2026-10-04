import { addItem, validateItem } from './domain.js';

export const recipeCategories = ['Semua', 'Ayam', 'Daging', 'Ikan & seafood', 'Sayur', 'Tahu, tempe & telur', 'Nasi & mi', 'Soto & sup', 'Sambal'];
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id');
export const ingredientKey = normalize;
let loading;
export function loadRecipes() {
  if (!loading) loading = fetch('/data/recipes.json').then(async response => {
    if (!response.ok) throw new Error('Resep belum bisa dibuka. Coba lagi.');
    const data = await response.json();
    if (!Array.isArray(data.recipes) || !data.recipes.length) throw new Error('Koleksi resep belum tersedia.');
    return data.recipes;
  }).catch(error => { loading = null; throw error; });
  return loading;
}
export function findRecipes(recipes, query = '', category = 'Semua') {
  const q = normalize(query);
  const found = recipes.filter(recipe => (category === 'Semua' || recipe.category === category) && normalize(recipe.name).includes(q));
  if (q || category !== 'Semua') return found;
  const groups = recipeCategories.slice(1).map(category => found.filter(recipe => recipe.category === category));
  return Array.from({ length: Math.max(0, ...groups.map(group => group.length)) }, (_, index) => groups.map(group => group[index]).filter(Boolean)).flat();
}
// Repeated references share one shopping choice; quantities are never added together.
export function shoppingIngredients(recipe) {
  const groups = new Map();
  for (const group of recipe.ingredientGroups) for (const item of group.items) {
    const key = ingredientKey(item.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { id: item.id, name: item.name, references: [] });
    const references = groups.get(key).references;
    if (!references.includes(item.text)) references.push(item.text);
  }
  return [...groups.values()];
}
export function addRecipeIngredients(state, recipe, selectedIds) {
  const selected = new Set(selectedIds);
  const ingredients = shoppingIngredients(recipe).filter(item => selected.has(item.id));
  if (!ingredients.length) throw new Error('Pilih setidaknya satu bahan yang ingin dibeli.');
  for (const ingredient of ingredients) validateItem({ name: ingredient.name });
  const added = [], existing = [];
  const current = new Map(state.items.map(item => [ingredientKey(item.name), item]));
  for (const ingredient of ingredients) {
    const key = ingredientKey(ingredient.name);
    if (current.has(key)) { existing.push(current.get(key)); continue; }
    addItem(state, { name: ingredient.name });
    const item = state.items.at(-1);
    item.recipeReference = ingredient.references.join(' · ');
    current.set(key, item); added.push(item);
  }
  return { recipeId: recipe.id, added, existing };
}
