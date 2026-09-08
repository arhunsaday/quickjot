import type { NoteDoc } from './codec'
import { displayTitle, excerptOf } from './note'

/**
 * A local index of notes you have opened.
 *
 * Before this existed, the URL was the *only* handle on a note: close the tab
 * without copying the link and the note was gone for good. This keeps a local
 * list so the app can hand it back. It stays entirely on the device — there is
 * still no server anywhere in this app.
 */

const KEY = 'quickjot:history:v1'
const MAX_ENTRIES = 60

export interface HistoryEntry {
  id: string
  title: string
  excerpt: string
  /** The fragment payload, which is all that is needed to reopen the note. */
  payload: string
  encrypted: boolean
  updatedAt: number
  chars: number
}

/**
 * Safari in private mode throws on access rather than returning null, and a
 * full quota throws on write, so every path through here is guarded.
 */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readHistory(): HistoryEntry[] {
  const store = storage()
  if (!store) return []

  try {
    const parsed: unknown = JSON.parse(store.getItem(KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry).sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<HistoryEntry>
  return typeof entry.id === 'string' && typeof entry.payload === 'string'
}

function write(entries: HistoryEntry[]): HistoryEntry[] {
  const store = storage()
  if (!store) return entries

  const capped = entries.slice(0, MAX_ENTRIES)
  try {
    store.setItem(KEY, JSON.stringify(capped))
  } catch {
    // Out of quota: shed the oldest half and try once more before giving up.
    try {
      const trimmed = capped.slice(0, Math.floor(MAX_ENTRIES / 2))
      store.setItem(KEY, JSON.stringify(trimmed))
      return trimmed
    } catch {
      return capped
    }
  }
  return capped
}

/**
 * Records a note, replacing any earlier entry for the same id.
 *
 * A protected note is indexed without its title or excerpt: the payload in
 * storage is ciphertext, and it would be careless to sit a readable summary of
 * it next to that on disk.
 */
export function rememberNote(
  doc: NoteDoc,
  payload: string,
  options: { encrypted: boolean; chars: number },
): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: doc.id,
    title: options.encrypted ? 'Protected note' : displayTitle(doc),
    excerpt: options.encrypted ? '' : excerptOf(doc),
    payload,
    encrypted: options.encrypted,
    updatedAt: Date.now(),
    chars: options.chars,
  }

  const others = readHistory().filter((existing) => existing.id !== entry.id)
  return write([entry, ...others])
}

export function forgetNote(id: string): HistoryEntry[] {
  return write(readHistory().filter((entry) => entry.id !== id))
}

export function clearHistory(): HistoryEntry[] {
  const store = storage()
  try {
    store?.removeItem(KEY)
  } catch {
    // Nothing more to do — the list is already unreadable.
  }
  return []
}
