import { describe, expect, it } from 'vitest'
import { toBase64Url } from './bytes'
import {
  CorruptNoteError,
  createEmptyDoc,
  decodePayload,
  encodeNote,
  FORMAT_VERSION,
  type NoteDoc,
  UnsupportedVersionError,
  unlockPayload,
  WrongPassphraseError,
} from './codec'
import { deriveKey, randomBytes, SALT_BYTES } from './crypto'

const doc: NoteDoc = {
  id: '4a1f0f1e-0000-4000-8000-000000000000',
  title: 'Meeting notes',
  content: {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Ship the codec. Grüße! 🤝' }] },
    ],
  },
}

async function lockFor(passphrase: string) {
  const salt = randomBytes(SALT_BYTES)
  return { key: await deriveKey(passphrase, salt), salt }
}

describe('plaintext payloads', () => {
  it('round-trips a document exactly', async () => {
    const payload = await encodeNote(doc)
    const decoded = await decodePayload(payload)

    expect(decoded.locked).toBe(false)
    if (decoded.locked) throw new Error('expected an unlocked payload')
    expect(decoded.doc).toEqual(doc)
  })

  it('stays URL-safe', async () => {
    expect(await encodeNote(doc)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('declares the format version in the first byte', async () => {
    const payload = await encodeNote(doc)
    // 6 bits per base64 char: the first character encodes the top 6 bits of byte 0.
    const firstByte = Buffer.from(
      `${payload.replace(/-/g, '+').replace(/_/g, '/').slice(0, 4)}==`,
      'base64',
    )[0]

    expect(firstByte).toBe(FORMAT_VERSION)
  })

  it('compresses repetitive prose well below its plain size', async () => {
    const long: NoteDoc = {
      ...doc,
      content: {
        type: 'doc',
        content: Array.from({ length: 80 }, () => ({
          type: 'paragraph',
          content: [{ type: 'text', text: 'The same sentence over and over again. ' }],
        })),
      },
    }

    const payload = await encodeNote(long)
    expect(payload.length).toBeLessThan(JSON.stringify(long).length / 4)
  })

  it('round-trips an empty document', async () => {
    const empty = createEmptyDoc()
    const decoded = await decodePayload(await encodeNote(empty))

    if (decoded.locked) throw new Error('expected an unlocked payload')
    expect(decoded.doc).toEqual(empty)
  })
})

describe('encrypted payloads', () => {
  it('round-trips with the right passphrase', async () => {
    const lock = await lockFor('correct horse battery staple')
    const payload = await encodeNote(doc, lock)
    const decoded = await decodePayload(payload)

    expect(decoded.locked).toBe(true)
    if (!decoded.locked) throw new Error('expected a locked payload')
    expect(await unlockPayload(decoded, lock.key)).toEqual(doc)
  })

  it('rejects a wrong passphrase rather than returning garbage', async () => {
    const lock = await lockFor('correct horse battery staple')
    const decoded = await decodePayload(await encodeNote(doc, lock))
    if (!decoded.locked) throw new Error('expected a locked payload')

    const wrong = await deriveKey('incorrect horse', decoded.salt)
    await expect(unlockPayload(decoded, wrong)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('leaks no plaintext into the payload', async () => {
    const lock = await lockFor('a long enough passphrase')
    const payload = await encodeNote(doc, lock)

    expect(payload).not.toContain('Meeting')
    expect(payload).not.toContain('Agenda')
  })

  it('uses a fresh IV each time, so identical notes encode differently', async () => {
    const lock = await lockFor('a long enough passphrase')
    expect(await encodeNote(doc, lock)).not.toBe(await encodeNote(doc, lock))
  })

  it('detects a tampered ciphertext', async () => {
    const lock = await lockFor('a long enough passphrase')
    const decoded = await decodePayload(await encodeNote(doc, lock))
    if (!decoded.locked) throw new Error('expected a locked payload')

    const tampered = { ...decoded }
    tampered.ciphertext[4] = (tampered.ciphertext[4] ?? 0) ^ 0xff

    await expect(unlockPayload(tampered, lock.key)).rejects.toBeInstanceOf(WrongPassphraseError)
  })
})

describe('damaged links', () => {
  it('reports a truncated payload instead of throwing something opaque', async () => {
    const payload = await encodeNote(doc)
    await expect(decodePayload(payload.slice(0, payload.length - 8))).rejects.toBeInstanceOf(
      CorruptNoteError,
    )
  })

  it('reports payloads that are not notes at all', async () => {
    await expect(decodePayload('hello-world')).rejects.toBeInstanceOf(CorruptNoteError)
  })

  it('reports an empty-but-present payload', async () => {
    await expect(decodePayload('AQ')).rejects.toBeInstanceOf(CorruptNoteError)
  })

  it('names the version when a payload is from a future format', async () => {
    const future = toBase64Url(new Uint8Array([FORMAT_VERSION + 1, 0, 1, 2, 3]))
    await expect(decodePayload(future)).rejects.toBeInstanceOf(UnsupportedVersionError)
  })

  it('reports a truncated encrypted payload', async () => {
    // Flagged as encrypted, but too short to hold a salt and IV.
    const short = toBase64Url(new Uint8Array([FORMAT_VERSION, 1, 9, 9, 9]))
    await expect(decodePayload(short)).rejects.toBeInstanceOf(CorruptNoteError)
  })
})
