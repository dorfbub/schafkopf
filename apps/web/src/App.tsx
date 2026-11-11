import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  type Connection,
  type SavedTable,
  clearSavedTable,
  findSavedTable,
  joinTable,
  openTable,
  readSavedTable,
  resumeTable,
  saveName,
} from './connection';
import { ERROR_TEXT } from './i18n/de';
import { ConnectBanner, ConnectSearch } from './ui/ConnectStatus';
import { Lobby } from './ui/Lobby';
import { StartScreen } from './ui/StartScreen';
import { Table } from './ui/Table';

export function App() {
  const [connection, setConnection] = useState<Connection | null>(null);
  // undefined = wird noch geprüft (Web Lock ist asynchron); null = nichts fortzusetzen.
  const [saved, setSaved] = useState<SavedTable | null | undefined>(() =>
    readSavedTable() ? undefined : null,
  );

  useEffect(() => {
    if (saved !== undefined) return;
    let cancelled = false;
    void findSavedTable().then((found) => {
      if (cancelled) return;
      // Derselbe Tab hat neu geladen: ohne Rückfrage weiter, die Gäste warten.
      if (found?.sameTab) setConnection(resumeTable(found));
      setSaved(found?.sameTab ? null : found);
    });
    return () => {
      cancelled = true;
    };
  }, [saved]);

  if (!connection) {
    if (saved === undefined) return null; // nur einen Augenblick, bis der Lock geprüft ist
    return (
      <StartScreen
        saved={saved}
        onResume={(table) => {
          setSaved(null);
          setConnection(resumeTable(table));
        }}
        onDiscard={() => {
          clearSavedTable();
          setSaved(null);
        }}
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
      <ConnectSearch
        status={status}
        roomId={roomId}
        onRetry={() => client.retry()}
        onCancel={onLeave}
      />
    );
  }

  return (
    <>
      <ConnectBanner status={status} onRetry={() => client.retry()} />
      {lastError && <p className="banner">{ERROR_TEXT[lastError]}</p>}
      {view.hand ? (
        <Table view={view} client={client} host={host} onLeave={onLeave} />
      ) : (
        <Lobby view={view} host={host} roomId={roomId} onLeave={onLeave} />
      )}
    </>
  );
}
