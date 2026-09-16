const KEY = 'quickjot:collaborator:v1'
export function collaborator(fallback: string) {
  try {
    const value = localStorage.getItem(KEY)
    if (value?.trim()) return value.slice(0, 40)
  } catch {
    /* Optional preference. */
  }
  return fallback
}
export function saveCollaborator(name: string) {
  try {
    localStorage.setItem(KEY, name.trim().slice(0, 40))
  } catch {
    /* Optional preference. */
  }
}
