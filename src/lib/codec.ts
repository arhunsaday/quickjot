import type { JSONContent } from '@tiptap/core'
import {
  alloc,
  type Bytes,
  concat,
  decodeText,
  encodeText,
  fromBase64Url,
  slice,
  toBase64Url,
} from './bytes'
import { gunzip, gzip } from './compress'
import { decryptBytes, encryptBytes, IV_BYTES, SALT_BYTES } from './crypto'

/**
 * The URL *is* the document, so this envelope is the project's real storage
 * format. It is versioned in byte 0 from the very first release: that single
 * byte is what makes it possible to change the encoding later without
 * invalidating links people have already bookmarked or shared.
 *
 *   byte 0            format version
 *   byte 1            flags (bit 0: payload is encrypted)
 *   bytes 2..n        plaintext:  gzip(utf-8 JSON)
 *                     encrypted:  salt(16) ‖ iv(12) ‖ AES-GCM(gzip(utf-8 JSON))
 *
 * The whole envelope is base64url-encoded and lives in the URL fragment, which
 * browsers never transmit to a server.
 *
 * Note the ordering: compress first, then encrypt. Ciphertext is
 * indistinguishable from noise and will not compress, so the reverse order
 * would roughly triple the length of every protected note.
 */

export const FORMAT_VERSION = 1
const FLAG_ENCRYPTED = 0b0000_0001
const HEADER_BYTES = 2

/**
 * How far ahead of us a version byte may be before we stop believing it.
 *
 * Random text in the fragment usually decodes as *valid* base64url, so without
 * a ceiling here a stray link would be reported as "this note needs a newer
 * QuickJot" when the truth is simply that it is not a note. Versions only ever
 * advance one at a time, so anything beyond a few releases ahead is noise.
 */
const VERSION_LOOKAHEAD = 8

export interface NoteDoc {
  /** Stable identity, so re-opening a note updates its history entry in place. */
  id: string
  title: string
  content: JSONContent
}

export interface LockedPayload {
  salt: Bytes
  iv: Bytes
  ciphertext: Bytes
}

export type DecodedPayload = { locked: false; doc: NoteDoc } | ({ locked: true } & LockedPayload)

/** The link is damaged, truncated or not a QuickJot payload at all. */
export class CorruptNoteError extends Error {
  override name = 'CorruptNoteError'
}

/** The envelope is intact but the supplied passphrase did not decrypt it. */
export class WrongPassphraseError extends Error {
  override name = 'WrongPassphraseError'
}

/** The payload declares a format this build does not know how to read. */
export class UnsupportedVersionError extends Error {
  override name = 'UnsupportedVersionError'
  readonly version: number
  constructor(version: number) {
    super(`This note uses URL format v${version}, which this version of QuickJot cannot read.`)
    this.version = version
  }
}

export function createEmptyDoc(): NoteDoc {
  return {
    id: crypto.randomUUID(),
    title: '',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  }
}

function header(flags: number): Bytes {
  const bytes = alloc(HEADER_BYTES)
  bytes[0] = FORMAT_VERSION
  bytes[1] = flags
  return bytes
}

async function deflateDoc(doc: NoteDoc): Promise<Bytes> {
  const json = JSON.stringify({ id: doc.id, title: doc.title, content: doc.content })
  return gzip(encodeText(json))
}

function inflateDoc(bytes: Uint8Array): NoteDoc {
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeText(bytes))
  } catch {
    throw new CorruptNoteError('Note payload is not valid JSON.')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new CorruptNoteError('Note payload is not an object.')
  }

  const candidate = parsed as Partial<NoteDoc>
  if (typeof candidate.content !== 'object' || candidate.content === null) {
    throw new CorruptNoteError('Note payload has no document content.')
  }

  return {
    id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
    title: typeof candidate.title === 'string' ? candidate.title : '',
    content: candidate.content,
  }
}

/**
 * Encodes a note for the URL fragment. Pass `lock` to produce a
 * password-protected payload; the key is derived once by the caller and reused,
 * because PBKDF2 is far too slow to run on every autosave.
 */
export async function encodeNote(
  doc: NoteDoc,
  lock?: { key: CryptoKey; salt: Uint8Array },
): Promise<string> {
  const compressed = await deflateDoc(doc)

  if (!lock) {
    return toBase64Url(concat(header(0), compressed))
  }

  const { iv, ciphertext } = await encryptBytes(compressed, lock.key)
  return toBase64Url(concat(header(FLAG_ENCRYPTED), lock.salt, iv, ciphertext))
}

/**
 * Reads a fragment payload. An encrypted note comes back as `locked: true`
 * without being decrypted, so the UI can prompt for a passphrase before doing
 * the expensive key derivation.
 */
export async function decodePayload(payload: string): Promise<DecodedPayload> {
  let envelope: Bytes
  try {
    envelope = fromBase64Url(payload)
  } catch {
    throw new CorruptNoteError('Link is not valid base64url.')
  }

  if (envelope.byteLength < HEADER_BYTES) {
    throw new CorruptNoteError('Link is too short to be a note.')
  }

  const version = envelope[0] as number
  if (version !== FORMAT_VERSION) {
    if (version > FORMAT_VERSION && version <= FORMAT_VERSION + VERSION_LOOKAHEAD) {
      throw new UnsupportedVersionError(version)
    }
    throw new CorruptNoteError(`Not a QuickJot payload (leading byte ${version}).`)
  }

  const flags = envelope[1] as number
  const body = envelope.subarray(HEADER_BYTES)

  if ((flags & FLAG_ENCRYPTED) === 0) {
    return { locked: false, doc: inflateDoc(await inflate(body)) }
  }

  if (body.byteLength <= SALT_BYTES + IV_BYTES) {
    throw new CorruptNoteError('Encrypted link is truncated.')
  }

  return {
    locked: true,
    salt: slice(body, 0, SALT_BYTES),
    iv: slice(body, SALT_BYTES, SALT_BYTES + IV_BYTES),
    ciphertext: slice(body, SALT_BYTES + IV_BYTES),
  }
}

async function inflate(body: Uint8Array): Promise<Bytes> {
  try {
    return await gunzip(body)
  } catch {
    throw new CorruptNoteError('Note payload could not be decompressed.')
  }
}

/** Completes the read of a locked payload once the passphrase key is known. */
export async function unlockPayload(locked: LockedPayload, key: CryptoKey): Promise<NoteDoc> {
  let compressed: Bytes
  try {
    compressed = await decryptBytes(locked.ciphertext, locked.iv, key)
  } catch {
    throw new WrongPassphraseError('That passphrase does not unlock this note.')
  }
  return inflateDoc(await inflate(compressed))
}
