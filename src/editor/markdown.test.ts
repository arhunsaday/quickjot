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

describe('task list Markdown', () => {
  it('preserves checked states and nested tasks through a round trip', () => {
    const source = '- [ ] Parent\n  - [x] Child\n- [x] Complete'
    const parsed = manager.parse(source)
    const list = parsed.content?.[0]
    expect(list?.type).toBe('taskList')
    expect(list?.content?.[0]?.attrs?.checked).toBe(false)
    expect(list?.content?.[1]?.attrs?.checked).toBe(true)
    const nested = list?.content?.[0]?.content?.find((node) => node.type === 'taskList')
    expect(nested?.content?.[0]?.attrs?.checked).toBe(true)
    expect(manager.parse(manager.serialize(parsed))).toEqual(parsed)
  })

  it('retains code text and language alongside task lists', () => {
    const parsed = manager.parse('- [x] Done\n\n```python\nprint("hello")\nprint(2)\n```')
    expect(manager.parse(manager.serialize(parsed))).toEqual(parsed)
  })
})

describe('collapsible sections', () => {
  it('keeps the summary and nested content through Markdown', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'details',
          attrs: { open: true },
          content: [
            { type: 'detailsSummary', content: [{ type: 'text', text: 'Section title' }] },
            {
              type: 'detailsContent',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hidden content' }] }],
            },
          ],
        },
      ],
    }
    const restored = manager.parse(manager.serialize(doc))
    expect(restored.content?.[0]?.type).toBe('details')
    expect(JSON.stringify(restored)).toContain('Section title')
    expect(JSON.stringify(restored)).toContain('Hidden content')
  })
})
