"""Package only the static web build, with index.html at the ZIP root."""
import hashlib
import json
from pathlib import Path
import zipfile

root = Path('dist')
files = sorted(file for file in root.rglob('*') if file.is_file())
assert (root / 'index.html').exists(), 'Build the app before packaging.'
assert len(files) <= 1000, 'Cloudflare dashboard upload supports 1000 files.'
assert all(file.stat().st_size <= 25 * 1024 * 1024 for file in files), 'Cloudflare file size limit is 25 MiB.'
assert (root / 'vendor/lang/eng.traineddata.gz').exists(), 'PWA must include the compressed OCR model.'
assert '"/_headers"' not in (root / 'sw.js').read_text(), 'Deployment config must not be precached.'

destination = Path('artifacts/Belanja-PWA-Cloudflare.zip')
destination.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in files:
        name = file.relative_to(root).as_posix()
        assert not name.startswith(('.android-tools', 'node_modules', 'artifacts'))
        archive.write(file, name)
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert 'index.html' in archive.namelist()
    assert all(archive.read(file.relative_to(root).as_posix()) == file.read_bytes() for file in files)

report = {
    'archive': destination.name,
    'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
    'files': len(files),
    'largestFileBytes': max(file.stat().st_size for file in files),
    'zipBytes': destination.stat().st_size,
    'cloudflareDashboardLimitsChecked': True,
    'containsOnlyStaticWebBuild': True,
    'deployed': False
}
Path('artifacts/cloudflare-package.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f'Ready: {destination} ({len(files)} files, {destination.stat().st_size / 1000000:.1f} MB).')
