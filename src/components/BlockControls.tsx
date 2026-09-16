import DragHandle from '@tiptap/extension-drag-handle-react'
import type { Editor } from '@tiptap/react'
import { Copy, Ellipsis, GripVertical, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { dropBlockTransaction } from '@/editor/blocks'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const POSITION_CONFIG = { placement: 'left-start', strategy: 'fixed' } as const

export function BlockControls({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState(-1)
  const [open, setOpen] = useState(false)
  const drag = useRef<{
    source: number
    target: number
    startY: number
    clientY: number
    moved: boolean
  } | null>(null)
  const [indicator, setIndicator] = useState<{ left: number; top: number; width: number } | null>(
    null,
  )
  const frame = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )
  const lock = (value: boolean) =>
    editor.view.dispatch(editor.state.tr.setMeta('lockDragHandle', value))
  const updateDropTarget = (clientY: number) => {
    const main = editor.view.dom.closest('main')
    if (!main) return
    const bounds = main.getBoundingClientRect()
    if (clientY < bounds.top + 48) main.scrollBy(0, -16)
    if (clientY > bounds.bottom - 48) main.scrollBy(0, 16)
    let offset = 0
    let target = editor.state.doc.content.size
    let top = editor.view.dom.getBoundingClientRect().bottom
    editor.state.doc.forEach((block, blockPos) => {
      const element = editor.view.nodeDOM(blockPos)
      if (!(element instanceof HTMLElement)) return
      const rect = element.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2 && target === editor.state.doc.content.size) {
        target = offset
        top = rect.top
      }
      offset += block.nodeSize
    })
    if (drag.current) drag.current.target = target
    const rect = editor.view.dom.getBoundingClientRect()
    if (drag.current?.moved)
      setIndicator({
        left: rect.left,
        top: Math.max(bounds.top, Math.min(top, bounds.bottom)),
        width: rect.width,
      })
  }
  const stopDrag = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    setIndicator(null)
  }
  const node = pos >= 0 && pos < editor.state.doc.content.size ? editor.state.doc.nodeAt(pos) : null
  return (
    <DragHandle
      editor={editor}
      onNodeChange={({ pos: next }) => setPos(next)}
      computePositionConfig={POSITION_CONFIG}
    >
      <div className="qj-no-print flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          onPointerDown={(event) => {
            if (event.button !== 0 || !node) return
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = {
              source: pos,
              target: pos,
              startY: event.clientY,
              clientY: event.clientY,
              moved: false,
            }
            lock(true)
            const tick = () => {
              if (!drag.current) return
              if (drag.current.moved) updateDropTarget(drag.current.clientY)
              frame.current = requestAnimationFrame(tick)
            }
            frame.current = requestAnimationFrame(tick)
          }}
          onPointerMove={(event) => {
            const current = drag.current
            if (!current) return
            if (Math.abs(event.clientY - current.startY) > 4) current.moved = true
            current.clientY = event.clientY
          }}
          onPointerUp={(event) => {
            const current = drag.current
            if (current?.moved) updateDropTarget(event.clientY)
            drag.current = null
            stopDrag()
            lock(false)
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId)
            const bounds = editor.view.dom.closest('main')?.getBoundingClientRect()
            if (
              current?.moved &&
              bounds &&
              event.clientX >= bounds.left &&
              event.clientX <= bounds.right &&
              event.clientY >= bounds.top &&
              event.clientY <= bounds.bottom
            ) {
              const transaction = dropBlockTransaction(editor.state, current.source, current.target)
              if (transaction) editor.view.dispatch(transaction)
              editor.commands.focus()
            }
          }}
          onPointerCancel={() => {
            drag.current = null
            stopDrag()
            lock(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && drag.current) {
              event.preventDefault()
              drag.current = null
              stopDrag()
              lock(false)
            }
          }}
          className="qj-block-grip"
          aria-label="Drag block to reorder"
          title="Drag to reorder"
        >
          <GripVertical size={18} />
        </Button>
        <DropdownMenu
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            lock(next)
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="qj-no-print"
              aria-label="Open block actions"
              title="Block actions"
            >
              <Ellipsis size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              disabled={!node}
              onClick={() => {
                if (node)
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(pos + node.nodeSize, node.toJSON())
                    .run()
              }}
            >
              <Copy />
              Duplicate block
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!node}
              onClick={() => {
                if (node)
                  editor
                    .chain()
                    .focus()
                    .deleteRange({ from: pos, to: pos + node.nodeSize })
                    .run()
              }}
            >
              <Trash2 />
              Delete block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {indicator &&
        createPortal(
          <div
            className="qj-block-drop-indicator qj-no-print"
            style={{
              position: 'fixed',
              left: indicator.left,
              top: indicator.top,
              width: indicator.width,
            }}
          />,
          document.body,
        )}
    </DragHandle>
  )
}
