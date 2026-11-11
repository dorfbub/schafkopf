import type { Seat, TableView } from '@schafkopf/core';
import type { ClientSession, HostSession } from '@schafkopf/net';
import { useState, useSyncExternalStore } from 'react';
import { inviteLink } from '../connection';
import { LOBBY_TEXT as T } from '../i18n/de';

interface Props {
  view: TableView;
  client: ClientSession;
  host: HostSession | null;
  roomId: string | null;
  onLeave: () => void;
}

export function Lobby({ view, client, host, roomId, onLeave }: Props) {
  const [copied, setCopied] = useState(false);
  const free = view.seats.filter((s) => s === null).length;
  const link = roomId ? inviteLink(roomId) : null;
  const { lobby } = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const watchers = lobby?.watchers ?? [];
  const me = view.you === null ? null : view.seats[view.you];

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
        <h2>{T.seats}</h2>
        <ol className="seats">
          {view.seats.map((player, seat) => (
            <li key={seat} className={player ? '' : 'seats__free'}>
              <div className="row">
                <span>
                  {player ? player.name : T.free}
                  {seat === view.you && ` ${T.you}`}
                </span>
                {!player && (
                  <button type="button" className="secondary" onClick={() => client.takeSeat(seat)}>
                    {T.sitHere}
                  </button>
                )}
                {host && player && (
                  <HostControls seat={seat} count={view.seats.length} host={host} />
                )}
              </div>
            </li>
          ))}
        </ol>
        {view.you !== null && (
          <button type="button" className="secondary" onClick={() => client.takeSeat(null)}>
            {T.watch}
          </button>
        )}
        {view.you === null && (
          <p className="hint">{free > 0 ? T.watching : `${T.watching} ${T.noFreeSeat}`}</p>
        )}
      </section>

      {watchers.length > 0 && (
        <section className="panel">
          <h2>{T.watchers}</h2>
          <ul className="seats">
            {watchers.map((name, i) => (
              <li key={i}>
                {name}
                {view.you === null && name === client.getSnapshot().name && ` ${T.you}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <RenameForm
        key={me?.name ?? client.getSnapshot().name}
        current={me?.name ?? client.getSnapshot().name}
        onRename={(name) => client.rename(name)}
      />

      {host && (
        <section className="panel" id="tisch-einstellungen">
          <h2>{T.settings}</h2>
          {/* Hier kommen mit K2 die Tischregeln dazu. */}
          <label className="row">
            <input
              type="checkbox"
              checked={lobby?.spectatorsWelcome ?? false}
              disabled={!roomId}
              onChange={(e) => host.setSpectatorsWelcome(e.target.checked)}
            />
            {T.spectators}
          </label>
          <p className="hint">{roomId ? T.spectatorsHint : T.spectatorsHintLocal}</p>
        </section>
      )}

      <section className="panel">
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
          <p className="hint">{T.guestWaits}</p>
        )}
      </section>

      <button type="button" className="secondary" onClick={onLeave}>
        Tisch verlassen
      </button>
    </main>
  );
}

function HostControls({ seat, count, host }: { seat: Seat; count: number; host: HostSession }) {
  return (
    <span className="row">
      <button
        type="button"
        className="secondary"
        aria-label={T.moveUp}
        title={T.moveUp}
        disabled={seat === 0}
        onClick={() => host.moveSeat(seat, seat - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="secondary"
        aria-label={T.moveDown}
        title={T.moveDown}
        disabled={seat === count - 1}
        onClick={() => host.moveSeat(seat, seat + 1)}
      >
        ↓
      </button>
      <button type="button" className="secondary" onClick={() => host.unseat(seat)}>
        {T.unseat}
      </button>
    </span>
  );
}

function RenameForm({ current, onRename }: { current: string; onRename: (name: string) => void }) {
  const [name, setName] = useState(current);
  const trimmed = name.trim();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed && trimmed !== current) onRename(trimmed);
  };
  return (
    <form className="panel" onSubmit={submit}>
      <label className="field">
        {T.rename}
        <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
      </label>
      <button type="submit" className="secondary" disabled={!trimmed || trimmed === current}>
        {T.renameButton}
      </button>
    </form>
  );
}
