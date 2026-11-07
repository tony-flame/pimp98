import { writeFileSync, mkdirSync } from 'node:fs';
import { GIRLS } from '../src/content/girls.ts';
import { renderPortrait } from '../src/art/portrait.ts';

mkdirSync('shots/portraits', { recursive: true });

const variants = GIRLS.map((arche) => ({
  name: arche.id,
  svg: renderPortrait(arche.portrait, { width: 240, height: 280, mood: 'plain' }),
}));

const smile = GIRLS.map((arche) => ({
  name: `${arche.id}-smile`,
  svg: renderPortrait({ ...arche.portrait, expression: 'smile' }, { width: 240, height: 280, mood: 'warm' }),
}));

const html = `<!doctype html><meta charset="utf-8">
<style>
body{background:#1a1d22;display:flex;flex-wrap:wrap;gap:12px;padding:16px;font-family:sans-serif}
figure{margin:0;color:#ccc;font-size:12px;text-align:center}
svg{box-shadow:0 0 0 1px #000}
</style>
${[...variants, ...smile].map((v) => `<figure>${v.svg}<figcaption>${v.name}</figcaption></figure>`).join('\n')}
`;

writeFileSync('shots/portraits.html', html);
console.log('written');
