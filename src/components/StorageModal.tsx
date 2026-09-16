import type { Editor } from '@tiptap/react'
import { yDocToProsemirrorJSON } from '@tiptap/y-tiptap'
import { useState } from 'react'
import { toast } from 'sonner'
import * as Y from 'yjs'
import { encodeNote, type NoteDoc } from '@/lib/codec'
import { saveCollaborator } from '@/lib/collaborator'
import {
  base64ToBytes,
  createLive,
  forgetLive,
  type LiveSession,
  liveRequest,
  liveUrl,
  rememberLive,
  savedLiveNotes,
  snapshotUrl,
} from '@/lib/live'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

export function StorageModal({
  open,
  onOpenChange,
  live,
  editor,
  title,
  id,
  encrypted,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  live?: LiveSession
  editor: Editor | null
  title: string
  id: string
  encrypted: boolean
}) {
  const [name, setName] = useState(
    String(live?.provider.awareness?.getLocalState()?.user?.name || ''),
  )
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const [expires, setExpires] = useState(live?.expires || 0)
  const [keys, setKeys] = useState(
    () => savedLiveNotes().find((note) => note.id === live?.id && note.token === live?.token)?.keys,
  )
  const [revisions, setRevisions] = useState<{ id: number; created: number }[] | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [snapshot, setSnapshot] = useState('')
  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await work()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }
  const copy = (url: string) =>
    void navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied'),
      () => toast.error('Copy the link from its field'),
    )
  const link = (label: string, token: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          aria-label={label}
          value={liveUrl(live?.id || '', token)}
          readOnly
          onFocus={(event) => event.target.select()}
        />
        <Button variant="outline" size="sm" onClick={() => copy(liveUrl(live?.id || '', token))}>
          Copy
        </Button>
      </div>
    </div>
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {live ? 'Live note · sharing & storage' : 'Where your note lives'}
          </DialogTitle>
          <DialogDescription>
            {live
              ? 'A stable link that stays up to date. The app host stores this note. Everyone holding an invitation link has its permission.'
              : 'Link snapshots are self-contained. Live notes add persistent storage and collaboration.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {live && (
            <div className="space-y-2">
              <Label htmlFor="collaborator-name">Your name in this note</Label>
              <div className="flex gap-2">
                <Input
                  id="collaborator-name"
                  value={name}
                  maxLength={40}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!name.trim()}
                  onClick={() => {
                    const current = live.provider.awareness?.getLocalState()?.user
                    live.provider.setAwarenessField('user', { ...current, name: name.trim() })
                    saveCollaborator(name)
                    toast.success('Collaboration name updated')
                  }}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Visible to people in this note; remembered on this device.
              </p>
            </div>
          )}

          {!live ? (
            <>
              <div className="rounded-xl border p-4 text-sm space-y-2">
                <p className="font-medium">Link snapshot · current mode</p>
                <p className="text-muted-foreground">
                  No server storage. Each shared link keeps its original version. Password
                  protection stays available.
                </p>
              </div>
              <div className="rounded-xl border p-4 text-sm space-y-3">
                <p className="font-medium">Live note</p>
                <p className="text-muted-foreground">
                  One stable link, live editing, offline drafts and recovery history. Stored for 30
                  days; the owner can extend it. No account required. Save your owner link to keep
                  management access.
                </p>
                {encrypted && (
                  <p className="text-destructive">
                    Remove password protection first. Live notes are stored unlocked and can be read
                    by the host.
                  </p>
                )}
                <Button
                  disabled={busy || encrypted || !editor}
                  onClick={() =>
                    void run(async () => {
                      if (!editor) return
                      const note: NoteDoc = { id, title, content: editor.getJSON() }
                      const url = await createLive(note)
                      window.location.assign(url)
                    })
                  }
                >
                  {busy ? 'Creating…' : 'Make this a live note'}
                </Button>
              </div>
              {savedLiveNotes().length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent live notes · saved on this device</p>
                  {savedLiveNotes().map((note) => (
                    <a
                      className="block rounded-lg border p-3 text-sm hover:bg-muted"
                      key={`${note.id}:${note.token}`}
                      href={liveUrl(note.id, note.token)}
                    >
                      {note.title || 'Untitled note'}{' '}
                      <span className="text-muted-foreground">· {note.role}</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl bg-muted/40 border p-3 text-sm">
                <p>
                  Access: <strong>{live.role}</strong>
                </p>
                <p className="text-muted-foreground">
                  Expires {new Date(expires).toLocaleString()}. Download or make a snapshot to keep
                  a permanent copy.
                </p>
              </div>
              {live.role === 'owner' &&
                link('Owner link · manage access; keep private', live.token)}
              {keys ? (
                <>
                  {link('Invite to edit · anyone with this link can edit', keys.editor)}
                  {link('View live note · read-only access', keys.viewer)}
                </>
              ) : (
                link(
                  live.role === 'viewer'
                    ? 'View live note · read-only access'
                    : 'Invite to edit · anyone with this link can edit',
                  live.token,
                )
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const url = await snapshotUrl(live)
                      setSnapshot(url)
                      copy(url)
                    })
                  }
                >
                  Create snapshot link
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () =>
                      setRevisions(await liveRequest(`/${live.id}/revisions`, live.token)),
                    )
                  }
                >
                  Recovery history
                </Button>
              </div>
              {snapshot && (
                <Input
                  aria-label="Snapshot link"
                  readOnly
                  value={snapshot}
                  onFocus={(event) => event.target.select()}
                />
              )}
              {revisions && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Open a previous version as a separate snapshot
                  </p>
                  {revisions.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      History appears after the first saved edits.
                    </p>
                  )}
                  {revisions.map((revision) => (
                    <Button
                      variant="outline"
                      key={revision.id}
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const value = await liveRequest<{ update: string }>(
                            `/${live.id}/revisions/${revision.id}`,
                            live.token,
                          )
                          const doc = new Y.Doc()
                          try {
                            Y.applyUpdate(doc, base64ToBytes(value.update))
                            const payload = await encodeNote({
                              id: crypto.randomUUID(),
                              title: String(doc.getMap('meta').get('title') || ''),
                              content: yDocToProsemirrorJSON(doc, 'default'),
                            })
                            window.open(`/#${payload}`, '_blank', 'noopener,noreferrer')
                          } finally {
                            doc.destroy()
                          }
                        })
                      }
                    >
                      {new Date(revision.created).toLocaleString()}
                    </Button>
                  ))}
                </div>
              )}
              {live.role === 'owner' && (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">Owner controls</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const result = await liveRequest<{ expires: number }>(
                            `/${live.id}/extend`,
                            live.token,
                            'POST',
                          )
                          live.expires = result.expires
                          setExpires(result.expires)
                          const saved = savedLiveNotes().find(
                            (note) => note.id === live.id && note.token === live.token,
                          )
                          if (saved) rememberLive({ ...saved, expires: result.expires })
                          toast.success('Storage extended by 30 days')
                        })
                      }
                    >
                      Extend 30 days
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const next = await liveRequest<{ editor: string; viewer: string }>(
                            `/${live.id}/access`,
                            live.token,
                            'POST',
                          )
                          setKeys(next)
                          const saved = savedLiveNotes().find(
                            (note) => note.id === live.id && note.token === live.token,
                          )
                          if (saved) rememberLive({ ...saved, keys: next })
                          toast.success('Old invitation links revoked')
                          live.provider.connect()
                        })
                      }
                    >
                      Replace invitation links
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
                      Delete live note…
                    </Button>
                  </div>
                  {confirmDelete && (
                    <div className="rounded-xl border border-destructive/40 p-3 space-y-3 text-sm">
                      <p>
                        This permanently removes the live note and recovery history for everyone.
                        Create a snapshot first to keep a copy.
                      </p>
                      <Button
                        variant="destructive"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const url = await snapshotUrl(live)
                            await liveRequest(`/${live.id}`, live.token, 'DELETE')
                            forgetLive(live.id)
                            await live.cache.clearData()
                            window.location.assign(url)
                          })
                        }
                      >
                        Delete and keep local snapshot
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
