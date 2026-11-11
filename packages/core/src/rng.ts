/**
 * Deterministischer Zufall. Der Kern würfelt nie selbst (kein Math.random),
 * damit jedes Spiel aus Seed + Aktionen reproduzierbar ist.
 */

export type Rng = () => number;

/**
 * Seed für die Mischung: vier 32-Bit-Wörter (128 Bit), als JSON-Array speicherbar.
 * Eine einzelne Zahl ist als Kurzform erlaubt (Tests, Bots) und wird per splitmix32 auf
 * 128 Bit aufgefüllt.
 */
export type Seed = readonly [number, number, number, number];
export type SeedInput = Seed | number;

/** splitmix32: streut eine Zahl auf beliebig viele gut durchmischte Wörter. */
function splitmix32(state: number): () => number {
  let a = state >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

export function toSeed(input: SeedInput): Seed {
  if (typeof input === 'number') {
    const next = splitmix32(input);
    return [next(), next(), next(), next()];
  }
  return [input[0] >>> 0, input[1] >>> 0, input[2] >>> 0, input[3] >>> 0];
}

/** Prüft, ob ein Wert (z. B. aus JSON) ein gültiger Seed ist. */
export function isSeed(value: unknown): value is Seed {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((w) => Number.isInteger(w) && w >= 0 && w <= 0xffffffff)
  );
}

/**
 * xoshiro128** (Blackman/Vigna): 128 Bit Zustand, Periode 2^128 − 1, besteht gängige
 * Statistik-Batterien (BigCrush). Liefert Werte in [0, 1) mit 32 Bit Auflösung.
 */
export function createRng(input: SeedInput): Rng {
  const [w0, w1, w2, w3] = toSeed(input);
  let s0 = w0;
  let s1 = w1;
  let s2 = w2;
  let s3 = w3;
  // Der Zustand 0 wäre ein Fixpunkt; kommt bei Zufall praktisch nie vor.
  if ((s0 | s1 | s2 | s3) === 0) s0 = 1;
  const rotl = (x: number, k: number) => (x << k) | (x >>> (32 - k));
  return () => {
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = s1 << 9;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 11);
    s0 >>>= 0;
    s1 >>>= 0;
    s2 >>>= 0;
    s3 >>>= 0;
    return result / 4294967296;
  };
}

/** Fisher-Yates; gibt eine neue Liste zurück. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]!;
}
