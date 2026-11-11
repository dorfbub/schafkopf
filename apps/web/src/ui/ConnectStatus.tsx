import type { ConnectionStatus } from '@schafkopf/net';
import { CONNECT_TEXT } from '../i18n/de';
import './connectStatus.css';

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
    <main className="screen connect" aria-live="polite">
      <h1>Schafkopf</h1>
      <p className={failed ? 'connect__state connect__state--failed' : 'connect__state'}>
        {!failed && <span className="connect__spinner" aria-hidden="true" />}
        {failed ? CONNECT_TEXT.failed : CONNECT_TEXT.searching(roomId ?? '')}
      </p>
      <p className="hint">{failed ? CONNECT_TEXT.failedHint : CONNECT_TEXT.searchingHint}</p>
      <div className="row">
        {failed && (
          <button type="button" onClick={onRetry}>
            {CONNECT_TEXT.retry}
          </button>
        )}
        <button type="button" className={failed ? 'secondary' : undefined} onClick={onCancel}>
          {CONNECT_TEXT.cancel}
        </button>
      </div>
    </main>
  );
}

/** Hinweis über dem Tisch, wenn die Verbindung zum Gastgeber abreißt. */
export function ConnectBanner({
  status,
  onRetry,
}: {
  status: ConnectionStatus;
  onRetry: () => void;
}) {
  if (status === 'disconnected') {
    return <p className="banner banner--warn connect__banner">{CONNECT_TEXT.lost}</p>;
  }
  if (status === 'failed') {
    return (
      <p className="banner banner--warn connect__banner">
        {CONNECT_TEXT.lostFailed}
        <button type="button" onClick={onRetry}>
          {CONNECT_TEXT.retry}
        </button>
      </p>
    );
  }
  return null;
}
