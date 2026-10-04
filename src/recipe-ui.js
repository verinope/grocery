import { loadRecipes, recipeCategories, findRecipes, shoppingIngredients, ingredientKey, addRecipeIngredients } from './recipes.js';

export function createRecipeUI({ app, getState, mutate, go, escape, top, icon, isCurrent }) {
  let library, query = '', category = 'Semua', limit = 16, selectedRecipe, selected = new Set(), result, saving = false;
  const existing = () => new Map(getState().items.map(item => [ingredientKey(item.name), item]));
  const recipeById = id => library?.find(recipe => recipe.id === id);
  const ingredientHint = item => escape(item.references.join(' · '));
  const footer = (content, note = '') => `<div class="recipe-footer">${note ? `<p>${note}</p>` : ''}${content}</div>`;

  function cards() {
    const found = findRecipes(library, query, category);
    app.querySelector('#recipe-count').textContent = `${found.length} resep${category === 'Semua' ? ' Indonesia' : ''}`;
    app.querySelector('#recipe-results').innerHTML = found.length ? found.slice(0, limit).map(recipe =>
      `<button class="recipe-card" data-action="recipe-detail" data-id="${escape(recipe.id)}"><span><small>${escape(recipe.category)}</small><strong>${escape(recipe.name)}</strong><span>${shoppingIngredients(recipe).length} bahan · ${recipe.steps.length} langkah</span></span>${icon('arrow')}</button>`
    ).join('') : '<div class="recipe-empty"><h2>Resep belum ditemukan</h2><p>Coba nama masakan lain atau pilih kategori Semua.</p></div>';
    app.querySelector('#recipe-more').hidden = found.length <= limit;
  }
  function catalog() {
    app.innerHTML = top('Mau masak apa?', 'Pilih resep, lalu tambahkan bahan yang kamu butuhkan.', true) +
      `<label class="sr-only" for="recipe-search">Cari nama masakan</label><div class="recipe-search"><input type="search" id="recipe-search" placeholder="Cari nama masakan" value="${escape(query)}" autocomplete="off"></div><div class="recipe-categories" aria-label="Kategori resep">${recipeCategories.map(value => `<button data-action="recipe-category" data-category="${escape(value)}" aria-pressed="${value === category}">${escape(value)}</button>`).join('')}</div><div class="recipe-library-heading"><h2>Inspirasi masakan</h2><span id="recipe-count" role="status"></span></div><div id="recipe-results" class="recipe-cards"></div><button id="recipe-more" class="button secondary" data-action="recipe-more">Lihat resep lainnya</button>`;
    cards();
  }
  function detail(recipe) {
    app.innerHTML = top(escape(recipe.name), escape(recipe.category), true) +
      `<div class="recipe-meta"><span>${shoppingIngredients(recipe).length} bahan</span><span>${recipe.steps.length} langkah</span></div><section class="recipe-ingredients"><h2>Bahan masakan</h2>${recipe.ingredientGroups.filter(group => group.items.length).map(group => `<h3>${escape(group.name)}</h3><ul>${group.items.map(item => `<li>${escape(item.text)}</li>`).join('')}</ul>`).join('')}</section><section class="recipe-steps"><h2>Cara memasak</h2><ol>${recipe.steps.map(step => `<li>${escape(step.text)}</li>`).join('')}</ol></section><div class="recipe-source"><h2>Sumber resep</h2><p>Wikibuku bahasa Indonesia · <a href="${escape(recipe.source.revisionUrl)}" target="_blank" rel="noopener noreferrer">Lihat sumber</a></p><p>Kontributor ${escape(recipe.source.title)} · <a href="${escape(recipe.source.historyUrl)}" target="_blank" rel="noopener noreferrer">Riwayat penulis</a> · <a href="${escape(recipe.source.licenseUrl)}" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p><p>Format dan nama bahan disesuaikan untuk list belanja.</p></div>` +
      footer(`<button class="button primary" data-action="recipe-pick" data-id="${escape(recipe.id)}">Pilih bahan untuk dibeli ${icon('arrow')}</button>`);
  }
  function updateSelection() {
    const ingredients = shoppingIngredients(recipeById(selectedRecipe));
    const current = existing();
    const eligible = ingredients.filter(item => !current.has(ingredientKey(item.name)));
    const count = eligible.filter(item => selected.has(item.id)).length;
    const button = app.querySelector('[data-action="recipe-add"]');
    if (!button) return;
    button.disabled = saving || !count;
    button.textContent = saving ? 'Menambahkan…' : count ? `Tambahkan ${count} bahan ke list` : 'Pilih bahan untuk dibeli';
    const all = app.querySelector('[data-action="recipe-select-all"]');
    all.disabled = !eligible.length;
    all.textContent = count === eligible.length && count ? 'Batalkan pilihan' : 'Pilih semua yang belum ada';
  }
  function pick(recipe) {
    if (selectedRecipe !== recipe.id) { selectedRecipe = recipe.id; selected = new Set(); }
    const current = existing();
    app.innerHTML = top('Pilih bahan', escape(recipe.name), true) +
      `<p class="recipe-help">Pilih yang belum ada di rumah. Takaran di bawah adalah referensi resep; jumlah belanja bisa kamu isi di list.</p><button class="text-button recipe-select-all" data-action="recipe-select-all">Pilih semua yang belum ada</button><div class="recipe-pick-list">${shoppingIngredients(recipe).map(item => {
        const saved = current.get(ingredientKey(item.name));
        return `<div class="recipe-pick-row ${saved ? 'recipe-existing' : ''}"><label><input type="checkbox" data-recipe-ingredient="${escape(item.id)}" ${saved ? 'disabled' : selected.has(item.id) ? 'checked' : ''}><span><strong>${escape(item.name)}</strong><small>${ingredientHint(item)}</small>${saved ? `<span class="tag green">Sudah di list${saved.quantity ? ` · ${escape([saved.quantity, saved.unit].filter(Boolean).join(' '))}` : ''}</span>` : ''}</span></label>${saved ? `<button class="icon-button" data-action="edit-item" data-id="${saved.id}" aria-label="Ubah ${escape(saved.name)}">${icon('edit')}</button>` : ''}</div>`;
      }).join('')}</div>` + footer('<button class="button primary" data-action="recipe-add" disabled>Pilih bahan untuk dibeli</button>', 'Bahan yang sudah ada di list tetap memakai jumlahmu.');
    updateSelection();
  }
  function success() {
    if (!result) { go('list'); return; }
    app.innerHTML = top('Bahan siap dibeli', '', true) + `<section class="recipe-success"><div class="recipe-success-mark">${icon('check')}</div><h2>${result.added.length ? `${result.added.length} bahan ditambahkan` : 'Bahan sudah ada di list'}</h2><p>${result.added.length ? 'Isi jumlah sesuai kebutuhanmu, lalu belanja seperti biasa.' : 'List belanjamu tetap tersimpan. Kamu bisa mengubah jumlah dari list.'}</p>${result.existing.length ? `<p>${result.existing.length} bahan sudah ada di list. Jumlahnya tetap.</p>` : ''}</section><div class="recipe-added-list">${result.added.map(item => `<div><strong>${escape(item.name)}</strong><span>Jumlah belum diisi</span></div>`).join('')}</div>` + footer('<button class="button primary" data-action="list">Lihat list belanja</button>');
  }
  async function render(page, id, token) {
    if (page === 'recipe-added') { success(); return; }
    if (!library) {
      app.innerHTML = top('Resep', '', true) + '<p class="recipe-loading" role="status">Memuat resep…</p>';
      try { library = await loadRecipes(); }
      catch {
        if (isCurrent(token)) app.innerHTML = top('Resep', '', true) + '<div class="recipe-empty"><h2>Resep belum bisa dibuka</h2><p>Sambungkan internet untuk menyiapkan koleksi resep, lalu coba lagi.</p><button class="button secondary" data-action="recipe-retry">Coba lagi</button></div>';
        return;
      }
    }
    if (!isCurrent(token)) return;
    if (page === 'recipes') catalog();
    else {
      const recipe = recipeById(id);
      if (!recipe) { go('recipes'); return; }
      if (page === 'recipe-pick') pick(recipe); else detail(recipe);
    }
  }
  async function action(button) {
    const { action, id } = button.dataset;
    if (action === 'recipe-open') go('recipes');
    else if (action === 'recipe-detail') go(`recipe/${id}`);
    else if (action === 'recipe-pick') go(`recipe-pick/${id}`);
    else if (action === 'recipe-category') { category = button.dataset.category; limit = 16; catalog(); }
    else if (action === 'recipe-more') { limit += 16; cards(); }
    else if (action === 'recipe-retry') go('recipes');
    else if (action === 'recipe-select-all') {
      const eligible = shoppingIngredients(recipeById(selectedRecipe)).filter(item => !existing().has(ingredientKey(item.name)));
      const allSelected = eligible.every(item => selected.has(item.id));
      selected = new Set(allSelected ? [] : eligible.map(item => item.id));
      pick(recipeById(selectedRecipe));
    } else if (action === 'recipe-add') {
      if (saving) return;
      saving = true;
      button.disabled = true; button.textContent = 'Menambahkan…';
      try {
        result = await mutate(next => addRecipeIngredients(next, recipeById(selectedRecipe), selected), null, false);
        selected = new Set(); go(`recipe-added/${result.recipeId}`);
      } finally { saving = false; if (app.querySelector('[data-action="recipe-add"]')) updateSelection(); }
    }
  }
  function input(target) { if (target.id === 'recipe-search' && library) { query = target.value; limit = 16; cards(); } }
  function change(target) {
    const id = target.dataset.recipeIngredient;
    if (!id) return;
    if (target.checked) selected.add(id); else selected.delete(id);
    updateSelection();
  }
  return { render, action, input, change };
}
