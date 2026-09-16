import { TaskItem } from '@tiptap/extension-list'
import {
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import { Checkbox } from '@/components/ui/checkbox'

function TaskItemView({ node, editor, updateAttributes }: ReactNodeViewProps) {
  const label = node.firstChild?.textContent || 'Untitled task'
  return (
    <NodeViewWrapper className="qj-task-row">
      <span contentEditable={false} className="qj-task-toggle">
        <Checkbox
          aria-label={`Task: ${label}`}
          checked={Boolean(node.attrs.checked)}
          disabled={!editor.isEditable}
          onCheckedChange={(checked) => updateAttributes({ checked: checked === true })}
        />
      </span>
      <NodeViewContent className="qj-task-content" />
    </NodeViewWrapper>
  )
}

export const EnhancedTaskItem = TaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemView, {
      as: 'li',
      attrs: ({ node }) => ({
        'data-type': 'taskItem',
        'data-checked': String(node.attrs.checked),
      }),
    })
  },
})
