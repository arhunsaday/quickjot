/** Read bounded NDJSON without assuming transport chunks line up with events. */
export async function readProposalStream(
  response: Response,
  onText: (value: string) => void,
): Promise<string> {
  if (!response.body) throw new Error('Response stream unavailable')
  const reader = response.body.getReader(),
    decoder = new TextDecoder()
  let buffer = '',
    output = '',
    complete = false
  const consume = (line: string) => {
    if (!line.trim()) return
    const event: { text?: string; error?: string; done?: boolean } = JSON.parse(line)
    if (event.error) throw new Error(event.error)
    if (event.text) {
      output += event.text
      if (output.length > 100000) throw new Error('Response too long')
      onText(output)
    }
    if (event.done) complete = true
  }
  try {
    while (true) {
      const chunk = await reader.read()
      buffer += decoder.decode(chunk.value, { stream: !chunk.done })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) consume(line)
      if (buffer.length > 200000) throw new Error('Response event too long')
      if (chunk.done) break
    }
    consume(buffer)
    if (!complete || !output.trim())
      throw new Error('No complete response received. Retry or choose another model.')
    return output
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
export function canReplaceProposal(original: string, current: unknown): boolean {
  return original === JSON.stringify(current)
}
