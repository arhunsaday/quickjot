import { useCallback, useEffect, useState } from 'react'
import { LoadFailure } from './components/LoadFailure'
import { LockScreen } from './components/LockScreen'
import { NoteWorkspace } from './components/NoteWorkspace'
import { ReadView } from './components/ReadView'
import {
  CorruptNoteError,
  createEmptyDoc,
  decodePayload,
  type LockedPayload,
  type NoteDoc,
  UnsupportedVersionError,
} from './lib/codec'
import type { Lock } from './lib/lock'
import { readLocation, type ViewMode } from './lib/url'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; doc: NoteDoc; lock: Lock | null }
  | { kind: 'locked'; locked: LockedPayload }
  | { kind: 'failed'; title: string; detail: string }

async function load(payload: string): Promise<LoadState> {
  if (!payload) return { kind: 'ready', doc: createEmptyDoc(), lock: null }

  try {
    const decoded = await decodePayload(payload)
    return decoded.locked
      ? { kind: 'locked', locked: decoded }
      : { kind: 'ready', doc: decoded.doc, lock: null }
  } catch (error) {
    if (error instanceof UnsupportedVersionError) {
      return { kind: 'failed', title: 'This note needs a newer QuickJot', detail: error.message }
    }
    if (error instanceof CorruptNoteError) {
      return {
        kind: 'failed',
        title: "This link isn't readable",
        detail:
          'The note data in the URL is incomplete or damaged. Links can get cut short by chat apps and email clients — try copying the full link again from the original message.',
      }
    }
    throw error
  }
}

export default function App() {
  const [mode, setMode] = useState<ViewMode>(() => readLocation().mode)
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  /** Bumped on browser navigation so the editor remounts around the new note. */
  const [generation, setGeneration] = useState(0)

  const reload = useCallback(() => {
    const location = readLocation()
    setMode(location.mode)
    setState({ kind: 'loading' })
    load(location.payload).then(setState, (error: unknown) => {
      setState({
        kind: 'failed',
        title: 'This note could not be opened',
        detail: error instanceof Error ? error.message : String(error),
      })
    })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Back/forward between saved states reloads the note from the URL. Our own
  // autosave writes use replaceState, which does not fire popstate.
  useEffect(() => {
    const onPopState = () => {
      setGeneration((value) => value + 1)
      reload()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [reload])

  if (state.kind === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="border-muted-foreground/25 border-t-primary size-6 animate-spin rounded-full border-2" />
      </div>
    )
  }

  if (state.kind === 'failed') {
    return <LoadFailure title={state.title} detail={state.detail} />
  }

  if (state.kind === 'locked') {
    return (
      <LockScreen
        locked={state.locked}
        mode={mode}
        onUnlocked={(doc, lock) => setState({ kind: 'ready', doc, lock })}
      />
    )
  }

  if (mode === 'read') {
    return <ReadView doc={state.doc} />
  }

  return (
    <NoteWorkspace
      key={`${state.doc.id}:${generation}`}
      initialDoc={state.doc}
      initialLock={state.lock}
    />
  )
}
