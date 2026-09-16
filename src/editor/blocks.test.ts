import { getSchema } from '@tiptap/core'
import { history, undo } from '@tiptap/pm/history'
import { EditorState } from '@tiptap/pm/state'
import { describe, expect, it } from 'vitest'
import { dropBlockTransaction } from './blocks'
import { createExtensions } from './extensions'

const schema = getSchema(createExtensions({ editable: false }))
const doc = schema.nodeFromJSON({
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Before', marks: [{ type: 'bold' }] }] },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done' }] }],
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'python' },
      content: [{ type: 'text', text: 'print(1)' }],
    },
  ],
})
const initial = () => EditorState.create({ doc, plugins: [history()] })

describe('block movement', () => {
  it('moves a task list without losing checked state and undoes in one step', () => {
    let state = initial()
    const tr = dropBlockTransaction(state, doc.child(0).nodeSize, 0)
    expect(tr).not.toBeNull()
    if (!tr) return
    state = state.apply(tr)
    expect(state.doc.child(0).toJSON()).toEqual(doc.child(1).toJSON())
    expect(state.doc.child(1).toJSON()).toEqual(doc.child(0).toJSON())
    expect(
      undo(state, (transaction) => {
        state = state.apply(transaction)
      }),
    ).toBe(true)
    expect(state.doc.toJSON()).toEqual(doc.toJSON())
  })
  it('moves down while preserving code language and contents', () => {
    const tr = dropBlockTransaction(initial(), doc.child(0).nodeSize, doc.content.size)
    expect(tr?.doc.child(1).toJSON()).toEqual(doc.child(2).toJSON())
    expect(tr?.doc.child(2).toJSON()).toEqual(doc.child(1).toJSON())
  })
  it('ignores no-op drops and positions inside a block', () => {
    expect(dropBlockTransaction(initial(), 0, 0)).toBeNull()
    expect(dropBlockTransaction(initial(), 0, doc.child(0).nodeSize)).toBeNull()
    expect(dropBlockTransaction(initial(), 1, doc.content.size)).toBeNull()
    expect(dropBlockTransaction(initial(), 0, 1)).toBeNull()
    expect(dropBlockTransaction(initial(), -1, 0)).toBeNull()
    expect(dropBlockTransaction(initial(), doc.content.size, 0)).toBeNull()
  })
})
