import type { HostSession } from '@schafkopf/net';
import { useCallback, useSyncExternalStore } from 'react';
import { JOIN_TEXT as T } from '../i18n/de';
import { Button } from './kit';

/**
 * Beitrittsanfragen beim Gastgeber (N6): je ein Papierzettel oben mittig mit Name, „Abweisen“
 * und „Zulassen“. Liegt über Lobby und Tisch (`position: fixed`), damit am Tisch nichts springt.
 */
export function JoinRequests({ host }: { host: HostSession }) {
  const subscribe = useCallback((listener: () => void) => host.subscribe(listener), [host]);
  const requests = useSyncExternalStore(subscribe, host.getJoinRequests);
  return (
    <section className="join-requests" aria-label={T.region} aria-live="polite">
      {requests.map((request) => (
        <p key={request.id} className="notice join-request surface-paper">
          <span className="notice__text">{T.request(request.name)}</span>
          <span className="join-request__actions">
            <Button
              variant="secondary"
              size="small"
              aria-label={T.rejectLabel(request.name)}
              onClick={() => host.rejectJoin(request.id)}
            >
              {T.reject}
            </Button>
            <Button
              size="small"
              aria-label={T.admitLabel(request.name)}
              onClick={() => host.admitJoin(request.id)}
            >
              {T.admit}
            </Button>
          </span>
        </p>
      ))}
    </section>
  );
}
