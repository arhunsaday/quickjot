import { type Editor, Extension, type Range } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion'
import { cn } from 'cn'
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  TextQuote,
} from 'lucide-react'
import { type Ref, useImperativeHandle, useState } from 'react'

interface SlashItem {
  title: string
  hint: string
  keywords: string[]
  icon: typeof Heading1
  run: (context: { editor: Editor; range: Range }) => void
}

const ITEMS: SlashItem[] = [
  {
    title: 'Text',
    hint: 'Plain paragraph',
    keywords: ['paragraph', 'body', 'plain'],
    icon: Pilcrow,
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: 'Heading 1',
    hint: 'Section title',
    keywords: ['h1', 'title', 'large'],
    icon: Heading1,
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    hint: 'Subsection',
    keywords: ['h2', 'subtitle'],
    icon: Heading2,
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    hint: 'Minor heading',
    keywords: ['h3'],
    icon: Heading3,
    run: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Bulleted list',
    hint: 'Unordered items',
    keywords: ['ul', 'unordered', 'bullet'],
    icon: List,
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered list',
    hint: 'Ordered steps',
    keywords: ['ol', 'ordered', 'number'],
    icon: ListOrdered,
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Quote',
    hint: 'Blockquote',
    keywords: ['blockquote', 'cite'],
    icon: TextQuote,
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Code block',
    hint: 'Syntax highlighted',
    keywords: ['code', 'pre', 'snippet'],
    icon: Code,
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Divider',
    hint: 'Horizontal rule',
    keywords: ['hr', 'rule', 'separator', 'line', 'divider'],
    icon: Minus,
    run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
]

function matchItems(query: string): SlashItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return ITEMS
  return ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(needle) ||
      item.keywords.some((keyword) => keyword.startsWith(needle)),
  )
}

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean
}

interface SlashMenuProps {
  items: SlashItem[]
  command: (item: SlashItem) => void
  ref?: Ref<SlashMenuHandle>
}

function SlashMenu({ items, command, ref }: SlashMenuProps) {
  const [active, setActive] = useState(0)

  // Adjusting state during render rather than in an effect: when the query
  // narrows the list, the highlight belongs on the first result immediately,
  // not one render later.
  const resultKey = items.map((item) => item.title).join('|')
  const [keyedTo, setKeyedTo] = useState(resultKey)
  if (keyedTo !== resultKey) {
    setKeyedTo(resultKey)
    setActive(0)
  }

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: (event) => {
        if (items.length === 0) return false

        if (event.key === 'ArrowDown') {
          setActive((current) => (current + 1) % items.length)
          return true
        }
        if (event.key === 'ArrowUp') {
          setActive((current) => (current - 1 + items.length) % items.length)
          return true
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          const item = items[active]
          if (item) command(item)
          return true
        }
        return false
      },
    }),
    [items, active, command],
  )

  if (items.length === 0) {
    return (
      <div className="bg-popover text-muted-foreground w-[264px] rounded-lg border p-3 text-sm shadow-md">
        No blocks match that.
      </div>
    )
  }

  return (
    <div className="bg-popover max-h-[280px] w-[264px] overflow-y-auto rounded-lg border p-1 shadow-md">
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          onMouseEnter={() => setActive(index)}
          onClick={() => command(item)}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left',
            index === active && 'bg-accent text-accent-foreground',
          )}
        >
          <item.icon
            className={cn(
              'size-[18px] shrink-0',
              index === active ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm leading-tight font-medium">{item.title}</span>
            <span className="text-muted-foreground block text-xs leading-tight">{item.hint}</span>
          </span>
          {index === active && (
            <kbd className="bg-background text-muted-foreground rounded border px-1 text-[10px]">
              ↵
            </kbd>
          )}
        </button>
      ))}
    </div>
  )
}

/** Places the popup at the caret, flipping above it when space runs out below. */
function place(element: HTMLElement, rect: DOMRect | null) {
  if (!rect) return
  const GAP = 8
  const height = element.offsetHeight || 280
  const belowFits = rect.bottom + GAP + height < window.innerHeight
  const top = belowFits ? rect.bottom + GAP : Math.max(GAP, rect.top - height - GAP)
  const left = Math.min(rect.left, window.innerWidth - (element.offsetWidth || 264) - GAP)

  element.style.left = `${left + window.scrollX}px`
  element.style.top = `${top + window.scrollY}px`
}

export interface SlashCommandOptions {
  suggestion: Partial<Omit<SuggestionOptions<SlashItem, SlashItem>, 'editor'>>
}

/**
 * `/` opens a block menu at the caret. Tiptap 3 dropped its tippy dependency,
 * so the popup is a plain absolutely-positioned element rendered through
 * ReactRenderer — which keeps it inside the editor's React tree and therefore
 * inside the app's providers.
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }) => {
          props.run({ editor, range })
        },
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }) => matchItems(query),
        render: () => {
          let renderer: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null = null
          let element: HTMLElement | null = null

          return {
            onStart: (props: SuggestionProps<SlashItem>) => {
              renderer = new ReactRenderer(SlashMenu, {
                editor: props.editor,
                props: { items: props.items, command: props.command },
              })
              element = renderer.element as HTMLElement
              element.style.position = 'absolute'
              element.style.zIndex = '50'
              document.body.append(element)
              place(element, props.clientRect?.() ?? null)
            },

            onUpdate: (props: SuggestionProps<SlashItem>) => {
              renderer?.updateProps({ items: props.items, command: props.command })
              if (element) place(element, props.clientRect?.() ?? null)
            },

            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
              if (event.key === 'Escape') return true
              return renderer?.ref?.onKeyDown(event) ?? false
            },

            onExit: () => {
              renderer?.destroy()
              element?.remove()
              renderer = null
              element = null
            },
          }
        },
      }),
    ]
  },
})
