import type { ConnectionStatus } from '@schafkopf/net';
import { CONNECT_TEXT, START_TEXT } from '../i18n/de';
import { formatRoomCode } from '../roomCode';
import { Button, Tafel } from './kit';

interface SearchProps {
  status: ConnectionStatus;
  roomId: string | null;
  onRetry: () => void;
  onCancel: () => void;
}

/** Gast wartet auf den Tisch: „suche Tisch“ oder nach der Zeitüberschreitung „fehlgeschlagen“. */
export function ConnectSearch({ status, roomId, onRetry, onCancel }: SearchProps) {
  const failed = status === 'failed';
  return (
    <main className="connect surface-felt">
      <p className="brand brand--small connect__brand" aria-hidden="true">
        {START_TEXT.brand}
      </p>
      <Tafel className="connect__card" aria-live="polite" aria-labelledby="connect-title">
        {failed ? (
          <span className="connect__icon" aria-hidden="true">
            !
          </span>
        ) : (
          <span className="spinner" aria-hidden="true" />
        )}
        <h1 id="connect-title" className="tafel__title">
          {failed ? CONNECT_TEXT.failed : CONNECT_TEXT.searching}
        </h1>
        {roomId && <p className="code code--large connect__code">{formatRoomCode(roomId)}</p>}
        <p className="tafel__text text-muted">
          {failed ? CONNECT_TEXT.failedHint : CONNECT_TEXT.searchingHint}
        </p>
        <div className="tafel__actions tafel__actions--center">
          <Button variant="secondary" onClick={onCancel}>
            {CONNECT_TEXT.cancel}
          </Button>
          {failed && <Button onClick={onRetry}>{CONNECT_TEXT.retry}</Button>}
        </div>
      </Tafel>
    </main>
  );
}

/** Zettel oben über Tisch oder Lobby, wenn die Verbindung zum Gastgeber abreißt. */
export function ConnectBanner({
  status,
  onRetry,
}: {
  status: ConnectionStatus;
  onRetry: () => void;
}) {
  if (status !== 'disconnected' && status !== 'failed') return null;
  return (
    <div className="connect-banner" role="status">
      {status === 'disconnected' ? (
        <>
          <span className="spinner spinner--small" aria-hidden="true" />
          <span>{CONNECT_TEXT.lost}</span>
        </>
      ) : (
        <>
          <span>{CONNECT_TEXT.lostFailed}</span>
          <Button size="small" onClick={onRetry}>
            {CONNECT_TEXT.retry}
          </Button>
        </>
      )}
    </div>
  );
}
