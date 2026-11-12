import {
  ALL_PASSED_RULES,
  BID_ORDER,
  CLASSIC_CONTRACTS,
  LAUFENDE_KINDS,
  TABLE_SETUPS,
  type ContractKind,
  type LaufendeKind,
  type RuleOptions,
  type TableView,
  availableKinds,
  davonlaufenAb,
} from '@schafkopf/core';
import type { HostSession } from '@schafkopf/net';
import { useId, useState } from 'react';
import { KIND_NAME, RULES_TEXT as T } from '../i18n/de';

interface Props {
  view: TableView;
  host: HostSession;
}

function options(view: TableView): RuleOptions {
  const { players, deck } = view.rules;
  const { contracts, allowTout, allPassed, tariff, ramsch, laufende, sie, davonlaufen, kontra } =
    view.rules;
  return {
    players,
    deck,
    contracts,
    allowTout,
    allPassed,
    tariff: { ...tariff },
    ramsch: { ...ramsch },
    laufende: { ...laufende },
    sie,
    davonlaufen,
    kontra,
  };
}

/** Tischregeln des Gastgebers in der Lobby. Jede gültige Änderung gilt sofort für alle. */
export function LobbySettings({ view, host }: Props) {
  const current = options(view);
  const allPassedGroup = useId();
  const setupGroup = useId();
  const change = (patch: Partial<RuleOptions>) => host.setRules({ ...current, ...patch });
  const three = current.players === 3;
  const available = availableKinds(current);
  const seated = view.seats.filter((s) => s !== null).length;

  /**
   * Neue Besetzung (K6). Zu dritt geht kein Muss, und es braucht ein Einzelspiel – beides wird
   * gleich mit umgestellt, sonst lehnt der Host die Änderung ab.
   */
  const changeSetup = (players: number, deck: RuleOptions['deck']) => {
    const patch: Partial<RuleOptions> = { players, deck };
    if (players === 3) {
      if (current.allPassed === 'muss') patch.allPassed = 'zusammenwerfen';
      if (availableKinds({ contracts: current.contracts, players, deck }).length === 0) {
        patch.contracts = BID_ORDER.filter((k) => current.contracts.includes(k) || k === 'solo');
      }
    }
    change(patch);
  };

  const toggleContract = (kind: ContractKind, on: boolean) => {
    const set = new Set(current.contracts);
    if (on) set.add(kind);
    else set.delete(kind);
    change({ contracts: BID_ORDER.filter((k) => set.has(k)) });
  };

  const contractChecks = (kinds: ContractKind[]) => (
    <div className="row">
      {kinds.map((kind) => {
        // Eingeschaltet oder nicht: Passt die Spielart zu dieser Besetzung?
        const fits = availableKinds({ ...current, contracts: [kind] }).length > 0;
        return (
          <label key={kind} className="check">
            <input
              type="checkbox"
              checked={fits && current.contracts.includes(kind)}
              disabled={kind === 'sauspiel' || !fits}
              onChange={(e) => toggleContract(kind, e.target.checked)}
            />
            {KIND_NAME[kind]}
            {!fits && (
              <span className="text-muted"> ({three ? T.notForThree : T.notForShort})</span>
            )}
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="regeln-einstellung">
      <fieldset className="regeln-einstellung__gruppe">
        <legend>{T.setup}</legend>
        <div className="row">
          {TABLE_SETUPS.map(({ players, deck }) => {
            const key = `${players}-${deck}`;
            const full = players < seated;
            return (
              <label key={key} className="check">
                <input
                  type="radio"
                  name={setupGroup}
                  value={key}
                  checked={current.players === players && current.deck === deck}
                  disabled={full}
                  onChange={() => changeSetup(players, deck)}
                />
                {T.setupName(players, deck)}
              </label>
            );
          })}
        </div>
        <p className="hint">
          {T.setupHint(current.players, current.deck)}
          {current.players > 3 && seated > 3 && ` ${T.setupFull}`}
        </p>
      </fieldset>

      <fieldset className="regeln-einstellung__gruppe">
        <legend>{T.contracts}</legend>
        {contractChecks(BID_ORDER.filter((k) => CLASSIC_CONTRACTS.includes(k)))}
        <p className="hint">{three ? T.contractsHintThree : T.contractsHint}</p>
      </fieldset>

      <fieldset className="regeln-einstellung__gruppe">
        <legend>{T.houseRules}</legend>
        {contractChecks(BID_ORDER.filter((k) => !CLASSIC_CONTRACTS.includes(k)))}
        <p className="hint">{T.houseRulesHint}</p>
      </fieldset>

      <div className="row">
        <label className="check">
          <input
            type="checkbox"
            checked={current.allowTout}
            onChange={(e) => change({ allowTout: e.target.checked })}
          />
          {T.tout}
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={current.sie}
            onChange={(e) => change({ sie: e.target.checked })}
          />
          {T.sie}
        </label>
        {!three && (
          <label className="check">
            <input
              type="checkbox"
              checked={current.davonlaufen}
              onChange={(e) => change({ davonlaufen: e.target.checked })}
            />
            {T.davonlaufen(davonlaufenAb(current.deck))}
          </label>
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={current.kontra}
            onChange={(e) => change({ kontra: e.target.checked })}
          />
          {T.kontra}
        </label>
      </div>

      <fieldset className="regeln-einstellung__gruppe">
        <legend>{T.allPassed}</legend>
        <div className="row">
          {ALL_PASSED_RULES.map((rule) => (
            <label key={rule} className="check">
              <input
                type="radio"
                name={allPassedGroup}
                value={rule}
                checked={current.allPassed === rule}
                disabled={three && rule === 'muss'}
                onChange={() => change({ allPassed: rule })}
              />
              {T.allPassedName[rule]}
            </label>
          ))}
        </div>
        <p className="hint">
          {T.allPassedHint[current.allPassed]}
          {three && ` ${T.mussNotForThree}`}
        </p>
        {current.allPassed === 'stock' && (
          <div className="row">
            <NumberField
              key={`stock-${current.tariff.stock}`}
              label={T.tariffStock}
              value={current.tariff.stock}
              min={0}
              max={100_000}
              error={T.invalid}
              onValid={(n) => change({ tariff: { ...current.tariff, stock: n } })}
            />
          </div>
        )}
        {current.allPassed === 'ramsch' && (
          <div className="row">
            <NumberField
              key={`ramsch-${current.tariff.ramsch}`}
              label={T.tariffRamsch}
              value={current.tariff.ramsch}
              min={0}
              max={100_000}
              error={T.invalid}
              onValid={(n) => change({ tariff: { ...current.tariff, ramsch: n } })}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={current.ramsch.durchmarsch}
                onChange={(e) =>
                  change({ ramsch: { ...current.ramsch, durchmarsch: e.target.checked } })
                }
              />
              {T.durchmarsch}
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={current.ramsch.jungfrau}
                onChange={(e) =>
                  change({ ramsch: { ...current.ramsch, jungfrau: e.target.checked } })
                }
              />
              {T.jungfrau}
            </label>
          </div>
        )}
      </fieldset>

      <fieldset className="regeln-einstellung__gruppe">
        <legend>{T.tariff}</legend>
        <div className="row">
          {(
            [
              ['sauspiel', T.tariffSauspiel],
              ['solo', T.tariffSolo],
              ['extra', T.tariffExtra],
            ] as const
          ).map(([key, label]) => (
            <NumberField
              key={`${key}-${current.tariff[key]}`}
              label={label}
              value={current.tariff[key]}
              min={0}
              max={100_000}
              error={T.invalid}
              onValid={(n) => change({ tariff: { ...current.tariff, [key]: n } })}
            />
          ))}
        </div>
        <p className="hint">{T.tariffHint}</p>
      </fieldset>

      <fieldset className="regeln-einstellung__gruppe">
        <legend>{T.laufende}</legend>
        <div className="row">
          {LAUFENDE_KINDS.filter((k) => available.includes(k)).map((kind: LaufendeKind) => (
            <NumberField
              key={`${kind}-${current.laufende[kind]}`}
              label={KIND_NAME[kind]}
              value={current.laufende[kind]}
              min={1}
              max={8}
              error={T.invalidRange}
              onValid={(n) => change({ laufende: { ...current.laufende, [kind]: n } })}
            />
          ))}
        </div>
        <p className="hint">{T.laufendeHint}</p>
      </fieldset>
    </div>
  );
}

/** Zahleneingabe: gibt nur gültige ganze Zahlen weiter, sonst zeigt sie einen Hinweis. */
function NumberField({
  label,
  value,
  min,
  max,
  error,
  onValid,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  error: string;
  onValid: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const n = Number(text);
  const valid = text.trim() !== '' && Number.isInteger(n) && n >= min && n <= max;
  return (
    <label className="regeln-einstellung__zahl">
      {label}
      <input
        type="text"
        inputMode="numeric"
        value={text}
        aria-invalid={!valid}
        onChange={(e) => {
          setText(e.target.value);
          const m = Number(e.target.value);
          if (e.target.value.trim() !== '' && Number.isInteger(m) && m >= min && m <= max) {
            onValid(m);
          }
        }}
      />
      {!valid && <span className="hint">{error}</span>}
    </label>
  );
}
