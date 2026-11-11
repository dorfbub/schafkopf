import { type Card } from '@schafkopf/core';
import { type ReactNode, useEffect, useState } from 'react';
import { type CardTheme, textTheme } from '../ui/cardTheme';
import { Button, CardBack, CardView, Dialog, PlayerSeat, Tafel, TextField } from '../ui/kit';
import { CONTRAST_PAIRS, contrast } from '../styles/contrast';
import { entwurfTheme } from './entwurfTheme';
import './muster.css';

/*
 * Musterseite (D2): alle Grundbausteine in allen Zuständen. Nur im Entwicklungsserver unter
 * #muster erreichbar; Beispielinhalte sind deshalb hier und nicht in i18n/de.ts.
 */

const COLOR_GROUPS: [string, string[]][] = [
  [
    'Tisch',
    [
      '--color-ground',
      '--color-felt',
      '--color-felt-deep',
      '--color-felt-light',
      '--color-felt-raised',
      '--color-felt-line',
      '--color-wood',
      '--color-wood-dark',
    ],
  ],
  ['Schrift auf Grün', ['--color-on-felt', '--color-on-felt-muted', '--color-negative-on-felt']],
  [
    'Messing und Akzent',
    ['--color-brass', '--color-on-brass', '--color-accent', '--color-accent-hover'],
  ],
  [
    'Papier',
    [
      '--color-paper',
      '--color-paper-raised',
      '--color-paper-line',
      '--color-paper-control',
      '--color-on-paper',
      '--color-on-paper-muted',
      '--color-negative-on-paper',
    ],
  ],
  [
    'Karten',
    [
      '--color-card-face',
      '--color-card-back',
      '--color-suit-eichel',
      '--color-suit-gras',
      '--color-suit-herz',
      '--color-suit-schellen',
    ],
  ],
];

const TEXT_SIZES = ['--text-2xl', '--text-xl', '--text-lg', '--text-md', '--text-sm', '--text-xs'];
const SPACES = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-7',
];
const RADII = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-pill'];
const SHADOWS = ['--shadow-card', '--shadow-raised', '--shadow-dialog', '--shadow-turn'];
const HAND: Card[] = ['EO', 'GO', 'HU', 'SU', 'HA', 'H10', 'GK', 'S7'];
const PLAYABLE = new Set<Card>(['EO', 'GO', 'HU', 'SU', 'HA', 'H10']);

function useTokens(names: string[]): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({});
  const key = names.join(',');
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(key.split(',').map((n) => [n, style.getPropertyValue(n).trim()])));
  }, [key]);
  return values;
}

export function Muster() {
  return (
    <main className="muster">
      <header className="muster__head">
        <h1>Musterseite · Kartentisch</h1>
        <p className="text-muted">
          Alle Grundbausteine aus <code>src/ui/kit</code> in allen Zuständen. Variablen:{' '}
          <code>src/styles/tokens.css</code>. Zur App: <a href="#">ohne #muster</a>.
        </p>
      </header>
      <Colors />
      <Contrasts />
      <Type />
      <Scales />
      <Buttons />
      <Fields />
      <Tafeln />
      <Dialogs />
      <Seats />
      <Cards theme={textTheme} />
      <Cards theme={entwurfTheme} />
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="muster__section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Colors() {
  const values = useTokens(COLOR_GROUPS.flatMap(([, names]) => names));
  return (
    <Section title="Farben">
      {COLOR_GROUPS.map(([group, names]) => (
        <div key={group} className="muster__group">
          <h3>{group}</h3>
          <div className="muster__swatches">
            {names.map((n) => (
              <figure key={n} className="swatch">
                <span className="swatch__color" style={{ background: `var(${n})` }} />
                <figcaption>
                  <code>{n.replace('--color-', '')}</code>
                  <span className="text-muted num">{values[n]}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}

function Contrasts() {
  const values = useTokens(CONTRAST_PAIRS.flatMap((p) => [p.fg, p.bg]));
  return (
    <Section title="Kontraste (WCAG AA)">
      <div className="muster__scroll">
        <table className="contrast">
          <thead>
            <tr>
              <th>Verwendung</th>
              <th>Probe</th>
              <th className="num">Wert</th>
              <th className="num">nötig</th>
            </tr>
          </thead>
          <tbody>
            {CONTRAST_PAIRS.map((p) => {
              const fg = values[p.fg];
              const bg = values[p.bg];
              const ratio = fg && bg ? contrast(fg, bg) : 0;
              return (
                <tr key={p.use}>
                  <td>{p.use}</td>
                  <td>
                    <span
                      className="contrast__sample"
                      style={{ color: `var(${p.fg})`, background: `var(${p.bg})` }}
                    >
                      Schafkopf 12
                    </span>
                  </td>
                  <td className="num">{ratio.toFixed(2).replace('.', ',')} : 1</td>
                  <td className="num">
                    {String(p.min).replace('.', ',')} {ratio >= p.min ? '✓' : '✗'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Type() {
  return (
    <Section title="Schrift">
      <div className="muster__group">
        <h3>Fraunces – Namen, Überschriften, Augenzahl</h3>
        {TEXT_SIZES.slice(0, 4).map((s) => (
          <p key={s} className="type-sample type-sample--display" style={{ fontSize: `var(${s})` }}>
            Sauspiel auf die Gras-Sau <code>{s}</code>
          </p>
        ))}
      </div>
      <div className="muster__group">
        <h3>Source Sans 3 – alles andere</h3>
        {TEXT_SIZES.slice(2).map((s) => (
          <p key={s} className="type-sample" style={{ fontSize: `var(${s})` }}>
            Lukas hat 3 Stiche, Stand <span className="num">+1,50 €</span> <code>{s}</code>
          </p>
        ))}
        <p className="type-sample">
          Normal 400 · <b className="w-semibold">Halbfett 600</b> · <b>Fett 700</b> ·{' '}
          <span className="text-negative num">−0,30 €</span>
        </p>
      </div>
    </Section>
  );
}

function Scales() {
  return (
    <Section title="Abstände, Radien, Schatten">
      <div className="muster__group">
        <h3>Abstände</h3>
        <div className="scale">
          {SPACES.map((s) => (
            <div key={s} className="scale__row">
              <code>{s}</code>
              <span className="scale__bar" style={{ width: `var(${s})` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="muster__row">
        <div className="muster__group">
          <h3>Radien</h3>
          <div className="muster__tiles">
            {RADII.map((r) => (
              <span key={r} className="tile" style={{ borderRadius: `var(${r})` }}>
                <code>{r.replace('--radius-', '')}</code>
              </span>
            ))}
          </div>
        </div>
        <div className="muster__group">
          <h3>Schatten</h3>
          <div className="muster__tiles">
            {SHADOWS.map((s) => (
              <span key={s} className="tile" style={{ boxShadow: `var(${s})` }}>
                <code>{s.replace('--shadow-', '')}</code>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function ButtonSet() {
  return (
    <div className="muster__row">
      <Button>Spiel starten</Button>
      <Button variant="secondary">Link kopieren</Button>
      <Button size="small">Weiter</Button>
      <Button variant="secondary" size="small">
        Verlassen
      </Button>
      <Button disabled>Deaktiviert</Button>
      <Button variant="secondary" disabled>
        Deaktiviert
      </Button>
    </div>
  );
}

function Buttons() {
  return (
    <Section title="Schaltfläche">
      <p className="text-muted">
        Primär (eine Hauptaktion je Ansicht), sekundär, klein, deaktiviert. Hover und Fokus
        (Tab-Taste) direkt ausprobieren.
      </p>
      <div className="muster__group surface-felt">
        <h3>Auf Grün</h3>
        <ButtonSet />
      </div>
      <Tafel>
        <h3>Auf Papier</h3>
        <ButtonSet />
      </Tafel>
    </Section>
  );
}

function Fields() {
  return (
    <Section title="Eingabefeld">
      <Tafel className="muster__fields">
        <TextField label="Dein Name" placeholder="z. B. Lukas" hint="So sehen dich die anderen." />
        <TextField label="Dein Name" defaultValue="Vroni" />
        <TextField label="Tischnummer" defaultValue="12ab" error="Diesen Tisch gibt es nicht." />
        <TextField label="Gesperrt" defaultValue="Nur der Gastgeber" disabled />
      </Tafel>
    </Section>
  );
}

function Tafeln() {
  return (
    <Section title="Tafel">
      <div className="muster__row muster__row--stretch">
        <Tafel>
          <h3>Papier</h3>
          <p>Für Start, Lobby und Einstellungen.</p>
          <p className="text-muted">Leiser Text auf Papier.</p>
        </Tafel>
        <Tafel tone="felt">
          <h3>Auf dem Filz</h3>
          <p>Für Listen und Stände neben dem Tisch.</p>
          <p className="text-muted">
            Leiser Text auf dunkler Fläche, <span className="text-negative num">−0,50 €</span>
          </p>
        </Tafel>
      </div>
    </Section>
  );
}

function Dialogs() {
  return (
    <Section title="Dialog">
      <div className="muster__felt muster__felt--dialog">
        <Dialog
          placement="inline"
          title="Was spielst du?"
          hint="Du bist als Erster dran. Die anderen sehen deine Ansage."
          actions={
            <>
              <Button variant="secondary">Weiter</Button>
              <Button>Ansagen</Button>
            </>
          }
        >
          <div className="muster__row">
            <Button variant="secondary" size="small">
              Sauspiel auf die Eichel
            </Button>
            <Button variant="secondary" size="small">
              Wenz
            </Button>
            <Button size="small">Herz-Solo</Button>
          </div>
        </Dialog>
      </div>
    </Section>
  );
}

function Backs({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <CardBack key={i} />
      ))}
    </>
  );
}

function Seats() {
  return (
    <Section title="Spielerplatz">
      <div className="muster__felt muster__seats">
        <PlayerSeat name="Vroni" info="2 Stiche · +0,30 €" cards={<Backs n={6} />} />
        <PlayerSeat name="Sepp" info="1 Stich · −0,10 €" turn cards={<Backs n={6} />} />
        <PlayerSeat name="Resi" info="0 Stiche · ±0,00 €" dealer cards={<Backs n={7} />} />
        <PlayerSeat name="Hias" info="3 Stiche · +0,60 €" disconnected cards={<Backs n={5} />} />
        <PlayerSeat
          name="Maximiliane"
          info="Spielt"
          turn
          dealer
          marks={<span className="marke marke--brass">Spieler</span>}
          bubble="Sauspiel auf die Gras"
          cards={<Backs n={8} />}
        />
        <PlayerSeat
          name="Lenz"
          info="Mitspieler"
          marks={<span className="marke">Mitspieler</span>}
          bubble="weiter"
          cards={<Backs n={8} />}
        />
      </div>
      <p className="text-muted">
        Normal · am Zug · Geber · getrennt · am Zug und Geber mit Marke und Ansage · Mitspieler
      </p>
    </Section>
  );
}

function Cards({ theme }: { theme: CardTheme }) {
  const noop = () => undefined;
  return (
    <Section title={`Karte · ${theme.label}`}>
      <div className="muster__felt muster__cards">
        <figure>
          <CardView card="HO" theme={theme} />
          <figcaption>offen</figcaption>
        </figure>
        <figure>
          <CardBack theme={theme} />
          <figcaption>verdeckt</figcaption>
        </figure>
        <figure>
          <CardView card="EA" theme={theme} onPlay={noop} />
          <figcaption>spielbar</figcaption>
        </figure>
        <figure>
          <CardView card="S9" theme={theme} state="locked" />
          <figcaption>gesperrt</figcaption>
        </figure>
        <figure>
          <CardView card="G10" theme={theme} state="won" />
          <figcaption>sticht</figcaption>
        </figure>
      </div>
      <div className="muster__felt muster__hand">
        {HAND.map((c) =>
          PLAYABLE.has(c) ? (
            <CardView key={c} card={c} theme={theme} onPlay={noop} />
          ) : (
            <CardView key={c} card={c} theme={theme} state="locked" />
          ),
        )}
      </div>
    </Section>
  );
}
