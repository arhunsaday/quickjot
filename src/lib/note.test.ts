import { describe, expect, it } from 'vitest'
import type { NoteDoc } from './codec'
import { displayTitle, excerptOf, isBlank, plainTextOf } from './note'

const docWith = (content: NoteDoc['content'], title = ''): NoteDoc => ({
  id: 'test',
  title,
  content,
})

describe('plainTextOf', () => {
  it('collects text across nested nodes', () => {
    const text = plainTextOf({
      type: 'doc',
      content: [
        { type: 'heading', content: [{ type: 'text', text: 'Title' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
            },
          ],
        },
      ],
    })

    expect(text).toContain('Title')
    expect(text).toContain('One')
  })

  it('keeps blocks on separate lines rather than running them together', () => {
    const text = plainTextOf({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      ],
    })

    expect(text).not.toContain('FirstSecond')
  })

  it('returns an empty string for an empty document', () => {
    expect(plainTextOf({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('')
  })
})

describe('excerptOf', () => {
  it('truncates with an ellipsis and respects the limit', () => {
    const doc = docWith({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'word '.repeat(80) }] }],
    })

    const excerpt = excerptOf(doc, 40)
    expect(excerpt.length).toBeLessThanOrEqual(40)
    expect(excerpt.endsWith('…')).toBe(true)
  })

  it('leaves short text untouched', () => {
    const doc = docWith({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Short note' }] }],
    })

    expect(excerptOf(doc)).toBe('Short note')
  })
})

describe('isBlank / displayTitle', () => {
  const empty = docWith({ type: 'doc', content: [{ type: 'paragraph' }] })

  it('treats an untitled, wordless note as blank', () => {
    expect(isBlank(empty)).toBe(true)
  })

  it('is not blank once there is a title', () => {
    expect(isBlank({ ...empty, title: 'Groceries' })).toBe(false)
  })

  it('is not blank once there is body text', () => {
    expect(
      isBlank(
        docWith({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
        }),
      ),
    ).toBe(false)
  })

  it('falls back from title to body text to a placeholder', () => {
    expect(displayTitle({ ...empty, title: 'Real title' })).toBe('Real title')
    expect(
      displayTitle(
        docWith({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body text' }] }],
        }),
      ),
    ).toBe('Body text')
    expect(displayTitle(empty)).toBe('Untitled note')
  })

  it('ignores whitespace-only titles', () => {
    expect(displayTitle({ ...empty, title: '   ' })).toBe('Untitled note')
  })
})
