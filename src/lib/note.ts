import type { JSONContent } from '@tiptap/core'
import type { NoteDoc } from './codec'

/** Walks a ProseMirror document and collects its text, for excerpts and counts. */
export function plainTextOf(content: JSONContent): string {
  const parts: string[] = []

  const walk = (node: JSONContent) => {
    if (typeof node.text === 'string') parts.push(node.text)
    if (node.content) {
      for (const child of node.content) walk(child)
    }
    // Blocks read as separate lines rather than running together.
    if (node.type && node.type !== 'text' && parts.at(-1) !== '\n') parts.push('\n')
  }

  walk(content)
  return parts
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function excerptOf(doc: NoteDoc, limit = 140): string {
  const text = plainTextOf(doc.content).replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text
}

export function isBlank(doc: NoteDoc): boolean {
  return doc.title.trim() === '' && plainTextOf(doc.content) === ''
}

/** The label a note is shown under once it has no title of its own. */
export function displayTitle(doc: NoteDoc): string {
  const title = doc.title.trim()
  if (title) return title
  const excerpt = excerptOf(doc, 48)
  return excerpt || 'Untitled note'
}
