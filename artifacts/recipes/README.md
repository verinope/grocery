# Indonesian recipe collection

This collection contains **100 recipes** selected from 146 Indonesian-language Wikibooks recipe pages. The PWA's initial recipe catalog uses an adapted copy at `public/data/recipes.json`. The source collection retains its extraction and review status; it is not a claim that the recipes have been cooking-tested.

## Files

- `indonesian-recipes.json`: recipe names, categories, ingredient groups, cooking steps, attribution, pinned revisions, and review status.
- `source-snapshots.json`: the selected source revisions, including original wikitext, for checking extraction and provenance.
- `excluded-recipes.json`: excluded candidates and reserve recipes, with reasons.
- `selection.txt`: the candidate titles used by the collector.
- `validation.json`: structural checks and their limits.
- `../../public/data/recipes.json`: generated PWA catalog with canonical shopping names and the original ingredient references.
- `../../scripts/recipe-name-overrides.json`: explicit corrections to extracted shopping names.
- `../designs/recipe-library-review.html`: standalone searchable design preview with embedded data; open directly in a browser.

## Source and license

Recipe text is adapted from **Wikibuku bahasa Indonesia** and its contributors under **[Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)**. Every record links to its source page, the exact revision used, the contributor history, and the license. Those links and the credit must remain visible when the text is reused. Adaptations of this recipe content are distributed under the same license. This notice covers the recipe content and source snapshots; it does not assign a license to the application's code.

Changes made: ingredient and cooking sections selected; wiki formatting and reference tags removed from display text; whitespace normalized; categories assigned. Original wording and quantities are otherwise retained. The PWA catalog additionally extracts shopping names, normalizes spelling, and excludes preparation-only lines and separators from the ingredient choices. Repeated names form one shopping choice with all original references preserved; amounts are never combined. Source snapshots retain the original references. No serving-size calculation or quantity conversion is performed. Photographs are deferred and no source photos have been downloaded; image rights must be checked separately when that work starts.

## Quality and release status

Entries have ingredients and cooking steps, unique IDs, and traceable source revisions. Pages with known contradictory ingredients, multiple mixed recipes, damaged text, or incomplete extraction were held out. Additional complete candidates are reserved to keep the first collection balanced across eight categories.

**Editorial review is still required before a public product release.** Structural validation does not verify cooking safety, taste, complete seasoning coverage, source accuracy, spelling, historical terminology, dietary suitability, or allergens. Some sources use older Indonesian spellings and informal measures. Quantities are references, not automatically normalized shopping quantities. The current catalog is suitable for prototype evaluation and retains source credit on every detail screen.

Category names describe how to browse the collection, not vegetarian or allergen-free guarantees. A vegetable recipe may contain shrimp paste, meat, stock, or other animal ingredients.

## Refresh

From the project root, using Python 3:

```sh
python scripts/collect-recipes.py
python scripts/prepare-recipe-review.py
python scripts/validate-recipe-review.py
python scripts/build-recipe-review.py
node scripts/build-recipes.mjs
```

The collector uses the public MediaWiki API with a descriptive user agent, batched requests, request delays, and bounded retries. Raw candidate responses are cached under the ignored `.test-output/recipes/` folder. A refresh must be reviewed again because upstream revisions may change. Existing pinned source snapshots remain sufficient to audit this delivered collection.

## Design decisions

- Exact search placeholder: **Cari nama masakan**.
- Search matches recipe names only, never ingredients.
- Recipes are an optional additional flow; List Belanja and Riwayat remain the main navigation.
- No serving selector. Users decide their shopping quantities themselves.
- Food visualization is deferred. The review uses clean text cards with no empty photo boxes.
- The HTML preview only simulates ingredient selection; it writes no shopping data or browser storage.
- The Figma file has not been updated: MCP quota and desktop-control failures blocked direct access. The revised SVG remains available for import.
