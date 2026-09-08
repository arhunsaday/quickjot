import type { Editor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { useEffect, useRef } from 'react'
import { EditorToolbar } from './editor-toolbar'

interface Props {
  editor: Editor | null
  title: string
  onTitleChange: (value: string) => void
}

/**
 * The writing surface: a borderless title that reads as the document's own
 * heading, and the body below it.
 *
 * There is deliberately no permanent toolbar. Inline formatting appears on
 * selection and blocks come from the `/` menu, which keeps the page quiet while
 * leaving every command reachable.
 */
export function EditorSurface({ editor, title, onTitleChange }: Props) {
  const titleRef = useRef<HTMLTextAreaElement>(null)

  // Grow the title box with its content instead of scrolling it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the title changes, including when it is set from an import.
  useEffect(() => {
    const node = titleRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }, [title])

  return (
    <div className="px-4">
      <textarea
        ref={titleRef}
        value={title}
        onChange={(event) => onTitleChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          // Enter belongs to the body, not the title.
          //
          // The DOM node is focused directly before asking Tiptap to place the
          // caret: Tiptap's own focus command defers through
          // requestAnimationFrame, which never runs while the page is hidden.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            editor?.view.dom.focus()
            editor?.commands.focus('start')
          }
        }}
        placeholder="Untitled note"
        aria-label="Note title"
        rows={1}
        spellCheck={false}
        className="placeholder:text-muted-foreground/60 w-full resize-none overflow-hidden bg-transparent pt-8 text-3xl font-bold tracking-tight outline-none sm:text-4xl"
      />

      {editor && (
        <BubbleMenu
          editor={editor}
          // flip/shift keep the menu on screen when the selection sits at the
          // very top or edge of the viewport.
          options={{ placement: 'top', offset: 8, flip: true, shift: true }}
          shouldShow={({ editor: instance, state }) =>
            !state.selection.empty && !instance.isActive('codeBlock')
          }
        >
          <EditorToolbar editor={editor} />
        </BubbleMenu>
      )}

      <EditorContent editor={editor} className="qj-document mt-4" />
    </div>
  )
}
