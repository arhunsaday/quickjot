import { describe, expect, it } from 'vitest'
import { canReplaceProposal, readProposalStream } from './ai'

function response(value: string) {
  const bytes = new TextEncoder().encode(value)
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
        controller.close()
      },
    }),
  )
}
describe('AI proposals', () => {
  it('handles split lines and Unicode, and only accepts completed output', async () => {
    let preview = ''
    const result = await readProposalStream(
      response('{"text":"Café ✨"}\n{"done":true}'),
      (text) => {
        preview = text
      },
    )
    expect(result).toBe('Café ✨')
    expect(preview).toBe(result)
  })
  it('rejects partial streams and provider failures instead of enabling apply', async () => {
    await expect(readProposalStream(response('{"text":"Partial"}\n'), () => {})).rejects.toThrow(
      'No complete response',
    )
    await expect(
      readProposalStream(response('{"text":"Partial"}\n{"error":"Quota exceeded"}\n'), () => {}),
    ).rejects.toThrow('Quota exceeded')
  })
  it('prevents replacement after any concurrent document change', () => {
    const original = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Original' }] }],
    }
    const signature = JSON.stringify(original)
    expect(canReplaceProposal(signature, original)).toBe(true)
    expect(
      canReplaceProposal(signature, {
        ...original,
        content: [{ type: 'paragraph' }, ...original.content],
      }),
    ).toBe(false)
    expect(canReplaceProposal(signature, { ...original, content: [] })).toBe(false)
  })
})
