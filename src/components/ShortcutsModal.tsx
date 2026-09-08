import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const IS_APPLE = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
const MOD = IS_APPLE ? '⌘' : 'Ctrl'

const GROUPS: Array<{ heading: string; rows: Array<[string, string]> }> = [
  {
    heading: 'Note',
    rows: [
      [`${MOD} + S`, 'Save to the URL and add a history point'],
      [`${MOD} + Shift + S`, 'Open share options'],
      [`${MOD} + Shift + H`, 'Open your local note history'],
      [`${MOD} + Shift + F`, 'Toggle focus mode'],
      [`${MOD} + /`, 'Show this list'],
    ],
  },
  {
    heading: 'Writing',
    rows: [
      ['/', 'Insert a heading, list, quote, code block or divider'],
      [`${MOD} + B`, 'Bold'],
      [`${MOD} + I`, 'Italic'],
      [`${MOD} + U`, 'Underline'],
      [`${MOD} + Shift + X`, 'Strikethrough'],
      [`${MOD} + E`, 'Inline code'],
      [`${MOD} + Z`, 'Undo'],
      [`${MOD} + Shift + Z`, 'Redo'],
    ],
  },
  {
    heading: 'Markdown while typing',
    rows: [
      ['# ', 'Heading (## and ### too)'],
      ['- ', 'Bulleted list'],
      ['1. ', 'Numbered list'],
      ['> ', 'Quote'],
      ['``` ', 'Code block'],
      ['---', 'Divider'],
    ],
  },
]

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="bg-muted text-muted-foreground inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium">
      {children}
    </kbd>
  )
}

export function ShortcutsModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Blocks come from the <Kbd>/</Kbd> menu; formatting appears when you select text.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="grid gap-5">
            {GROUPS.map((group) => (
              <div key={group.heading} className="grid gap-2">
                <h3 className="text-sm font-semibold">{group.heading}</h3>
                <dl className="grid gap-1.5">
                  {group.rows.map(([keys, description]) => (
                    <div key={keys} className="grid grid-cols-[150px_1fr] items-center gap-3">
                      <dt>
                        <Kbd>{keys}</Kbd>
                      </dt>
                      <dd className="text-muted-foreground text-sm">{description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
