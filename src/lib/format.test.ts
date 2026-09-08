import { describe, expect, it } from 'vitest'
import { formatBytes, formatRelative } from './format'

describe('formatRelative', () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0)

  it('calls the last few seconds "just now"', () => {
    expect(formatRelative(now - 1_000, now)).toBe('just now')
    expect(formatRelative(now, now)).toBe('just now')
  })

  it('steps up through units as time passes', () => {
    expect(formatRelative(now - 30_000, now)).toMatch(/30/)
    expect(formatRelative(now - 5 * 60_000, now)).toMatch(/5/)
    expect(formatRelative(now - 3 * 3_600_000, now)).toMatch(/3/)
  })
})

describe('formatBytes', () => {
  it('uses bytes below a kilobyte', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(999)).toBe('999 B')
  })

  it('switches to kilobytes with one decimal while small', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1843)).toBe('1.8 KB')
  })

  it('drops the decimal for larger kilobyte values', () => {
    expect(formatBytes(30 * 1024)).toBe('30 KB')
  })

  it('switches to megabytes past a thousand kilobytes', () => {
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
