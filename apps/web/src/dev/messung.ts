/**
 * Messwerkzeug für den Verbindungsaufbau (Paket N1), nur im Entwicklungsserver.
 *
 * Zwei Tabs, gleicher Weg:
 *   Host: http://localhost:5180/?weg=nostr&messung=host
 *   Gast: http://localhost:5180/?weg=nostr&messung=gast&n=10
 *
 * Der Gast steuert: Er lässt den Host neu laden und einen frischen Tisch
 * eröffnen, wartet `vorlauf` ms (Standard 5000, der Host ist dann „warm“), tritt
 * bei und misst die Zeit, bis der Host ihn begrüßt. Danach lädt er sich selbst
 * neu (frische Trystero-Kennung, keine geteilten Verbindungen) und wiederholt.
 * Ergebnis steht im Gast-Tab und in `window.__messung`.
 */

import { joinTable, openTable } from '../connection';

const CHANNEL = 'schafkopf-messung';
const RESULTS_KEY = 'messung.ergebnisse';
const OPEN_KEY = 'messung.eroeffnen';
const ATTEMPT_TIMEOUT_MS = 60_000;

type Message = { t: 'neu' } | { t: 'tisch'; room: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function show(root: HTMLElement, text: string): void {
  root.innerHTML = '';
  const pre = document.createElement('pre');
  pre.style.cssText = 'padding:1rem;font:14px/1.4 monospace;white-space:pre-wrap';
  pre.textContent = text;
  root.append(pre);
}

export function run(role: string, root: HTMLElement): void {
  if (role === 'host') runHost(root);
  else runGuest(root);
}

function runHost(root: HTMLElement): void {
  const channel = new BroadcastChannel(CHANNEL);
  let room: string | null = null;
  if (sessionStorage.getItem(OPEN_KEY)) {
    sessionStorage.removeItem(OPEN_KEY);
    room = openTable('Host', true).roomId!;
    channel.postMessage({ t: 'tisch', room } satisfies Message);
  }
  show(root, `Messung – Host\nTisch: ${room ?? '(wartet auf Gast-Tab)'}`);
  channel.onmessage = (event: MessageEvent<Message>) => {
    if (event.data.t !== 'neu') return;
    sessionStorage.setItem(OPEN_KEY, '1');
    window.location.reload();
  };
}

interface Result {
  ms: number | null;
}

function summary(results: Result[]): string {
  const ok = results.flatMap((r) => (r.ms === null ? [] : [r.ms])).sort((a, b) => a - b);
  const median = ok.length
    ? ok.length % 2
      ? ok[(ok.length - 1) / 2]!
      : Math.round((ok[ok.length / 2 - 1]! + ok[ok.length / 2]!) / 2)
    : null;
  const weg = new URLSearchParams(window.location.search).get('weg') ?? 'standard';
  return [
    `Weg: ${weg}`,
    `Versuche: ${results.length}, verbunden: ${ok.length}, fehlgeschlagen: ${results.length - ok.length}`,
    `Median: ${median ?? '–'} ms, Maximum: ${ok.at(-1) ?? '–'} ms, Minimum: ${ok[0] ?? '–'} ms`,
    `Einzelwerte: ${results.map((r) => r.ms ?? 'x').join(', ')}`,
  ].join('\n');
}

function runGuest(root: HTMLElement): void {
  const params = new URLSearchParams(window.location.search);
  const total = Number(params.get('n') ?? 10);
  const lead = Number(params.get('vorlauf') ?? 5000);
  const results = JSON.parse(sessionStorage.getItem(RESULTS_KEY) ?? '[]') as Result[];
  const w = window as unknown as { __messung?: { done: boolean; results: Result[] } };
  w.__messung = { done: results.length >= total, results };

  if (results.length >= total) {
    show(root, `Messung fertig\n${summary(results)}\n\nNeu starten: sessionStorage leeren.`);
    console.info(summary(results));
    return;
  }
  show(root, `Messung – Gast, Versuch ${results.length + 1}/${total}\n${summary(results)}`);

  const channel = new BroadcastChannel(CHANNEL);
  const roomP = new Promise<string>((resolve) => {
    channel.onmessage = (event: MessageEvent<Message>) => {
      if (event.data.t === 'tisch') resolve(event.data.room);
    };
  });
  channel.postMessage({ t: 'neu' } satisfies Message);

  void (async () => {
    const room = await roomP;
    await sleep(lead);
    const start = performance.now();
    const connection = joinTable('Gast', room);
    const ms = await new Promise<number | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), ATTEMPT_TIMEOUT_MS);
      const check = () => {
        if (connection.client.getSnapshot().status !== 'connected') return;
        clearTimeout(timer);
        resolve(Math.round(performance.now() - start));
      };
      connection.client.subscribe(check);
      check();
    });
    connection.close();
    results.push({ ms });
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    await sleep(500);
    window.location.reload();
  })();
}
