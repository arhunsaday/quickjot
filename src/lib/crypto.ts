import { alloc, type Bytes, encodeText, slice } from './bytes'

/**
 * Password-protected notes.
 *
 * The passphrase never enters the URL. What travels in the link is a random
 * salt, a random IV and AES-GCM ciphertext; the key is derived on the
 * recipient's machine from the passphrase they are prompted for. Losing the
 * passphrase means losing the note — there is no server to ask.
 */

/** OWASP's current floor for PBKDF2-HMAC-SHA256. Deliberately slow. */
export const PBKDF2_ITERATIONS = 600_000
export const SALT_BYTES = 16
/** 96 bits, the size AES-GCM is specified for. */
export const IV_BYTES = 12

export function randomBytes(length: number): Bytes {
  const out = alloc(length)
  crypto.getRandomValues(out)
  return out
}

/**
 * Deriving a key costs a few hundred milliseconds by design, so callers should
 * do it once per session and keep the CryptoKey (which is not extractable)
 * rather than re-deriving on every autosave.
 */
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encodeText(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: slice(salt, 0), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBytes(
  plaintext: Uint8Array,
  key: CryptoKey,
): Promise<{ iv: Bytes; ciphertext: Bytes }> {
  const iv = randomBytes(IV_BYTES)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, slice(plaintext, 0))
  return { iv, ciphertext: new Uint8Array(ciphertext) as Bytes }
}

/** Rejects if the passphrase is wrong — GCM authenticates as well as encrypts. */
export async function decryptBytes(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey,
): Promise<Bytes> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: slice(iv, 0) },
    key,
    slice(ciphertext, 0),
  )
  return new Uint8Array(plaintext) as Bytes
}
