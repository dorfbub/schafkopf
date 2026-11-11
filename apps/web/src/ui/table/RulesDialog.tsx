import type { RuleSet } from '@schafkopf/core';
import { useEffect, useRef } from 'react';
import { RULES_TEXT as T } from '../../i18n/de';
import { Button, Dialog } from '../kit';
import { RulesSummary } from '../RulesSummary';

interface Props {
  rules: RuleSet;
  onClose: () => void;
}

/** Kurze Regelübersicht am Tisch; Escape oder „Schließen“ schließt sie. */
export function RulesDialog({ rules, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      before?.focus();
    };
  }, [onClose]);

  return (
    <Dialog
      className="regeln-dialog"
      title={T.title}
      actions={
        <Button ref={closeRef} variant="secondary" onClick={onClose}>
          {T.close}
        </Button>
      }
    >
      <RulesSummary rules={rules} />
    </Dialog>
  );
}
