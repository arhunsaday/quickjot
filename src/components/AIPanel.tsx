import type { Editor } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { canReplaceProposal, readProposalStream } from '@/lib/ai'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet'

const actions = {
  improve: 'Improve clarity and flow while preserving the meaning and voice.',
  grammar: 'Fix spelling and grammar while preserving the meaning.',
  shorten: 'Make the text more concise while retaining its main ideas.',
  expand: 'Expand the text with helpful detail. Do not invent factual claims.',
  summarize: 'Summarize the main ideas clearly.',
  translate: 'Translate the text into the language specified in the additional instruction.',
  custom: '',
}
type Target = { from: number; to: number; source: string; signature: string }
export function AIPanel({
  open,
  onOpenChange,
  editor,
  canEdit,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  editor: Editor | null
  canEdit: boolean
}) {
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai')
  const [model, setModel] = useState('gpt-4.1-mini')
  const [key, setKey] = useState('')
  const [action, setAction] = useState<keyof typeof actions>('improve')
  const [instruction, setInstruction] = useState('')
  const [whole, setWhole] = useState(false)
  const [target, setTarget] = useState<Target | null>(null)
  const [proposal, setProposal] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const capture = () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    setTarget({
      from,
      to,
      source: editor.state.doc.textBetween(from, to, '\n'),
      signature: JSON.stringify(editor.getJSON()),
    })
    setProposal('')
    setComplete(false)
  }
  // Capture before the panel moves focus away from the document.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only capture when the panel opens, not on every selection update.
  useEffect(() => {
    if (open) capture()
    else controller.current?.abort()
  }, [open])
  useEffect(() => () => controller.current?.abort(), [])
  const source = whole ? editor?.getMarkdown() || '' : target?.source || ''
  const generate = async () => {
    if (!source.trim() || !key.trim() || !model.trim()) return
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    setComplete(false)
    setProposal('')
    setError('')
    // Whole-document replacement also uses a guarded snapshot, never untracked positions.
    if (whole && editor)
      setTarget({
        from: 0,
        to: editor.state.doc.content.size,
        source,
        signature: JSON.stringify(editor.getJSON()),
      })
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.trim()}` },
        body: JSON.stringify({
          provider,
          model: model.trim(),
          instruction: [actions[action], instruction].filter(Boolean).join('\n'),
          context: source,
        }),
        signal: request.signal,
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'AI service unavailable. Start the backend and try again.')
      }
      await readProposalStream(response, setProposal)
      setComplete(true)
    } catch (reason) {
      if (!request.signal.aborted)
        setError(reason instanceof Error ? reason.message : 'Generation failed')
      else setError('Generation canceled. The note has not changed.')
    } finally {
      setBusy(false)
    }
  }
  const apply = (replace: boolean) => {
    if (!editor || !target || !canEdit || !complete) return
    if (replace && !canReplaceProposal(target.signature, editor.getJSON())) {
      toast.error(
        'The note changed while AI was working. Copy the proposal or insert it at your current cursor.',
      )
      return
    }
    try {
      const content = editor.markdown?.parse(proposal).content
      if (!content) throw new Error('Invalid Markdown')
      const range = replace ? { from: target.from, to: target.to } : editor.state.selection.to
      editor.chain().focus().insertContentAt(range, content).run()
      onOpenChange(false)
      toast.success('AI proposal applied. Undo to restore your previous text.')
    } catch {
      setError('This proposal could not be inserted. Copy it instead.')
    }
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto gap-0 rounded-l-2xl">
        <SheetHeader>
          <SheetTitle>Write with AI</SheetTitle>
          <SheetDescription>
            Preview an edit before applying it. Your key and chosen text pass through this app’s
            backend to your provider. Keys are held in memory only; usage is billed by your
            provider.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-5 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">Provider</Label>
              <select
                id="ai-provider"
                className="qj-settings-select"
                disabled={busy}
                value={provider}
                onChange={(event) => {
                  const next = event.target.value as typeof provider
                  setProvider(next)
                  setModel(next === 'openai' ? 'gpt-4.1-mini' : 'claude-sonnet-4-6')
                  setKey('')
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-model">Model</Label>
              <Input
                id="ai-model"
                value={model}
                disabled={busy}
                onChange={(event) => setModel(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-key">Your API key</Label>
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              placeholder="Paste your provider key"
              value={key}
              disabled={busy}
              onChange={(event) => setKey(event.target.value)}
            />
            <Button variant="ghost" size="sm" disabled={busy || !key} onClick={() => setKey('')}>
              Forget key
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-action">Editing action</Label>
            <select
              id="ai-action"
              className="qj-settings-select"
              value={action}
              disabled={busy}
              onChange={(event) => setAction(event.target.value as keyof typeof actions)}
            >
              {Object.keys(actions).map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-instruction">
              {action === 'translate' ? 'Target language' : 'Additional instruction'}
            </Label>
            <Input
              id="ai-instruction"
              value={instruction}
              disabled={busy}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder={action === 'translate' ? 'e.g. French' : 'e.g. Keep a friendly tone'}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={whole ? 'outline' : 'secondary'}
              size="sm"
              disabled={busy}
              onClick={() => {
                setWhole(false)
                capture()
              }}
            >
              Selected text
            </Button>
            <Button
              variant={whole ? 'secondary' : 'outline'}
              size="sm"
              disabled={busy}
              onClick={() => {
                setWhole(true)
                setComplete(false)
                setProposal('')
              }}
            >
              Whole note
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {source.length
              ? `${source.length.toLocaleString()} characters will be sent.`
              : 'Select some text in your note, reopen this panel, or choose Whole note.'}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={
                busy ||
                !key.trim() ||
                !source.trim() ||
                source.length > 60000 ||
                ((action === 'custom' || action === 'translate') && !instruction.trim())
              }
              onClick={() => void generate()}
            >
              {busy ? 'Generating…' : 'Generate proposal'}
            </Button>
            {busy && (
              <Button variant="outline" onClick={() => controller.current?.abort()}>
                Cancel
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {proposal && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                PROPOSAL · {complete ? 'Ready to review' : 'Draft'}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed rounded-xl border bg-muted/30 p-4 max-h-[40vh] overflow-y-auto">
                {proposal}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!complete || !canEdit} onClick={() => apply(true)}>
                  Replace {whole ? 'note' : 'selection'}
                </Button>
                <Button
                  variant="outline"
                  disabled={!complete || !canEdit}
                  onClick={() => apply(false)}
                >
                  Insert at cursor
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void navigator.clipboard.writeText(proposal).then(
                      () => toast.success('Proposal copied'),
                      () => toast.error('Clipboard unavailable'),
                    )
                  }
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
