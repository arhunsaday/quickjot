/** Turns a note title into something safe to use as a filename. */
export function slugify(title: string, fallback = 'quickjot-note'): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || fallback
}

export function downloadText(filename: string, contents: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: `${mime};charset=utf-8` }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Revoked on the next tick so the navigation has already been queued.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export interface PickedFile {
  name: string
  text: string
}

/** Opens the system file picker and resolves to null if the user cancels. */
export function pickTextFile(accept: string): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'

    const finish = (value: PickedFile | null) => {
      input.remove()
      resolve(value)
    }

    input.addEventListener('cancel', () => finish(null))
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return finish(null)
      finish({ name: file.name, text: await file.text() })
    })

    document.body.append(input)
    input.click()
  })
}
