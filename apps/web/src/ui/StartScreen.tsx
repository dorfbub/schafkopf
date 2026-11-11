import { type FormEvent, useState } from 'react';
import { type SavedTable, loadName, normalizeRoom, roomFromUrl } from '../connection';
import { RESUME_TEXT, START_TEXT as T, spacedCode } from '../i18n/de';
import { Button, Tafel, TextField } from './kit';

interface Props {
  onOpen: (name: string, online: boolean) => void;
  onJoin: (name: string, roomId: string) => void;
  /** Gespeicherter Tisch dieses Geräts, der fortgesetzt werden kann (N2). */
  saved?: SavedTable | null;
  onResume?: (saved: SavedTable) => void;
  onDiscard?: () => void;
  /** Tisch-Code aus dem Einladungslink; Standard: aus der Adresse. Für die Ansichtsprobe. */
  invite?: string | null;
}

/**
 * Startbildschirm auf dem Filz: Schriftzug, darunter eine Tafel mit Name und den beiden Wegen
 * an den Tisch. Kommt man über einen Einladungslink, zeigt er gleich die Beitreten-Ansicht.
 */
export function StartScreen({ onOpen, onJoin, saved, onResume, onDiscard, invite }: Props) {
  const [name, setName] = useState(loadName);
  const [invited] = useState(() => (invite === undefined ? roomFromUrl() : invite));
  const [showInvite, setShowInvite] = useState(invited !== null);
  const [room, setRoom] = useState(invited ?? '');
  const [nameError, setNameError] = useState(false);
  const trimmed = name.trim();
  const roomId = normalizeRoom(room);

  /** Ohne Namen geht nichts: Hinweis am Feld statt stummer, gesperrter Knöpfe. */
  const withName = (go: (name: string) => void) => () => {
    if (!trimmed) {
      setNameError(true);
      document.getElementById('start-name')?.focus();
      return;
    }
    go(trimmed);
  };

  const nameField = (
    <TextField
      id="start-name"
      label={T.name}
      value={name}
      maxLength={24}
      autoComplete="nickname"
      autoFocus
      placeholder={T.namePlaceholder}
      hint={T.nameHint}
      error={nameError && !trimmed ? T.nameMissing : undefined}
      onChange={(e) => setName(e.target.value)}
    />
  );

  const submitInvite = (e: FormEvent) => {
    e.preventDefault();
    withName((n) => onJoin(n, roomId))();
  };

  const submitJoin = (e: FormEvent) => {
    e.preventDefault();
    if (roomId) withName((n) => onJoin(n, roomId))();
  };

  return (
    <main className="start surface-felt">
      <header className="start__brand">
        <h1 className="brand">{T.brand}</h1>
        <p className="start__tagline">{T.tagline}</p>
      </header>

      {saved && onResume && !showInvite && (
        <Tafel className="start__resume" aria-labelledby="start-resume">
          <h2 id="start-resume" className="tafel__title">
            {RESUME_TEXT.title}
          </h2>
          <p className="tafel__text">
            {saved.snapshot.roomId ? RESUME_TEXT.online(saved.snapshot.roomId) : RESUME_TEXT.local}{' '}
            {RESUME_TEXT.progress(
              saved.snapshot.table.handNo,
              Math.max(1, Math.round((Date.now() - saved.savedAt) / 60_000)),
            )}
          </p>
          <div className="tafel__actions">
            <Button variant="secondary" onClick={onDiscard}>
              {RESUME_TEXT.discard}
            </Button>
            <Button onClick={() => onResume(saved)}>{RESUME_TEXT.resume}</Button>
          </div>
        </Tafel>
      )}

      {showInvite ? (
        <Tafel aria-labelledby="start-invite">
          <form className="start__form" onSubmit={submitInvite} noValidate>
            <h2 id="start-invite" className="tafel__title">
              {T.inviteTitle}{' '}
              <span className="start__invite-to">
                {T.inviteTo} <span className="code">{spacedCode(roomId)}</span>
              </span>
            </h2>
            <p className="tafel__text text-muted">{T.inviteHint}</p>
            {nameField}
            <Button type="submit" className="start__wide">
              {T.join}
            </Button>
          </form>
          <button type="button" className="text-link" onClick={() => setShowInvite(false)}>
            {T.inviteOwn}
          </button>
        </Tafel>
      ) : (
        <>
          <Tafel aria-label={T.brand}>
            <div className="start__form">
              {nameField}
              <div className="start__choices">
                <Button
                  variant={saved ? 'secondary' : 'primary'}
                  className="start__wide"
                  aria-describedby="start-friends-hint"
                  onClick={withName((n) => onOpen(n, true))}
                >
                  {T.playFriends}
                </Button>
                <Button
                  variant="secondary"
                  className="start__wide"
                  onClick={withName((n) => onOpen(n, false))}
                >
                  {T.playBots}
                </Button>
              </div>
              <p className="tafel__text text-muted start__small" id="start-friends-hint">
                {T.playFriendsHint} {T.hostHint}
              </p>
            </div>
          </Tafel>

          <Tafel tone="felt" aria-labelledby="start-join">
            <form className="start__join" onSubmit={submitJoin} noValidate>
              <h2 id="start-join" className="tafel__title tafel__title--small">
                {T.joinTitle}
              </h2>
              <div className="start__join-row">
                <TextField
                  className="start__code"
                  label={T.joinCode}
                  value={room}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder={T.joinPlaceholder}
                  onChange={(e) => setRoom(e.target.value)}
                />
                <Button type="submit" variant="secondary" disabled={!roomId}>
                  {T.join}
                </Button>
              </div>
            </form>
          </Tafel>
        </>
      )}
    </main>
  );
}
