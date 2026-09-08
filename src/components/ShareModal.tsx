import { Check, Copy, ExternalLink, Lock, QrCode, TriangleAlert } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCopy } from '@/hooks/use-copy'
import { assessUrl, QR_MAX_CHARS } from '@/lib/budget'
import { formatBytes } from '@/lib/format'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editUrl: string
  readUrl: string
  encrypted: boolean
}

type LinkKind = 'edit' | 'read'
type QrState = { status: 'idle' | 'busy' | 'ready' | 'failed'; src?: string }

export function ShareModal({ open, onOpenChange, editUrl, readUrl, encrypted }: Props) {
  const [kind, setKind] = useState<LinkKind>('edit')
  const url = kind === 'edit' ? editUrl : readUrl
  const budget = assessUrl(url.length)

  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  const { copied, copy } = useCopy()
  const [qr, setQr] = useState<QrState>({ status: 'idle' })

  useEffect(() => {
    if (!open) return
    if (!budget.fitsInQr) {
      setQr({ status: 'failed' })
      return
    }

    let cancelled = false
    setQr({ status: 'busy' })

    // Loaded on demand: most sessions never open this dialog.
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, {
          errorCorrectionLevel: 'L',
          margin: 1,
          width: 220,
          color: dark
            ? { dark: '#e8e8e8ff', light: '#00000000' }
            : { dark: '#18181bff', light: '#00000000' },
        }),
      )
      .then(
        (src) => {
          if (!cancelled) setQr({ status: 'ready', src })
        },
        () => {
          if (!cancelled) setQr({ status: 'failed' })
        },
      )

    return () => {
      cancelled = true
    }
  }, [open, url, dark, budget.fitsInQr])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share this note</DialogTitle>
          <DialogDescription>
            {kind === 'edit'
              ? 'The whole note travels inside the link. Anyone with it can read and edit their own copy — nothing is stored on a server.'
              : 'Opens as a clean page with no editing tools. The note is still inside the link, so a determined reader can always switch to editing.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={kind} onValueChange={(value) => setKind(value as LinkKind)}>
          <TabsList className="w-full">
            <TabsTrigger value="edit" className="flex-1">
              Editable
            </TabsTrigger>
            <TabsTrigger value="read" className="flex-1">
              Read-only
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Input
            value={url}
            readOnly
            aria-label="Note link"
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button
            variant="secondary"
            size="icon"
            aria-label="Copy link"
            onClick={() => void copy(url)}
          >
            {copied ? <Check className="text-success" /> : <Copy />}
          </Button>
        </div>

        {encrypted && (
          <Alert>
            <Lock />
            <AlertDescription>
              This note is password protected. Send the passphrase separately — never in the same
              message as the link.
            </AlertDescription>
          </Alert>
        )}

        {budget.tone !== 'ok' && (
          <Alert variant={budget.tone === 'danger' ? 'destructive' : 'default'}>
            <TriangleAlert />
            <AlertDescription>
              This link is {formatBytes(budget.chars)} — {budget.label}. Shorten the note, or export
              it as a file instead.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-muted/40 flex min-h-[212px] items-center justify-center rounded-lg border border-dashed p-4">
          {qr.status === 'ready' && qr.src ? (
            <div className="flex flex-col items-center gap-2">
              <img src={qr.src} alt={`QR code for the ${kind} link`} width={220} height={220} />
              <p className="text-muted-foreground text-xs">
                Point a phone camera at this to open the note
              </p>
            </div>
          ) : qr.status === 'busy' ? (
            <div className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-4 text-center">
              <QrCode className="text-muted-foreground/50 size-7" />
              <p className="text-sm font-medium">Too long for a QR code</p>
              <p className="text-muted-foreground max-w-[320px] text-xs">
                QR codes hold about {QR_MAX_CHARS.toLocaleString()} characters; this link needs{' '}
                {budget.chars.toLocaleString()}. Copy the link or export the note as a file instead.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => window.open(readUrl, '_blank', 'noopener')}>
            <ExternalLink />
            Preview read-only
          </Button>
          <Button onClick={() => void copy(url)}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
