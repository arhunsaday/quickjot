import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import {
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
} from '@tiptap/react'
import { Check, Copy, ListOrdered, WrapText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const CODE_LANGUAGES = [
  'bash',
  'css',
  'diff',
  'go',
  'java',
  'javascript',
  'json',
  'markdown',
  'python',
  'rust',
  'sql',
  'typescript',
  'xml',
  'yaml',
]

function CodeBlockView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const [wrap, setWrap] = useState(false)
  const [numbers, setNumbers] = useState(false)
  const [copied, setCopied] = useState(false)
  const language = node.attrs.language as string | null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy code. Select it and copy manually.')
    }
  }
  return (
    <NodeViewWrapper className="qj-code-block" data-wrap={wrap}>
      <div className="qj-code-controls qj-no-print" contentEditable={false}>
        {editor.isEditable ? (
          <select
            aria-label="Code language"
            value={language ?? ''}
            onChange={(event) => updateAttributes({ language: event.target.value || null })}
          >
            <option value="">Auto detect</option>
            <option value="plaintext">Plain text</option>
            {language && language !== 'plaintext' && !CODE_LANGUAGES.includes(language) && (
              <option value={language}>{language}</option>
            )}
            {CODE_LANGUAGES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        ) : (
          <span>{language || 'Code'}</span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Toggle code line numbers"
            aria-pressed={numbers}
            onClick={() => {
              setNumbers(!numbers)
              setWrap(false)
            }}
            title="Line numbers"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            aria-label="Toggle code wrapping"
            aria-pressed={wrap}
            onClick={() => {
              setWrap(!wrap)
              setNumbers(false)
            }}
            title="Wrap lines"
          >
            <WrapText size={16} />
          </button>
          <button
            type="button"
            aria-label={copied ? 'Code copied' : 'Copy code'}
            onClick={() => void copy()}
            title="Copy code"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>
      <div className="qj-code-body">
        {numbers && (
          <div className="qj-code-numbers" contentEditable={false} aria-hidden="true">
            {node.textContent
              .split('\n')
              .map((_, index) => index + 1)
              .join('\n')}
          </div>
        )}
        <pre>
          <NodeViewContent<'code'> as="code" style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre' }} />
        </pre>
      </div>
    </NodeViewWrapper>
  )
}

export const EnhancedCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
})
