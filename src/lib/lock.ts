import type { Bytes } from './bytes'

/**
 * A live passphrase key held only in memory.
 *
 * PBKDF2 at 600k iterations takes a few hundred milliseconds, which is fine
 * once per session and impossible on every autosave — so the derived key is
 * kept for as long as the tab is open and never written anywhere. Reload the
 * page and the reader is asked for the passphrase again.
 */
export interface Lock {
  key: CryptoKey
  salt: Bytes
}
