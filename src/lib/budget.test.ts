import { describe, expect, it } from 'vitest'
import { assessUrl, PRACTICAL_MAX_CHARS, QR_MAX_CHARS } from './budget'

describe('assessUrl', () => {
  it('treats short links as unconditionally shareable', () => {
    const budget = assessUrl(400)
    expect(budget.tier).toBe('pristine')
    expect(budget.tone).toBe('ok')
    expect(budget.fitsInQr).toBe(true)
  })

  it('warns before the practical ceiling rather than at it', () => {
    expect(assessUrl(12_000).tone).toBe('warn')
    expect(assessUrl(20_000).tier).toBe('risky')
  })

  it('flags links past the practical ceiling as unshareable', () => {
    const budget = assessUrl(PRACTICAL_MAX_CHARS + 1)
    expect(budget.tier).toBe('over')
    expect(budget.tone).toBe('danger')
    expect(budget.ratio).toBe(1)
  })

  it('reports QR capacity from the real byte-mode limit', () => {
    expect(assessUrl(QR_MAX_CHARS).fitsInQr).toBe(true)
    expect(assessUrl(QR_MAX_CHARS + 1).fitsInQr).toBe(false)
  })

  it('keeps the meter ratio within bounds', () => {
    for (const length of [0, 1, 5_000, PRACTICAL_MAX_CHARS, 500_000]) {
      const { ratio } = assessUrl(length)
      expect(ratio).toBeGreaterThanOrEqual(0)
      expect(ratio).toBeLessThanOrEqual(1)
    }
  })

  it('never leaves a tier boundary unlabelled', () => {
    for (const length of [2_000, 2_001, 8_000, 8_001, 16_000, 16_001]) {
      expect(assessUrl(length).label).not.toBe('')
    }
  })
})
