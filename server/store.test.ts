import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as Y from 'yjs'
import { Store } from './store.js'

test('capabilities enforce roles, rotation, expiry and deletion', () => {
  const store = new Store(':memory:'),
    doc = new Y.Doc()
  const room = store.create(Y.encodeStateAsUpdate(doc))
  assert.equal(store.authorize(room.id, room.keys.owner), 'owner')
  assert.equal(store.authorize(room.id, room.keys.editor), 'editor')
  assert.equal(store.authorize(room.id, room.keys.viewer), 'viewer')
  assert.equal(store.authorize(room.id, 'invented'), null)
  const next = store.rotate(room.id)
  assert.equal(store.authorize(room.id, room.keys.editor), null)
  assert.equal(store.authorize(room.id, next.editor), 'editor')
  store.db.prepare('UPDATE rooms SET expires = 0 WHERE id = ?').run(room.id)
  assert.equal(store.authorize(room.id, room.keys.owner), null)
  store.cleanup()
  assert.equal(store.count(), 0)
  store.db.close()
  doc.destroy()
})
test('updates and bounded recovery history survive database reopening', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const directory = mkdtempSync(`${tmpdir()}/quickjot-`),
    path = `${directory}/db.sqlite`
  const store = new Store(path),
    doc = new Y.Doc()
  doc.getMap('meta').set('title', 'Original')
  const room = store.create(Y.encodeStateAsUpdate(doc))
  doc.getMap('meta').set('title', 'Edited')
  store.save(room.id, Y.encodeStateAsUpdate(doc))
  assert.equal(store.revisions(room.id).length, 1)
  store.db.close()
  const reopened = new Store(path),
    restored = new Y.Doc()
  const saved = reopened.get(room.id)
  assert.ok(saved)
  Y.applyUpdate(restored, saved.data)
  assert.equal(restored.getMap('meta').get('title'), 'Edited')
  reopened.delete(room.id)
  assert.equal(reopened.revisions(room.id).length, 0)
  reopened.db.close()
  doc.destroy()
  restored.destroy()
  rmSync(directory, { recursive: true })
})
