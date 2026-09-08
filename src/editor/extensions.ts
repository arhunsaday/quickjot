import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import { createLowlight } from 'lowlight'
import { SlashCommand } from './slash-menu'

/**
 * A curated grammar set rather than lowlight's `common`.
 *
 * `common` carries 37 grammars — around 165 KB that every visitor would
 * download and the service worker would precache, to highlight languages a
 * notepad rarely sees. These fourteen cover the realistic cases.
 */
const lowlight = createLowlight({
  bash,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  markdown,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
})

export const PLACEHOLDER = 'Start writing. Type / for headings, lists and code blocks.'

/**
 * One extension list, shared by the editor and the read-only view so a shared
 * note renders identically to how it was written.
 *
 * Every formatting control in the UI is backed by an extension registered here.
 * The previous build shipped toolbar buttons for highlight, underline,
 * sub/superscript and all four alignments without ever registering the
 * extensions behind them, so none of those buttons could do anything.
 */
export function createExtensions({ editable }: { editable: boolean }) {
  return [
    StarterKit.configure({
      // Replaced below by the syntax-highlighting variant.
      codeBlock: false,
      link: {
        openOnClick: !editable,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      },
    }),
    CodeBlockLowlight.configure({ lowlight }),
    Highlight,
    Subscript,
    Superscript,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    CharacterCount,
    // Markdown gives us paste-as-markdown plus getMarkdown() for export.
    Markdown,
    ...(editable ? [Placeholder.configure({ placeholder: PLACEHOLDER }), SlashCommand] : []),
  ]
}
