const url = 'https://tony-flame.github.io/pimp98/';

const res = await fetch(url);
const html = await res.text();
console.log('index status:', res.status);
console.log('has stage:', html.includes('id="stage"'));
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
console.log('refs:', assets.join(' | '));

for (const ref of assets) {
  if (!ref.startsWith('./assets') && !ref.startsWith('./favicon')) continue;
  const target = new URL(ref, url).href;
  try {
    const r = await fetch(target, { method: 'GET' });
    console.log(`  ${ref} -> ${r.status} ${r.headers.get('content-type')}`);
  } catch (error) {
    console.log(`  ${ref} -> ERR ${error.message}`);
  }
}
