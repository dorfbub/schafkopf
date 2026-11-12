import type { TableView } from '@schafkopf/core';
import type { AbsentSeatInfo, ClientSession, HostSession } from '@schafkopf/net';
import { useSyncExternalStore } from 'react';
import { TutorProvider, useTutorSession } from '../tutor/context';
import { tutorSettings } from '../tutor/settings';
import { TableBoard } from './table/TableBoard';

interface Props {
  view: TableView;
  client: ClientSession;
  host: HostSession | null;
  absent: AbsentSeatInfo[];
  onLeave: () => void;
  /** Allein gegen Bots (eigener Tisch ohne Einladungslink): nur dann gibt es den Trainer. */
  solo?: boolean;
}

/**
 * Verbindet den Spieltisch mit der Sitzung; Aufbau und Stile unter `ui/table/`. Beim Spiel allein
 * gegen Bots sitzt auf Wunsch Max Weber als Trainer mit am Tisch (T2) – er rechnet im eigenen
 * Browser, nichts davon geht über das Netz.
 */
export function Table({ view, client, host, absent, onLeave, solo = false }: Props) {
  const { on } = useSyncExternalStore(tutorSettings.subscribe, tutorSettings.getSnapshot);
  const tutor = useTutorSession(solo && on && view.you !== null, view);
  return (
    <TutorProvider session={tutor}>
      <TableBoard
        view={view}
        onBid={(call) => {
          tutor?.noteMove({ type: 'bid', call });
          client.bid(call);
        }}
        onPlay={(card) => {
          tutor?.noteMove({ type: 'card', card });
          client.play(card);
        }}
        onPrelude={(move) => client.prelude(move)}
        onDouble={() => {
          tutor?.noteMove({ type: 'double', double: true });
          client.double();
        }}
        onNext={host ? () => host.nextHand() : null}
        onLeave={onLeave}
        absent={absent}
        onStandInNow={host ? (seat) => host.standInNow(seat) : null}
        onReplaceWithBot={host ? (seat) => host.replaceWithBot(seat) : null}
      />
    </TutorProvider>
  );
}
