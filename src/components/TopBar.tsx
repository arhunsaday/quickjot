import {
  Clock3,
  Cloud,
  Download,
  EllipsisVertical,
  FileCode2,
  FileDown,
  FileInput,
  Info,
  Keyboard,
  Lock,
  LockOpen,
  Maximize2,
  PanelLeft,
  Save,
  Share2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  people: { id: number; name: string; color: string }[]
  live: boolean
  onStorage: () => void
  onAI: () => void
  title: string
  sidebarExpanded: boolean
  onAbout: () => void
  encrypted: boolean
  markdownMode: boolean
  onSave: () => void
  onShare: () => void
  onHistory: () => void
  onLock: () => void
  onExportMarkdown: () => void
  onExportHtml: () => void
  onImport: () => void
  onShortcuts: () => void
  onFocusMode: () => void
  onSidebarToggle: () => void
  onMarkdownMode: () => void
  onWritingPreferences: () => void
}

export function TopBar({
  people,
  live,
  onStorage,
  onAI,
  title,
  sidebarExpanded,
  onAbout,
  encrypted,
  markdownMode,
  onSave,
  onShare,
  onHistory,
  onLock,
  onExportMarkdown,
  onExportHtml,
  onImport,
  onShortcuts,
  onFocusMode,
  onSidebarToggle,
  onMarkdownMode,
  onWritingPreferences,
}: Props) {
  return (
    <header className="qj-no-print flex h-[68px] shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              aria-label="Toggle editor sidebar"
              aria-controls="editor-sidebar"
              aria-expanded={sidebarExpanded}
              onClick={onSidebarToggle}
            >
              <PanelLeft className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editor sidebar</TooltipContent>
        </Tooltip>
        <div className="bg-border hidden h-5 w-px sm:block" />
        <Button
          variant="ghost"
          size="sm"
          className="rounded-lg text-xs shrink-0"
          onClick={onStorage}
        >
          <Cloud className="size-3.5" />
          <span className="hidden md:inline">{live ? 'Live note' : 'Link snapshot'}</span>
        </Button>
        <span className="truncate text-sm font-medium">{title.trim() || 'Untitled note'}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {live && people.length > 0 && (
          <button
            type="button"
            onClick={onStorage}
            aria-label="Collaborators and your name"
            className="hidden sm:flex items-center -space-x-1.5 mr-1"
          >
            {people.slice(0, 3).map((person) => (
              <span
                key={person.id}
                title={person.name}
                style={{ backgroundColor: person.color }}
                className="flex size-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-medium text-white"
              >
                {person.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {people.length > 3 && (
              <span className="rounded-full bg-muted text-[10px] p-1">+{people.length - 3}</span>
            )}
          </button>
        )}

        <Button
          variant="ghost"
          size="sm"
          aria-label="Write with AI"
          className="rounded-lg"
          onClick={onAI}
        >
          <Sparkles className="size-4" />
          <span className="hidden sm:inline">AI</span>
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hidden rounded-lg sm:inline-flex"
              aria-label="Save note"
              onClick={onSave}
            >
              <Save className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save note</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="rounded-lg" aria-label="More actions">
              <EllipsisVertical className="size-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
            <DropdownMenuLabel>Document</DropdownMenuLabel>
            <DropdownMenuItem onClick={onSave}>
              <Save />
              Save note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLock}>
              {encrypted ? <Lock /> : <LockOpen />}
              {live
                ? 'Sharing & storage'
                : encrypted
                  ? 'Password protection'
                  : 'Protect with password'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onHistory}>
              <Clock3 />
              Recent notes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Import & export</DropdownMenuLabel>
            <DropdownMenuItem onClick={onImport}>
              <FileInput />
              Open a .md or .html file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportMarkdown}>
              <Download />
              Download Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportHtml}>
              <FileDown />
              Download HTML
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Writing</DropdownMenuLabel>
            <DropdownMenuItem onClick={onMarkdownMode}>
              <FileCode2 />
              {markdownMode ? 'Switch to rich text' : 'Edit Markdown source'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onWritingPreferences}>
              <SlidersHorizontal />
              Writing preferences
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFocusMode}>
              <Maximize2 />
              Focus mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShortcuts}>
              <Keyboard />
              Keyboard shortcuts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              aria-label="About QuickJot"
              onClick={onAbout}
            >
              <Info className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>About QuickJot</TooltipContent>
        </Tooltip>
        <Button
          size="sm"
          onClick={onShare}
          className="rounded-lg px-3 shadow-xs"
          aria-label="Share note"
        >
          <Share2 className="size-3.5" />
          <span>
            Share<span className="hidden sm:inline"> link</span>
          </span>
        </Button>
      </div>
    </header>
  )
}
