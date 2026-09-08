import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const ORDER = ['light', 'dark', 'system'] as const
type Scheme = (typeof ORDER)[number]

const LABEL: Record<Scheme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

const ICON: Record<Scheme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

/**
 * Cycles light → dark → system. "system" is the default, so the app follows the
 * OS preference out of the box — the previous build hard-coded light mode.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const current: Scheme = ORDER.includes(theme as Scheme) ? (theme as Scheme) : 'system'
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? 'system'
  const Icon = ICON[current]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(next)}
          aria-label={`Theme: ${LABEL[current]}. Switch to ${LABEL[next].toLowerCase()}.`}
        >
          <Icon className="size-[18px]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {LABEL[current]} theme — switch to {LABEL[next].toLowerCase()}
      </TooltipContent>
    </Tooltip>
  )
}
