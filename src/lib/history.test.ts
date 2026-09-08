import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoteDoc } from './codec'
import { clearHistory, forgetNote, readHistory, rememberNote } from './history'

function memoryStorage(overrides: Partial<Storage> = {}): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
    ...overrides,
  } as Storage
}

const noteWith = (id: string, title: string, body: string): NoteDoc => ({
  id,
  title,
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }],
  },
})

describe('note history', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  it('records a note and reads it back', () => {
    rememberNote(noteWith('a', 'Groceries', 'milk'), 'PAYLOAD', { encrypted: false, chars: 120 })
    const [entry] = readHistory()

    expect(entry?.id).toBe('a')
    expect(entry?.title).toBe('Groceries')
    expect(entry?.payload).toBe('PAYLOAD')
    expect(entry?.chars).toBe(120)
  })

  it('replaces the entry for a note instead of appending a duplicate', () => {
    rememberNote(noteWith('a', 'First', 'x'), 'P1', { encrypted: false, chars: 10 })
    rememberNote(noteWith('a', 'Second', 'y'), 'P2', { encrypted: false, chars: 20 })

    const entries = readHistory()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.title).toBe('Second')
    expect(entries[0]?.payload).toBe('P2')
  })

  it('sorts by recency, not by insertion order', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    rememberNote(noteWith('a', 'Older', 'x'), 'P1', { encrypted: false, chars: 10 })

    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'))
    rememberNote(noteWith('b', 'Newer', 'y'), 'P2', { encrypted: false, chars: 10 })

    // Touching the older note again should move it back to the top.
    vi.setSystemTime(new Date('2026-01-03T00:00:00Z'))
    rememberNote(noteWith('a', 'Older', 'x'), 'P1', { encrypted: false, chars: 10 })

    expect(readHistory().map((entry) => entry.title)).toEqual(['Older', 'Newer'])
    vi.useRealTimers()
  })

  it('stores no readable text alongside a protected note', () => {
    rememberNote(noteWith('a', 'Secret plans', 'the actual secret'), 'CIPHER', {
      encrypted: true,
      chars: 400,
    })

    const raw = localStorage.getItem('quickjot:history:v1') ?? ''
    expect(raw).not.toContain('Secret plans')
    expect(raw).not.toContain('the actual secret')
    expect(readHistory()[0]?.title).toBe('Protected note')
    expect(readHistory()[0]?.excerpt).toBe('')
  })

  it('forgets a single note and clears them all', () => {
    rememberNote(noteWith('a', 'A', 'x'), 'P1', { encrypted: false, chars: 10 })
    rememberNote(noteWith('b', 'B', 'y'), 'P2', { encrypted: false, chars: 10 })

    expect(forgetNote('a').map((entry) => entry.id)).toEqual(['b'])
    expect(clearHistory()).toEqual([])
    expect(readHistory()).toEqual([])
  })

  it('caps the list rather than growing without bound', () => {
    for (let index = 0; index < 80; index++) {
      rememberNote(noteWith(`n${index}`, `Note ${index}`, 'x'), 'P', {
        encrypted: false,
        chars: 10,
      })
    }

    expect(readHistory().length).toBeLessThanOrEqual(60)
  })

  it('survives storage that is unavailable entirely', () => {
    vi.stubGlobal('localStorage', undefined)

    expect(readHistory()).toEqual([])
    expect(() =>
      rememberNote(noteWith('a', 'A', 'x'), 'P', { encrypted: false, chars: 10 }),
    ).not.toThrow()
  })

  it('survives a storage quota error on write', () => {
    vi.stubGlobal(
      'localStorage',
      memoryStorage({
        setItem: () => {
          throw new DOMException('quota', 'QuotaExceededError')
        },
      }),
    )

    expect(() =>
      rememberNote(noteWith('a', 'A', 'x'), 'P', { encrypted: false, chars: 10 }),
    ).not.toThrow()
  })

  it('ignores corrupt stored data instead of throwing', () => {
    const store = memoryStorage()
    store.setItem('quickjot:history:v1', '{not json')
    vi.stubGlobal('localStorage', store)

    expect(readHistory()).toEqual([])
  })

  it('drops entries that are not shaped like history entries', () => {
    const store = memoryStorage()
    store.setItem('quickjot:history:v1', JSON.stringify([{ nope: true }, 42, null]))
    vi.stubGlobal('localStorage', store)

    expect(readHistory()).toEqual([])
  })
})
