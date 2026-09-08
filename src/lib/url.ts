export type ViewMode = 'edit' | 'read'

const READ_PARAM = 'view'
const READ_VALUE = 'read'

export interface LocationState {
  /** base64url envelope from the fragment, or '' for a fresh note. */
  payload: string
  mode: ViewMode
}

export function readLocation(): LocationState {
  const params = new URLSearchParams(window.location.search)
  return {
    payload: window.location.hash.replace(/^#/, ''),
    mode: params.get(READ_PARAM) === READ_VALUE ? 'read' : 'edit',
  }
}

export function noteUrl(payload: string, mode: ViewMode = 'edit'): string {
  const url = new URL(window.location.href)
  url.search = mode === 'read' ? `?${READ_PARAM}=${READ_VALUE}` : ''
  url.hash = payload ? `#${payload}` : ''
  return url.toString()
}

/**
 * Autosave replaces the current entry; an explicit save pushes a new one.
 *
 * This matters: the old build pushed on every debounced keystroke, which meant
 * a minute of typing buried the page the reader arrived from under ~60 history
 * entries and made the back button useless. Only a deliberate save deserves to
 * become a point you can navigate back to.
 */
export function writeUrl(payload: string, mode: ViewMode, options: { push?: boolean } = {}): void {
  const next = noteUrl(payload, mode)
  if (next === window.location.href) return

  if (options.push) {
    window.history.pushState(null, '', next)
  } else {
    window.history.replaceState(null, '', next)
  }
}

/**
 * Opens another note in place.
 *
 * The app reloads a note in response to `popstate`, so dispatching one after
 * the push keeps history navigation and in-app navigation on the same path
 * instead of forcing a full page load.
 */
export function navigateToNote(payload: string): void {
  window.history.pushState(null, '', noteUrl(payload, 'edit'))
  window.dispatchEvent(new PopStateEvent('popstate'))
}
