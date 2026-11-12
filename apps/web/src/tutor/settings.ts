/**
 * Einstellungen des Trainers (T2): ob Max Weber beim Spiel allein gegen Bots mitschaut und ob er
 * sich von selbst meldet. Das ist eine Vorliebe dieses Geräts, keine Tischregel – deshalb steht
 * sie nicht im `RuleSet`, geht nie über das Netz und liegt im localStorage.
 *
 * Standard: an, mit Automatik. Wer „Allein gegen Bots“ wählt, übt meist; der Trainer drängt sich
 * nicht auf (von selbst nur in wichtigen Momenten) und ist mit einem Klick aus.
 */

export interface TutorSettings {
  /** Max Weber sitzt mit am Tisch (nur allein gegen Bots). */
  on: boolean;
  /** Er meldet sich in wichtigen Momenten von selbst. */
  auto: boolean;
}

export const DEFAULT_TUTOR_SETTINGS: TutorSettings = { on: true, auto: true };

const KEY = 'schafkopf.tutor';

function read(): TutorSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<TutorSettings> | null;
    if (!raw || typeof raw !== 'object') return DEFAULT_TUTOR_SETTINGS;
    return {
      on: typeof raw.on === 'boolean' ? raw.on : DEFAULT_TUTOR_SETTINGS.on,
      auto: typeof raw.auto === 'boolean' ? raw.auto : DEFAULT_TUTOR_SETTINGS.auto,
    };
  } catch {
    return DEFAULT_TUTOR_SETTINGS;
  }
}

let current: TutorSettings | null = null;
const listeners = new Set<() => void>();

/** Kleiner Speicher für `useSyncExternalStore`. */
export const tutorSettings = {
  getSnapshot(): TutorSettings {
    return (current ??= read());
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  set(patch: Partial<TutorSettings>): void {
    current = { ...tutorSettings.getSnapshot(), ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      // ohne Speicher gilt die Wahl nur bis zum Neuladen
    }
    for (const l of listeners) l();
  },
};
