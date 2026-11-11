import { useState } from 'react';
import { type SavedTable, loadName, normalizeRoom, roomFromUrl } from '../connection';
import { RESUME_TEXT } from '../i18n/de';

interface Props {
  onOpen: (name: string, online: boolean) => void;
  onJoin: (name: string, roomId: string) => void;
  /** Gespeicherter Tisch dieses Geräts, der fortgesetzt werden kann (N2). */
  saved?: SavedTable | null;
  onResume?: (saved: SavedTable) => void;
  onDiscard?: () => void;
}

export function StartScreen({ onOpen, onJoin, saved, onResume, onDiscard }: Props) {
  const [name, setName] = useState(loadName);
  const [room, setRoom] = useState(() => roomFromUrl() ?? '');
  const trimmed = name.trim();
  const roomId = normalizeRoom(room);

  return (
    <main className="screen">
      <h1>Schafkopf</h1>
      <label className="field">
        Dein Name
        <input
          value={name}
          maxLength={24}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Lukas"
        />
      </label>

      {saved && onResume && (
        <section className="panel">
          <h2>{RESUME_TEXT.title}</h2>
          <p className="hint">
            {saved.snapshot.roomId ? RESUME_TEXT.online(saved.snapshot.roomId) : RESUME_TEXT.local}{' '}
            {RESUME_TEXT.progress(
              saved.snapshot.table.handNo,
              Math.max(1, Math.round((Date.now() - saved.savedAt) / 60_000)),
            )}
          </p>
          <div className="row">
            <button type="button" onClick={() => onResume(saved)}>
              {RESUME_TEXT.resume}
            </button>
            <button type="button" className="secondary" onClick={onDiscard}>
              {RESUME_TEXT.discard}
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Tisch eröffnen</h2>
        <p className="hint">
          Du bist Gastgeber: Dein Gerät mischt und gibt. Freie Plätze übernehmen Bots.
        </p>
        <div className="row">
          <button type="button" disabled={!trimmed} onClick={() => onOpen(trimmed, true)}>
            Mit Freunden spielen
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!trimmed}
            onClick={() => onOpen(trimmed, false)}
          >
            Allein gegen Bots
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Einem Tisch beitreten</h2>
        <label className="field">
          Tisch-Code
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="z. B. k7m2xp"
          />
        </label>
        <button
          type="button"
          disabled={!trimmed || !roomId}
          onClick={() => onJoin(trimmed, roomId)}
        >
          Beitreten
        </button>
      </section>
    </main>
  );
}
