import { useEffect, useState } from 'react'
import { type LiveSession, liveNote, openLive } from '@/lib/live'
import { LoadFailure } from './LoadFailure'
import { NoteWorkspace } from './NoteWorkspace'

export function LiveNoteLoader({ id, token }: { id: string; token: string }) {
  const [session, setSession] = useState<LiveSession | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let canceled = false,
      active: LiveSession | undefined
    openLive(id, token).then(
      (value) => {
        active = value
        if (canceled) {
          value.provider.destroy()
          void value.cache.destroy()
          value.doc.destroy()
        } else setSession(value)
      },
      (reason) => {
        if (!canceled) setError(reason instanceof Error ? reason.message : 'Could not open note')
      },
    )
    return () => {
      canceled = true
      if (active) {
        active.provider.destroy()
        void active.cache.destroy()
        active.doc.destroy()
      }
    }
  }, [id, token])
  if (error) return <LoadFailure title="This live note could not be opened" detail={error} />
  if (!session)
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">
        Opening live note…
      </div>
    )
  return <NoteWorkspace initialDoc={liveNote(session)} initialLock={null} live={session} />
}
