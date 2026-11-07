/** Deterministic RNG. Same seed, same week. No Math.random anywhere in the engine. */

export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  /** mulberry32 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty array');
    const index = Math.floor(this.next() * items.length);
    return items[index] as T;
  }

  weighted<T>(entries: readonly { item: T; w: number }[]): T {
    if (entries.length === 0) throw new Error('Rng.weighted: empty array');
    const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.w), 0);
    if (total <= 0) return (entries[0] as { item: T }).item;
    let roll = this.next() * total;
    for (const entry of entries) {
      roll -= Math.max(0, entry.w);
      if (roll <= 0) return entry.item;
    }
    return (entries[entries.length - 1] as { item: T }).item;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const a = copy[i] as T;
      const b = copy[j] as T;
      copy[i] = b;
      copy[j] = a;
    }
    return copy;
  }
}

export function rngFor(seed: string, tick: number): Rng {
  return new Rng(hashString(`${seed}:${tick}`));
}
