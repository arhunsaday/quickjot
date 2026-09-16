import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { cn } from 'cn'
import { FileCode2, Hash, Keyboard, Plus, ShieldCheck, Type } from 'lucide-react'
import type { WritingPreferences } from '@/lib/writing-preferences'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/button'

function Outline({ editor, onNavigate }: { editor: Editor; onNavigate: (pos: number) => void }) {
  const items = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      const headings: { pos: number; level: number; text: string }[] = []
      instance.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading')
          headings.push({
            pos,
            level: node.attrs.level,
            text: node.textContent,
          })
      })
      const current = headings
        .filter((item) => item.pos <= instance.state.selection.from)
        .at(-1)?.pos
      return { headings, current }
    },
  })
  return (
    <nav aria-label="Document outline" className="space-y-0.5">
      {items.headings.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed px-3 py-4 text-xs leading-relaxed">
          Your headings will appear here.
          <br />
          <span className="text-foreground/70">Type / to add a section.</span>
        </div>
      ) : (
        items.headings.map((heading) => (
          <button
            key={heading.pos}
            type="button"
            aria-current={heading.pos === items.current ? 'location' : undefined}
            className={cn(
              'qj-sidebar-item group w-full text-left',
              heading.pos === items.current && 'bg-accent text-foreground',
            )}
            style={{ paddingLeft: 10 + (heading.level - 1) * 10 }}
            onClick={() => onNavigate(heading.pos)}
          >
            <Hash className="text-muted-foreground size-3.5 shrink-0" />
            <span className="truncate">{heading.text || 'Untitled section'}</span>
          </button>
        ))
      )}
    </nav>
  )
}

export function WorkspaceSidebar({
  markdownMode,
  onModeChange,
  editor,
  onNewNote,
  onShortcuts,
  onNavigate,
}: {
  editor: Editor | null
  title: string
  markdownMode: boolean
  onModeChange: (markdown: boolean) => void
  onHistory: () => void
  onNewNote: () => void
  onPreferences: () => void
  onShortcuts: () => void
  onNavigate: (pos: number) => void
  preferences: WritingPreferences
  onPreferencesChange: (value: WritingPreferences) => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <div className="bg-background flex size-9 items-center justify-center rounded-xl border shadow-xs">
          <img src="/quickjot.png" alt="" width={24} height={24} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold tracking-tight">QuickJot</p>
          <p className="text-muted-foreground mt-0.5 text-[11px]">A little space to think</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Create new note"
          title="New note"
          onClick={onNewNote}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {/* Temporarily disabled to clean ui */}
        {/* <nav aria-label="Workspace navigation" className="space-y-1">
          <div className="qj-sidebar-item border border-border/70 bg-background text-foreground shadow-xs">
            <FileText className="text-primary size-4" />
            <span className="min-w-0 flex-1 truncate font-medium">
              {title.trim() || "Untitled note"}
            </span>
            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[9px] font-medium">
              OPEN
            </span>
          </div>
          <button
            type="button"
            className="qj-sidebar-item w-full"
            onClick={onHistory}
          >
            <Clock3 className="size-4" />
            <span className="flex-1 text-left">Recent notes</span>
            <ChevronRight className="size-3.5 opacity-50" />
          </button>
        </nav> */}
        <section aria-label="Editor mode">
          <p className="qj-sidebar-label">Editor</p>
          <div className="bg-muted/70 grid grid-cols-2 gap-1 rounded-xl border p-1">
            <button
              type="button"
              aria-pressed={!markdownMode}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors',
                !markdownMode
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onModeChange(false)}
            >
              <Type className="size-3.5" />
              Rich text
            </button>
            <button
              type="button"
              aria-pressed={markdownMode}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors',
                markdownMode
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onModeChange(true)}
            >
              <FileCode2 className="size-3.5" />
              Markdown
            </button>
          </div>
        </section>
        <section>
          {/* <p className="qj-sidebar-label">On this page</p> */}
          {editor && <Outline editor={editor} onNavigate={onNavigate} />}
        </section>
      </div>
      <div className="space-y-3 px-3 pb-3">
        {/* <section className="bg-background/70 rounded-xl border p-3">
          <button
            type="button"
            onClick={onPreferences}
            className="mb-3 flex w-full items-center gap-2 text-left text-xs font-medium"
          >
            <SlidersHorizontal className="text-muted-foreground size-3.5" />
            Writing setup
            <ChevronRight className="text-muted-foreground ml-auto size-3.5" />
          </button>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-muted-foreground text-[10px]">
              Font
              <select
                aria-label="Sidebar writing font"
                className="qj-sidebar-select"
                value={preferences.font}
                onChange={(e) =>
                  onPreferencesChange({
                    ...preferences,
                    font: e.target.value as WritingPreferences['font'],
                  })
                }
              >
                <option value="sans">Sans serif</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
            </label>
            <label className="text-muted-foreground text-[10px]">
              Page width
              <select
                aria-label="Sidebar page width"
                className="qj-sidebar-select"
                value={preferences.width}
                onChange={(e) =>
                  onPreferencesChange({
                    ...preferences,
                    width: e.target.value as WritingPreferences['width'],
                  })
                }
              >
                <option value="narrow">Narrow</option>
                <option value="comfortable">Regular</option>
                <option value="wide">Wide</option>
              </select>
            </label>
          </div>
        </section> */}
        <div className="flex items-center gap-2 rounded-xl px-2 py-1">
          <div className="bg-success/10 text-success flex size-8 items-center justify-center rounded-lg">
            <ShieldCheck className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium">Local & private</p>
            <p className="text-muted-foreground text-[10px]">Your note lives in its link</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-2 py-2 text-xs"
            onClick={onShortcuts}
          >
            <Keyboard className="size-3.5" />
            Shortcuts
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
