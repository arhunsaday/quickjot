import { TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { useEffect, useRef } from 'react'
import { BlockControls } from './BlockControls'
import { EditorToolbar } from './editor-toolbar'

interface Props {
  editor: Editor | null
  title: string
  onTitleChange: (value: string) => void
  canEdit?: boolean
  sourceReadOnly?: boolean
  markdown?: string | null
  onMarkdownChange?: (value: string) => void
  markdownLosses?: string[]
}

/**
 * The writing surface: a borderless title that reads as the document's own
 * heading, and the body below it.
 *
 * There is deliberately no permanent toolbar. Inline formatting appears on
 * selection and blocks come from the `/` menu, which keeps the page quiet while
 * leaving every command reachable.
 */
export function EditorSurface({
  editor,
  title,
  onTitleChange,
  canEdit = true,
  sourceReadOnly = false,
  markdown = null,
  onMarkdownChange,
  markdownLosses = [],
}: Props) {
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const sourceMode = markdown !== null
  useEffect(() => {
    if (sourceMode) sourceRef.current?.focus()
  }, [sourceMode])
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
    <div className="pl-16 pr-6 sm:px-16">
      <textarea
        ref={titleRef}
        value={title}
        readOnly={!canEdit}
        onChange={(event) => onTitleChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          // Enter belongs to the body, not the title.
          //
          // The DOM node is focused directly before asking Tiptap to place the
          // caret: Tiptap's own focus command defers through
          // requestAnimationFrame, which never runs while the page is hidden.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (sourceMode) sourceRef.current?.focus()
            else {
              editor?.view.dom.focus()
              editor?.commands.focus('start')
            }
          }
        }}
        placeholder="Untitled note"
        aria-label="Note title"
        rows={1}
        spellCheck={false}
        className="placeholder:text-muted-foreground/40 w-full resize-none overflow-hidden bg-transparent pt-4 text-3xl font-bold tracking-tight outline-none sm:text-4xl"
      />

      {editor && canEdit && markdown === null && (
        <BubbleMenu
          editor={editor}
          // flip/shift keep the menu on screen when the selection sits at the
          // very top or edge of the viewport.
          options={{ placement: 'top', offset: 8, flip: true, shift: true }}
          shouldShow={({ editor: instance, state }) =>
            state.selection instanceof TextSelection &&
            !state.selection.empty &&
            !instance.isActive('codeBlock')
          }
        >
          <EditorToolbar editor={editor} />
        </BubbleMenu>
      )}

      {markdown !== null ? (
        <div className="mt-4">
          <p className="text-muted-foreground mb-3 text-xs" role="status">
            {sourceReadOnly
              ? 'Markdown preview · make a snapshot to edit source safely.'
              : 'Markdown source · changes save automatically.'}
            {markdownLosses.length > 0 &&
              ` Editing this source removes ${markdownLosses.join(', ')}. Switch back without editing to keep them.`}
          </p>
          <textarea
            ref={sourceRef}
            aria-label="Markdown source"
            value={markdown}
            readOnly={!canEdit || sourceReadOnly}
            onChange={(event) => onMarkdownChange?.(event.target.value)}
            spellCheck={false}
            className="qj-markdown-source min-h-[65vh] w-full resize-y bg-transparent font-mono outline-none"
          />
        </div>
      ) : (
        <>
          {editor && canEdit && <BlockControls editor={editor} />}
          <EditorContent editor={editor} className="qj-document mt-6" />
        </>
      )}
    </div>
  )
}
