import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'

const waitFor = async (condition: () => boolean) => {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > 10000) throw new Error('Timed out waiting for synchronization')
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}
test('REST capabilities and real WebSocket editing persist while viewers cannot write', async () => {
  const directory = mkdtempSync(`${tmpdir()}/quickjot-api-`)
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    env: { ...process.env, PORT: '3035', DATABASE_PATH: `${directory}/db.sqlite` },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (chunk) => {
    log += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    log += chunk.toString()
  })
  const providers: HocuspocusProvider[] = [],
    docs: Y.Doc[] = []
  try {
    await waitFor(() => log.includes('backend ready'))
    const seed = new Y.Doc()
    docs.push(seed)
    seed.getXmlFragment('default').insert(0, [new Y.XmlElement('paragraph')])
    seed.getMap('meta').set('title', 'Original')
    const create = await fetch('http://127.0.0.1:3035/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update: Buffer.from(Y.encodeStateAsUpdate(seed)).toString('base64') }),
    })
    assert.equal(create.status, 201)
    const room = (await create.json()) as {
      id: string
      keys: { owner: string; editor: string; viewer: string }
    }
    const request = (path: string, token: string, method = 'GET') =>
      fetch(`http://127.0.0.1:3035/api/notes/${room.id}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
    assert.equal((await request('', 'fake')).status, 403)
    assert.equal((await request('/access', room.keys.editor, 'POST')).status, 403)
    const connect = async (token: string) => {
      const doc = new Y.Doc()
      docs.push(doc)
      const provider = new HocuspocusProvider({
        url: 'ws://127.0.0.1:3035/collaboration',
        name: room.id,
        token,
        document: doc,
      })
      providers.push(provider)
      await waitFor(() => provider.isSynced)
      return { doc, provider }
    }
    const a = await connect(room.keys.owner),
      b = await connect(room.keys.editor),
      viewer = await connect(room.keys.viewer)
    a.doc.getMap('meta').set('title', 'Together')
    await waitFor(
      () =>
        b.doc.getMap('meta').get('title') === 'Together' &&
        viewer.doc.getMap('meta').get('title') === 'Together' &&
        a.provider.unsyncedChanges === 0,
    )
    b.doc.getMap('meta').set('second', 'Other client')
    await waitFor(() => a.doc.getMap('meta').get('second') === 'Other client')
    b.provider.disconnect()
    await waitFor(() => b.provider.configuration.websocketProvider.status === 'disconnected')
    b.doc.getMap('meta').set('offline', 'Written offline')
    b.provider.connect()
    await waitFor(
      () =>
        a.doc.getMap('meta').get('offline') === 'Written offline' &&
        b.provider.unsyncedChanges === 0,
    )
    viewer.doc.getMap('meta').set('title', 'Forbidden')
    await new Promise((resolve) => setTimeout(resolve, 150))
    const saved = (await (await request('', room.keys.owner)).json()) as { update: string }
    const restored = new Y.Doc()
    docs.push(restored)
    Y.applyUpdate(restored, Buffer.from(saved.update, 'base64'))
    assert.equal(restored.getMap('meta').get('title'), 'Together')
    assert.equal(restored.getMap('meta').get('second'), 'Other client')
    assert.equal(restored.getMap('meta').get('offline'), 'Written offline')
    const rotated = (await (await request('/access', room.keys.owner, 'POST')).json()) as {
      viewer: string
    }
    assert.equal((await request('', room.keys.viewer)).status, 403)
    assert.equal((await request('', rotated.viewer)).status, 200)
    assert.equal((await request('/extend', room.keys.owner, 'POST')).status, 200)
    assert.equal((await request('/revisions', room.keys.owner)).status, 200)
    assert.equal((await request('', room.keys.viewer, 'DELETE')).status, 403)
    assert.equal((await request('', room.keys.owner, 'DELETE')).status, 204)
    assert.equal((await request('', room.keys.owner)).status, 403)
    const invalidAI = await fetch('http://127.0.0.1:3035/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    assert.equal(invalidAI.status, 400)
  } catch (error) {
    throw new Error(`${String(error)}\n${log}`)
  } finally {
    for (const provider of providers) provider.destroy()
    for (const doc of docs) doc.destroy()
    child.kill('SIGTERM')
    await new Promise((resolve) => {
      if (child.exitCode !== null) resolve(undefined)
      else child.once('exit', resolve)
    })
    rmSync(directory, { recursive: true })
  }
})
