"""Collect a curated Wikibooks recipe selection with pinned revisions and attribution.

Review dataset only: not loaded by the PWA. No images are downloaded.
Run with Python 3: python scripts/collect-recipes.py
"""
from pathlib import Path
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'artifacts/recipes'
CACHE = ROOT / '.test-output/recipes'
API = 'https://id.wikibooks.org/w/api.php'
UA = 'BelanjaRecipeReview/0.1 (https://github.com/verinope/grocery; curated recipe research)'

def request(params):
    query = {'format': 'json', 'formatversion': 2, 'maxlag': 5, **params}
    url = API + '?' + urllib.parse.urlencode(query)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40) as res:
                data = json.load(res)
            if 'error' in data:
                raise RuntimeError(data['error'])
            return data
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    titles = ['Resep:' + line.strip() for line in (DEST / 'selection.txt').read_text(encoding='utf-8').splitlines() if line.strip()]
    pages = []
    for offset in range(0, len(titles), 40):
        data = request({'action': 'query', 'prop': 'revisions', 'rvprop': 'ids|timestamp|content', 'rvslots': 'main', 'titles': '|'.join(titles[offset:offset+40])})
        pages.extend(data['query']['pages'])
        print(f'Fetched {len(pages)}/{len(titles)} selected source pages', flush=True)
        time.sleep(0.3)
    result = {'retrievedAt': datetime.now(timezone.utc).isoformat(), 'pages': pages}
    (CACHE / 'source-pages.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Saved {len(pages)} source pages; missing: {[p["title"] for p in pages if p.get("missing")]}')

if __name__ == '__main__':
    main()
