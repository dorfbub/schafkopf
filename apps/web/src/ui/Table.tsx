import type { TableView } from '@schafkopf/core';
import type { ClientSession, HostSession } from '@schafkopf/net';
import { TableBoard } from './table/TableBoard';

interface Props {
  view: TableView;
  client: ClientSession;
  host: HostSession | null;
  onLeave: () => void;
}

/** Verbindet den Spieltisch mit der Sitzung; Aufbau und Stile unter `ui/table/`. */
export function Table({ view, client, host, onLeave }: Props) {
  return (
    <TableBoard
      view={view}
      onBid={(call) => client.bid(call)}
      onPlay={(card) => client.play(card)}
      onNext={host ? () => host.nextHand() : null}
      onLeave={onLeave}
    />
  );
}
