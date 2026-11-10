import type { TableView } from '@schafkopf/core';
import type { HostSession } from '@schafkopf/net';
import { useState } from 'react';
import { inviteLink } from '../connection';

interface Props {
  view: TableView;
  host: HostSession | null;
  roomId: string | null;
  onLeave: () => void;
}

export function Lobby({ view, host, roomId, onLeave }: Props) {
  const [copied, setCopied] = useState(false);
  const free = view.seats.filter((s) => s === null).length;
  const link = roomId ? inviteLink(roomId) : null;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false); // Zwischenablage gesperrt – der Link steht zum Markieren da
    }
  };

  return (
    <main className="screen">
      <h1>Tisch {roomId ?? '(lokal)'}</h1>

      {link && (
        <section className="panel">
          <h2>Freunde einladen</h2>
          <p className="hint">Schick diesen Link an deine Mitspieler:</p>
          <div className="row">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button type="button" className="secondary" onClick={copy}>
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Plätze</h2>
        <ol className="seats">
          {view.seats.map((player, seat) => (
            <li key={seat} className={player ? '' : 'seats__free'}>
              {player ? player.name : 'frei'}
              {seat === view.you && ' (du)'}
            </li>
          ))}
        </ol>
        {host ? (
          <>
            <button type="button" onClick={() => host.start()}>
              Spiel starten
            </button>
            {free > 0 && (
              <p className="hint">
                {free === 1 ? 'Der freie Platz wird' : `Die ${free} freien Plätze werden`} mit Bots
                besetzt.
              </p>
            )}
          </>
        ) : (
          <p className="hint">Der Gastgeber startet das Spiel.</p>
        )}
      </section>

      <button type="button" className="secondary" onClick={onLeave}>
        Tisch verlassen
      </button>
    </main>
  );
}
