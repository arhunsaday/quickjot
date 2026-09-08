import { cn } from 'cn'
import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { type Budget, PRACTICAL_MAX_CHARS } from '@/lib/budget'
import { formatBytes, formatRelative } from '@/lib/format'

interface Props {
  budget: Budget
  savedAt: number | null
  dirty: boolean
  words: number
  characters: number
  encrypted: boolean
}

const METER_COLOR = {
  ok: '[&>[data-slot=progress-indicator]]:bg-success',
  warn: '[&>[data-slot=progress-indicator]]:bg-warning',
  danger: '[&>[data-slot=progress-indicator]]:bg-destructive',
} as const

const TEXT_COLOR = {
  ok: 'text-muted-foreground',
  warn: 'text-warning',
  danger: 'text-destructive',
} as const

/** Re-renders on a slow tick so "saved 2m ago" stays true without polling. */
function useTick(intervalMs: number) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}

export function StatusBar({ budget, savedAt, dirty, words, characters, encrypted }: Props) {
  useTick(15_000)

  const saveLabel = dirty
    ? 'Unsaved changes'
    : savedAt
      ? `Saved ${formatRelative(savedAt)}`
      : 'Nothing to save yet'

  return (
    <div className="bg-background/80 flex items-center justify-between gap-6 border-t px-4 py-1.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={cn(
            'size-[7px] shrink-0 rounded-full transition-colors',
            dirty ? 'bg-pencil' : savedAt ? 'bg-success' : 'bg-muted-foreground/50',
          )}
        />
        <span className="text-muted-foreground truncate text-xs" aria-live="polite">
          {saveLabel}
        </span>
        {encrypted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock className="text-muted-foreground size-3 shrink-0" />
            </TooltipTrigger>
            <TooltipContent>Password protected</TooltipContent>
          </Tooltip>
        )}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground truncate text-xs">
              <span className={cn('font-semibold', TEXT_COLOR[budget.tone])}>
                {formatBytes(budget.chars)}
              </span>
              {/* The tier wording is the first thing to go on a narrow screen —
                  the size and the meter still carry the meaning. */}
              <span className="hidden sm:inline"> · {budget.label}</span>
            </span>
            <Progress
              value={budget.ratio * 100}
              aria-label="Share URL length"
              className={cn('h-1.5 w-[72px]', METER_COLOR[budget.tone])}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px]">
          This note's link is {budget.chars.toLocaleString()} characters long. Under{' '}
          {PRACTICAL_MAX_CHARS.toLocaleString()} it stays shareable through most chat and mail
          clients.
        </TooltipContent>
      </Tooltip>

      <span className="text-muted-foreground hidden truncate text-xs sm:inline">
        {words.toLocaleString()} {words === 1 ? 'word' : 'words'} · {characters.toLocaleString()}{' '}
        characters
      </span>
    </div>
  )
}
