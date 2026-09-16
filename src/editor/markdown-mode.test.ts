import { describe, expect, it } from 'vitest'
import { markdownFormattingLosses } from './markdown-mode'

describe('Markdown source formatting warning', () => {
  it('detects rich formatting nested inside blocks and deduplicates warnings', () => {
    expect(
      markdownFormattingLosses({
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                attrs: { textAlign: 'center' },
                content: [
                  {
                    type: 'text',
                    text: 'test',
                    marks: [{ type: 'highlight' }, { type: 'underline' }],
                  },
                  { type: 'text', text: 'more', marks: [{ type: 'highlight' }] },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual(['text alignment', 'highlight', 'underline'])
  })
  it('allows standard Markdown formatting and default alignment', () => {
    expect(
      markdownFormattingLosses({
        type: 'paragraph',
        attrs: { textAlign: 'left' },
        content: [{ type: 'text', text: 'test', marks: [{ type: 'bold' }, { type: 'code' }] }],
      }),
    ).toEqual([])
  })
})
