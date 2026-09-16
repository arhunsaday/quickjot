import { useEffect, useState } from 'react'
import type { LiveSession } from '@/lib/live'

export function useLiveStatus(live?: LiveSession) {
  const [status, setStatus] = useState('Connecting…')
  const [blocked, setBlocked] = useState(false)
  const [people, setPeople] = useState<{ id: number; name: string; color: string }[]>([])
  useEffect(() => {
    if (!live) return
    const provider = live.provider
    let denied = false
    const refresh = () => {
      if (!denied && live.expires <= Date.now()) {
        denied = true
        setBlocked(true)
        provider.disconnect()
      }
      setStatus(
        denied
          ? 'Access unavailable · export your draft'
          : provider.configuration.websocketProvider.status !== 'connected'
            ? 'Offline · waiting to sync'
            : !provider.isSynced
              ? 'Syncing…'
              : provider.unsyncedChanges > 0
                ? 'Saving…'
                : 'Saved to live note',
      )
    }
    const failed = () => {
      denied = true
      setBlocked(true)
      refresh()
      provider.disconnect()
    }
    const authenticated = () => {
      denied = false
      setBlocked(false)
      refresh()
    }
    const timer = setInterval(refresh, 15000)
    const awareness = () =>
      setPeople(
        Array.from(provider.awareness?.getStates().entries() || [])
          .filter(
            ([, value]) =>
              typeof value.user?.name === 'string' && typeof value.user?.color === 'string',
          )
          .map(([id, value]) => ({
            id,
            name: value.user.name.slice(0, 40),
            color: value.user.color,
          })),
      )
    provider.on('authenticated', authenticated)
    provider.on('status', refresh)
    provider.on('synced', refresh)
    provider.on('unsyncedChanges', refresh)
    provider.on('authenticationFailed', failed)
    provider.on('awarenessChange', awareness)
    refresh()
    awareness()
    return () => {
      clearInterval(timer)
      provider.off('authenticated', authenticated)
      provider.off('status', refresh)
      provider.off('synced', refresh)
      provider.off('unsyncedChanges', refresh)
      provider.off('authenticationFailed', failed)
      provider.off('awarenessChange', awareness)
    }
  }, [live])
  return { status, blocked, people }
}
