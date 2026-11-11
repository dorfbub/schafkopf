/// <reference types="vite/client" />

/** Einstellungen beim Bauen, siehe `docs/ARCHITEKTUR.md` („Verbindungsaufbau“). */
interface ImportMetaEnv {
  /** Vermittlungsweg: `nostr` (Standard), `torrent` oder `mqtt`. */
  readonly VITE_SIGNALING?: string;
  /** Eigene Relay-Liste für den Weg, durch Komma oder Leerzeichen getrennt (nur `wss://`). */
  readonly VITE_SIGNALING_URLS?: string;
  /** TURN-Server als JSON, z. B. `[{"urls":"turn:turn.example.org:3478","username":"…","credential":"…"}]`. */
  readonly VITE_TURN_CONFIG?: string;
  /** `1` nur für den Build der Ende-zu-Ende-Tests (`npm run e2e`); nie im ausgelieferten Standard. */
  readonly VITE_E2E?: string;
}

/** Kennung dieses Builds (siehe `pwa-plugin.ts`). Im Entwicklungsserver `dev`. */
declare const __BUILD_ID__: string;
