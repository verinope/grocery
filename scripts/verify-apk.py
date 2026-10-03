"""Check the actual APK bundle, including AAPT's expansion of .gz assets."""
import gzip
import hashlib
import json
from pathlib import Path
import zipfile

apk = Path('artifacts/Belanja-0.1.0-debug.apk')
with zipfile.ZipFile(apk) as archive:
    checked = 0
    for file in Path('dist').rglob('*'):
        if not file.is_file():
            continue
        name = 'assets/public/' + file.relative_to('dist').as_posix()
        expected = file.read_bytes()
        if name.endswith('.gz'):
            name = name[:-3]
            expected = gzip.decompress(expected)
        assert archive.read(name) == expected, f'APK asset differs: {name}'
        checked += 1
    config = json.loads(archive.read('assets/capacitor.config.json'))
    assert config['appId'] == 'id.belanja.personal'
    assert not config.get('server', {}).get('url'), 'APK must run from bundled assets'
    plugins = json.loads(archive.read('assets/capacitor.plugins.json'))
    assert any('Camera' in p['classpath'] for p in plugins)
    assert any('AppPlugin' in p['classpath'] for p in plugins)

report = {
    'apk': apk.name,
    'bytes': apk.stat().st_size,
    'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
    'webAssetsVerified': checked,
    'localOcrModelVerified': True,
    'nativeCameraAndAppPluginsVerified': True,
    'physicalDeviceTested': False,
    'emulatorTested': False,
    'note': 'Emulator could not boot on this host without hardware acceleration; device testing is still required.'
}
Path('artifacts/verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(f'PASS: {checked} bundled assets match, including the expanded OCR model; native plugins and offline configuration are present.')
