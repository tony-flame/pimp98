/** Tiny 16x16-ish pixel icons drawn as SVG. No external assets. */

export type IconName =
  | 'office'
  | 'girls'
  | 'map'
  | 'clients'
  | 'ledger'
  | 'police'
  | 'journal'
  | 'computer'
  | 'folder'
  | 'floppy'
  | 'speaker'
  | 'warning'
  | 'money'
  | 'heart'
  | 'eye'
  | 'star'
  | 'phone'
  | 'door'
  | 'moon'
  | 'sun'
  | 'lock';

const P: Record<IconName, string> = {
  office: `<rect x="2" y="8" width="16" height="12" fill="#8a6a3a"/><rect x="2" y="6" width="16" height="3" fill="#b08b4c"/><rect x="5" y="11" width="4" height="4" fill="#4f7ba8"/><rect x="11" y="11" width="4" height="9" fill="#3a3a3a"/><rect x="1" y="19" width="18" height="3" fill="#555"/>`,
  girls: `<circle cx="13" cy="8" r="4" fill="#e8b892"/><path d="M13 3c3 0 5 2 5 5 0 4-2 6-5 6V3z" fill="#7a1f2b"/><path d="M5 22c0-5 3-8 8-8s8 3 8 8z" fill="#2b3a55"/>`,
  map: `<path d="M2 5l6-2 6 3 6-3v16l-6 3-6-3-6 2z" fill="#d8d0b8" stroke="#6a6448" stroke-width="1"/><path d="M8 3v18M14 6v18" stroke="#6a6448" stroke-width="1"/><circle cx="17" cy="13" r="2" fill="#c04040"/>`,
  clients: `<circle cx="9" cy="8" r="4" fill="#e0b088"/><path d="M2 22c0-5 3-8 7-8s7 3 7 8z" fill="#4a5a72"/><circle cx="18" cy="10" r="3" fill="#c9a227"/><path d="M13 22c0-4 2-6 5-6s5 2 5 6z" fill="#6f4a67"/>`,
  ledger: `<rect x="3" y="3" width="16" height="19" fill="#f0ece0" stroke="#6a6448"/><path d="M6 8h10M6 11h10M6 14h7" stroke="#8a8470" stroke-width="1.4"/><rect x="2" y="3" width="2" height="19" fill="#b04040"/>`,
  police: `<path d="M12 2l8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5z" fill="#3f5f8f"/><path d="M12 8l1.4 3h3.2l-2.6 2 1 3-3-1.9-3 1.9 1-3-2.6-2h3.2z" fill="#e3c76a"/>`,
  journal: `<rect x="3" y="4" width="18" height="17" fill="#efe6d2" stroke="#6a6448"/><path d="M6 8h12M6 11h12M6 14h9M6 17h12" stroke="#8a8470" stroke-width="1.3"/>`,
  computer: `<rect x="2" y="4" width="17" height="12" fill="#c3c3c3" stroke="#3a3a3a"/><rect x="4" y="6" width="13" height="8" fill="#1a3a6a"/><rect x="7" y="17" width="7" height="2" fill="#8a8a8a"/><rect x="4" y="19" width="13" height="3" fill="#a8a8a8" stroke="#3a3a3a"/>`,
  folder: `<path d="M2 5h7l2 2h11v14H2z" fill="#e3c76a" stroke="#8a7a3a"/><path d="M2 9h20" stroke="#b0a05a"/>`,
  floppy: `<rect x="3" y="3" width="18" height="18" fill="#3a3a3a"/><rect x="7" y="3" width="10" height="8" fill="#c3c3c3"/><rect x="10" y="4" width="4" height="5" fill="#6a6a6a"/><rect x="6" y="14" width="12" height="7" fill="#e8e8e8"/>`,
  speaker: `<path d="M3 9h4l5-4v14l-5-4H3z" fill="#5a5a5a"/><path d="M15 8c2 2 2 6 0 8M18 5c4 4 4 10 0 14" stroke="#3a3a3a" stroke-width="1.6" fill="none"/>`,
  warning: `<path d="M12 2l11 20H1z" fill="#e3c76a" stroke="#3a3a3a"/><rect x="11" y="8" width="2" height="8" fill="#2a2a2a"/><rect x="11" y="17" width="2" height="2" fill="#2a2a2a"/>`,
  money: `<rect x="2" y="7" width="20" height="12" fill="#7ba86a" stroke="#3a5a30"/><circle cx="12" cy="13" r="4" fill="#a8d09a" stroke="#3a5a30"/><path d="M12 10v6M10 12h4M10 14h4" stroke="#3a5a30" stroke-width="1"/>`,
  heart: `<path d="M12 21C5 16 2 12 2 8.5 2 5.5 4.5 3 7.5 3 9.5 3 11 4 12 5.5 13 4 14.5 3 16.5 3 19.5 3 22 5.5 22 8.5 22 12 19 16 12 21z" fill="#b04040"/>`,
  eye: `<path d="M1 13c4-7 18-7 22 0-4 7-18 7-22 0z" fill="#f7f3ea" stroke="#3a3a3a"/><circle cx="12" cy="13" r="4" fill="#2a2a2a"/><circle cx="13" cy="12" r="1.2" fill="#fff"/>`,
  star: `<path d="M12 2l3 7 7 .6-5.4 4.7 1.7 7L12 17.6 5.7 21.3l1.7-7L2 9.6 9 9z" fill="#e3c76a" stroke="#8a7a3a"/>`,
  phone: `<path d="M5 2c2-1 4 1 5 4 1 2 0 3-2 4l2 4c1 2 2 3 4 4l2-3c1-1 3-1 4 1 1 2 2 4 1 5-1 2-4 3-7 1C10 20 4 14 2 9 1 6 3 3 5 2z" fill="#3a3a3a"/>`,
  door: `<rect x="4" y="2" width="16" height="20" fill="#8a6a3a" stroke="#3a2a18"/><circle cx="16" cy="13" r="1.4" fill="#e3c76a"/><rect x="4" y="2" width="16" height="3" fill="#b08b4c"/>`,
  moon: `<path d="M15 2A10 10 0 1022 17a8 8 0 11-7-15z" fill="#e8e2b8" stroke="#6a6448"/>`,
  sun: `<circle cx="12" cy="12" r="5" fill="#e3c76a"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M20 4l-2 2M6 18l-2 2" stroke="#c9a227" stroke-width="2"/>`,
  lock: `<rect x="4" y="10" width="16" height="12" fill="#a8a8a8" stroke="#3a3a3a"/><path d="M8 10V7a4 4 0 018 0v3" stroke="#3a3a3a" stroke-width="2.4" fill="none"/><circle cx="12" cy="16" r="2" fill="#3a3a3a"/>`,
};

export function icon(name: IconName, size = 24, className = 'px-icon'): string {
  return `<svg class="${className}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" shape-rendering="crispEdges">${P[name]}</svg>`;
}

export function iconUri(name: IconName): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${P[name]}</svg>`,
  )}`;
}
