import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { cn } from 'cn'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Ellipsis,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ToggleProps {
  label: string
  active?: boolean
  onClick: () => void
  children: ReactNode
}

function ToolbarToggle({ label, active, onClick, children }: ToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(active && 'bg-accent text-accent-foreground')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')

  const apply = () => {
    const value = href.trim()
    if (!value) {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: value }).run()
    }
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Seed the field from the link already under the cursor, if any.
        if (next) setHref(editor.getAttributes('link').href ?? '')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Add or edit link"
          className={cn(editor.isActive('link') && 'bg-accent text-accent-foreground')}
        >
          <Link2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="flex items-center gap-2">
          <Input
            value={href}
            onChange={(event) => setHref(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                apply()
              }
            }}
            placeholder="https://example.com"
            aria-label="Link address"
            autoFocus
            className="h-8"
          />
          <Button type="button" size="sm" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Inline formatting, shown on selection.
 *
 * Every control here is backed by an extension that is actually registered.
 * The previous build shipped buttons for highlight, underline, sub/superscript
 * and all four alignments without registering any of those extensions, so none
 * of them could do anything.
 */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive('bold'),
      italic: instance.isActive('italic'),
      underline: instance.isActive('underline'),
      strike: instance.isActive('strike'),
      highlight: instance.isActive('highlight'),
      code: instance.isActive('code'),
      link: instance.isActive('link'),
    }),
  })

  return (
    <div className="bg-popover flex items-center gap-0.5 rounded-lg border p-1 shadow-md">
      <ToolbarToggle
        label="Bold"
        active={active?.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarToggle>
      <ToolbarToggle
        label="Italic"
        active={active?.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarToggle>
      <ToolbarToggle
        label="Underline"
        active={active?.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline />
      </ToolbarToggle>
      <ToolbarToggle
        label="Strikethrough"
        active={active?.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarToggle>
      <ToolbarToggle
        label="Highlight"
        active={active?.highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter />
      </ToolbarToggle>
      <ToolbarToggle
        label="Inline code"
        active={active?.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code />
      </ToolbarToggle>

      <Separator orientation="vertical" className="mx-0.5 !h-5" />

      <LinkButton editor={editor} />
      <ToolbarToggle label="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>
        <Link2Off />
      </ToolbarToggle>

      <Separator orientation="vertical" className="mx-0.5 !h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="More formatting">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Alignment</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft />
            Left
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter />
            Centre
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight />
            Right
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify />
            Justify
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Script</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleSubscript().run()}>
            <Subscript />
            Subscript
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleSuperscript().run()}>
            <Superscript />
            Superscript
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            <RemoveFormatting />
            Clear formatting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
