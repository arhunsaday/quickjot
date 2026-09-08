import { cn } from 'cn'
import {
  Clock,
  Download,
  FileCode2,
  FileInput,
  Keyboard,
  Lock,
  LockOpen,
  Maximize2,
  Save,
  Share2,
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
import { BrandMark } from './BrandMark'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  encrypted: boolean
  onSave: () => void
  onShare: () => void
  onHistory: () => void
  onLock: () => void
  onExportMarkdown: () => void
  onExportHtml: () => void
  onImport: () => void
  onShortcuts: () => void
  onFocusMode: () => void
}

export function TopBar({
  encrypted,
  onSave,
  onShare,
  onHistory,
  onLock,
  onExportMarkdown,
  onExportHtml,
  onImport,
  onShortcuts,
  onFocusMode,
}: Props) {
  return (
    <header className="bg-background/80 qj-no-print sticky top-0 z-40 flex items-center justify-between gap-2 border-b px-4 py-2 backdrop-blur-md">
      <BrandMark />

      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Save note" onClick={onSave}>
              <Save className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save a history point</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open note history" onClick={onHistory}>
              <Clock className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Your notes on this device</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={encrypted ? 'Manage password protection' : 'Protect this note'}
              onClick={onLock}
              className={cn(encrypted && 'text-primary bg-primary/10 hover:bg-primary/15')}
            >
              {encrypted ? <Lock className="size-[18px]" /> : <LockOpen className="size-[18px]" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {encrypted ? 'Password protected' : 'Protect with a password'}
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <Download className="size-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuItem onClick={onExportMarkdown}>
              <FileCode2 />
              Download as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportHtml}>
              <FileCode2 />
              Download as HTML
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Import</DropdownMenuLabel>
            <DropdownMenuItem onClick={onImport}>
              <FileInput />
              Open a .md or .html file
            </DropdownMenuItem>

            <DropdownMenuSeparator />
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

        <ThemeToggle />

        <Button onClick={onShare} className="ml-1" aria-label="Share note">
          <Share2 />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </div>
    </header>
  )
}
