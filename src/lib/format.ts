const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'narrow' })

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 1000],
  ['minute', 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['year', 365 * 24 * 60 * 60 * 1000],
]

/** "just now" / "3m ago" — far easier to read at a glance than a timestamp. */
export function formatRelative(timestamp: number, now = Date.now()): string {
  const elapsed = now - timestamp
  if (elapsed < 5000) return 'just now'

  let chosen: [Intl.RelativeTimeFormatUnit, number] = UNITS[0] as [
    Intl.RelativeTimeFormatUnit,
    number,
  ]
  for (const unit of UNITS) {
    if (Math.abs(elapsed) >= unit[1]) chosen = unit
  }
  return relative.format(-Math.round(elapsed / chosen[1]), chosen[0])
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
