import { createRandomBot } from '@schafkopf/bots';
import {
  ClientSession,
  type ConnectionStatus,
  HostSession,
  createLoopbackPair,
} from '@schafkopf/net';
import { useSyncExternalStore } from 'react';
import type { SavedTable } from '../connection';
import { ERROR_TEXT } from '../i18n/de';
import { ConnectBanner, ConnectSearch } from '../ui/ConnectStatus';
import { Lobby } from '../ui/Lobby';
import { Notice } from '../ui/Notice';
import { StartScreen } from '../ui/StartScreen';

/*
 * Ansichtsprobe (D4): Start, Lobby und Verbinden mit festen Zuständen, ohne echtes Netz. Nur im
 * Entwicklungsserver, z. B. http://localhost:5180/#ansicht?szene=lobby-gast
 *
 * Szenen: start, fortsetzen (Angebot nach Neuladen), einladung (über den Einladungslink),
 * lobby-gastgeber, lobby-gast, lobby-zuschauer, lobby-lokal (gegen Bots), suche, fehlgeschlagen,
 * verloren (Verbindung in der Lobby abgerissen), hinweis (Fehler des Gastgebers als Zettel).
 * Die Lobby läuft über einen echten HostSession mit Loopback-Verbindungen.
 * Beispielnamen stehen deshalb hier und nicht in i18n/de.ts.
 */

const ROOM = 'k7mqx2pdhn';
const noop = () => {};

function guest(host: HostSession, name: string): ClientSession {
  const pair = createLoopbackPair();
  host.addTransport(pair.host);
  return new ClientSession(pair.client, {
    name,
    clientId: `probe-${name}`,
    connectTimeoutMs: 0,
  });
}

/** Lukas eröffnet, Resi und Vroni sitzen, Platz 3 ist frei, Xaver schaut zu. */
function setup(online: boolean) {
  const host = new HostSession({
    createBot: (seat) => createRandomBot(seat + 1),
    roomId: online ? ROOM : null,
    schedule: noop,
  });
  const lukas = guest(host, 'Lukas');
  if (!online) return { host, me: lukas, others: [] as ClientSession[] };
  const resi = guest(host, 'Resi');
  const vroni = guest(host, 'Vroni');
  vroni.takeSeat(3);
  const xaver = guest(host, 'Xaver');
  xaver.takeSeat(null);
  host.setSpectatorsWelcome(true);
  return { host, me: lukas, others: [resi, vroni, xaver] };
}

const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
const scene = params.get('szene') ?? 'start';
const world =
  scene.startsWith('lobby') || ['verloren', 'hinweis'].includes(scene)
    ? setup(scene !== 'lobby-lokal')
    : null;

const savedTable = {
  owner: 'probe',
  name: 'Lukas',
  savedAt: Date.now() - 4 * 60_000,
  sameTab: false,
  snapshot: { roomId: ROOM, table: { handNo: 3 } },
} as unknown as SavedTable;

function LobbyScene({
  client,
  host,
  banner,
  notice,
}: {
  client: ClientSession;
  host: HostSession | null;
  banner?: ConnectionStatus;
  notice?: boolean;
}) {
  const { view } = useSyncExternalStore(client.subscribe, client.getSnapshot);
  if (!view) return null;
  return (
    <>
      {banner && <ConnectBanner status={banner} onRetry={noop} />}
      <Lobby
        view={view}
        client={client}
        host={host}
        roomId={scene === 'lobby-lokal' ? null : ROOM}
        onLeave={noop}
      />
      <Notice message={notice ? ERROR_TEXT.seat_taken : null} />
    </>
  );
}

export function Ansichtsprobe() {
  switch (scene) {
    case 'fortsetzen':
      return (
        <StartScreen
          saved={savedTable}
          invite={null}
          onOpen={noop}
          onJoin={noop}
          onResume={noop}
          onDiscard={noop}
        />
      );
    case 'einladung':
      return <StartScreen invite={ROOM} onOpen={noop} onJoin={noop} />;
    case 'suche':
    case 'fehlgeschlagen':
      return (
        <ConnectSearch
          status={scene === 'suche' ? 'connecting' : 'failed'}
          roomId={ROOM}
          onRetry={noop}
          onCancel={noop}
        />
      );
    case 'lobby-gastgeber':
    case 'lobby-lokal':
      return <LobbyScene client={world!.me} host={world!.host} />;
    case 'lobby-gast':
      return <LobbyScene client={world!.others[0]!} host={null} />;
    case 'lobby-zuschauer':
      return <LobbyScene client={world!.others[2]!} host={null} />;
    case 'verloren':
      return <LobbyScene client={world!.others[0]!} host={null} banner="disconnected" />;
    case 'hinweis':
      return <LobbyScene client={world!.others[0]!} host={null} notice />;
    default:
      return <StartScreen invite={null} onOpen={noop} onJoin={noop} />;
  }
}
