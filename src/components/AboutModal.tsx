import { Link2, LockKeyhole, NotebookPen, WifiOff } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'

export function AboutModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-[480px]">
        <div className="bg-primary/10 text-primary mb-1 flex size-12 items-center justify-center rounded-2xl">
          <NotebookPen className="size-6" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight">A little space to think.</DialogTitle>
          <DialogDescription className="leading-relaxed">
            QuickJot is a private notepad you can share with a link. No account, no database, just
            your ideas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex gap-3">
            <Link2 className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">The link is the document</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Your note is compressed into the URL. Copy the link to keep it or share a read-only
                snapshot. Edits create an updated link; previously shared links keep their original
                version.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <LockKeyhole className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Your words stay with you</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                The app host never receives your note. Anyone with its link can read it unless you
                add password protection. Recent notes and writing preferences stay on this device.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <WifiOff className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Write anywhere</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Works offline after the app is cached. Use / for blocks, select text to format it,
                or switch to Markdown. Download your note whenever you like.
              </p>
            </div>
          </div>
        </div>
        <Button className="rounded-lg" onClick={() => onOpenChange(false)}>
          Back to writing
        </Button>
      </DialogContent>
    </Dialog>
  )
}
