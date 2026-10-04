"""Build the standalone design review, without modifying or deploying the PWA."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'artifacts/recipes/indonesian-recipes.json').read_text(encoding='utf-8'))
template=(ROOT/'artifacts/designs/recipe-library.template.html').read_text(encoding='utf-8')
payload=json.dumps(data,ensure_ascii=False).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
target=ROOT/'artifacts/designs/recipe-library-review.html'
target.write_text(template.replace('__RECIPE_DATA__',payload),encoding='utf-8')
print(target)
