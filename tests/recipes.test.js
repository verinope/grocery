import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initialState, addItem, beginDraft, archive } from '../src/domain.js';
import { findRecipes, shoppingIngredients, addRecipeIngredients } from '../src/recipes.js';

const data = JSON.parse(await readFile(new URL('../public/data/recipes.json', import.meta.url), 'utf8'));
const recipes = data.recipes;
const ayam = recipes.find(recipe => recipe.id === 'ayam-kecap');

test('100 unique attributed recipes have usable shopping names and source references', () => {
  assert.equal(recipes.length, 100);
  assert.equal(new Set(recipes.map(recipe => recipe.id)).size, 100);
  assert.equal(new Set(recipes.map(recipe => recipe.name.toLowerCase())).size, 100);
  for (const recipe of recipes) {
    assert.ok(recipe.steps.length >= 2, recipe.name);
    assert.ok(shoppingIngredients(recipe).length >= 3, recipe.name);
    assert.equal(recipe.source.license, 'CC-BY-SA-4.0');
    assert.equal(new URL(recipe.source.revisionUrl).hostname, 'id.wikibooks.org');
    assert.ok(recipe.source.historyUrl && recipe.source.attribution);
    for (const ingredient of shoppingIngredients(recipe)) {
      assert.ok(ingredient.name && ingredient.name.length <= 120);
      assert.ok(ingredient.references.every(text => text.trim()));
    }
  }
});

test('search uses dish names only, handles whitespace/case, and combines with category', () => {
  assert.deepEqual(findRecipes(recipes, '  AYAM   KECAP '), [ayam]);
  assert.equal(findRecipes(recipes, 'margarin').length, 0);
  assert.equal(findRecipes(recipes, 'ayam kecap', 'Sayur').length, 0);
  assert.equal(findRecipes(recipes, '', 'Sayur').length, 18);
  assert.equal(findRecipes(recipes).length, 100);
  assert.equal(new Set(findRecipes(recipes).slice(0, 8).map(recipe => recipe.category)).size, 8);
});

test('repeated ingredient lines form one choice without combining their quantities', () => {
  const ingredients = shoppingIngredients(ayam);
  assert.equal(ingredients.length, 8);
  const lemon = ingredients.find(item => item.name === 'Jeruk lemon');
  assert.deepEqual(lemon.references, ['2 sdm air jeruk lemon', '3 sdm air jeruk lemon']);
  assert.equal(Object.hasOwn(lemon, 'quantity'), false);
});

test('bulk addition leaves existing amounts, checkmarks, history, and drafts intact', () => {
  const state = initialState();
  addItem(state, { name: 'Susu' }); state.items[0].checked = true;
  beginDraft(state); archive(state);
  addItem(state, { name: 'BAWANG  PUTIH', quantity: '2', unit: 'pcs' }); state.items[0].checked = true;
  beginDraft(state);
  const before = structuredClone(state);
  const choices = shoppingIngredients(ayam);
  const result = addRecipeIngredients(state, ayam, choices.filter(item => ['Ayam', 'Bawang putih', 'Jeruk lemon'].includes(item.name)).map(item => item.id));
  assert.equal(result.added.length, 2); assert.equal(result.existing.length, 1);
  assert.deepEqual(state.items[0], before.items[0]);
  assert.deepEqual(state.trips, before.trips); assert.deepEqual(state.draft, before.draft);
  assert.equal(state.listId, before.listId);
  for (const item of result.added) {
    assert.equal(item.quantity, ''); assert.equal(item.unit, ''); assert.equal(item.checked, false);
    assert.ok(item.recipeReference);
  }
  const again = addRecipeIngredients(state, ayam, choices.map(item => item.id));
  assert.equal(again.existing.length, 3);
  const count = state.items.length;
  const repeated = addRecipeIngredients(state, ayam, choices.map(item => item.id));
  assert.equal(repeated.added.length, 0); assert.equal(state.items.length, count);
});

test('empty or invalid selection cannot change the active list', () => {
  const state = initialState(); const before = structuredClone(state);
  assert.throws(() => addRecipeIngredients(state, ayam, []));
  assert.throws(() => addRecipeIngredients(state, ayam, ['missing-id']));
  assert.deepEqual(state, before);
});

test('invalid ingredient batch is rejected before any addition', () => {
  const state = initialState(); const before = structuredClone(state);
  const invalid = { id: 'invalid', ingredientGroups: [{ items: [{ id: 'ok', name: 'Ayam', text: 'Ayam' }, { id: 'too-long', name: 'a'.repeat(121), text: 'Bad' }] }] };
  assert.throws(() => addRecipeIngredients(state, invalid, ['ok', 'too-long']));
  assert.deepEqual(state, before);
});
