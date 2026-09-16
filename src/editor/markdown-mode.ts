import type { JSONContent } from '@tiptap/core'

/** These rich formatting features have no faithful representation in our Markdown dialect. */
export function markdownFormattingLosses(content: JSONContent): string[] {
  const losses = new Set<string>()
  const labels: Record<string, string> = {
    underline: 'underline',
    highlight: 'highlight',
    subscript: 'subscript',
    superscript: 'superscript',
  }
  const walk = (node: JSONContent) => {
    if (node.attrs?.textAlign && node.attrs.textAlign !== 'left') losses.add('text alignment')
    for (const mark of node.marks ?? [])
      if (labels[mark.type]) losses.add(labels[mark.type] as string)
    for (const child of node.content ?? []) walk(child)
  }
  walk(content)
  return [...losses]
}
