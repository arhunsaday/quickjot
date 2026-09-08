/**
 * How shareable is this note's URL?
 *
 * Worth being precise about what actually constrains us. The payload lives in
 * the fragment, which is never sent to a server, so server request-line limits
 * (Apache's 8 KB, nginx's 8 KB) do not apply to *opening* a note. What does
 * bite is everything a link passes through on its way to someone else: address
 * bars, chat clients that truncate, mail clients that wrap, and QR codes. The
 * tiers below are graded against those.
 */

export type BudgetTier = 'pristine' | 'comfortable' | 'chunky' | 'risky' | 'over'

/** Byte mode in a QR code caps out here, at the lowest error correction level. */
export const QR_MAX_CHARS = 2953

/** Past this, links break widely enough that we stop calling them shareable. */
export const PRACTICAL_MAX_CHARS = 32_000

interface Tier {
  tier: BudgetTier
  limit: number
  label: string
  tone: 'ok' | 'warn' | 'danger'
}

const TIERS: Tier[] = [
  { tier: 'pristine', limit: 2_000, label: 'fits anywhere', tone: 'ok' },
  { tier: 'comfortable', limit: 8_000, label: 'comfortably shareable', tone: 'ok' },
  { tier: 'chunky', limit: 16_000, label: 'fine for most apps', tone: 'warn' },
  { tier: 'risky', limit: PRACTICAL_MAX_CHARS, label: 'some apps may truncate this', tone: 'warn' },
]

const OVER: Tier = {
  tier: 'over',
  limit: Number.POSITIVE_INFINITY,
  label: 'too long to share reliably',
  tone: 'danger',
}

export interface Budget {
  /** Length of the whole URL, which is what sharing surfaces actually measure. */
  chars: number
  tier: BudgetTier
  label: string
  tone: 'ok' | 'warn' | 'danger'
  /** 0–1 against the practical ceiling, for the meter. */
  ratio: number
  fitsInQr: boolean
}

export function assessUrl(urlLength: number): Budget {
  const matched = TIERS.find((tier) => urlLength <= tier.limit) ?? OVER
  return {
    chars: urlLength,
    tier: matched.tier,
    label: matched.label,
    tone: matched.tone,
    ratio: Math.min(1, urlLength / PRACTICAL_MAX_CHARS),
    fitsInQr: urlLength <= QR_MAX_CHARS,
  }
}
