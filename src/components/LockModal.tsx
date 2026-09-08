import { cn } from 'cn'
import { Lock, LockOpen, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { PBKDF2_ITERATIONS } from '@/lib/crypto'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isLocked: boolean
  onProtect: (passphrase: string) => Promise<void>
  onRemove: () => Promise<void>
}

/**
 * Tailwind only generates classes it can see in the source, so the meter
 * colours have to be complete literals rather than strings built at runtime.
 */
const STRENGTH_TONE = {
  bad: '[&>[data-slot=progress-indicator]]:bg-destructive',
  fair: '[&>[data-slot=progress-indicator]]:bg-warning',
  good: '[&>[data-slot=progress-indicator]]:bg-success',
} as const

/** A rough, honest signal — length dominates real passphrase strength. */
function strengthOf(passphrase: string) {
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(passphrase),
  ).length
  const score = Math.min(100, passphrase.length * 6 + classes * 8)

  if (passphrase.length < 8) {
    return { value: Math.min(score, 30), label: 'Too short', tone: STRENGTH_TONE.bad }
  }
  if (score < 55) return { value: score, label: 'Weak', tone: STRENGTH_TONE.bad }
  if (score < 80) return { value: score, label: 'Reasonable', tone: STRENGTH_TONE.fair }
  return { value: score, label: 'Strong', tone: STRENGTH_TONE.good }
}

export function LockModal({ open, onOpenChange, isLocked, onProtect, onRemove }: Props) {
  const [passphrase, setPassphrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const strength = strengthOf(passphrase)
  const mismatch = confirmation.length > 0 && confirmation !== passphrase
  const canSubmit = passphrase.length >= 8 && confirmation === passphrase && !busy

  const close = () => {
    setPassphrase('')
    setConfirmation('')
    setError(null)
    onOpenChange(false)
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await onProtect(passphrase)
      close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not protect this note.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await onRemove()
      close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        {isLocked ? (
          <>
            <DialogHeader>
              <DialogTitle>Password protection</DialogTitle>
              <DialogDescription>
                Removing protection rewrites the link so the note is readable by anyone who has it.
              </DialogDescription>
            </DialogHeader>

            <Alert>
              <Lock />
              <AlertDescription>
                This note is encrypted with AES-GCM. The link carries only ciphertext; the
                passphrase is never part of it.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Keep protected
              </Button>
              <Button variant="destructive" disabled={busy} onClick={() => void remove()}>
                <LockOpen />
                Remove protection
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Protect this note</DialogTitle>
              <DialogDescription>
                The note is encrypted in your browser with a key derived from this passphrase
                (PBKDF2, {PBKDF2_ITERATIONS.toLocaleString()} iterations). Only the salt, IV and
                ciphertext go into the link.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>
                There is no server and no recovery. Lose the passphrase and the note is unreadable —
                permanently.
              </AlertDescription>
            </Alert>

            <div className="grid gap-2">
              <Label htmlFor="passphrase">Passphrase</Label>
              <Input
                id="passphrase"
                type="password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.currentTarget.value)}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                At least 8 characters. A few unrelated words beats a short complex string.
              </p>
              {passphrase.length > 0 && (
                <div className="grid gap-1">
                  <Progress value={strength.value} className={cn('h-1', strength.tone)} />
                  <p className="text-muted-foreground text-xs">{strength.label}</p>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm passphrase</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canSubmit) void submit()
                }}
                aria-invalid={mismatch}
              />
              {mismatch && <p className="text-destructive text-xs">Passphrases do not match</p>}
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <p className="text-muted-foreground text-xs">
              Earlier entries in this tab's back history may still hold the unprotected link. Close
              the tab afterwards if that matters.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button disabled={!canSubmit} onClick={() => void submit()}>
                <Lock />
                {busy ? 'Encrypting' : 'Protect note'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
