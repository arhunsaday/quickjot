const KEY = 'quickjot:sidebar-open:v1'

/** Missing or unavailable storage starts with the writing canvas unobstructed. */
export function readSidebarPreference(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export function storeSidebarPreference(open: boolean): void {
  try {
    localStorage.setItem(KEY, String(open))
  } catch {
    /* The toggle still works when browser storage is unavailable. */
  }
}
