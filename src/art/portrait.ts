import type { Accessory, Expression, EyeShape, HairStyle, Outfit, PortraitParams } from '../game/types';
import { Rng, hashString } from '../game/rng';

export interface PortraitOptions {
  width?: number;
  height?: number;
  frame?: boolean;
  mood?: 'plain' | 'dim' | 'warm';
}

const DITHER = 'p98-dither';
const SHADE = 'p98-shade';
const CLIP = 'p98-clip';
const SKIN_LIGHT = 'p98-skinlight';

function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.max(0, Math.min(255, ((num >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* The head: wide cheekbones, narrow chin, top of skull at y=37. */
const HEAD = `M60 83.4
  C 56.4 83.4, 52.4 81, 50.4 76.8
  C 48 72, 45.6 66, 45.2 58
  C 44.6 45.6, 51 37, 60 37
  C 69 37, 75.4 45.6, 74.8 58
  C 74.4 66, 72 72, 69.6 76.8
  C 67.6 81, 63.6 83.4, 60 83.4 Z`;

/* ------------------------------------------------------------------- hair */

function hairBack(style: HairStyle, color: string): string {
  const dark = shade(color, -24);
  switch (style) {
    case 'long':
      return `<path d="M38 58c0-18 9-29 22-29s22 11 22 29v38c0 9-4 15-8 17 1-16 2-32 2-44-4 5-28 5-32 0 0 12 1 28 2 44-4-2-8-8-8-17z" fill="${dark}"/>`;
    case 'wavy':
      return `<path d="M37 58c0-18 9-29 23-29s23 11 23 29v26c0 8-2 14-5 17-2-1-3-5-4-10-2 5-3 8-6 6-2-1-3-5-4-9-2 4-3 7-5 9-3 2-4-1-6-6-1 5-2 9-4 10-3-3-5-9-5-17z" fill="${dark}"/>`;
    case 'bob':
      return `<path d="M37.6 57c0-18 9.4-28 22.4-28s22.4 10 22.4 28v17c0 7-4 11-8 11h-3c-1-9-4-15-9-15s-8.6 6-9.6 15h-3c-4 0-8-4-8-11z" fill="${dark}"/>`;
    case 'afro':
      return `<circle cx="60" cy="50" r="27" fill="${dark}"/><circle cx="39" cy="61" r="10" fill="${dark}"/><circle cx="81" cy="61" r="10" fill="${dark}"/>`;
    case 'bun':
      return `<circle cx="60" cy="22" r="10" fill="${dark}"/><rect x="55" y="28" width="10" height="8" fill="${dark}"/><path d="M39.8 57c0-16 8.6-25 20.2-25s20.2 9 20.2 25v14c0 6-3.4 9-7 9H46.8c-3.6 0-7-3-7-9z" fill="${dark}"/>`;
    case 'ponytail':
      return `<path d="M79 47c11 5 16 17 13 30-3 14-9 20-14 18 7-12 10-29 1-48z" fill="${dark}"/><path d="M39.8 57c0-16 8.6-25 20.2-25s20.2 9 20.2 25v13c0 6-3.4 9-7 9H46.8c-3.6 0-7-3-7-9z" fill="${dark}"/>`;
    case 'pixie':
      return `<path d="M39 58c0-16 8.4-27 19.4-27s19.4 11 19.4 27v13c0 5-3 8-7 8H46c-4 0-7-3-7-8z" fill="${dark}"/><path d="M41 57c-.8 7-.2 14 1.6 20l4.4-1.4c-1.8-6-2.4-12-1.8-17.6zM79 57c.8 7 .2 14-1.6 20l-4.4-1.4c1.8-6 2.4-12 1.8-17.6z" fill="${dark}"/>`;
    case 'short':
    default:
      return `<path d="M40.6 58c0-17 8.4-27 19.4-27s19.4 10 19.4 27v11c0 5-3 7-6 7H46.6c-3 0-6-2-6-7z" fill="${dark}"/>`;
  }
}

/** Hair mass on top of the skull. Sits above y=37 so the silhouette reads as volume, not a cap. */
function hairTop(style: HairStyle, color: string): string {
  const light = shade(color, 26);
  const smooth = `<path d="M39.6 56C38 41 46 29.6 60 29.6S82 41 80.4 56c-2.2-8.6-7.4-13.6-14-15.2C63.4 40 56.6 40 53.6 40.8 47 42.4 41.8 47.4 39.6 56Z" fill="${color}"/>`;

  switch (style) {
    case 'long':
      return `${smooth}<path d="M40.6 54c-2.2 9-2.2 18-1.4 27l4.6-.8c-1.4-9-1.6-18-.8-26zM79.4 54c2.2 9 2.2 18 1.4 27l-4.6-.8c1.4-9 1.6-18 .8-26z" fill="${color}"/><path d="M46 38c3.6-3.8 8-5.6 12.6-5.6" stroke="${light}" stroke-width="1.4" fill="none" opacity="0.6"/>`;
    case 'bob':
      return `${smooth}<path d="M41 53c-1.8 8-2 16-1.2 24 1.6.8 3.6.6 5-.2-1.6-8-1.8-16-.8-23zM79 53c1.8 8 2 16 1.2 24-1.6.8-3.6.6-5-.2 1.6-8 1.8-16 .8-23z" fill="${color}"/><path d="M45 38.6c3.4-3.4 8-5.2 12.4-5.4" stroke="${light}" stroke-width="1.5" fill="none" opacity="0.55"/>`;
    case 'wavy':
      return `${smooth}<path d="M40.6 55c-2.4 8-1.8 16-.2 24l4.4-1.4c-1.6-8-1.8-15-.8-21zM79.4 55c2.4 8 1.8 16 .2 24l-4.4-1.4c1.6-8 1.8-15 .8-21z" fill="${color}"/>`;
    case 'afro':
      return `<path d="M38 54c0-13 9-22 22-22s22 9 22 22c-3.4-8.4-10-12.4-22-12.4S41.4 45.6 38 54Z" fill="${color}"/><circle cx="43" cy="43" r="4.6" fill="${color}"/><circle cx="77" cy="43" r="4.6" fill="${color}"/><circle cx="60" cy="34" r="5" fill="${color}"/>`;
    case 'bun':
      return `${smooth}<path d="M49 36.6c4-2.6 18-2.6 22 0" stroke="${light}" stroke-width="1.3" fill="none" opacity="0.55"/>`;
    case 'ponytail':
      return `${smooth}<path d="M45.6 38.4c3.6-3.6 8.4-5.4 13-5.4" stroke="${light}" stroke-width="1.4" fill="none" opacity="0.55"/>`;
    case 'pixie':
      return `<path d="M39.4 54c-1.4-13 5.4-23 19.6-23s21 10 19.6 23c-3.4-7.4-8.4-11-13.4-11.8 1.8 2.8 1.8 6 .4 8.4-2.6-4.4-6.6-6.6-11-6.6-5.4 0-10 3.2-15.2 10z" fill="${color}"/><path d="M53 32.6c3.4 1 6.4 3.2 7.6 6.4" stroke="${light}" stroke-width="1.3" fill="none" opacity="0.65"/>`;
    case 'short':
    default:
      return `${smooth}<path d="M47 36.8c4-2.6 8-3.6 12.4-3.6" stroke="${light}" stroke-width="1.3" fill="none" opacity="0.5"/>`;
  }
}

/* ---------------------------------------------------------------- outfits */

function outfitShape(kind: Outfit, color: string): string {
  const dark = shade(color, -30);
  const light = shade(color, 30);
  switch (kind) {
    case 'blazer':
      return `<path d="M26 140c0-22 12-33 22-39l12 18 12-18c10 6 22 17 22 39z" fill="${color}"/><path d="M48 101l12 18-8 21-6-26zM72 101L60 119l8 21 6-26z" fill="${light}"/><path d="M60 117l-5 23h10z" fill="${dark}"/>`;
    case 'dress':
      return `<path d="M28 140c2-20 12-31 22-36l10 13 10-13c10 5 20 16 22 36z" fill="${color}"/><path d="M60 117v23" stroke="${dark}" stroke-width="1.8"/><path d="M46 102c7 5 21 5 28 0" stroke="${light}" stroke-width="2.6" fill="none"/>`;
    case 'jacket':
      return `<path d="M24 140c0-24 14-35 24-40l12 20 12-20c10 5 24 16 24 40z" fill="${color}"/><path d="M60 120v20" stroke="${shade(color, -44)}" stroke-width="2.6"/><circle cx="60" cy="125" r="2.2" fill="${light}"/><circle cx="60" cy="133" r="2.2" fill="${light}"/>`;
    case 'turtleneck':
      return `<path d="M28 140c0-22 12-33 22-38h20c10 5 22 16 22 38z" fill="${color}"/><path d="M50 98c4 6 16 6 20 0l2 11c-4.4 4.6-19.6 4.6-24 0z" fill="${shade(color, 18)}"/>`;
    case 'coat':
      return `<path d="M22 140c0-26 15-38 27-43l11 18 11-18c12 5 27 17 27 43z" fill="${color}"/><path d="M60 115v25" stroke="${shade(color, -46)}" stroke-width="1.8"/><path d="M48 100l12 13 12-13" stroke="${light}" stroke-width="2.4" fill="none"/>`;
    case 'top':
    default:
      return `<path d="M32 140c0-21 12-32 22-37h12c10 5 22 16 22 37z" fill="${color}"/><path d="M48 104c6 5 18 5 24 0" stroke="${shade(color, 22)}" stroke-width="2.6" fill="none"/>`;
  }
}

/* ------------------------------------------------------------------- face */

function brows(expression: Expression, hair: string, weight = 1): string {
  const stroke = shade(hair, -44);
  const lift = expression === 'angry' ? 1.4 : expression === 'sad' ? -1.2 : expression === 'smirk' ? 0.7 : 0;
  const inner = expression === 'angry' ? 1.8 : expression === 'sad' ? -1 : 0;
  const w = weight.toFixed(2);
  return `
    <path d="M47 ${51.4 - lift}q4.2 -2.4 8 -1.2" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" fill="none" opacity="0.85"/>
    <path d="M65 ${50.2 - lift - inner}q3.8 -1.2 8 1.2" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" fill="none" opacity="0.85"/>`;
}

function eyes(kind: EyeShape, expression: Expression, gap = 0): string {
  const narrow = kind === 'narrow' || expression === 'smirk';
  const wide = kind === 'wide';
  const tired = kind === 'tired' || expression === 'tired';
  const rx = wide ? 4 : narrow ? 3.2 : 3.7;
  const ry = wide ? 3.7 : narrow ? 2.3 : 3;
  const pupil = wide ? 1.7 : 1.5;
  const left = (48 - gap).toFixed(2);
  const right = (72 + gap).toFixed(2);
  const lx = Number(left);
  const rx2 = Number(right);
  const upper = `<path d="M${(lx - rx - 0.5).toFixed(2)} ${59.2 - ry * 0.35}q${rx + 0.5} -${ry + 1.2} ${rx * 2 + 1} 0" stroke="#2b1a1c" stroke-width="1.1" fill="none" opacity="0.95"/>`;
  const crease = `<path d="M${(lx - rx + 0.4).toFixed(2)} ${58.4 - ry - 1.4}q${rx} -1.4 ${rx * 2 - 0.8} 0.2M${(rx2 - rx + 0.4).toFixed(2)} ${58.4 - ry - 1.4}q${rx} -1.4 ${rx * 2 - 0.8} 0.2" stroke="rgba(120,70,64,0.35)" stroke-width="0.7" fill="none"/>`;
  const lash = expression === 'smile' || expression === 'smirk'
    ? `<path d="M${(lx + rx).toFixed(2)} 59.6l2.2 -1.6M${(rx2 - rx).toFixed(2)} 59.6l-2.2 -1.6" stroke="#2b1a1c" stroke-width="1.05" stroke-linecap="round"/>`
    : '';
  const lid = tired ? `<path d="M${(lx - rx).toFixed(2)} 58h${rx * 2}M${(rx2 - rx).toFixed(2)} 58h${rx * 2}" stroke="rgba(45,25,25,0.32)" stroke-width="0.85"/>` : '';
  return `
    <ellipse cx="${left}" cy="61.2" rx="${rx}" ry="${ry}" fill="#faf6ee"/>
    <ellipse cx="${right}" cy="61.2" rx="${rx}" ry="${ry}" fill="#faf6ee"/>
    <circle cx="${(lx + 0.4).toFixed(2)}" cy="61.4" r="${pupil}" fill="#31211f"/>
    <circle cx="${(rx2 + 0.4).toFixed(2)}" cy="61.4" r="${pupil}" fill="#31211f"/>
    <circle cx="${(lx + 1).toFixed(2)}" cy="60.6" r="0.55" fill="#fff"/>
    <circle cx="${(rx2 + 1).toFixed(2)}" cy="60.6" r="0.55" fill="#fff"/>
    ${upper}
    ${crease}
    ${lash}
    ${lid}`;
}

function nose(): string {
  return `<path d="M60 64.6c-.4 1.8-.9 2.8-1.5 3.7.9.5 2.1.5 3 0" stroke="rgba(150,92,78,0.45)" stroke-width="1" fill="none" stroke-linecap="round"/>`;
}

function mouth(expression: Expression, tilt = 0): string {
  const lip = '#a04c58';
  const lipDark = '#7e3a44';
  const base = 71.8 + tilt;
  const y = base.toFixed(2);
  switch (expression) {
    case 'smile':
      return `<path d="M55.6 ${y}c1.9 2.3 6.9 2.3 8.8 0" stroke="${lip}" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M57.6 ${(base + 0.8).toFixed(2)}c1.2.8 3.8.8 5 0" fill="${lipDark}" opacity="0.5"/>`;
    case 'smirk':
      return `<path d="M55.8 ${y}c2.8 1.2 6.8.4 8.6-1.8" stroke="${lip}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    case 'sad':
      return `<path d="M56 ${(base + 1.2).toFixed(2)}c1.9-2 6.2-2 8 0" stroke="${lip}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
    case 'angry':
      return `<path d="M56.4 ${(base + 0.6).toFixed(2)}c2.2-.8 5-.8 7.2 0" stroke="${lip}" stroke-width="1.9" stroke-linecap="round" fill="none"/>`;
    case 'tired':
      return `<path d="M56.4 ${(base + 0.6).toFixed(2)}c1.6-.7 5.6-.7 7.2 0" stroke="${lip}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    default:
      return `<path d="M56.8 ${(base + 0.4).toFixed(2)}c1.8.9 4.6.9 6.4 0" stroke="${lip}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
  }
}

function accessory(kind: Accessory, expression: Expression): string {
  switch (kind) {
    case 'earrings':
      return `<circle cx="42.4" cy="67" r="1.8" fill="#e3c76a"/><circle cx="77.6" cy="67" r="1.8" fill="#e3c76a"/>`;
    case 'cigarette':
      return `<rect x="71" y="71.4" width="14" height="2.2" rx="1" fill="#efe6d2"/><rect x="83" y="71.4" width="3.4" height="2.2" fill="#c96b3f"/><path d="M87 69.8c2.6-3.8.6-7.6 2.6-11" stroke="rgba(232,232,232,0.38)" stroke-width="1" fill="none"/>`;
    case 'glasses':
      return `<g stroke="#2a2622" stroke-width="1.3" fill="rgba(205,228,238,0.2)"><rect x="43.4" y="55.4" width="9.6" height="9.2" rx="2.4"/><rect x="67" y="55.4" width="9.6" height="9.2" rx="2.4"/><path d="M53 59.4h14M43.4 57.6l-3.6 1.6M76.6 57.6l3.6 1.6" fill="none"/></g>`;
    case 'scarf':
      return `<path d="M45 97c7.6 5.6 22.4 5.6 30 0l3.6 8.6c-10 6.6-27.2 6.6-37.2 0z" fill="#a84646"/><path d="M74.4 102l4.6 19-7.6 2-2.8-17z" fill="#8d3838"/>`;
    case 'headphones':
      return `<path d="M42 58c0-15 8-22 18-22s18 7 18 22" stroke="#2a2a30" stroke-width="3.4" fill="none"/><rect x="36" y="55" width="7.6" height="13" rx="2.8" fill="#2a2a30"/><rect x="76.4" y="55" width="7.6" height="13" rx="2.8" fill="#2a2a30"/>`;
    case 'none':
    default:
      return expression === 'angry' ? `<path d="M79.6 74.4l2.6 2.6M82.2 74.4l-2.6 2.6" stroke="#a04c58" stroke-width="1"/>` : '';
  }
}

/* -------------------------------------------------------------------- main */

export function renderPortrait(params: PortraitParams, options: PortraitOptions = {}): string {
  const width = options.width ?? 120;
  const height = options.height ?? 140;
  const frame = options.frame ?? true;
  const mood = options.mood ?? 'plain';
  const rng = new Rng(hashString(`portrait:${params.seed}`));

  const tilt = rng.float(-0.9, 0.9);
  const jaw = rng.float(-0.9, 0.9);
  const browWeight = 0.9 + rng.float(0, 0.35);
  const eyeGap = rng.float(-0.5, 0.5);
  const lipTilt = rng.float(-0.4, 0.4);
  const skinShadow = shade(params.skin, -30);
  const skinLight = shade(params.skin, 20);
  const round = shade(params.skin, 8);
  const bgDark = shade(params.bg, -22);

  const tint =
    mood === 'warm'
      ? '<rect width="120" height="140" fill="#d9a05a" opacity="0.10"/>'
      : mood === 'dim'
        ? '<rect width="120" height="140" fill="#0a1020" opacity="0.22"/>'
        : '';

  const layers = [
    `<rect width="120" height="140" fill="${params.bg}"/>`,
    `<rect width="120" height="140" fill="${bgDark}" opacity="0.26"/>`,
    `<rect width="120" height="140" fill="url(#${DITHER})"/>`,
    hairBack(params.hairStyle, params.hair),
    /* neck — narrow, sits under the jaw and behind the collar */
    `<path d="M55.4 72h9.2v20c0 4.4-9.2 4.4-9.2 0z" fill="${skinShadow}"/>`,
    `<path d="M57.6 72h6.4v18c0 3.6-6.4 3.6-6.4 0z" fill="${round}" opacity="0.5"/>`,
    `<ellipse cx="60" cy="83" rx="5.4" ry="2.4" fill="${skinShadow}" opacity="0.45"/>`,
    outfitShape(params.outfit, params.outfitColor),
    `<g transform="rotate(${tilt.toFixed(3)} 60 60)">`,
    `<path d="${HEAD}" fill="${params.skin}" transform="rotate(${jaw.toFixed(3)} 60 74)"/>`,
    /* soft shadow along the jaw and temples only */
    `<path d="M60 82c-6 0-12-3-14.6-8.6 1.4 4.4 5.4 9.8 14.6 9.8s13.2-5.4 14.6-9.8C72 79 66 82 60 82Z" fill="${skinShadow}" opacity="0.28"/>`,
    `<ellipse cx="42.6" cy="59.4" rx="2.4" ry="3.8" fill="${params.skin}"/>`,
    `<ellipse cx="77.4" cy="59.4" rx="2.4" ry="3.8" fill="${skinShadow}"/>`,
    `<ellipse cx="48.4" cy="67.4" rx="4.4" ry="2.6" fill="#c96f72" opacity="0.15"/>`,
    `<ellipse cx="71.6" cy="67.4" rx="4.4" ry="2.6" fill="#c96f72" opacity="0.15"/>`,
    `<path d="M49.4 44.8c-1.9 3.2-2 8-1.2 12" stroke="${skinLight}" stroke-width="1.4" fill="none" opacity="0.42"/>`,
    hairTop(params.hairStyle, params.hair),
    brows(params.expression, params.hair, browWeight),
    eyes(params.eyes, params.expression, eyeGap),
    nose(),
    mouth(params.expression, lipTilt),
    accessory(params.accessory, params.expression),
    `</g>`,
    `<rect x="0" y="0" width="120" height="140" fill="url(#${SHADE})"/>`,
    tint,
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140" width="${width}" height="${height}" role="img" aria-label="Портрет">
  <defs>
    <pattern id="${DITHER}" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="none"/>
      <rect width="1" height="1" x="0" y="0" fill="rgba(255,255,255,0.11)"/>
      <rect width="1" height="1" x="2" y="2" fill="rgba(0,0,0,0.09)"/>
    </pattern>
    <linearGradient id="${SHADE}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.09)"/>
      <stop offset="0.55" stop-color="rgba(0,0,0,0)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0.32)"/>
    </linearGradient>
    <radialGradient id="${SKIN_LIGHT}" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="${skinLight}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${skinLight}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${CLIP}"><rect x="0" y="0" width="120" height="140"/></clipPath>
  </defs>
  <g clip-path="url(#${CLIP})">
    ${layers.join('\n    ')}
  </g>
  ${
    frame
      ? `<rect x="0.5" y="0.5" width="119" height="139" fill="none" stroke="#000" stroke-width="1" opacity="0.5"/>
         <rect x="2.5" y="2.5" width="115" height="135" fill="none" stroke="#fff" stroke-width="1" opacity="0.14"/>`
      : ''
  }
</svg>`;
}
