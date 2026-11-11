import type { TableView } from '@schafkopf/core';
import type { AbsentSeatInfo, ClientSession, HostSession } from '@schafkopf/net';
import { TableBoard } from './table/TableBoard';

interface Props {
  view: TableView;
  client: ClientSession;
  host: HostSession | null;
  absent: AbsentSeatInfo[];
  onLeave: () => void;
}

/** Verbindet den Spieltisch mit der Sitzung; Aufbau und Stile unter `ui/table/`. */
export function Table({ view, client, host, absent, onLeave }: Props) {
  return (
    <TableBoard
      view={view}
      onBid={(call) => client.bid(call)}
      onPlay={(card) => client.play(card)}
      onPrelude={(move) => client.prelude(move)}
      onDouble={() => client.double()}
      onNext={host ? () => host.nextHand() : null}
      onLeave={onLeave}
      absent={absent}
      onStandInNow={host ? (seat) => host.standInNow(seat) : null}
      onReplaceWithBot={host ? (seat) => host.replaceWithBot(seat) : null}
    />
  );
}
