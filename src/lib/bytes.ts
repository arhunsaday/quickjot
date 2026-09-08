/**
 * Byte plumbing shared by the codec. Kept dependency-free so it runs the same
 * in the browser, in a worker and under Node during tests.
 */

/** A Uint8Array that is guaranteed to be backed by a real ArrayBuffer. */
export type Bytes = Uint8Array<ArrayBuffer>

export function alloc(length: number): Bytes {
  return new Uint8Array(new ArrayBuffer(length)) as Bytes
}

export function concat(...parts: Uint8Array[]): Bytes {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = alloc(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

/** Copies a slice into its own buffer so it can be handed to WebCrypto safely. */
export function slice(source: Uint8Array, start: number, end?: number): Bytes {
  const view = source.subarray(start, end)
  const out = alloc(view.byteLength)
  out.set(view)
  return out
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function encodeText(text: string): Bytes {
  const encoded = encoder.encode(text)
  return slice(encoded, 0)
}

export function decodeText(bytes: Uint8Array): string {
  return decoder.decode(bytes)
}

/**
 * base64url, per RFC 4648 §5: URL-safe alphabet and no padding, so the value
 * survives being pasted into a URL, a chat message or a QR code untouched.
 */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  // Chunked to stay well clear of the argument-count limit on large notes.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(value: string): Bytes {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, '=')
  const binary = atob(padded)
  const out = alloc(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}
