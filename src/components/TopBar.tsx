import {
  Clock3,
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
        <span className="truncate text-sm font-medium">{title.trim() || 'Untitled note'}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
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
              {encrypted ? 'Password protection' : 'Protect with password'}
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
