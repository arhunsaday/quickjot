import { useCallback, useEffect, useState } from 'react'

/**
 * Clipboard write with a short "copied" flash.
 *
 * `navigator.clipboard` rejects on an insecure origin or a denied permission,
 * so `copy` reports whether it actually succeeded rather than lying to the UI.
 */
export function useCopy(timeout = 1800) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (value: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), timeout)
    return () => clearTimeout(id)
  }, [copied, timeout])

  return { copied, copy }
}
