/**
 * Alle Texte der Oberfläche an einer Stelle. Weitere Sprachen (oder Bairisch)
 * lassen sich später als zweite Datei mit denselben Schlüsseln ergänzen.
 */

import type {
  AllPassedRule,
  BidCall,
  BidLevel,
  BotStrength,
  Contract,
  ContractKind,
  DeckKind,
  PreludeMove,
  Rank,
  Suit,
} from '@schafkopf/core';
import { HAWAII_SWITCH_TRICK } from '@schafkopf/core';
import type { HostErrorCode } from '@schafkopf/net';

export const SUIT_NAME: Record<Suit, string> = {
  eichel: 'Eichel',
  gras: 'Gras',
  herz: 'Herz',
  schellen: 'Schellen',
};

export const RANK_NAME: Record<Rank, string> = {
  A: 'Sau',
  '10': 'Zehner',
  K: 'König',
  O: 'Ober',
  U: 'Unter',
  '9': 'Neuner',
  '8': 'Achter',
  '7': 'Siebener',
};

export function contractLabel(contract: Contract): string {
  const suit = contract.suit ? SUIT_NAME[contract.suit] : '';
  const suit2 = contract.suit2 ? SUIT_NAME[contract.suit2] : '';
  const base = {
    sauspiel: `Sauspiel auf die ${suit}-Sau`,
    hochzeit: 'Hochzeit',
    arabischeHochzeit: 'Arabische Hochzeit',
    solo: `${suit}-Solo`,
    farbwenz: `${suit}-Farbwenz`,
    wenz: 'Wenz',
    eisenbahner: 'Eisenbahner',
    geier: 'Geier',
    hawaii: `Hawaii-Habicht (${suit}, ab Stich ${HAWAII_SWITCH_TRICK + 1} ${suit2})`,
    bettel: 'Bettel',
    ramsch: 'Ramsch',
  }[contract.kind];
  return contract.tout ? `${base} Tout` : base;
}

export const ERROR_TEXT: Record<HostErrorCode, string> = {
  version_mismatch: 'Deine Version passt nicht zum Tisch. Bitte die Seite neu laden.',
  not_seated: 'Du sitzt nicht am Tisch und schaust nur zu.',
  bad_message: 'Das hat der Tisch nicht verstanden.',
  wrong_phase: 'Das geht gerade nicht.',
  not_your_turn: 'Du bist nicht an der Reihe.',
  illegal_bid: 'Diese Ansage ist nicht erlaubt.',
  illegal_move: 'Das geht bei der Hochzeit gerade nicht.',
  illegal_card: 'Diese Karte darfst du nicht spielen.',
  illegal_double: 'Kontra bzw. Re geht jetzt nicht mehr.',
  no_hand: 'Es läuft gerade kein Spiel.',
  seat_taken: 'Dieser Platz ist schon besetzt.',
  not_admitted: 'Der Gastgeber hat dich noch nicht an den Tisch gelassen.',
};

/** Verbindungsstatus für Gäste (Paket N1, gestaltet in D4). */
export const CONNECT_TEXT = {
  searching: 'Suche Tisch …',
  searchingHint:
    'Der Tisch wird direkt beim Gastgeber gesucht. Das dauert meist nur ein paar Sekunden; der Gastgeber muss die Seite geöffnet haben.',
  failed: 'Tisch nicht gefunden',
  failedHint:
    'Ist der Tisch-Code richtig und hat der Gastgeber die Seite noch offen? In manchen Firmen- oder Hotelnetzen klappen direkte Verbindungen nicht.',
  retry: 'Erneut versuchen',
  cancel: 'Abbrechen',
  lost: 'Verbindung zum Gastgeber verloren – suche Tisch …',
  lostFailed: 'Gastgeber nicht mehr erreichbar.',
  /** Beitritt muss bestätigt werden (N6). */
  waiting: (host: string) => (host ? `Warte auf Zusage von ${host} …` : 'Warte auf Zusage …'),
  waitingHint:
    'Der Tisch ist gefunden. Der Gastgeber lässt neue Mitspieler erst nach einem Klick an den Tisch.',
  rejected: 'Nicht zugelassen',
  rejectedHint: 'Der Gastgeber hat deine Anfrage abgewiesen.',
  back: 'Zurück zum Start',
};

/** Beitrittsanfragen beim Gastgeber (N6). */
export const JOIN_TEXT = {
  region: 'Beitrittsanfragen',
  request: (name: string) => `${name} möchte an den Tisch.`,
  admit: 'Zulassen',
  admitLabel: (name: string) => `${name} an den Tisch lassen`,
  reject: 'Abweisen',
  rejectLabel: (name: string) => `${name} abweisen`,
};

/** Offener Tisch nach dem Neuladen des Gastgebers (Paket N2). */
export const RESUME_TEXT = {
  title: 'Dein Tisch ist noch offen',
  online: (room: string) => `Dein Tisch ${room} läuft noch.`,
  local: 'Dein Tisch gegen die Bots läuft noch.',
  progress: (handNo: number, minutes: number) =>
    handNo === 0
      ? `Noch in der Lobby, zuletzt vor ${minutes} min.`
      : `${handNo}. Spiel, zuletzt vor ${minutes} min. Kontostände und Karten bleiben erhalten.`,
  resume: 'Tisch fortsetzen',
  discard: 'Verwerfen',
};

/** Startbildschirm (D4). */
export const START_TEXT = {
  brand: 'Schafkopf',
  tagline: 'Zu viert oder zu dritt am Tisch – ohne Anmeldung, direkt im Browser.',
  name: 'Dein Name',
  namePlaceholder: 'z. B. Lukas',
  nameHint: 'So sehen dich die anderen am Tisch.',
  nameMissing: 'Bitte gib zuerst deinen Namen ein.',
  playFriends: 'Mit Freunden spielen',
  playFriendsHint: 'Du bekommst einen Link zum Einladen.',
  playBots: 'Allein gegen Bots',
  hostHint: 'Dein Gerät mischt und gibt. Freie Plätze übernehmen Bots.',
  joinTitle: 'Einladung bekommen?',
  joinCode: 'Tisch-Code',
  joinPlaceholder: 'z. B. k7mq-x2pd-hn',
  joinCodeInvalid:
    'Dieser Tisch-Code stimmt nicht. Ein Code hat 10 Zeichen, zum Beispiel k7mq-x2pd-hn.',
  inviteOutdated:
    'Dieser Einladungslink ist veraltet oder unvollständig. Tisch-Codes sind seit Kurzem länger – bitte den Gastgeber um einen neuen Link.',
  join: 'Beitreten',
  inviteTitle: 'Du bist eingeladen',
  inviteTo: 'an Tisch',
  inviteHint: 'Gib deinen Namen ein und setz dich dazu.',
  inviteOwn: 'Lieber selbst einen Tisch eröffnen',
};

/** Kurze Hinweise unten am Rand (Fehler des Gastgebers, D4). */
export const NOTICE_TEXT = {
  close: 'Hinweis schließen',
};

/** Hinweis auf eine neue Version der App (U5). */
export const UPDATE_TEXT = {
  message: 'Neue Version verfügbar.',
  reload: 'Neu laden',
};

/** Cent-Betrag als Euro, mit Vorzeichen: 150 → "+1,50 €". */
export function money(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
  return `${sign}${(Math.abs(cents) / 100).toFixed(2).replace('.', ',')} €`;
}

/** Betrag ohne Vorzeichen: 150 → "1,50 €". */
export function plainMoney(cents: number): string {
  return money(cents).replace(/^[+−]/, '');
}

/** Texte der Grundbausteine (src/ui/kit). */
export const UI_TEXT = {
  seatTurn: 'am Zug',
  seatDealer: 'Geber',
  seatDealerShort: 'G',
  seatDisconnected: 'getrennt',
  seatStandIn: 'Bot vertritt',
};

/** Name einer Spielart ohne Farbe, für den Ansage-Dialog. */
export const KIND_NAME: Record<ContractKind, string> = {
  sauspiel: 'Sauspiel',
  hochzeit: 'Hochzeit',
  arabischeHochzeit: 'Arabische Hochzeit',
  solo: 'Solo',
  wenz: 'Wenz',
  farbwenz: 'Farbwenz',
  eisenbahner: 'Eisenbahner',
  geier: 'Geier',
  hawaii: 'Hawaii-Habicht',
  bettel: 'Bettel',
  ramsch: 'Ramsch',
};

/** Spielart ohne Farbe, wie sie im Zweikampf genannt wird. */
export function levelLabel(level: BidLevel): string {
  return level.tout ? `${KIND_NAME[level.kind]} Tout` : KIND_NAME[level.kind];
}

/** Was ein Spieler in der Ansage laut sagt. */
export function callLabel(call: BidCall): string {
  switch (call.type) {
    case 'pass':
      return 'weiter';
    case 'interest':
      return 'Ich würde';
    case 'name':
      return levelLabel(call.level);
    case 'hold':
      return 'ich auch';
    case 'yield':
      return 'gut';
    case 'declare':
      return contractLabel(call.contract);
  }
}

/** Was ein Spieler im Vorspiel der Hochzeit laut sagt bzw. tut. */
export function preludeMoveLabel(move: PreludeMove['type']): string {
  switch (move) {
    case 'accept':
      return 'nehme an';
    case 'decline':
      return 'nein';
    case 'give':
      return 'gibt zurück';
  }
}

/** Texte des Spieltischs (src/ui/table). */
export const TABLE_TEXT = {
  brand: 'Schafkopf',
  leave: 'Verlassen',
  lastTrick: 'Letzter Stich',
  lastTrickPileLabel: (name: string, points: number) =>
    `Letzter Stich: ${name} hat gestochen, ${points} Augen. Groß zeigen`,
  close: 'Schließen',
  handNo: (n: number) => `Spiel ${n}`,
  trickNo: (n: number, of: number) => `Stich ${n} von ${of}`,
  bidding: 'Ansage',
  finished: 'Spiel beendet',
  youBid: 'Ansage – du bist dran',
  othersBid: (name: string) => `Ansage – ${name} ist dran`,
  plays: 'spielt',
  seatFallback: (seat: number) => `Platz ${seat + 1}`,
  you: 'du',
  spectating: 'Du schaust zu',
  yourTurnBid: 'Du sagst an',
  yourTurnPlay: 'Du bist dran',
  waitingFor: (name: string) => `${name} ist dran`,
  tricks: (n: number) => (n === 1 ? '1 Stich' : `${n} Stiche`),
  cards: (n: number) => (n === 1 ? '1 Karte' : `${n} Karten`),
  signLabel: (label: string) => `spielt ${label}`,
  markPartner: 'Mitspieler',
  pass: 'weiter',
  thinking: '…',
  trick: 'Stich',
  hand: 'Deine Karten',
  wonBy: (name: string, points: number) => `${name} sticht · ${points} Augen`,
  // Ansage-Dialog
  interestTitle: 'Würdest du spielen?',
  interestBody: 'Erst sagt jeder, ob er spielen würde. Wer mag, nennt danach sein Spiel.',
  interestYes: 'Ich würde',
  duelTitle: (name: string) => `Gegen ${name}: Was hast du?`,
  duelHint: (name: string) => `${name} war vorher dran und hat bei Gleichstand Vorrang.`,
  duelHintLevel: (name: string, level: string) => `${name} hält ${level} – du musst höher gehen.`,
  duelName: (label: string) => `„${label}“ sagen`,
  duelYield: 'Aufgeben',
  holdTitle: (name: string, level: string) => `${name} sagt: ${level}`,
  holdBody: (level: string) =>
    `Hast du ${level} oder Höheres? Bei Gleichstand hast du Vorrang, weil du vorher dran warst.`,
  holdYes: 'Ich auch',
  holdNo: 'Gut',
  bidTitle: 'Was spielst du?',
  bidKind: 'Spielart',
  bidSuitCalled: 'Auf welche Sau?',
  bidSuitTrump: 'Welche Farbe ist Trumpf?',
  bidSuitTrumpFirst: `Trumpf in Stich 1–${HAWAII_SWITCH_TRICK}`,
  bidSuitTrumpSecond: `Trumpf ab Stich ${HAWAII_SWITCH_TRICK + 1} (eine andere Farbe)`,
  // Hawaii-Habicht: Trumpffarbe wechselt nach dem vierten Stich (`HAWAII_SWITCH_TRICK`)
  trumpNext: (suit: string) => `ab Stich ${HAWAII_SWITCH_TRICK + 1}: ${suit}`,
  trumpSwitched: 'Trumpf gewechselt',
  trumpNow: (suit: string) => `Trumpf jetzt ${suit}`,
  bidTout: 'Tout',
  bidTouthint: 'alle Stiche',
  bidPass: 'Weiter',
  bidAnnounce: (label: string) => `${label} ansagen`,
  bidChoose: 'Spielart wählen',
  bidNothing: 'Mit diesem Blatt kannst du nichts ansagen.',
  bidStatus: (said: string[], open: string[]) =>
    [
      ...said,
      open.length ? `${open.join(' und ')} ${open.length > 1 ? 'kommen' : 'kommt'} noch` : '',
    ]
      .filter(Boolean)
      .join(' · '),
  bidSaid: (name: string, what: string) => `${name}: ${what}`,
  bidMinimum: (label: string) => `Mindestens: ${label}`,
  ramschStatus: 'Ramsch – jeder für sich',
  pot: (amount: string) => `Pott ${amount}`,
  mussStatus: (name: string) => `Muss – ${name} hat den Eichel-Ober`,
  mussYou: 'Muss – du hast den Eichel-Ober',
  mussTitle: 'Du musst spielen',
  mussBody: 'Alle haben „weiter“ gesagt. Du hast den Eichel-Ober und musst ein Sauspiel spielen.',
  // Hochzeit (K5)
  wedding: 'Hochzeit',
  yourTurnWedding: 'Du bist gefragt',
  weddingStatus: (declarer: string, asked: string, game = 'Hochzeit') =>
    `${declarer} macht ${game} – ${asked} ist gefragt`,
  weddingStatusYou: (declarer: string, game = 'Hochzeit') =>
    `${declarer} macht ${game} – du bist gefragt`,
  weddingExchange: (partner: string, n = 1) =>
    `${partner} nimmt an und gibt ${n === 1 ? 'eine Karte' : `${n} Karten`} zurück`,
  weddingOfferTitle: (declarer: string, game = 'Hochzeit') => `${declarer} macht ${game}`,
  weddingOfferBody: (declarer: string, n = 1) =>
    `${declarer} hat ${n === 1 ? 'nur einen Trumpf' : `nur ${n} Trümpfe`}. Wer annimmt, bekommt ${n === 1 ? 'ihn' : 'sie'} verdeckt, gibt dafür ${n === 1 ? 'eine Karte' : `${n} Karten`} zurück, die ${n === 1 ? 'kein Trumpf ist' : 'keine Trümpfe sind'}, und spielt mit ${declarer} gegen die anderen zwei.`,
  weddingAccept: 'Ich nehme an',
  weddingDecline: 'Nein',
  weddingGiveTitle: (n: number) =>
    n === 1 ? 'Welche Karte gibst du zurück?' : `Welche ${n} Karten gibst du zurück?`,
  weddingGiveHint: (declarer: string, n: number) =>
    `Du hast ${n === 1 ? 'den Trumpf' : 'die Trümpfe'} von ${declarer} bekommen. Zurück geht, was kein Trumpf ist – nur wenn du keine andere Karte hast, auch ein Trumpf.`,
  weddingGive: 'Zurückgeben',
  mussBlocked:
    'Du bist gesperrt: Du darfst auch eine Sau rufen, von deren Farbe du keine Karte hast.',
  // Ergebnis
  passedTitle: 'Alle weiter – es wird zusammengeworfen',
  stockTitle: 'Alle weiter – jeder zahlt in den Stock',
  mussFallbackTitle: 'Muss geht nicht – es wird zusammengeworfen',
  mussFallbackHint: 'Wer den Eichel-Ober hat, hält alle drei Säue und kann keine rufen.',
  potFilled: (each: string) => `Im Pott (jeder ${each} eingezahlt)`,
  potWon: 'Pott gewonnen',
  potStays: 'Pott bleibt stehen',
  ramschLoser: (name: string) => `Ramsch – ${name} verliert`,
  ramschDurchmarsch: (name: string) => `Durchmarsch – ${name} gewinnt`,
  ramschHint: 'Alle weiter – jeder für sich. Wer die meisten Augen hat, zahlt an jeden.',
  ramschHintDurchmarsch: 'Ab 91 Augen gewinnt der Spieler allein und bekommt von jedem.',
  ramschJungfrauen: (names: string[]) =>
    names.length === 1
      ? `Jungfrau: ${names[0]} – der Betrag verdoppelt sich`
      : `Jungfrauen: ${names.join(' und ')} – der Betrag vervierfacht sich`,
  ramschPerPlayer: 'je Mitspieler',
  colPoints: 'Augen',
  jungfrau: 'Jungfrau',
  resultTitle: (names: string, plural: boolean, won: boolean) =>
    `${names} ${plural ? 'haben' : 'hat'} ${won ? 'gewonnen' : 'verloren'}`,
  and: ' und ',
  points: 'Augen',
  pointsOf: (n: number) => `${n} von 120 Augen`,
  extras: {
    schneider: 'Schneider',
    schwarz: 'Schwarz',
    sie: 'Sie',
    laufende: (n: number) => `${n} Laufende`,
    tricks: (n: number) => (n === 1 ? '1 Stich' : `${n} Stiche`),
  },
  valuePerPlayer: 'je Gegenspieler',
  // Aufschlüsselung (U4)
  breakdownLabel: 'So setzt sich der Betrag zusammen',
  valueParts: {
    grundtarif: 'Grundtarif',
    schneider: 'Schneider',
    schwarz: 'Schwarz',
    laufende: 'Laufende',
    tout: 'Tout (doppelt)',
    sie: 'Sie',
  },
  valuePartsLaufende: (n: number) => `${n} Laufende`,
  valueSum: 'Spielwert',
  factorReasons: {
    kontra: 'Kontra',
    re: 'Re',
    jungfrau: 'Jungfrau',
    bock: 'Bock',
  },
  factorTimes: (n: number) => `× ${n}`,
  amountEach: 'Jeder zahlt bzw. bekommt',
  // Tabelle des Abends und Endabrechnung (U4)
  evening: 'Tabelle',
  eveningTitle: 'Der Abend',
  eveningEmpty: 'Noch kein Spiel gespielt.',
  eveningHint: 'Betrag je Spiel, darunter der Stand danach.',
  eveningTableLabel: 'Alle Spiele des Abends',
  colNo: 'Nr.',
  colGame: 'Spiel',
  gameWon: 'gewonnen',
  gameLost: 'verloren',
  gamePassed: 'Alle weiter',
  gameStock: 'Alle weiter – Stock',
  gamePlays: (name: string, contract: string) => `${name}: ${contract}`,
  gameRamsch: (name: string) => `Ramsch – ${name} verliert`,
  gameDurchmarsch: (name: string) => `Durchmarsch – ${name}`,
  potRow: 'Pott',
  standRow: 'Stand',
  settleTitle: 'Wer zahlt wem',
  settleEven: 'Alles ausgeglichen – niemand muss etwas zahlen.',
  settlePays: (from: string, to: string) => `${from} zahlt ${to}`,
  settleRefund: (pot: string, each: string) =>
    `Der Pott von ${pot} geht zu gleichen Teilen zurück (je ${each}).`,
  settleRefundCents: (pot: string) =>
    `Der Pott von ${pot} geht zurück; übrige Cent bekommen die mit dem niedrigsten Stand.`,
  leaveBack: 'Zurück zum Tisch',
  leaveConfirm: 'Tisch verlassen',
  leaveTitle: 'Abrechnung vor dem Gehen',
  colPlayer: 'Spieler',
  colHand: 'Spiel',
  colBalance: 'Stand',
  nextHand: 'Nächstes Spiel',
  historyTitle: 'So wurde gespielt',
  historyTrick: (n: number, leader: string, winner: string, points: number) =>
    `Stich ${n}: ${leader} spielt aus, ${winner} sticht, ${points} Augen`,
  hostDeals: 'Der Gastgeber gibt das nächste Spiel.',
  // Ansagen für Bildschirmleser
  announceTurn: 'Du bist dran.',
  announceBid: 'Du bist mit der Ansage dran.',
  // Ausgefallene Mitspieler (N3)
  absentCountdown: (seconds: number) => `getrennt · Bot in ${seconds} s`,
  absentStandInNow: 'Bot übernehmen lassen',
  absentStandInNowLabel: (name: string) => `Für ${name} sofort einen Bot spielen lassen`,
  absentRemove: 'Vom Platz nehmen',
  absentRemoveLabel: (name: string) => `${name} dauerhaft vom Platz nehmen`,
  absentRemoveTitle: (name: string) => `${name} vom Platz nehmen?`,
  absentRemoveHint: (name: string) =>
    `Ein Bot spielt dann dauerhaft auf diesem Platz weiter, samt Kontostand. Kommt ${name} zurück, bleibt nur das Zuschauen.`,
  absentRemoveConfirm: 'Vom Platz nehmen',
  absentRemoveCancel: 'Abbrechen',
  // Kontra und Re (K4)
  kontra: 'Kontra',
  re: 'Re',
  kontraLabel: 'Kontra geben – der Spielwert verdoppelt sich',
  reLabel: 'Re geben – der Spielwert verdoppelt sich noch einmal',
  kontraHint: 'bis zur ersten Karte',
  markKontra: 'Kontra',
  markRe: 'Re',
  doublingSaid: (name: string, what: string) => `${name} sagt ${what}`,
  factorLine: (said: string[], factor: number) => `${said.join(' · ')} – Spielwert ×${factor}`,
  valueTimes: (value: string, factor: number, total: string) => `${value} × ${factor} = ${total}`,
};

/** Lobby (Paket N4, gestaltet in D4). */
export const LOBBY_TEXT = {
  title: (room: string) => `Tisch ${room}`,
  titleLocal: 'Tisch gegen die Bots',
  leave: 'Tisch verlassen',
  invite: 'Freunde einladen',
  inviteCode: 'Tisch-Code',
  inviteHint: 'Schick den Link an deine Mitspieler oder sag ihnen den Code.',
  inviteLink: 'Einladungslink',
  copy: 'Link kopieren',
  copied: 'Kopiert',
  copyFailed: 'Kopieren ging nicht – markier den Link und kopier ihn selbst.',
  seats: 'Plätze am Tisch',
  seatLabel: (seat: number) => `Platz ${seat + 1}`,
  free: 'frei',
  you: 'du',
  sitHere: 'Hier sitzen',
  sitHereLabel: (seat: number) => `Platz ${seat + 1} ist frei – hier sitzen`,
  freeCount: (n: number) =>
    n === 0 ? 'Alle Plätze besetzt' : n === 1 ? 'Noch 1 Platz frei' : `Noch ${n} Plätze frei`,
  botsFill: (n: number) =>
    n === 1 ? 'Den freien Platz übernimmt ein Bot.' : `Die ${n} freien Plätze übernehmen Bots.`,
  start: 'Spiel starten',
  watch: 'Nur zuschauen',
  watchers: 'Zuschauer',
  watching: 'Du schaust zu. Such dir einen freien Platz, wenn du mitspielen willst.',
  noFreeSeat: 'Alle Plätze sind besetzt.',
  rename: 'Dein Name',
  renameButton: 'Ändern',
  moveCw: (name: string) => `${name} einen Platz im Uhrzeigersinn weiter`,
  moveCcw: (name: string) => `${name} einen Platz gegen den Uhrzeigersinn weiter`,
  unseat: (name: string) => `${name} vom Platz nehmen`,
  settings: 'Einstellungen',
  spectators: 'Zuschauer zulassen',
  spectatorsHint:
    'Hält den Tisch auch bei voller Besetzung und im laufenden Spiel für neue Zuschauer offen. Das kostet etwas mehr Verbindungsverkehr über die öffentlichen Relays.',
  spectatorsHintLocal: 'Nur bei einem Tisch mit Einladungslink möglich.',
  approval: 'Neue Mitspieler bestätigen',
  approvalHint:
    'Wer zum ersten Mal an den Tisch will, wartet auf deinen Klick. Wer schon da war, kommt ohne Rückfrage zurück.',
  guestWaits: 'Der Gastgeber startet das Spiel.',
} as const;

/** Tischregeln (K2): Einstellungen in der Lobby und Regelübersicht am Tisch. */
/** Namen der Kartenbilder (U9) in der Lobby; die Sätze selbst stehen in `ui/cardTheme.tsx`. */
export const CARD_SET_NAME = {
  bayerisch: 'Bayerisch',
  salzburger: 'Salzburger',
};

export const RULES_TEXT = {
  title: 'Regeln',
  info: 'Regeln',
  close: 'Schließen',
  contracts: 'Spielarten',
  contractsHint:
    'Das Sauspiel ist immer dabei. Hochzeit: Wer genau einen Trumpf hat, sucht sich einen Partner, der ihn gegen eine andere Karte nimmt.',
  contractsHintThree:
    'Zu dritt spielt jeder allein gegen die zwei anderen: kein Sauspiel, keine Hochzeit. Mindestens ein Einzelspiel muss an sein.',
  notForThree: 'nicht zu dritt',
  notForShort: 'nicht mit kurzer Karte zu viert',
  setup: 'Spieler und Karten',
  setupName: (players: number, deck: DeckKind) =>
    `Zu ${players === 3 ? 'dritt' : 'viert'}, ${deck === 'kurz' ? 'kurze' : 'lange'} Karte`,
  setupHint: (players: number, deck: DeckKind) =>
    deck === 'lang'
      ? '32 Karten, acht für jeden.'
      : players === 3
        ? 'Ohne 7er und 8er: 24 Karten, acht für jeden. Nur Einzelspiele; der Spieler kassiert von zwei Gegnern.'
        : 'Ohne 7er und 8er: 24 Karten, sechs für jeden. Davonlaufen schon mit drei Karten.',
  setupFull: 'Für drei Plätze sitzen schon zu viele am Tisch.',
  mussNotForThree: 'Muss gibt es zu dritt nicht.',
  houseRules: 'Hausregeln',
  houseRulesHint:
    'Eisenbahner: wie der Wenz, aber die vier Zehner sind die Trümpfe. Hawaii-Habicht: vier Könige, dazu eine Trumpffarbe für die Stiche 1–4 und eine andere ab Stich 5. Arabische Hochzeit: wie die Hochzeit, aber mit genau zwei Trümpfen und zwei Karten zurück.',
  tout: 'Tout erlaubt',
  sie: 'Sie (alle Ober und Unter) wird bezahlt',
  davonlaufen: (n: number) => `Davonlaufen mit ${n === 3 ? 'drei' : 'vier'} Karten der Ruffarbe`,
  kontra: 'Kontra und Re',
  botStrength: 'Spielstärke der Bots',
  botStrengthName: {
    anfaenger: 'Anfänger',
    normal: 'Normal',
    stark: 'Stark',
  } satisfies Record<BotStrength, string>,
  botStrengthHint: {
    anfaenger: 'Zählt nicht mit und greift öfter daneben – gut zum Lernen.',
    normal: 'Spielt nach den Faustregeln vom Wirtshaustisch.',
    stark: 'Rechnet vor jedem Zug mögliche Kartenverteilungen durch.',
  } satisfies Record<BotStrength, string>,
  cardSet: 'Kartenbild',
  cardSetHint: 'Gilt für alle am Tisch.',
  cardSetDraft: (own: number, total: number) =>
    `Entwurf: ${own} von ${total} Karten im neuen Bild, die übrigen bayerisch.`,
  cardSetPreview: (name: string) => `Vorschau ${name}: Herz-Ober, Eichel-Sau, Rücken`,
  tariff: 'Tarif (Cent)',
  tariffSauspiel: 'Sauspiel',
  tariffSolo: 'Einzelspiel',
  tariffExtra: 'Aufschlag',
  tariffHint: 'Aufschlag je Schneider, Schwarz und Laufendem.',
  laufende: 'Laufende ab …',
  laufendeHint: 'Ab so vielen Laufenden wird gezahlt. Erlaubt sind 1 bis 8.',
  invalid: 'Bitte eine ganze Zahl eingeben.',
  invalidRange: 'Bitte eine Zahl von 1 bis 8 eingeben.',
  guestHint: 'So wird an diesem Tisch gespielt. Der Gastgeber kann das vor dem Start ändern.',
  allPassed: 'Wenn alle „weiter“ sagen',
  allPassedName: {
    zusammenwerfen: 'Zusammenwerfen',
    ramsch: 'Ramsch',
    stock: 'Stock',
    muss: 'Muss',
  } satisfies Record<AllPassedRule, string>,
  allPassedHint: {
    zusammenwerfen: 'Die Karten werden neu gegeben, niemand zahlt.',
    ramsch: 'Jeder spielt für sich. Wer die meisten Augen hat, zahlt den Ramsch-Tarif an jeden.',
    stock:
      'Jeder zahlt den Einsatz in den Pott. Den Pott gewinnt, wer das nächste Spiel gewinnt (im Sauspiel geteilt).',
    muss: 'Wer den Eichel-Ober hat, muss ein Sauspiel spielen. Hat er alle drei Säue, wird zusammengeworfen.',
  } satisfies Record<AllPassedRule, string>,
  tariffRamsch: 'Ramsch',
  tariffStock: 'Stock-Einsatz',
  durchmarsch: 'Durchmarsch: ab 91 Augen gewinnt man allein',
  jungfrau: 'Jungfrau: jeder ohne Stich verdoppelt',
  durchmarschShort: 'Durchmarsch',
  jungfrauShort: 'Jungfrau',
  yes: 'ja',
  no: 'nein',
  cent: (n: number) => `${n} Cent`,
  from: (n: number) => `ab ${n}`,
} as const;

// ---------------------------------------------------------------------------
// Trainer Max Weber (T2). Didaktik und Textvorschläge: docs/STRATEGIEN.md.

/** Name einer Karte im Satz: „die Gras-Sau“, „den Herz-Ober“ (Sau weiblich, sonst männlich). */
function cardPhrase(card: string, fall: 'nom' | 'akk'): string {
  const suit = SUIT_NAME[cardSuit(card)];
  const rank = cardRank(card);
  const article = rank === 'A' ? 'die' : fall === 'nom' ? 'der' : 'den';
  return `${article} ${suit}-${RANK_NAME[rank]}`;
}

const SUIT_LETTER: Record<string, Suit> = { E: 'eichel', G: 'gras', H: 'herz', S: 'schellen' };
const cardSuit = (card: string): Suit => SUIT_LETTER[card[0]!] ?? 'herz';
const cardRank = (card: string): Rank => card.slice(1) as Rank;

const upper = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Wie Max Sitze, Farben und Spielarten in Texte einsetzt. */
export interface TutorTextContext {
  /** Name zu einem Sitz. */
  name: (seat: number) => string;
  /** Gegner im Zweikampf, falls gerade einer läuft. */
  opponent: number | null;
}

type TutorParams = Record<string, string | number>;
type HintText = (p: TutorParams, c: TutorTextContext) => string;

const seatName = (p: TutorParams, key: string, c: TutorTextContext, fallback: string) =>
  typeof p[key] === 'number' ? c.name(p[key]) : fallback;
const suitWord = (p: TutorParams) =>
  typeof p.farbe === 'string' && p.farbe in SUIT_NAME ? SUIT_NAME[p.farbe as Suit] : 'Ruf';
const kindWord = (p: TutorParams) =>
  typeof p.spiel === 'string' && p.spiel in KIND_NAME
    ? KIND_NAME[p.spiel as ContractKind]
    : 'Spiel';

/** Kurztitel der Faustregeln (Kennungen wie in docs/STRATEGIEN.md). */
const RULE_TITLE: Record<string, string> = {
  'ansage.zu.schwach': 'Mit schwachem Blatt „weiter“',
  'ansage.sauspiel.grundblatt': 'Ein Sauspiel braucht zwei Farben im Griff',
  'ansage.ruffarbe.kurz': 'Die Sau zur eigenen Zehn rufen',
  'ansage.solo.trumpflaenge': 'Solo nur mit der Mehrheit der Trümpfe',
  'ansage.wenz.unter.und.farben': 'Wenz: hohe Unter und starke Farben',
  'ansage.bettel.nur.sicher': 'Bettel nur ohne Lücke',
  'ansage.tout.nur.sicher': 'Tout nur, wenn kein Stich verloren geht',
  'zweikampf.eigener.wert': 'Im Zweikampf zählt das eigene Blatt',
  'hochzeit.zwei.sauen': 'Hochzeit nur mit Sauen',
  'kontra.gegen.partnerspiel': 'Kontra gegen ein Sauspiel nur mit eigenem Spiel',
  'kontra.gegen.einzelspiel': 'Kontra gegen ein Solo nur mit halber Trumpfstärke',
  're.mit.reserve': 'Re nur mit Reserve',
  'spieler.solo.von.oben': 'Im Solo von oben',
  'spieler.trumpf.ziehen': 'Als Spielerpartei Trumpf ziehen',
  'spieler.rufsau.nicht.selbst.suchen': 'Die Rufsau nicht selbst suchen',
  'spieler.farbe.nach.trumpf': 'Trümpfe draußen – jetzt die Farben',
  'mitspieler.trumpf.spielen': 'Als Mitspieler Trumpf spielen',
  'gegner.rufsau.suchen': 'Als Gegenspieler die Rufsau suchen',
  'gegner.sau.frisch': 'Die Sau beim ersten Mal',
  'gegner.kurzer.weg.lange.farbe': 'Kurzer Weg, lange Farbe – langer Weg, kurze Farbe',
  'gegner.kein.trumpf.anspielen': 'Als Gegenspieler kein Trumpf',
  'karte.schmieren': 'Dem Partner schmieren',
  'karte.nicht.vorschnell.schmieren': 'Nicht zu früh schmieren',
  'karte.hinten.billig.stechen': 'Hinten billig stechen',
  'karte.stechen.lohnt': 'Volle Stiche holen',
  'karte.farbe.freimachen': 'Eine Farbe frei machen',
  'karte.abspatzen': 'In verlorene Stiche einen Spatz',
  'bettel.spieler.drunter': 'Im Bettel drunter bleiben',
  'bettel.gegner.klein': 'Gegen den Bettel klein spielen',
  'ramsch.durchmarsch.verhindern': 'Den Durchmarsch verhindern',
  'ramsch.hoch.drunter': 'Im Ramsch hoch drunter',
};

/** Begründung der Faustregeln, für die Sprechblase auf ein, zwei Sätze gekürzt. */
const RULE_REASON: Record<string, string> = {
  'ansage.zu.schwach':
    'Mit einem schwachen Blatt verliert man meist das Spiel und oft dazu Schneider. „Weiter“ kostet nichts, und als Gegenspieler hilfst du trotzdem mit.',
  'ansage.sauspiel.grundblatt':
    'Ein Sauspiel trägt, wenn ihr zwei Farben im Griff habt: die Ruffarbe und eine Farbe, die du frei bist oder mit der Sau hältst.',
  'ansage.ruffarbe.kurz':
    'Rufst du die Sau zu deiner Zehn, fällt die Zehn in den Stich des Partners. Und in einer kurzen Ruffarbe bist du bald frei und stichst.',
  'ansage.solo.trumpflaenge':
    'Allein gegen drei brauchst du die Mehrheit der Trümpfe: Sind sie gezogen, haben die Gegner nur noch Farben, und deine Sauen stechen.',
  'ansage.wenz.unter.und.farben':
    'Im Wenz gibt es nur vier Trümpfe. Mit den hohen Untern holst du dir das Ausspiel zurück; die Stiche kommen aus Sauen und langen Farben.',
  'ansage.bettel.nur.sicher':
    'Im Bettel reicht ein einziger Stich zum Verlieren, und die Gegner suchen genau die Farbe, in der du nicht drunter kommst.',
  'ansage.tout.nur.sicher':
    'Tout verdoppelt den Gewinn, aber ein abgegebener Stich verliert alles. Mit einer Lücke kostet das mehr, als es bringt – ohne Lücke verschenkst du Geld.',
  'zweikampf.eigener.wert':
    'Ein höheres Spiel lohnt sich nur, wenn es mit deinem Blatt gewinnt. Als Gegenspieler hast du noch Chancen, mit einem überreizten Solo kaum.',
  'hochzeit.zwei.sauen':
    'Wer die Hochzeit annimmt, hat die Trümpfe; du bringst die Farbstiche mit. Ohne Sauen trägst du nichts bei.',
  'kontra.gegen.partnerspiel':
    'Kontra lohnt, wenn du selbst ein gutes Sauspiel-Blatt hast. Sonst verdoppelst du vor allem deinen eigenen Verlust.',
  'kontra.gegen.einzelspiel':
    'Der Spieler hat meist die besten Trümpfe. Kontra lohnt erst mit etwa der Hälfte seiner Trumpfstärke und dazu Sauen.',
  're.mit.reserve':
    'Re verdoppelt noch einmal. Wer Kontra sagt, hat meist Gründe – Re lohnt nur mit deutlich mehr als dem Nötigen.',
  'spieler.solo.von.oben':
    'Der höchste Trumpf ist ein sicherer Stich und zieht jedem Gegner einen Trumpf. So bleibt weniger, womit sie deine Sauen stechen.',
  'spieler.trumpf.ziehen':
    'Solange die Gegner Trümpfe haben, stechen sie deine Sauen. Trumpf zwingt sie zum Bedienen; danach gehören die Farben dir.',
  'spieler.rufsau.nicht.selbst.suchen':
    'Spielst du die Ruffarbe selbst an, muss dein Partner die Sau zugeben, und alle wissen Bescheid. Suchen ist Sache der Gegenspieler.',
  'spieler.farbe.nach.trumpf':
    'Jetzt sticht niemand mehr ein. Erst Sauen und sichere Farbkarten heimbringen; jeder weitere Trumpf wäre verschenkt.',
  'mitspieler.trumpf.spielen':
    'Mit Trumpf oder der Rufsau gibst du dich als Partner zu erkennen und hilfst, die Trümpfe der Gegner zu ziehen.',
  'gegner.rufsau.suchen':
    'Mit der Ruffarbe zwingst du die Sau heraus: Die Parteien sind klar, und die Sau fällt oft in einen kleinen Stich.',
  'gegner.sau.frisch':
    'Beim ersten Anspielen einer Farbe bedienen meist alle – die Sau bringt ihre Augen sicher heim. Später sticht eher jemand.',
  'gegner.kurzer.weg.lange.farbe':
    'Sitzt der Spieler direkt hinter dir, spiel deine lange Farbe: Er ist bald frei, und dein Partner hinter ihm übersticht. Sitzt er als Letzter, macht dich eine kurze Farbe frei.',
  'gegner.kein.trumpf.anspielen':
    'Trumpf nimmt dem Spieler die Arbeit ab, er wollte die Trümpfe ohnehin ziehen. Farben zwingen ihn, mit Trumpf zu stechen.',
  'karte.schmieren':
    'Was in diesem Stich liegt, gehört deiner Partei. Also Augen dazu: Sau oder Zehn – aber keine Ober oder Unter, die später selbst stechen.',
  'karte.nicht.vorschnell.schmieren':
    'Geschmierte Augen in einem Stich, den der Gegner noch holt, zählen doppelt gegen dich. Lieber billig zugeben.',
  'karte.hinten.billig.stechen':
    'Als Letzter kann dich niemand mehr überstechen. Es reicht der kleinste Trumpf, der sticht; die hohen hebst du auf.',
  'karte.stechen.lohnt':
    'Ein voller Stich ist die Hälfte dessen, was man für Schneider braucht. Wer ihn sicher holen kann, holt ihn.',
  'karte.farbe.freimachen':
    'Wirfst du die letzte Karte einer Farbe ab, bist du dort frei. Spielt sie später jemand an, stichst du ein oder schmierst.',
  'karte.abspatzen':
    'Was du in einen verlorenen Stich legst, zählt für die Gegner. Also einen Spatz – keine Trümpfe und keine Sauen.',
  'bettel.spieler.drunter':
    'Kommst du heraus, die niedrigste Karte; gibst du zu, die höchste, die noch drunter bleibt. So wirst du gefährliche Karten gefahrlos los.',
  'bettel.gegner.klein':
    'Je niedriger die angespielte Karte, desto schwerer bleibt der Spieler drunter.',
  'ramsch.durchmarsch.verhindern':
    'Ein Durchmarsch kostet alle viel. Ein einziger Stich, auch ohne Augen, verhindert ihn.',
  'ramsch.hoch.drunter':
    'Wer im Ramsch Augen sammelt, verliert. Unter einer höheren Karte wirfst du deine gefährlichen Karten ab.',
};

/** Denkanstöße (`denkanstoss.<kennung>`): eine Frage, die zur Lösung führt, ohne sie zu nennen. */
const HINT: Record<string, HintText> = {
  'ansage.zu.schwach': () => 'Wie viele Stiche machst du mit diesem Blatt sicher selbst?',
  'ansage.sauspiel.grundblatt': () => 'Welche zwei Farben hättest du mit deinem Partner im Griff?',
  'ansage.ruffarbe.kurz': (p) =>
    p.zehn === 0
      ? `Wie schnell bist du in ${suitWord(p)} frei, wenn du die passende Sau rufst?`
      : `Wo landet deine ${suitWord(p)}-Zehn, wenn du die passende Sau rufst?`,
  'ansage.solo.trumpflaenge': () => 'Wie viele Trümpfe haben die drei anderen zusammen noch?',
  'ansage.wenz.unter.und.farben': () =>
    'Wie kommst du im Wenz ans Spiel zurück – und woher kommen die Stiche?',
  'ansage.bettel.nur.sicher': () => 'Gibt es eine Farbe, in der du nicht sicher drunter bleibst?',
  'ansage.tout.nur.sicher': () => 'Kann dir irgendein Gegner einen Stich abnehmen?',
  'zweikampf.eigener.wert': (p, c) =>
    `Gewinnst du das höhere Spiel – oder willst du nur ${seatName(p, 'gegner', c, c.opponent === null ? 'den anderen' : c.name(c.opponent))} ausstechen?`,
  'hochzeit.zwei.sauen': () => 'Was bringst du deinem Partner mit, wenn er deinen Trumpf nimmt?',
  'kontra.gegen.partnerspiel': () => 'Wärst du mit diesem Blatt selbst gern Sauspieler?',
  'kontra.gegen.einzelspiel': () => 'Wie viel von der Trumpfstärke des Spielers hältst du?',
  're.mit.reserve': (p, c) =>
    `${seatName(p, 'kontra', c, 'Der Gegner')} glaubt, du verlierst. Hast du genug Reserve für das Doppelte?`,
  'spieler.solo.von.oben': () => 'Welcher Trumpf ist gerade der höchste im Spiel?',
  'spieler.trumpf.ziehen': () => 'Womit stechen die Gegner deine Sauen?',
  'spieler.rufsau.nicht.selbst.suchen': () => 'Wer sollte die Rufsau suchen – du oder die Gegner?',
  'spieler.farbe.nach.trumpf': () => 'Kann jetzt noch jemand einstechen?',
  'mitspieler.trumpf.spielen': (p, c) =>
    `Wie zeigst du ${seatName(p, 'spieler', c, 'dem Spieler')}, dass ihr zusammenspielt?`,
  'gegner.rufsau.suchen': () => 'Wie findest du heraus, wer mit dem Spieler spielt?',
  'gegner.sau.frisch': () => 'Wann ist eine Sau am sichersten?',
  'gegner.kurzer.weg.lange.farbe': () =>
    'Wo sitzt der Spieler – direkt hinter dir oder als Letzter?',
  'gegner.kein.trumpf.anspielen': () => 'Wem hilft es, wenn du Trumpf spielst?',
  'karte.schmieren': (p, c) =>
    `${seatName(p, 'partner', c, 'Dein Partner')} hält den Stich. Kann ihn noch jemand holen?`,
  'karte.nicht.vorschnell.schmieren': (p, c) =>
    `${seatName(p, 'partner', c, 'Dein Partner')} liegt vorn – aber ist der Stich schon sicher?`,
  'karte.hinten.billig.stechen': () => 'Du bist der Letzte. Wie viel Trumpf brauchst du wirklich?',
  'karte.stechen.lohnt': (p) =>
    `${p.augen ?? 'Viele'} Augen liegen im Stich. Kannst du ihn sicher holen?`,
  'karte.farbe.freimachen': () => 'Welche Farbe könntest du mit diesem Abwurf frei machen?',
  'karte.abspatzen': () => 'Der Stich ist verloren. Was gibst du am wenigsten gern her?',
  'bettel.spieler.drunter': () => 'Welche Karte wirst du jetzt gefahrlos los?',
  'bettel.gegner.klein': () => 'Wie zwingst du den Bettelspieler, einen Stich zu nehmen?',
  'ramsch.durchmarsch.verhindern': (p, c) =>
    `${seatName(p, 'spieler', c, 'Einer')} hat alle Stiche. Was hält ihn auf?`,
  'ramsch.hoch.drunter': () =>
    'Du bleibst drunter. Welche Karte willst du später nicht mehr haben?',
  ausnahme: (p) =>
    typeof p.regel === 'string' && RULE_TITLE[p.regel]
      ? `„${RULE_TITLE[p.regel]}“ – das gilt sonst. Was ist an dieser Lage anders?`
      : 'Die übliche Faustregel passt hier nicht ganz. Was ist an dieser Lage anders?',
  ansage: () => 'Wie viele Stiche traust du deinem Blatt zu?',
  kontra: () => 'Wer hat hier die besseren Karten – der Spieler oder du?',
  'karte.anspielen': () => 'Was soll dieser Stich für dich erreichen?',
  'karte.zugeben': (p, c) =>
    `${seatName(p, 'stich', c, 'Wer')} liegt vorn, ${p.augen ?? 0} Augen sind im Stich. Was willst du damit?`,
};

/** Eine Möglichkeit als kurzes Wort für Vergleiche: „Gras-Sau“, „weiter“, „Kontra“. */
function optionWord(o: TutorOptionText, re: boolean): string {
  switch (o.type) {
    case 'card':
      return `${SUIT_NAME[cardSuit(o.card)]}-${RANK_NAME[cardRank(o.card)]}`;
    case 'bid':
      return o.call.type === 'declare' ? contractLabel(o.call.contract) : `„${callLabel(o.call)}“`;
    case 'double':
      return o.double ? (re ? 'Re' : 'Kontra') : re ? 'kein Re' : 'kein Kontra';
  }
}

/** Eine Möglichkeit, wie sie der Tutor bespricht (Typ wie `TutorOption` in @schafkopf/tutor). */
export type TutorOptionText =
  | { type: 'bid'; call: BidCall }
  | { type: 'card'; card: string }
  | { type: 'double'; double: boolean };

/** Eine Möglichkeit im Satz (Werfall): „der Gras-Zehner“, „„weiter““, „Kontra“. */
function optionPhrase(o: TutorOptionText, re: boolean): string {
  return o.type === 'card' ? cardPhrase(o.card, 'nom') : optionWord(o, re);
}

/** Cent-Betrag ungefähr: „etwa 12 Cent“, ab einem Euro „etwa 1,20 €“. */
function aboutCents(cents: number): string {
  const c = Math.max(1, Math.round(cents));
  return c < 100 ? `etwa ${c} Cent` : `etwa ${plainMoney(c)}`;
}

export const TUTOR_TEXT = {
  name: 'Max Weber',
  initials: 'MW',
  /** Knopf der Figur (Bildschirmleser). */
  figureOpen: 'Max Weber fragen',
  figureClose: 'Max Weber: Sprechblase schließen',
  figureCaption: 'Max',
  bubbleLabel: 'Max Weber, dein Trainer',
  close: 'Schließen',
  greeting: 'Servus! Was willst du wissen?',
  nothingToAsk: 'Gerade gibt es nichts zu entscheiden. Frag mich, wenn du dran bist.',
  wedding: 'Bei der Hochzeit kann ich dir noch nicht helfen – da musst du selbst entscheiden.',
  finished:
    'Das Spiel ist aus. Unter „So wurde gespielt“ habe ich markiert, wo mehr drin gewesen wäre.',
  thinking: 'Moment, ich überleg …',
  failed: 'Da habe ich mich verrechnet. Frag mich gleich noch einmal.',
  autoIntro: 'Moment –',
  askRecommend: 'Und was empfiehlst du?',
  askWhy: 'Warum?',
  askBetter: 'Was wäre besser gewesen?',
  otherQuestion: 'Andere Frage',
  thanks: 'Danke',
  autoToggle: 'Von selbst melden',
  autoHint: 'Max meldet sich nur in wichtigen Momenten.',

  /** Auswahlfragen (`QUESTION_IDS`). */
  question(id: string, p: TutorParams, c: TutorTextContext): string {
    switch (id) {
      case 'frage.ansage.spielen':
        return 'Soll ich mit diesen Karten spielen?';
      case 'frage.ansage.welches.spiel':
        return 'Welches Spiel passt zu meinem Blatt?';
      case 'frage.ansage.zweikampf':
        return `${seatName(p, 'gegner', c, 'Einer')} will spielen – lohnt sich ein höheres Spiel?`;
      case 'frage.ansage.halten':
        return `${seatName(p, 'gegner', c, 'Einer')} will höher – soll ich halten?`;
      case 'frage.karte.welche':
        return 'Welche Karte ist sinnvoll, und welche Strategie steckt dahinter?';
      case 'frage.kontra':
        return `Soll ich gegen das ${kindWord(p)} von ${seatName(p, 'spieler', c, 'dem Spieler')} Kontra geben?`;
      case 'frage.re':
        return `${seatName(p, 'kontra', c, 'Ein Gegner')} hat Kontra gegeben – Re?`;
      case 'frage.rueckblick.zug':
        return 'War mein letzter Zug gut?';
      default:
        return id;
    }
  },

  /** Denkanstoß zu einer Kennung `denkanstoss.<…>`. */
  hint(key: string, p: TutorParams, c: TutorTextContext): string {
    const text = HINT[key.replace(/^denkanstoss\./, '')];
    return text ? text(p, c) : 'Was ist in dieser Lage das Wichtigste?';
  },

  ruleTitle: (id: string) => RULE_TITLE[id] ?? id,
  ruleReason: (id: string) => RULE_REASON[id] ?? '',
  /** Gemessener Wert einer Faustregel (T4), nur wenn sicher positiv gemessen. */
  ruleValue: (cents: number) => `Gemessen bringt sie im Schnitt ${aboutCents(cents)}.`,

  /** Stufe 2: die Empfehlung als ganzer Satz. */
  recommend(o: TutorOptionText, re: boolean): string {
    switch (o.type) {
      case 'card':
        return `Ich würde ${cardPhrase(o.card, 'akk')} spielen.`;
      case 'double':
        return o.double
          ? re
            ? 'Ich würde Re sagen.'
            : 'Ich würde Kontra geben.'
          : re
            ? 'Ich würde kein Re sagen.'
            : 'Ich würde kein Kontra geben.';
      case 'bid':
        switch (o.call.type) {
          case 'pass':
            return 'Ich würde „weiter“ sagen.';
          case 'interest':
            return 'Ich würde mitbieten: „Ich würde“.';
          case 'name':
            return `Ich würde „${levelLabel(o.call.level)}“ sagen.`;
          case 'hold':
            return 'Ich würde halten: „ich auch“.';
          case 'yield':
            return 'Ich würde „gut“ sagen und das Spiel lassen.';
          case 'declare':
            return `Ich würde ansagen: ${contractLabel(o.call.contract)}.`;
        }
    }
  },

  /** Stufe 3: was die Rechnung sagt (nur mit durchgerechneten Werten). */
  margin(
    best: TutorOptionText,
    next: TutorOptionText,
    cents: number,
    re: boolean,
    withRule: boolean,
  ): string {
    if (cents >= 0.5)
      return `Durchgerechnet bringt ${optionWord(best, re)} im Schnitt ${aboutCents(cents)} mehr als ${optionWord(next, re)}.`;
    const tie = `Durchgerechnet liegen ${optionWord(best, re)} und ${optionWord(next, re)} fast gleichauf`;
    return withRule ? `${tie} – dann gilt die Faustregel.` : `${tie}; beides ist vertretbar.`;
  },
  noRule:
    'Eine feste Faustregel gibt es dafür nicht; das Durchrechnen der möglichen Kartenverteilungen spricht dafür.',
  onlyRules:
    'Mir fehlen Stiche aus diesem Spiel (etwa nach dem Neuladen). Darum rate ich nur nach Faustregel.',
  overruled: (id: string) => `Sonst gilt „${RULE_TITLE[id] ?? id}“ – hier bringt das weniger.`,

  /** Bewertung hinterher. */
  reviewMistake: (move: TutorOptionText, loss: number, re: boolean) =>
    move.type === 'card'
      ? `Kurz zu deinem Zug: ${upper(cardPhrase(move.card, 'nom'))} hat dich ${aboutCents(loss)} gekostet.`
      : `Kurz zu deinem Zug: ${optionWord(move, re)} hat dich ${aboutCents(loss)} gekostet.`,
  reviewGood: (move: TutorOptionText, re: boolean) =>
    move.type === 'card'
      ? `Ja, ${cardPhrase(move.card, 'nom')} war gut.`
      : `Ja, ${optionWord(move, re)} war gut.`,
  reviewOkay: (move: TutorOptionText, best: TutorOptionText, loss: number, re: boolean) =>
    `${move.type === 'card' ? upper(cardPhrase(move.card, 'nom')) : upper(optionWord(move, re))} war vertretbar. ${
      best.type === 'card' ? upper(cardPhrase(best.card, 'nom')) : upper(optionWord(best, re))
    } hätte etwas mehr gebracht${loss > 0 ? ` (${aboutCents(loss)})` : ''}.`,
  reviewBetter: (best: TutorOptionText, re: boolean) =>
    `Besser wäre ${best.type === 'card' ? cardPhrase(best.card, 'nom') : optionWord(best, re)} gewesen.`,
  reviewMisleading: (id: string) =>
    `„${RULE_TITLE[id] ?? id}“ klingt hier richtig, passt aber in dieser Lage nicht.`,

  /** Rückblick in „So wurde gespielt“. */
  historyMarks: (n: number) =>
    n === 1 ? 'Max hat eine Stelle markiert' : `Max hat ${n} Stellen markiert`,
  historyNoMarks: 'Max Weber: kein teurer Fehler in diesem Spiel.',
  historyMore: (n: number) =>
    n === 1 ? 'Dazu ein kleinerer Fehler.' : `Dazu ${n} kleinere Fehler.`,
  historyWhere: (where: 'bid' | 'double' | 'card', re: boolean) =>
    where === 'bid' ? 'Ansage' : where === 'double' ? (re ? 'Re' : 'Kontra') : 'Karte',
  historyMark: (move: TutorOptionText, best: TutorOptionText, loss: number, re: boolean) =>
    `${upper(optionPhrase(best, re))} wäre besser gewesen als ${optionPhrase(move, re)} (${aboutCents(loss)}).`,
  historyIntro: (n: number) =>
    n === 1
      ? 'Eine Stelle habe ich dir markiert – unten beim Stich.'
      : `${n} Stellen habe ich dir markiert – unten bei den Stichen.`,
  historyRule: (id: string) => `Faustregel: ${RULE_TITLE[id] ?? id}.`,
  historyMarkLabel: 'Hinweis von Max',

  /** Lobby: Einstellungen des Trainers. */
  lobbyTitle: 'Trainer',
  lobbyOn: 'Max Weber schaut mir über die Schulter',
  lobbyOnHint:
    'Max ist dein Trainer: Frag ihn vor einem Zug, und nach dem Spiel zeigt er dir, wo mehr drin gewesen wäre. Er rechnet nur in deinem Browser und kennt nur deine Karten.',
  lobbyAuto: 'Meldet sich in wichtigen Momenten von selbst',
  lobbyAutoHint: 'Dann stellt er zuerst eine Frage – die Antwort gibt es nur, wenn du willst.',
  /** Hervorgehobene Karte bzw. Knopf. */
  tipLabel: 'Empfehlung von Max',
};
