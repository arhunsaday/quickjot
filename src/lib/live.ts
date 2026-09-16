import { HocuspocusProvider } from '@hocuspocus/provider'
import { getSchema } from '@tiptap/core'
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from '@tiptap/y-tiptap'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { createExtensions } from '@/editor/extensions'
import { encodeNote, type NoteDoc } from './codec'
import { collaborator } from './collaborator'

export type LiveRole = 'owner' | 'editor' | 'viewer'
export interface LiveMetadata {
  id: string
  role: LiveRole
  expires: number
  updated: number
}
export interface LiveSession extends LiveMetadata {
  token: string
  doc: Y.Doc
  provider: HocuspocusProvider
  cache: IndexeddbPersistence
}
interface SavedLive extends LiveMetadata {
  token: string
  title: string
  keys?: { editor: string; viewer: string }
}
const key = 'quickjot:live-notes:v1'
export function liveLocation() {
  const match = /^\/n\/([a-f0-9-]{36})$/.exec(window.location.pathname)
  return match
    ? {
        id: match[1] || '',
        token: new URLSearchParams(window.location.hash.slice(1)).get('key') || '',
      }
    : null
}
export function liveUrl(id: string, token: string) {
  return `${window.location.origin}/n/${id}#key=${token}`
}
export function savedLiveNotes(): SavedLive[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value)
      ? value.filter(
          (note) =>
            note &&
            typeof note.id === 'string' &&
            typeof note.token === 'string' &&
            typeof note.expires === 'number' &&
            ['owner', 'editor', 'viewer'].includes(note.role),
        )
      : []
  } catch {
    return []
  }
}
export function rememberLive(value: SavedLive) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          value,
          ...savedLiveNotes().filter((note) => note.id !== value.id || note.token !== value.token),
        ].slice(0, 50),
      ),
    )
  } catch {
    /* Browser storage is optional. */
  }
}
export function forgetLive(id: string) {
  try {
    localStorage.setItem(key, JSON.stringify(savedLiveNotes().filter((note) => note.id !== id)))
  } catch {
    /* Optional. */
  }
}
export async function liveRequest<T>(
  path: string,
  token: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/notes${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const failure = new Error(error.error || 'The live note service is unavailable.')
    Object.assign(failure, { status: response.status })
    throw failure
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
export function bytesToBase64(bytes: Uint8Array) {
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return btoa(text)
}
export function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}
export function liveNote(session: LiveSession): NoteDoc {
  return {
    id: session.id,
    title: String(session.doc.getMap('meta').get('title') || ''),
    content: yDocToProsemirrorJSON(session.doc, 'default'),
  }
}
export async function createLive(note: NoteDoc) {
  const doc = prosemirrorJSONToYDoc(
    getSchema(createExtensions({ editable: false })),
    note.content,
    'default',
  )
  doc.getMap('meta').set('title', note.title)
  try {
    const result = await liveRequest<{
      id: string
      keys: { owner: string; editor: string; viewer: string }
      expires: number
    }>('', '', 'POST', { update: bytesToBase64(Y.encodeStateAsUpdate(doc)) })
    rememberLive({
      id: result.id,
      expires: result.expires,
      keys: { editor: result.keys.editor, viewer: result.keys.viewer },
      token: result.keys.owner,
      role: 'owner',
      updated: Date.now(),
      title: note.title,
    })
    return liveUrl(result.id, result.keys.owner)
  } finally {
    doc.destroy()
  }
}
export async function openLive(id: string, token: string): Promise<LiveSession> {
  let metadata: LiveMetadata, update: string | undefined
  try {
    const response = await liveRequest<LiveMetadata & { update: string }>(`/${id}`, token)
    metadata = response
    update = response.update
  } catch (error) {
    const saved = savedLiveNotes().find((note) => note.id === id && note.token === token)
    const status =
      error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0
    if (!saved || saved.expires <= Date.now() || (status > 0 && status < 500)) throw error
    metadata = saved
  }
  const doc = new Y.Doc()
  // Scope cached drafts to the capability so viewer links cannot upload an editor's draft.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const cache = new IndexeddbPersistence(
    `quickjot:${id}:${bytesToBase64(new Uint8Array(digest))}`,
    doc,
  )
  try {
    await cache.whenSynced
    if (update) Y.applyUpdate(doc, base64ToBytes(update))
    else if (doc.getXmlFragment('default').length === 0)
      throw new Error('No offline draft is available on this device. Reconnect to open this note.')
    const url = new URL('/collaboration', window.location.origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const provider = new HocuspocusProvider({ url: url.toString(), name: id, token, document: doc })
    provider.setAwarenessField('user', {
      name: collaborator(`Writer ${String(doc.clientID).slice(-4)}`),
      color: ['#6366f1', '#e87924', '#16a34a', '#db2777'][doc.clientID % 4],
    })
    const existing = savedLiveNotes().find((note) => note.id === id && note.token === token)
    rememberLive({
      ...metadata,
      token,
      title: String(doc.getMap('meta').get('title') || ''),
      keys: existing?.keys,
    })
    return { ...metadata, token, doc, provider, cache }
  } catch (error) {
    await cache.destroy()
    doc.destroy()
    throw error
  }
}
export async function snapshotUrl(session: LiveSession) {
  return `${window.location.origin}/#${await encodeNote(liveNote(session))}`
}
