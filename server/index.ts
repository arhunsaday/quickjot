import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { Hocuspocus } from '@hocuspocus/server'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import { z } from 'zod'
import { aiInput, generate } from './ai.js'
import { Store } from './store.js'

if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN)
  throw new Error('Set APP_ORIGIN to your public HTTPS origin in production.')
const maxSize = 1024 * 1024
const store = new Store(process.env.DATABASE_PATH || 'data/quickjot.sqlite')
const app = express()
app.disable('x-powered-by')
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'script-src': ["'self'"],
        'connect-src': ["'self'", 'ws:', 'wss:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'style-src': ["'self'", "'unsafe-inline'"],
      },
    },
  }),
)
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
app.use(
  '/api',
  rateLimit({ windowMs: 60000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }),
)
app.use(express.json({ limit: '1500kb' }))
const allowedOrigin = (origin: string | undefined, host: string | undefined) => {
  if (!origin) return true // Non-browser API clients still need a capability.
  if (process.env.NODE_ENV === 'production') return origin === process.env.APP_ORIGIN
  return (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    origin === process.env.APP_ORIGIN ||
    origin === `http://${host}`
  )
}
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && !allowedOrigin(req.headers.origin, req.headers.host)) {
    res.status(403).json({ error: 'Origin not allowed' })
    return
  }
  next()
})
const bearer = (req: express.Request) => req.headers.authorization?.replace(/^Bearer /, '') || ''
const auth =
  (owner = false): express.RequestHandler =>
  (req, res, next) => {
    const role = store.authorize(String(req.params.id), bearer(req))
    if (!role || (owner && role !== 'owner')) {
      res.status(403).json({ error: 'This note is unavailable, expired, or the link was revoked.' })
      return
    }
    res.locals.role = role
    next()
  }
app.get('/api/health', (_req, res) =>
  res.json({ persistent: true, ai: process.env.DISABLE_AI !== 'true' }),
)
app.post(
  '/api/notes',
  rateLimit({ windowMs: 3600000, limit: 20, legacyHeaders: false }),
  (req, res) => {
    if (
      process.env.DISABLE_CREATION === 'true' ||
      store.count() >= Number(process.env.MAX_ROOMS || 10000)
    ) {
      res.status(503).json({ error: 'Live note creation is temporarily unavailable.' })
      return
    }
    const input = z.object({ update: z.string().max(1400000) }).safeParse(req.body)
    if (!input.success) {
      res.status(400).json({ error: 'Invalid document' })
      return
    }
    const data = Buffer.from(input.data.update, 'base64')
    const doc = new Y.Doc()
    try {
      Y.applyUpdate(doc, data)
      if (data.length > maxSize || doc.getXmlFragment('default').length === 0) throw new Error()
      res.status(201).json(store.create(Y.encodeStateAsUpdate(doc)))
    } catch {
      res.status(400).json({ error: 'Invalid or oversized document' })
    } finally {
      doc.destroy()
    }
  },
)
app.get('/api/notes/:id', auth(), (req, res) => {
  const room = store.get(String(req.params.id))
  if (!room) {
    res.status(403).json({ error: 'Note unavailable' })
    return
  }
  res.json({
    id: room.id,
    expires: room.expires,
    updated: room.updated,
    role: res.locals.role,
    update: Buffer.from(room.data).toString('base64'),
  })
})
const messageRates = new WeakMap<object, { start: number; count: number }>()
const collab: Hocuspocus<{ token: string }> = new Hocuspocus<{ token: string }>({
  timeout: 30000,
  debounce: 0,
  maxDebounce: 0,
  async onAuthenticate({ documentName, token, connectionConfig }) {
    const role = store.authorize(documentName, token)
    if (!role) throw new Error('This link is expired or revoked.')
    if ((collab.documents.get(documentName)?.getConnectionsCount() || 0) >= 20)
      throw new Error('This note has too many connected editors.')
    connectionConfig.readOnly = role === 'viewer'
    return { token }
  },
  async onLoadDocument({ documentName, document }) {
    const room = store.get(documentName)
    if (!room) throw new Error('Note unavailable')
    Y.applyUpdate(document, room.data)
  },
  async beforeHandleMessage({ documentName, context, update, connection }) {
    const now = Date.now(),
      prior = messageRates.get(connection)
    const bucket = prior && now - prior.start < 10000 ? prior : { start: now, count: 0 }
    bucket.count++
    messageRates.set(connection, bucket)
    if (bucket.count > 500) throw new Error('Too many messages')
    if (!store.authorize(documentName, context.token) || update.length > maxSize + 1024)
      throw new Error('Link revoked or message too large')
  },
  async beforeSync({ documentName, context, type, payload }) {
    if (type === 0) return
    const role = store.authorize(documentName, context.token)
    if (!role) throw new Error('Link revoked')
    if (role === 'viewer') return // Hocuspocus enforces readOnly and acknowledges unchanged sync state.
    const room = store.get(documentName)
    if (!room) throw new Error('Note unavailable')
    const candidate = new Y.Doc()
    try {
      Y.applyUpdate(candidate, room.data)
      Y.applyUpdate(candidate, payload)
      const data = Y.encodeStateAsUpdate(candidate)
      if (data.length > maxSize) throw new Error('Note exceeds 1 MiB limit')
      store.save(documentName, data)
    } finally {
      candidate.destroy()
    }
  },
})
app.post('/api/notes/:id/access', auth(true), (req, res) => {
  const keys = store.rotate(String(req.params.id))
  collab.closeConnections(String(req.params.id))
  res.json(keys)
})
app.post('/api/notes/:id/extend', auth(true), (req, res) =>
  res.json({ expires: store.extend(String(req.params.id)) }),
)
app.delete('/api/notes/:id', auth(true), (req, res) => {
  store.delete(String(req.params.id))
  collab.closeConnections(String(req.params.id))
  res.status(204).end()
})
app.get('/api/notes/:id/revisions', auth(), (req, res) =>
  res.json(store.revisions(String(req.params.id))),
)
app.get('/api/notes/:id/revisions/:revision', auth(), (req, res) => {
  const row = store.db
    .prepare('SELECT data FROM revisions WHERE room = ? AND id = ?')
    .get(String(req.params.id), String(req.params.revision)) as { data: Uint8Array } | undefined
  if (!row) {
    res.status(404).json({ error: 'Revision unavailable' })
    return
  }
  res.json({ update: Buffer.from(row.data).toString('base64') })
})
app.post(
  '/api/ai',
  rateLimit({ windowMs: 60000, limit: 10, legacyHeaders: false }),
  async (req, res) => {
    if (process.env.DISABLE_AI === 'true') {
      res.status(503).json({ error: 'AI is disabled on this host.' })
      return
    }
    const input = aiInput.safeParse(req.body),
      key = bearer(req)
    if (!input.success || !key || key.length > 512) {
      res.status(400).json({ error: 'Provide a key, model, instruction and source text.' })
      return
    }
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 90000)
    res.on('close', () => controller.abort())
    res.set({ 'Content-Type': 'application/x-ndjson', 'X-Accel-Buffering': 'no' })
    const send = (value: object) => res.write(`${JSON.stringify(value)}\n`)
    try {
      for await (const text of generate(input.data, key, controller.signal)) {
        if (res.destroyed) break
        send({ text })
      }
      if (!res.destroyed) send({ done: true })
    } catch (error) {
      const status =
        typeof error === 'object' && error !== null && 'status' in error ? error.status : 0
      if (!res.destroyed)
        send({
          error:
            status === 401
              ? 'The provider rejected your API key.'
              : status === 429
                ? 'Provider quota or rate limit reached. Check your provider billing.'
                : 'Generation failed or timed out. Check the model name and retry.',
        })
    } finally {
      clearTimeout(timer)
      res.end()
    }
  },
)
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }))
app.use(express.static(resolve('dist')))
app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')))
app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (!res.headersSent)
      res.status(400).json({
        error:
          error instanceof SyntaxError ? 'Invalid request JSON' : 'Request could not be completed',
      })
  },
)
const http = createServer(app),
  sockets = new WebSocketServer({ noServer: true, maxPayload: maxSize + 1024 })
http.on('upgrade', (req, socket, head) => {
  if (
    !/^\/collaboration\/?$/.test(req.url || '') ||
    (process.env.NODE_ENV === 'production' && !req.headers.origin) ||
    !allowedOrigin(req.headers.origin, req.headers.host)
  ) {
    socket.destroy()
    return
  }
  sockets.handleUpgrade(req, socket, head, (ws) => {
    const headers = new Headers()
    for (const [name, value] of Object.entries(req.headers))
      if (typeof value === 'string') headers.set(name, value)
    const connection = collab.handleConnection(
      ws,
      new Request(`http://${req.headers.host}/collaboration`, { headers }),
    )
    ws.on('message', (data) => connection.handleMessage(new Uint8Array(data as Buffer)))
    ws.on(
      'close',
      (code, reason) => void connection.handleClose({ code, reason: reason.toString() }),
    )
  })
})
const cleanup = setInterval(() => {
  for (const id of collab.documents.keys()) if (!store.get(id)) collab.closeConnections(id)
  store.cleanup()
}, 60000)
http.listen(Number(process.env.PORT || 3001), () => console.log('QuickJot backend ready'))
const shutdown = async () => {
  clearInterval(cleanup)
  collab.closeConnections()
  collab.flushPendingStores()
  sockets.close()
  http.close()
  store.db.close()
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
