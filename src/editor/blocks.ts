import { type EditorState, NodeSelection, type Transaction } from '@tiptap/pm/state'

/** Drop a whole block at a top-level document boundary in one undoable transaction. */
export function dropBlockTransaction(
  state: EditorState,
  source: number,
  target: number,
): Transaction | null {
  const { doc, tr } = state
  if (source < 0 || source >= doc.content.size || target < 0 || target > doc.content.size)
    return null
  if (doc.resolve(source).depth !== 0 || doc.resolve(target).depth !== 0) return null
  const node = doc.nodeAt(source)
  if (!node || target === source || target === source + node.nodeSize) return null
  tr.delete(source, source + node.nodeSize)
  const destination = target > source ? target - node.nodeSize : target
  tr.insert(destination, node)
  tr.setSelection(NodeSelection.create(tr.doc, destination))
  return tr.scrollIntoView()
}
