import { mkdir, writeFile } from 'node:fs/promises';
const assets = {
  'list.svg': 'https://www.figma.com/api/mcp/asset/d47a00e7-40ea-4201-944c-31a455e01add.svg',
  'history.svg': 'https://www.figma.com/api/mcp/asset/caefbdda-598d-4666-8fdd-fd54d06a1cb3.svg',
  'unchecked.svg': 'https://www.figma.com/api/mcp/asset/d06cdf98-9312-4d01-b4dc-6c1f37589888.svg',
  'checked.svg': 'https://www.figma.com/api/mcp/asset/5bf8a2d2-5249-4e5a-ba45-04aebd64a877.svg',
  'empty-ring.svg': 'https://www.figma.com/api/mcp/asset/14bc3b42-76d3-4f3a-a17e-b8ffb24c1c9e.svg',
  'empty-center.svg': 'https://www.figma.com/api/mcp/asset/2a3c9b67-5078-4e53-87f5-d7693f754991.svg',
};
await mkdir('public/assets', { recursive: true });
await Promise.all(Object.entries(assets).map(async ([name, url]) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  const data = await response.arrayBuffer();
  if (data.byteLength < 20) throw new Error(`${name}: empty asset`);
  await writeFile(`public/assets/${name}`, new Uint8Array(data));
  console.log(`${name}: ${data.byteLength} bytes`);
}));
