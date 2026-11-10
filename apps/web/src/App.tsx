import { useState, useSyncExternalStore } from 'react';
import { type Connection, joinTable, openTable, saveName } from './connection';
import { ERROR_TEXT } from './i18n/de';
import { Lobby } from './ui/Lobby';
import { StartScreen } from './ui/StartScreen';
import { Table } from './ui/Table';

export function App() {
  const [connection, setConnection] = useState<Connection | null>(null);

  if (!connection) {
    return (
      <StartScreen
        onOpen={(name, online) => {
          saveName(name);
          setConnection(openTable(name, online));
        }}
        onJoin={(name, roomId) => {
          saveName(name);
          setConnection(joinTable(name, roomId));
        }}
      />
    );
  }

  const leave = () => {
    connection.close();
    setConnection(null);
  };
  return <Game connection={connection} onLeave={leave} />;
}

function Game({ connection, onLeave }: { connection: Connection; onLeave: () => void }) {
  const { client, host, roomId } = connection;
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const { view, status, lastError } = snapshot;

  if (!view) {
    return (
      <main className="screen">
        <h1>Schafkopf</h1>
        <p>Verbinde mit Tisch {roomId} …</p>
        <p className="hint">
          Der Tisch wird direkt beim Gastgeber gesucht. Das kann ein paar Sekunden dauern; der
          Gastgeber muss die Seite geöffnet haben.
        </p>
        <button type="button" onClick={onLeave}>
          Abbrechen
        </button>
      </main>
    );
  }

  return (
    <>
      {status === 'disconnected' && (
        <p className="banner banner--warn">
          Verbindung zum Gastgeber verloren. Warte auf Rückkehr …
        </p>
      )}
      {lastError && <p className="banner">{ERROR_TEXT[lastError]}</p>}
      {view.hand ? (
        <Table view={view} client={client} host={host} onLeave={onLeave} />
      ) : (
        <Lobby view={view} host={host} roomId={roomId} onLeave={onLeave} />
      )}
    </>
  );
}
