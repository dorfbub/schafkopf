/**
 * Tisch-Code (N5): Erzeugung, Anzeige und tolerante Eingabe.
 *
 * Der Code ist das einzige Geheimnis, das einen Tisch schützt: Wer ihn kennt, setzt sich ohne
 * Rückfrage dazu. Deshalb 10 Zeichen aus 31 (rund 49,5 Bit), gleichverteilt gezogen.
 */

/** Ohne i, l, o, 0, 1 – leicht zu verwechseln beim Vorlesen. */
export const ROOM_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const ROOM_CODE_LENGTH = 10;
/** Anzeige in Gruppen: `k7mq-x2pd-hn`. */
const GROUPS = [4, 4, 2];

/** Quelle zufälliger Bytes; im Test durch eine feste Folge ersetzbar. */
export type RandomBytes = (n: number) => Uint8Array;

const cryptoBytes: RandomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

/**
 * Zieht einen Code per Rejection Sampling: Bytes ab 248 (= 8 · 31) werden verworfen, weil sie
 * die ersten Zeichen des Alphabets sonst häufiger machten (`b % 31`).
 */
export function randomRoomId(random: RandomBytes = cryptoBytes): string {
  const limit = 256 - (256 % ROOM_ALPHABET.length);
  let code = '';
  while (code.length < ROOM_CODE_LENGTH) {
    for (const b of random(ROOM_CODE_LENGTH * 2)) {
      if (b >= limit) continue;
      code += ROOM_ALPHABET[b % ROOM_ALPHABET.length];
      if (code.length === ROOM_CODE_LENGTH) break;
    }
  }
  return code;
}

/** Eingabe säubern: Bindestriche, Leerzeichen und Groß-/Kleinschreibung sind egal. */
export function normalizeRoom(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Ist das ein vollständiger, gültiger Code (bereits normalisiert)? */
export function isValidRoomId(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_ALPHABET.includes(c));
}

/** `k7mqx2pdhn` → `k7mq-x2pd-hn`. Kürzere Eingaben werden so weit gruppiert, wie sie reichen. */
export function formatRoomCode(code: string): string {
  const parts: string[] = [];
  let at = 0;
  for (const size of GROUPS) {
    if (at >= code.length) break;
    parts.push(code.slice(at, at + size));
    at += size;
  }
  return parts.join('-');
}
