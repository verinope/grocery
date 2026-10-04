"""Validate recipe provenance and structure; this is not a cooking-quality test."""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import importlib.util, json, hashlib, re, sys
sys.dont_write_bytecode=True

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'artifacts/recipes'
spec=importlib.util.spec_from_file_location('prepare',ROOT/'scripts/prepare-recipe-review.py')
prepare=importlib.util.module_from_spec(spec);spec.loader.exec_module(prepare)
data=json.loads((DIR/'indonesian-recipes.json').read_text(encoding='utf-8'))
snapshots=json.loads((DIR/'source-snapshots.json').read_text(encoding='utf-8'))['pages']
recipes=data['recipes'];errors=[];fingerprints=[]
assert len(recipes)==100
assert len({r['id'] for r in recipes})==len(recipes)
assert len({r['name'].casefold() for r in recipes})==len(recipes)
assert len({r['source']['revisionId'] for r in recipes})==len(recipes)
for r in recipes:
    src=r['source'];page=snapshots[src['title']];revision=page['revisions'][0]
    raw=revision['slots']['main']['content'];normalized=prepare.clean(raw)
    assert revision['revid']==src['revisionId'],r['name']
    assert hashlib.sha256(raw.encode()).hexdigest()==src['sourceContentSha256'],r['name']
    ingredients=[i for g in r['ingredientGroups'] for i in g['items']]
    assert len(ingredients)>=3 and len(r['steps'])>=2,r['name']
    assert len({i['id'] for i in ingredients})==len(ingredients),r['name']
    assert r['image'] is None and r['review']['cookingTested'] is False
    assert src['license']=='CC-BY-SA-4.0' and src['attribution'] and src['changes']
    for key in ('url','revisionUrl','historyUrl'):
        assert src[key].startswith('https://id.wikibooks.org/'),(r['name'],key)
    for item in [*ingredients,*r['steps']]:
        value=item['text']
        if value not in normalized:errors.append({'recipe':r['name'],'error':'Text not traceable to pinned source','text':value})
        if re.search(r'\[\[|\]\]|\{\{|\}\}|<ref|\ufffd',value):errors.append({'recipe':r['name'],'error':'Unclean markup','text':value})
    fingerprints.append(hashlib.sha256(json.dumps([i['text'] for i in ingredients]+[s['text'] for s in r['steps']],ensure_ascii=False).encode()).hexdigest())
assert len(set(fingerprints))==100,'Duplicate recipe contents'
result={'checkedAt':datetime.now(timezone.utc).isoformat(),'recipeCount':len(recipes),
    'categories':dict(Counter(r['category'] for r in recipes)),
    'uniqueNames':True,'uniqueRecipeContents':True,'pinnedSourcesVerified':len(recipes),
    'allHaveIngredientsAndSteps':True,'photosDownloaded':0,'errors':errors,
    'editorialReviewRequired':True,'cookingTested':False,
    'scope':'Structure, provenance and extraction checks only. No claim of culinary correctness or complete ingredient coverage.'}
(DIR/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
assert not errors,f'{len(errors)} validation issues'
