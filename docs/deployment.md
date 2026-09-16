# Deploy QuickJot

## Runtime

The implementation uses React/Vite/Tiptap on the frontend and one Node 24+ process with Express, Hocuspocus/Yjs, SQLite and the official OpenAI/Anthropic SDKs. HTTP and WebSockets share port 3001. No Redis, external database, host AI key or subscription to Tiptap Cloud is needed.

Run one backend instance with a persistent volume. SQLite is the source of truth and the active Hocuspocus process coordinates rooms. Do not horizontally scale this build by launching independent copies against the same database: that needs a shared pub/sub design. Durable Objects remain an alternative architecture, not the deployed backend in this branch.

## Local development

```sh
pnpm install
pnpm dev
```

The frontend proxies `/api` and `/collaboration` to `127.0.0.1:3001`. Development accepts localhost origins. Backend data defaults to `data/quickjot.sqlite`, ignored by Git. Set environment variables in the shell or use Node's `--env-file=.env` when starting the server; copying `.env.example` alone does not automatically load it.

```sh
pnpm build
APP_ORIGIN=http://localhost:3001 pnpm start
```

`pnpm dev:web` and static `dist/` deployments preserve snapshot functionality without the backend. Persistent-note creation and AI show errors when the API is unavailable. `pnpm preview` previews static assets only.

## Docker

```sh
APP_ORIGIN=https://notes.example.com docker compose up -d --build
```

Put HTTPS termination in front of port 3001 and route both HTTP and WebSocket upgrades to it. The named `notes` volume keeps `/data/quickjot.sqlite` across restarts. Back up the database using SQLite's backup mechanism; copying only the main file while WAL writes are active can miss data. The container runs as the non-root `node` user.

The Docker image was built and started locally with Node 24, including a successful health check. Validate HTTPS, persistent-volume backups and WebSocket routing on your production host.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | HTTP/WebSocket listening port |
| `DATABASE_PATH` | `data/quickjot.sqlite` | File on persistent storage |
| `APP_ORIGIN` | unset | Exact public origin for browser requests; set for production |
| `MAX_ROOMS` | `10000` | Global creation cap |
| `DISABLE_CREATION` | `false` | Stop new rooms without blocking existing reads |
| `DISABLE_AI` | `false` | Disable the BYOK proxy |

Production should run with `NODE_ENV=production`. Configure a trusted reverse proxy before enabling forwarded-IP handling; rate limits currently use the direct socket address, which can group clients behind a proxy. The app deliberately does not blindly trust arbitrary forwarded IP headers.

Routes: `/api/health`, `/api/notes`, `/api/notes/:id`, `/api/notes/:id/access`, `/api/notes/:id/extend`, `/api/notes/:id/revisions`, `/api/notes/:id/revisions/:revision`, `/api/ai`, and `/collaboration` for Hocuspocus.

## Storage and access policy

Live notes expire 30 days after creation; owner extension starts a new 30-day window. Expiry cleanup runs each minute, while authorization rejects expired notes immediately. Each document is capped at 1 MiB of encoded Yjs state with at most 20 connections. HTTP creation is limited to 20 requests/hour per IP, AI to 10/minute, and all APIs to 100/minute; WebSocket message rate and payload size are bounded too.

Owner links manage access and deletion. Editor/viewer links have independent random capability tokens; only hashes are stored in SQLite. Replacing invitation links disconnects current sessions and invalidates both invitations. Owner access remains intact. URLs keep capabilities in fragments and API authorization uses headers/the Hocuspocus authentication message.

SQLite stores current Yjs state before accepting incoming sync updates. Recovery stores at most 20 prior states, sampled at most once per minute. Open a revision as a separate snapshot so recovery does not silently overwrite active collaborators. Presence is transient. IndexedDB caches drafts per capability; it is not a server backup. Acknowledged edits survive process restarts; unacknowledged edits need reconnecting from their browser draft.

Snapshots remain self-contained and may use password encryption. Live notes are not end-to-end encrypted. Password-protected snapshots must be explicitly unlocked before conversion; the host can read the live copy. Anyone possessing an invitation has its stated access, and owner recovery is not available if the owner link is lost.

## AI

No server-side AI key is configured. Users choose OpenAI or Anthropic, enter a model and their own key, and generate a proposal. The backend uses fixed official provider endpoints and never accepts arbitrary base URLs. Requests are cancellable and time-bounded; prompts, keys and outputs are not persisted or logged by the application. Provider retention policies still apply; OpenAI requests use `store: false`.

Keys persist only in the panel's memory for the current page; closing the panel retains the key for convenience, while Forget key or reload clears it. Keys never enter Yjs, recent-note history or snapshot URLs. The preview displays text rather than executing model HTML; accepted output is parsed through the editor's Markdown/schema pipeline.

OpenAI integration follows the [Responses streaming documentation](https://developers.openai.com/api/docs/guides/streaming-responses). Models are editable because access differs by provider account. No paid provider call was made during automated verification: SDK transport was tested with a mocked stream. A real key is required to verify account/model access.

## Verification

```sh
pnpm lint
pnpm test
pnpm test:server
pnpm build
```

Backend tests use an isolated temporary SQLite database and real WebSocket clients for editing, viewer write rejection, capabilities, invitation rotation and deletion. Store tests verify database reopening and expiry. AI tests verify Responses request configuration, streaming, context limits and stale-proposal rejection.

Vercel's static frontend deployment can build this branch, but its static hosting alone cannot run SQLite persistence or the long-lived Hocuspocus server. Deploy the combined application to a Node/container host with persistent disk, or configure a reverse proxy from the frontend host to that backend. No production resources were provisioned by this change.
