import { describe, expect, it } from 'vitest'
import { concat, decodeText, encodeText, fromBase64Url, toBase64Url } from './bytes'

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array(512)
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37) % 256

    expect([...fromBase64Url(toBase64Url(bytes))]).toEqual([...bytes])
  })

  it('emits only URL-safe characters and no padding', () => {
    // 0xff bytes are what produce '+' and '/' in standard base64.
    const encoded = toBase64Url(new Uint8Array([0xff, 0xfe, 0xfd, 0xfc, 0xfb]))

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(encoded).not.toContain('=')
  })

  it('round-trips every payload length, so padding is restored correctly', () => {
    for (let length = 0; length < 12; length++) {
      const bytes = new Uint8Array(length).fill(0xab)
      expect([...fromBase64Url(toBase64Url(bytes))]).toEqual([...bytes])
    }
  })

  it('handles payloads larger than the chunking threshold', () => {
    const bytes = new Uint8Array(0x8000 * 2 + 17).fill(7)
    expect(fromBase64Url(toBase64Url(bytes)).byteLength).toBe(bytes.byteLength)
  })

  it('round-trips unicode text', () => {
    const text = 'Grüße — 日本語 · 🤝 emoji'
    expect(decodeText(encodeText(text))).toBe(text)
  })
})

describe('concat', () => {
  it('joins parts in order', () => {
    const joined = concat(new Uint8Array([1, 2]), new Uint8Array([]), new Uint8Array([3]))
    expect([...joined]).toEqual([1, 2, 3])
  })
})
