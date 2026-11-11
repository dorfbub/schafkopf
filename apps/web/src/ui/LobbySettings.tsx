import {
  ALL_PASSED_RULES,
  BID_ORDER,
  LAUFENDE_KINDS,
  type ContractKind,
  type LaufendeKind,
  type RuleOptions,
  type TableView,
} from '@schafkopf/core';
import type { HostSession } from '@schafkopf/net';
import { useState } from 'react';
import { KIND_NAME, RULES_TEXT as T } from '../i18n/de';

interface Props {
  view: TableView;
  host: HostSession;
}

function options(view: TableView): RuleOptions {
  const { contracts, allowTout, allPassed, tariff, ramsch, laufende, sie, davonlaufen } =
    view.rules;
  return {
    contracts,
    allowTout,
    allPassed,
    tariff: { ...tariff },
    ramsch: { ...ramsch },
    laufende: { ...laufende },
    sie,
    davonlaufen,
  };
}

/** Tischregeln des Gastgebers in der Lobby. Jede gültige Änderung gilt sofort für alle. */
export function LobbySettings({ view, host }: Props) {
  const current = options(view);
  const change = (patch: Partial<RuleOptions>) => host.setRules({ ...current, ...patch });

  const toggleContract = (kind: ContractKind, on: boolean) => {
    const set = new Set(current.contracts);
    if (on) set.add(kind);
    else set.delete(kind);
    change({ contracts: BID_ORDER.filter((k) => set.has(k)) });
  };

  return (
    <div className="regeln-einstellung">
      <fieldset className="regeln-einstellung__gruppe">
        <legend>{T.contracts}</legend>
        <div className="row">
          {BID_ORDER.map((kind) => (
            <label key={kind} className="check">
              <input
                type="checkbox"
                checked={current.contracts.includes(kind)}
                disabled={kind === 'sauspiel'}
                onChange={(e) => toggleContract(kind, e.target.checked)}
              />
              {KIND_NAME[kind]}
            </label>
          ))}
        </div>
        <p className="hint">{T.contractsHint}</p>
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
        <label className="check">
          <input
            type="checkbox"
            checked={current.davonlaufen}
            onChange={(e) => change({ davonlaufen: e.target.checked })}
          />
          {T.davonlaufen}
        </label>
      </div>

      <fieldset className="regeln-einstellung__gruppe">
        <legend>{T.allPassed}</legend>
        <div className="row">
          {ALL_PASSED_RULES.map((rule) => (
            <label key={rule} className="check">
              <input
                type="radio"
                name="alle-weiter"
                value={rule}
                checked={current.allPassed === rule}
                onChange={() => change({ allPassed: rule })}
              />
              {T.allPassedName[rule]}
            </label>
          ))}
        </div>
        <p className="hint">{T.allPassedHint[current.allPassed]}</p>
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
          {LAUFENDE_KINDS.filter((k) => current.contracts.includes(k)).map((kind: LaufendeKind) => (
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
