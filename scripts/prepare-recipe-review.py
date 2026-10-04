"""Convert pinned Wikibooks source text to an attributed, review-only recipe dataset."""
from pathlib import Path
from html import unescape
import json, re, hashlib
from urllib.parse import quote

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'artifacts/recipes'
RAW=ROOT/'.test-output/recipes/source-pages.json'
LICENSE='https://creativecommons.org/licenses/by-sa/4.0/'
HOLD={
    'Ayam goreng mentega':'Source contains multiple recipe versions; hold until one version is curated.',
    'Tempe mendoan':'Source contains multiple recipe versions; hold until one version is curated.',
    'Mie Aceh':'Source repeats ingredients and cooking steps with different seasonings.',
    'Nasi Liwet Solo':'Complex multi-dish source needs manual separation before import.',
    'Pindang serani':'Source describes fish but lists chicken/beef; inconsistent recipe.',
    'Pindang bandeng kecap':'Cooking steps mention seasonings absent from the ingredient list.',
    'Nasi goreng':'Cooking steps mention seasonings absent from the ingredient list.',
    'Gabus Pucung':'Source reuses an ingredient heading for cooking instructions; requires manual curation.',
    'Soto Bandung':'Source contains two versions; do not merge their ingredients and instructions.',
    'Bistik solo':'Beef appears in ingredients but the instructions only prepare chicken; hold for editorial review.',
    'Gado-gado':'Source contains a merged/corrupted ingredient line; hold for editorial correction.',
}
QUOTAS={'Ayam':20,'Daging':8,'Ikan & seafood':16,'Sayur':18,'Tahu, tempe & telur':10,'Nasi & mi':14,'Soto & sup':8,'Sambal':6}

def clean(s):
    s=re.sub(r'<ref\b[^>]*>.*?</ref\s*>|<ref\b[^>]*/\s*>','',s,flags=re.I|re.S)
    s=re.sub(r'\[\[(?:Berkas|File|Image|Kategori|Category):[^\]]*\]\]','',s,flags=re.I)
    s=re.sub(r'\[\[([^\[\]]+)\]\]',lambda m:m[1].split('|')[-1].split(':')[-1],s)
    for _ in range(4): s=re.sub(r'\{\{[^{}]*\}\}','',s)
    s=re.sub(r'\[https?://\S+\s+([^\]]+)\]',r'\1',s)
    s=re.sub(r'<[^>]+>',' ',s)
    s=s.replace("'''",'').replace("''",'')
    return re.sub(r'\s+',' ',unescape(s)).strip(' \t:;')

def parse(raw):
    raw=re.sub(r'<ref\b[^>]*>.*?</ref\s*>|<ref\b[^>]*/\s*>','',raw,flags=re.I|re.S)
    raw=re.sub(r'<br\s*/?>','\n',raw,flags=re.I)
    raw=re.sub(r'<li\b[^>]*>','\n* ',raw,flags=re.I)
    raw=re.sub(r'</li>','\n',raw,flags=re.I)
    groups=[]; steps=[]; mode=None; label='Bahan'; flags=[]
    for line in raw.splitlines():
        line=line.strip()
        if not line or line.startswith(('[[Berkas:','[[File:','[[Kategori:','{{','<!--','{|','|-','|}','!')): continue
        value=clean(line)
        head=None
        if re.match(r'^=+.*=+$',line): head=clean(line.strip('='))
        elif re.match(r"^'''[^']{1,85}'''\s*:?(\{\{.*)?$",line): head=value
        elif line.startswith(';'): head=clean(line[1:])
        elif re.match(r'^(Bahan|Bumbu|Cara|Langkah|Pelengkap)[^.!?]{0,70}:?$',value,re.I) and not line.startswith(('*','#')): head=value
        if head:
            lower=head.lower()
            if re.search(r'pranala|referensi|lihat pula|sumber|catatan|tips|keterangan|info tambahan|galeri',lower): mode=None
            elif re.search(r'cara|langkah|memasak|membuat|pembuatan|penyajian|menghidangkan|merebus|menumis|racikan',lower): mode='steps'; label=head
            elif re.search(r'bahan|bumbu|pelengkap|olesan|haluskan|sambal|^sate$|^kuah|^resep ',lower):
                if mode=='steps' and lower in ('kuah','penyajian'): label=head
                else: mode='ingredients'; label=head
            continue
        is_item=bool(re.match(r'^[*#]+\s*|^\d+[.)]\s+',line))
        if not is_item and not (mode=='ingredients' and value and len(value)<220 and not line.startswith(('|','<','[['))): continue
        value=clean(re.sub(r'^[*#]+\s*|^\d+[.)]\s+','',line))
        if not value or 'http://' in value or 'https://' in value: continue
        if mode=='ingredients':
            if not groups or groups[-1]['name']!=label: groups.append({'name':label,'items':[]})
            groups[-1]['items'].append({'text':value})
        elif mode=='steps': steps.append({'section':label,'text':value})
    return groups,steps,flags

def category(name):
    n=name.lower()
    if n.startswith(('soto','sup','coto','empal gentong','bebalung')): return 'Soto & sup'
    if n.startswith(('nasi','bubur','mi ','mie ')): return 'Nasi & mi'
    if n.startswith('sambal'): return 'Sambal'
    if any(w in n for w in ['ikan','cakalang','kakap','tongkol','patin','bandeng','udang','cumi','gabus','pepes peda','pindang serani']): return 'Ikan & seafood'
    if any(w in n for w in ['tempe','tahu','telur','telor','oncom']): return 'Tahu, tempe & telur'
    if re.search(r'\b(?:ayam|hayam)\b',n): return 'Ayam'
    if n.startswith(('sayur','tumis','oseng','urap','gado','karedok','lotek','pecel','ketoprak','gulai daun','gulai nangka','gulai pakis','pepes jamur')): return 'Sayur'
    return 'Daging'

def main():
    source=json.loads(RAW.read_text(encoding='utf-8'))
    order=(DEST/'selection.txt').read_text(encoding='utf-8').splitlines()
    by_title={p['title'].removeprefix('Resep:'):p for p in source['pages']}
    recipes=[]; rejects=[]
    for name in order:
        p=by_title[name]; rev=p['revisions'][0]; raw=rev['slots']['main']['content']
        if name in HOLD:
            rejects.append({'name':name,'reason':HOLD[name]});continue
        groups,steps,flags=parse(raw)
        count=sum(len(g['items']) for g in groups)
        if count<3 or len(steps)<2 or '\ufffd' in str(groups)+str(steps):
            rejects.append({'name':name,'ingredients':count,'steps':len(steps),'reason':'Incomplete extraction or damaged source characters; excluded rather than inventing content.'});continue
        slug=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
        index=0
        for g in groups:
            for item in g['items']:
                index+=1;item['id']=f'{slug}-ingredient-{index}'
        url='https://id.wikibooks.org/wiki/'+quote(p['title'].replace(' ','_'),safe=':')
        recipes.append({'id':slug,'name':name,'category':category(name),'image':None,
            'ingredientGroups':groups,'steps':steps,
            'source':{'publisher':'Wikibuku bahasa Indonesia','title':p['title'],'url':url,
                'revisionId':rev['revid'],'revisionUrl':f'https://id.wikibooks.org/w/index.php?oldid={rev["revid"]}',
                'historyUrl':f'https://id.wikibooks.org/w/index.php?title={quote(p["title"],safe="")}&action=history',
                'updatedAt':rev['timestamp'],'retrievedAt':source['retrievedAt'],
                'attribution':f'{p["title"]} — kontributor Wikibuku bahasa Indonesia',
                'license':'CC-BY-SA-4.0','licenseUrl':LICENSE,
                'sourceContentSha256':hashlib.sha256(raw.encode()).hexdigest(),
                'changes':'Selected ingredient and cooking sections; wiki markup and reference tags removed; whitespace normalized; category assigned. No portion scaling or quantity conversion.'},
            'review':{'status':'editorial-review-required','cookingTested':False,'flags':flags}})
    selected=[]; counts={}
    for r in recipes:
        cat=r['category']
        if counts.get(cat,0)<QUOTAS[cat]:
            selected.append(r);counts[cat]=counts.get(cat,0)+1
        else: rejects.append({'name':r['name'],'reason':'Reserve recipe; category quota filled for the first 100.'})
    recipes=selected
    assert len(recipes)==100, f'Only {len(recipes)} selected: {counts}'
    data={'schemaVersion':1,'status':'design-review-only','language':'id','license':'CC-BY-SA-4.0',
          'licenseUrl':LICENSE,'retrievedAt':source['retrievedAt'],'imagePolicy':'Deferred; no photographs downloaded.',
          'recipes':recipes}
    (DEST/'indonesian-recipes.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (DEST/'excluded-recipes.json').write_text(json.dumps(rejects,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    snapshots={r['source']['title']:by_title[r['name']] for r in recipes}
    (DEST/'source-snapshots.json').write_text(json.dumps({'license':'CC-BY-SA-4.0','licenseUrl':LICENSE,'retrievedAt':source['retrievedAt'],'pages':snapshots},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    counts={}
    for r in recipes: counts[r['category']]=counts.get(r['category'],0)+1
    print(json.dumps({'accepted':len(recipes),'categories':counts,'excluded':rejects},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
