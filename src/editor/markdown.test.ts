import { MarkdownManager } from '@tiptap/markdown'
import { describe, expect, it } from 'vitest'
import { createExtensions } from './extensions'

/**
 * Markdown is a documented feature of this app, so both directions are pinned
 * here. The manager is driven directly rather than through an Editor instance:
 * parsing and serialising are pure, and this keeps the test out of the DOM.
 */
const manager = new MarkdownManager({ extensions: createExtensions({ editable: false }) })

const SOURCE = [
  '# Title',
  '',
  'Some **bold** and *italic* text with `code` and a [link](https://example.com).',
  '',
  '## Second level',
  '',
  '- first',
  '- second',
  '',
  '> quoted',
  '',
  '```typescript',
  'const x = 1',
  '```',
].join('\n')

describe('markdown parsing', () => {
  it('produces a document our schema understands', () => {
    const doc = manager.parse(SOURCE)

    expect(doc.type).toBe('doc')
    expect(Array.isArray(doc.content)).toBe(true)
    const types = (doc.content ?? []).map((node) => node.type)
    expect(types).toContain('heading')
    expect(types).toContain('paragraph')
    expect(types).toContain('bulletList')
    expect(types).toContain('blockquote')
    expect(types).toContain('codeBlock')
  })

  it('keeps the code block language, which the highlighter needs', () => {
    const doc = manager.parse(SOURCE)
    const code = (doc.content ?? []).find((node) => node.type === 'codeBlock')

    expect(code?.attrs?.language).toBe('typescript')
  })

  it('round-trips the structural essentials', () => {
    const rendered = manager.serialize(manager.parse(SOURCE))

    expect(rendered).toContain('# Title')
    expect(rendered).toContain('## Second level')
    expect(rendered).toContain('**bold**')
    expect(rendered).toContain('`code`')
    expect(rendered).toContain('[link](https://example.com)')
    expect(rendered).toContain('- first')
    expect(rendered).toContain('> quoted')
    expect(rendered).toContain('```typescript')
  })

  it('survives markdown that uses none of our block types', () => {
    expect(() => manager.parse('just a bare sentence')).not.toThrow()
  })
})
