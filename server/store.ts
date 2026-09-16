import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type Role = 'owner' | 'editor' | 'viewer'
export interface Room {
  id: string
  data: Uint8Array
  owner: string
  editor: string
  viewer: string
  expires: number
  updated: number
}
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const token = () => randomBytes(32).toString('base64url')
export class Store {
  db: DatabaseSync
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, data BLOB NOT NULL, owner TEXT NOT NULL, editor TEXT NOT NULL, viewer TEXT NOT NULL, expires INTEGER NOT NULL, updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY, room TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, data BLOB NOT NULL, created INTEGER NOT NULL);`)
  }
  get(id: string): Room | undefined {
    const row = this.db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as unknown as
      | Room
      | undefined
    return row && row.expires > Date.now() ? row : undefined
  }
  authorize(id: string, value: string): Role | null {
    const room = this.get(id)
    if (!room || value.length < 32 || value.length > 128) return null
    const digest = hash(value)
    return (['owner', 'editor', 'viewer'] as const).find((role) => room[role] === digest) ?? null
  }
  create(data: Uint8Array, days = 30) {
    const id = randomUUID(),
      keys = { owner: token(), editor: token(), viewer: token() }
    const expires = Date.now() + days * 86400000
    this.db
      .prepare('INSERT INTO rooms VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, data, hash(keys.owner), hash(keys.editor), hash(keys.viewer), expires, Date.now())
    return { id, keys, expires }
  }
  save(id: string, data: Uint8Array) {
    if (!this.get(id)) throw new Error('Note unavailable')
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const last = this.db
        .prepare('SELECT MAX(created) AS created FROM revisions WHERE room = ?')
        .get(id) as { created: number | null }
      if (!last.created || Date.now() - last.created > 60000) {
        this.db
          .prepare(
            'INSERT INTO revisions(room,data,created) SELECT id,data,? FROM rooms WHERE id = ?',
          )
          .run(Date.now(), id)
        this.db
          .prepare(
            'DELETE FROM revisions WHERE room = ? AND id NOT IN (SELECT id FROM revisions WHERE room = ? ORDER BY id DESC LIMIT 20)',
          )
          .run(id, id)
      }
      this.db
        .prepare('UPDATE rooms SET data = ?, updated = ? WHERE id = ?')
        .run(data, Date.now(), id)
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
  rotate(id: string) {
    const keys = { editor: token(), viewer: token() }
    this.db
      .prepare('UPDATE rooms SET editor = ?, viewer = ? WHERE id = ?')
      .run(hash(keys.editor), hash(keys.viewer), id)
    return keys
  }
  extend(id: string) {
    const expires = Date.now() + 30 * 86400000
    this.db.prepare('UPDATE rooms SET expires = ? WHERE id = ?').run(expires, id)
    return expires
  }
  delete(id: string) {
    this.db.prepare('DELETE FROM rooms WHERE id = ?').run(id)
  }
  cleanup() {
    this.db.prepare('DELETE FROM rooms WHERE expires <= ?').run(Date.now())
  }
  count() {
    return (this.db.prepare('SELECT COUNT(*) AS count FROM rooms').get() as { count: number }).count
  }
  revisions(id: string) {
    return this.db
      .prepare('SELECT id,created FROM revisions WHERE room = ? ORDER BY id DESC')
      .all(id)
  }
}
