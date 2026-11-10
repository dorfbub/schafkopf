import { useState } from 'react';
import { loadName, normalizeRoom, roomFromUrl } from '../connection';

interface Props {
  onOpen: (name: string, online: boolean) => void;
  onJoin: (name: string, roomId: string) => void;
}

export function StartScreen({ onOpen, onJoin }: Props) {
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
