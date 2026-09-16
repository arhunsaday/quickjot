import type { ComponentProps } from 'react'
import { Check } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { cn } from 'cn'

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn('peer border-input bg-background size-4 shrink-0 rounded-[4px] border shadow-xs outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-default disabled:opacity-70 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground', className)} {...props}>
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current"><Check className="size-3.5" strokeWidth={3} /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
