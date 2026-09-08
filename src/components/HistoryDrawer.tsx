import { cn } from 'cn'
import { Clock, Lock, NotebookPen, Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatBytes, formatRelative } from '@/lib/format'
import type { HistoryEntry } from '@/lib/history'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: HistoryEntry[]
  currentId: string
  onOpenNote: (payload: string) => void
  onNewNote: () => void
  onForget: (id: string) => void
  onClearAll: () => void
}

/**
 * The local index of notes you have opened.
 *
 * This list never leaves the device. A protected note is listed without its
 * text — what sits in storage for it is ciphertext, and putting a readable
 * summary next to that would defeat the point.
 */
export function HistoryDrawer({
  open,
  onOpenChange,
  entries,
  currentId,
  onOpenNote,
  onNewNote,
  onForget,
  onClearAll,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            Your notes
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 pb-2">
          <Button variant="secondary" className="w-full" onClick={onNewNote}>
            <Plus />
            New note
          </Button>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <NotebookPen className="text-muted-foreground/50 size-7" />
            <p className="text-sm font-medium">No notes yet</p>
            <p className="text-muted-foreground text-xs">
              Notes you open are listed here so a closed tab is never the end of them. This list is
              kept on this device only.
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <ul className="grid gap-1 p-2">
              {entries.map((entry) => {
                const isCurrent = entry.id === currentId
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      'group hover:bg-accent/60 flex items-start gap-1 rounded-md p-2',
                      isCurrent && 'bg-accent',
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-default text-left disabled:cursor-default"
                      onClick={() => onOpenNote(entry.payload)}
                      disabled={isCurrent}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {entry.encrypted && (
                          <Lock className="text-muted-foreground size-3 shrink-0" />
                        )}
                        <span className="truncate text-sm font-medium">
                          {entry.title || 'Untitled note'}
                        </span>
                        {isCurrent && (
                          <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                            open
                          </Badge>
                        )}
                      </span>

                      {entry.excerpt && (
                        <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">
                          {entry.excerpt}
                        </span>
                      )}

                      <span className="text-muted-foreground mt-1 block text-xs">
                        {formatRelative(entry.updatedAt)} · {formatBytes(entry.chars)}
                      </span>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${entry.title} from history`}
                      onClick={() => onForget(entry.id)}
                      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X />
                    </Button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}

        {entries.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t p-3">
            <span className="text-muted-foreground text-xs">
              {entries.length} {entries.length === 1 ? 'note' : 'notes'} on this device
            </span>
            <Button variant="ghost" size="xs" className="text-destructive" onClick={onClearAll}>
              <Trash2 />
              Clear list
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
