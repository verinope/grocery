import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
await mkdir('dist', { recursive: true });
await cp('src', 'dist/src', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await build({ entryPoints: ['src/platform.js'], outfile: 'dist/src/platform.js', bundle: true, format: 'esm', target: 'es2020', minify: true });
const tess = dirname(require.resolve('tesseract.js/package.json'));
const core = dirname(createRequire(join(tess, 'package.json')).resolve('tesseract.js-core/package.json'));
const lang = dirname(require.resolve('@tesseract.js-data/eng/package.json'));
const fonts = dirname(require.resolve('@fontsource/inter/package.json'));
await mkdir('dist/vendor/core', { recursive: true });
await mkdir('dist/vendor/lang', { recursive: true });
await mkdir('dist/fonts', { recursive: true });
await cp(join(tess, 'dist/tesseract.min.js'), 'dist/vendor/tesseract.min.js');
await cp(join(tess, 'dist/worker.min.js'), 'dist/vendor/worker.min.js');
for (const name of await readdir(core)) if (/^tesseract-core.*\.wasm(?:\.js)?$/.test(name)) await cp(join(core, name), join('dist/vendor/core', name));
await cp(join(lang, '4.0.0/eng.traineddata.gz'), 'dist/vendor/lang/eng.traineddata.gz');
// Regular Latin letters cover Indonesian; font weights are stored locally.
await cp(join(fonts, 'files/inter-latin-400-normal.woff2'), 'dist/fonts/inter-latin-wght-normal.woff2');
for (const weight of [500, 600, 700]) await cp(join(fonts, `files/inter-latin-${weight}-normal.woff2`), `dist/fonts/inter-latin-${weight}-normal.woff2`);
async function walk(path, prefix = '') {
  const out = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) out.push(...await walk(join(path, entry.name), relative));
    // Cloudflare consumes these config files; they are not publicly served assets.
    else if (!['sw.js', '_headers', '_redirects'].includes(entry.name)) out.push(relative);
  }
  return out;
}
const urls = (await walk('dist')).sort();
const hash = createHash('sha256');
for (const url of urls) hash.update(await readFile(`dist${url}`));
const version = hash.digest('hex').slice(0, 12);
await writeFile('dist/sw.js', `const CACHE='belanja-${version}';\nconst ASSETS=${JSON.stringify(['/', ...urls])};\n` + await readFile('scripts/sw-template.js', 'utf8'));
console.log(`Build ready: ${urls.length} local assets, cache ${version}.`);
