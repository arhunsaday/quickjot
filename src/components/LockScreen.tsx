import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type LockedPayload, type NoteDoc, unlockPayload, WrongPassphraseError } from '@/lib/codec'
import { deriveKey } from '@/lib/crypto'
import type { Lock as LockState } from '@/lib/lock'
import type { ViewMode } from '@/lib/url'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  locked: LockedPayload
  mode: ViewMode
  onUnlocked: (doc: NoteDoc, lock: LockState) => void
}

export function LockScreen({ locked, mode, onUnlocked }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!passphrase || busy) return
    setBusy(true)
    setError(null)

    try {
      // Deliberately slow: 600k PBKDF2 iterations is the point of the design.
      const key = await deriveKey(passphrase, locked.salt)
      const doc = await unlockPayload(locked, key)
      onUnlocked(doc, { key, salt: locked.salt })
    } catch (cause) {
      setError(
        cause instanceof WrongPassphraseError
          ? 'That passphrase does not unlock this note.'
          : 'This note could not be opened — the link may be damaged.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-end">
          <ThemeToggle />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                <Lock className="size-[18px]" />
              </div>
              <div>
                <CardTitle>Protected note</CardTitle>
                <p className="text-muted-foreground text-xs">
                  {mode === 'read' ? 'Read-only link' : 'Editable link'}
                </p>
              </div>
            </div>
            <CardDescription className="pt-2">
              This note was encrypted by whoever wrote it. Enter the passphrase they shared with you
              to read it.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="unlock">Passphrase</Label>
              <Input
                id="unlock"
                type="password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void submit()
                }}
                aria-invalid={Boolean(error)}
                disabled={busy}
                autoFocus
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <Button onClick={() => void submit()} disabled={!passphrase || busy}>
              {busy ? 'Deriving key…' : 'Unlock note'}
            </Button>
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-3 text-center text-xs">
          Decryption happens entirely in this browser. Nothing is sent anywhere.
        </p>
      </div>
    </div>
  )
}
