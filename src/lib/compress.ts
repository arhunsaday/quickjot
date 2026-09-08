import { alloc, type Bytes, concat, slice } from './bytes'

/**
 * gzip via the platform's own CompressionStream. This replaces the `pako` +
 * `js-base64` pair the project used to carry: both are now built into every
 * browser we support, and dropping them takes ~50 KB out of the bundle.
 */

function readableFrom(bytes: Bytes): ReadableStream<BufferSource> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<Bytes> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return chunks.length === 1 ? slice(chunks[0] as Uint8Array, 0) : concat(...chunks)
}

export async function gzip(input: Uint8Array): Promise<Bytes> {
  if (input.byteLength === 0) return alloc(0)
  return drain(readableFrom(slice(input, 0)).pipeThrough(new CompressionStream('gzip')))
}

export async function gunzip(input: Uint8Array): Promise<Bytes> {
  if (input.byteLength === 0) return alloc(0)
  return drain(readableFrom(slice(input, 0)).pipeThrough(new DecompressionStream('gzip')))
}
