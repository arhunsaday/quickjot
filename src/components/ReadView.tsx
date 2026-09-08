import { EditorContent, useEditor } from '@tiptap/react'
import { PencilLine, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createExtensions } from '@/editor/extensions'
import { useDocumentTitle } from '@/hooks/use-document-title'
import type { NoteDoc } from '@/lib/codec'
import { displayTitle } from '@/lib/note'
import { noteUrl, readLocation } from '@/lib/url'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  doc: NoteDoc
}

/**
 * `?view=read` — what a recipient sees. No toolbar, no status bar, nothing in
 * the way of the writing.
 */
export function ReadView({ doc }: Props) {
  useDocumentTitle(`${displayTitle(doc)} · QuickJot`)

  const editor = useEditor({
    extensions: createExtensions({ editable: false }),
    content: doc.content,
    editable: false,
    immediatelyRender: false,
  })

  const title = doc.title.trim()

  return (
    <div className="min-h-dvh">
      <div className="qj-no-print fixed top-4 right-4 z-40 flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
        <Button
          size="sm"
          onClick={() => {
            window.location.href = noteUrl(readLocation().payload, 'edit')
          }}
        >
          <PencilLine />
          Edit a copy
        </Button>
        <ThemeToggle />
      </div>

      <article className="mx-auto max-w-[760px] px-4 py-20">
        {title && (
          <h1 className="mb-8 text-4xl font-bold tracking-tight text-balance sm:text-[2.6rem]">
            {title}
          </h1>
        )}

        <EditorContent editor={editor} className="qj-document" />

        <hr className="qj-no-print my-10" />
        <p className="text-muted-foreground qj-no-print text-xs">
          Written in QuickJot. This entire note is encoded in the link you followed — there is no
          server holding a copy.
        </p>
      </article>
    </div>
  )
}
