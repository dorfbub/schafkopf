/**
 * Alle Texte der Oberfläche an einer Stelle. Weitere Sprachen (oder Bairisch)
 * lassen sich später als zweite Datei mit denselben Schlüsseln ergänzen.
 */

import type {
  AllPassedRule,
  BidCall,
  BidLevel,
  Contract,
  ContractKind,
  Rank,
  Suit,
} from '@schafkopf/core';
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
  const base = {
    sauspiel: `Sauspiel auf die ${suit}-Sau`,
    solo: `${suit}-Solo`,
    farbwenz: `${suit}-Farbwenz`,
    wenz: 'Wenz',
    geier: 'Geier',
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
  illegal_card: 'Diese Karte darfst du nicht spielen.',
  illegal_double: 'Kontra bzw. Re geht jetzt nicht mehr.',
  no_hand: 'Es läuft gerade kein Spiel.',
  seat_taken: 'Dieser Platz ist schon besetzt.',
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
  tagline: 'Zu viert am Tisch – ohne Anmeldung, direkt im Browser.',
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
  joinPlaceholder: 'z. B. k7m2xp',
  join: 'Beitreten',
  inviteTitle: 'Du bist eingeladen',
  inviteTo: 'an Tisch',
  inviteHint: 'Gib deinen Namen ein und setz dich dazu.',
  inviteOwn: 'Lieber selbst einen Tisch eröffnen',
};

/** Tisch-Code zum Vorlesen in Dreiergruppen: „k7m2xp“ → „k7m 2xp“. */
export function spacedCode(code: string): string {
  return code.replace(/(.{3})(?=.)/g, '$1 ');
}

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
  solo: 'Solo',
  wenz: 'Wenz',
  farbwenz: 'Farbwenz',
  geier: 'Geier',
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

/** Texte des Spieltischs (src/ui/table). */
export const TABLE_TEXT = {
  brand: 'Schafkopf',
  leave: 'Verlassen',
  lastTrick: 'Letzter Stich',
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
  markDeclarer: 'Spieler',
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
  colPlayer: 'Spieler',
  colHand: 'Spiel',
  colBalance: 'Stand',
  nextHand: 'Nächstes Spiel',
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
  guestWaits: 'Der Gastgeber startet das Spiel.',
} as const;

/** Tischregeln (K2): Einstellungen in der Lobby und Regelübersicht am Tisch. */
export const RULES_TEXT = {
  title: 'Regeln',
  info: 'Regeln',
  close: 'Schließen',
  contracts: 'Spielarten',
  contractsHint: 'Das Sauspiel ist immer dabei.',
  tout: 'Tout erlaubt',
  sie: 'Sie (alle Ober und Unter) wird bezahlt',
  davonlaufen: 'Davonlaufen mit vier Karten der Ruffarbe',
  kontra: 'Kontra und Re',
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
