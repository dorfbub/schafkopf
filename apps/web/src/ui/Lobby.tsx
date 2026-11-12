import type { PlayerInfo, Seat, TableView } from '@schafkopf/core';
import type { ClientSession, HostSession } from '@schafkopf/net';
import { type FormEvent, useState, useSyncExternalStore } from 'react';
import { inviteLink } from '../connection';
import { LOBBY_TEXT as T, RULES_TEXT as R, START_TEXT } from '../i18n/de';
import { formatRoomCode } from '../roomCode';
import { Button, PlayerSeat, Tafel } from './kit';
import { LobbySettings } from './LobbySettings';
import { RulesSummary } from './RulesSummary';
import { POSITIONS } from './table/layout';

interface Props {
  view: TableView;
  client: ClientSession;
  host: HostSession | null;
  roomId: string | null;
  onLeave: () => void;
}

/**
 * Lobby: oben die Einladung, darunter der Tisch mit den vier Plätzen (du unten, wie später im
 * Spiel), daneben bzw. darunter Name, Zuschauer und – nur für den Gastgeber – die Einstellungen.
 */
export function Lobby({ view, client, host, roomId, onLeave }: Props) {
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const watchers = snapshot.lobby?.watchers ?? [];
  const me = view.you === null ? null : view.seats[view.you];
  const myName = me?.name ?? snapshot.name;

  return (
    <main className="lobby surface-felt">
      <header className="lobby__bar">
        <span className="brand brand--small" aria-hidden="true">
          {START_TEXT.brand}
        </span>
        <h1 className="lobby__title">{roomId ? T.title(formatRoomCode(roomId)) : T.titleLocal}</h1>
        <Button variant="secondary" size="small" onClick={onLeave}>
          {T.leave}
        </Button>
      </header>

      <div className="lobby__grid">
        {roomId && <Invite roomId={roomId} />}

        <LobbyTable view={view} client={client} host={host} />

        <div className="lobby__side">
          <RenameForm key={myName} current={myName} onRename={(name) => client.rename(name)} />

          {watchers.length > 0 && (
            <Tafel tone="felt" aria-labelledby="lobby-watchers">
              <h2 id="lobby-watchers" className="tafel__title tafel__title--small">
                {T.watchers}
              </h2>
              <ul className="lobby__watchers">
                {watchers.map((name, i) => (
                  <li key={i}>
                    <span className="lobby__watcher-avatar" aria-hidden="true">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                    {name}
                    {view.you === null && name === snapshot.name && (
                      <span className="marke marke--brass">{T.you}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Tafel>
          )}

          {host && (
            <Tafel id="tisch-einstellungen" aria-labelledby="lobby-settings">
              <h2 id="lobby-settings" className="tafel__title tafel__title--small">
                {T.settings}
              </h2>
              <LobbySettings view={view} host={host} />
              <label className="check">
                <input
                  type="checkbox"
                  checked={snapshot.lobby?.spectatorsWelcome ?? false}
                  disabled={!roomId}
                  aria-describedby="lobby-spectators-hint"
                  onChange={(e) => host.setSpectatorsWelcome(e.target.checked)}
                />
                {T.spectators}
              </label>
              <p id="lobby-spectators-hint" className="tafel__text text-muted start__small">
                {roomId ? T.spectatorsHint : T.spectatorsHintLocal}
              </p>
            </Tafel>
          )}

          {!host && (
            <Tafel aria-labelledby="lobby-rules">
              <h2 id="lobby-rules" className="tafel__title tafel__title--small">
                {R.title}
              </h2>
              <p className="tafel__text text-muted start__small">{R.guestHint}</p>
              <RulesSummary rules={view.rules} />
            </Tafel>
          )}
        </div>
      </div>
    </main>
  );
}

/** Einladung: großer Tisch-Code zum Vorlesen, Link zum Kopieren. */
function Invite({ roomId }: { roomId: string }) {
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');
  const link = inviteLink(roomId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopy('done');
    } catch {
      setCopy('failed'); // Zwischenablage gesperrt – der Link steht zum Markieren da
    }
  };

  return (
    <Tafel className="lobby__invite" aria-labelledby="lobby-invite">
      <h2 id="lobby-invite" className="tafel__title tafel__title--small">
        {T.invite}
      </h2>
      <p className="lobby__code-row">
        <span className="lobby__code-label">{T.inviteCode}</span>
        <span className="code code--large">{formatRoomCode(roomId)}</span>
      </p>
      <p className="tafel__text text-muted start__small">{T.inviteHint}</p>
      <div className="lobby__link">
        <label className="visually-hidden" htmlFor="lobby-link">
          {T.inviteLink}
        </label>
        <input
          id="lobby-link"
          className="field__input lobby__link-input"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
        />
        <Button variant="secondary" onClick={copyLink}>
          {copy === 'done' ? T.copied : T.copy}
        </Button>
      </div>
      <p className="lobby__copy-state" role="status">
        {copy === 'failed' && T.copyFailed}
      </p>
    </Tafel>
  );
}

/** Der Tisch mit den vier Plätzen; in der Mitte „Spiel starten“ bzw. der Hinweis für Gäste. */
function LobbyTable({
  view,
  client,
  host,
}: {
  view: TableView;
  client: ClientSession;
  host: HostSession | null;
}) {
  const players = view.seats.length;
  const bottom = view.you ?? 0;
  const free = view.seats.filter((s) => s === null).length;

  return (
    <section className="lobby__table-wrap" aria-labelledby="lobby-seats">
      <h2 id="lobby-seats" className="visually-hidden">
        {T.seats}
      </h2>
      <div className="lobby-table">
        <ol className="lobby-table__seats">
          {view.seats.map((player, seat) => (
            <li
              key={seat}
              className={`lobby-seat lobby-seat--${POSITIONS[(seat - bottom + players) % players]}`}
            >
              {player ? (
                <TakenSeat
                  seat={seat}
                  player={player}
                  you={seat === view.you}
                  host={host}
                  players={players}
                />
              ) : (
                <button
                  type="button"
                  className="lobby-seat__free"
                  aria-label={T.sitHereLabel(seat)}
                  onClick={() => client.takeSeat(seat)}
                >
                  <span className="lobby-seat__chair" aria-hidden="true">
                    +
                  </span>
                  <span className="lobby-seat__free-text">{T.sitHere}</span>
                </button>
              )}
            </li>
          ))}
        </ol>

        <div className="lobby-table__center">
          <p className="lobby-table__count">{T.freeCount(free)}</p>
          {host ? (
            <>
              <Button onClick={() => host.start()}>{T.start}</Button>
              {free > 0 && <p className="lobby-table__hint">{T.botsFill(free)}</p>}
            </>
          ) : (
            <p className="lobby-table__hint">{T.guestWaits}</p>
          )}
        </div>
      </div>

      <div className="lobby__below">
        {view.you === null ? (
          <p className="text-muted">{free > 0 ? T.watching : `${T.watching} ${T.noFreeSeat}`}</p>
        ) : (
          <Button variant="secondary" size="small" onClick={() => client.takeSeat(null)}>
            {T.watch}
          </Button>
        )}
      </div>
    </section>
  );
}

function TakenSeat({
  seat,
  player,
  you,
  host,
  players,
}: {
  seat: Seat;
  player: PlayerInfo;
  you: boolean;
  host: HostSession | null;
  players: number;
}) {
  return (
    <>
      <PlayerSeat
        className="lobby-seat__player"
        name={player.name}
        disconnected={!player.connected}
        marks={you ? <span className="marke marke--brass">{T.you}</span> : undefined}
      />
      {host && (
        <span className="lobby-seat__controls">
          <button
            type="button"
            className="icon-btn"
            aria-label={T.moveCcw(player.name)}
            title={T.moveCcw(player.name)}
            onClick={() => host.moveSeat(seat, (seat + players - 1) % players)}
          >
            <span aria-hidden="true">↺</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={T.moveCw(player.name)}
            title={T.moveCw(player.name)}
            onClick={() => host.moveSeat(seat, (seat + 1) % players)}
          >
            <span aria-hidden="true">↻</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={T.unseat(player.name)}
            title={T.unseat(player.name)}
            onClick={() => host.unseat(seat)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </span>
      )}
    </>
  );
}

function RenameForm({ current, onRename }: { current: string; onRename: (name: string) => void }) {
  const [name, setName] = useState(current);
  const trimmed = name.trim();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (trimmed && trimmed !== current) onRename(trimmed);
  };
  return (
    <Tafel tone="felt">
      <form className="lobby__rename" onSubmit={submit}>
        <label className="field__label" htmlFor="lobby-name">
          {T.rename}
        </label>
        <div className="lobby__rename-row">
          <input
            id="lobby-name"
            className="field__input"
            value={name}
            maxLength={24}
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!trimmed || trimmed === current}>
            {T.renameButton}
          </Button>
        </div>
      </form>
    </Tafel>
  );
}
