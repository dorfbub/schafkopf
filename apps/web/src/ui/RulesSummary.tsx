import { LAUFENDE_KINDS, type RuleSet, availableKinds, davonlaufenAb } from '@schafkopf/core';
import { KIND_NAME, RULES_TEXT as T } from '../i18n/de';

/** Die Tischregeln zum Lesen – für Gäste in der Lobby und im Info-Dialog am Tisch. */
export function RulesSummary({ rules }: { rules: RuleSet }) {
  const yesNo = (b: boolean) => (b ? T.yes : T.no);
  const kinds = availableKinds(rules);
  return (
    <dl className="regeln">
      <dt>{T.setup}</dt>
      <dd>{T.setupName[`${rules.players}-${rules.deck}`]}</dd>
      <dt>{T.contracts}</dt>
      <dd>{kinds.map((k) => KIND_NAME[k]).join(', ')}</dd>
      <dt>{T.tout}</dt>
      <dd>{yesNo(rules.allowTout)}</dd>
      <dt>{T.tariff}</dt>
      <dd>
        {T.tariffSauspiel} {rules.tariff.sauspiel} · {T.tariffSolo} {rules.tariff.solo} ·{' '}
        {T.tariffExtra} {rules.tariff.extra}
      </dd>
      <dt>{T.laufende}</dt>
      <dd>
        {LAUFENDE_KINDS.filter((k) => kinds.includes(k))
          .map((k) => `${KIND_NAME[k]} ${rules.laufende[k]}`)
          .join(' · ')}
      </dd>
      <dt>{T.allPassed}</dt>
      <dd>
        {T.allPassedName[rules.allPassed]}
        {rules.allPassed === 'ramsch' &&
          ` · ${T.tariffRamsch} ${rules.tariff.ramsch} · ${T.durchmarschShort} ${yesNo(
            rules.ramsch.durchmarsch,
          )} · ${T.jungfrauShort} ${yesNo(rules.ramsch.jungfrau)}`}
        {rules.allPassed === 'stock' && ` · ${T.tariffStock} ${rules.tariff.stock}`}
      </dd>
      <dt>{T.sie}</dt>
      <dd>{yesNo(rules.sie)}</dd>
      {kinds.includes('sauspiel') && (
        <>
          <dt>{T.davonlaufen(davonlaufenAb(rules.deck))}</dt>
          <dd>{yesNo(rules.davonlaufen)}</dd>
        </>
      )}
      <dt>{T.kontra}</dt>
      <dd>{yesNo(rules.kontra)}</dd>
    </dl>
  );
}
