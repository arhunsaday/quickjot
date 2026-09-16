import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aiInput, generate } from './ai.js'

test('OpenAI BYOK uses Responses streaming without storing the response or host credentials', async () => {
  const original = globalThis.fetch
  let called = false
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses')
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-user-key')
    const body = JSON.parse(String(init?.body))
    assert.equal(body.store, false)
    assert.equal(body.stream, true)
    assert.equal(body.model, 'test-model')
    assert.match(body.input, /quoted JSON string/)
    called = true
    return new Response(
      'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Edited text"}\n\nevent: response.completed\ndata: {"type":"response.completed","response":{}}\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    )
  }
  try {
    let output = ''
    for await (const text of generate(
      { provider: 'openai', model: 'test-model', instruction: 'Improve', context: 'Original text' },
      'test-user-key',
      new AbortController().signal,
    ))
      output += text
    assert.equal(output, 'Edited text')
    assert.equal(called, true)
  } finally {
    globalThis.fetch = original
  }
})
test('provider endpoint injection and oversized contexts are rejected', () => {
  assert.equal(
    aiInput.safeParse({ provider: 'custom', model: 'model', instruction: 'Edit', context: 'text' })
      .success,
    false,
  )
  assert.equal(
    aiInput.safeParse({
      provider: 'openai',
      model: 'model',
      instruction: 'Edit',
      context: 'x'.repeat(60001),
    }).success,
    false,
  )
})
