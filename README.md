# QuickJot

A notepad with two ways to save: self-contained link snapshots, or persistent live notes with collaboration. Optional AI editing uses your own OpenAI or Anthropic key.

Snapshots keep the entire document in a compressed URL fragment, with optional password encryption. Live notes use stable random links and a Node backend with SQLite; the host stores their unlocked content. No account is required.

## Features

- **Rich text editing** — headings, lists, quotes, code blocks with syntax
  highlighting, links, highlight, alignment, sub/superscript.
- **`/` command menu** for inserting blocks, and a formatting bar that appears
  when you select text. No permanent toolbar in the way of the writing.
- **Task lists** with shadcn checkboxes, nested items, slash commands and Markdown support.
- **Collapsible sections** with editable summaries and persistent open state.
- **Block drag and drop** with a visible insertion guide and automatic scrolling;
  a separate block menu handles duplication and deletion.
- **Code block controls** — language selection, copy, line numbers, wrapping,
  and two-space Tab indentation. Line numbers and wrapping are alternate views.
- **Document outline** in the animated sidebar; click a heading to jump. The sidebar
  starts closed and remembers its open/closed state on the device.
- **Markdown source mode** with automatic saving. Switching views alone preserves
  rich formatting; editing source warns about formatting Markdown cannot retain.
- **Writing preferences** — page width, font, text size, line spacing, typewriter
  scrolling and dimming inactive blocks, saved on the device.
- **Markdown** in both directions: paste it in, export it out.
- **Password-protected notes** — AES-GCM encryption with a key derived from a
  passphrase (PBKDF2, 600k iterations). The passphrase never touches the URL;
  the link carries only salt, IV and ciphertext.
- **Local note history** — a list of notes you have opened, kept on the device.
  Closing a tab is no longer the end of a note.
- **URL budget meter** — tells you, honestly, when a note has grown too long to
  survive being pasted into a chat client or a QR code.
- **Read-only sharing** (`?view=read`) — a clean page for recipients.
- **Export / import** `.md` and `.html`, plus a QR code for the link.
- **Installable PWA** — offline snapshots and locally cached live-note drafts.
- Light, dark and system themes; keyboard shortcuts (press <kbd>⌘/</kbd>);
  focus mode; a print stylesheet.

## Running it

```bash
pnpm install
pnpm dev
```

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Typecheck and build to `dist/` |
| `pnpm preview` | Serve the production build |
| `pnpm test` | Unit tests |
| `pnpm lint` | Lint and format check |
| `pnpm format` | Apply lint and format fixes |

Static hosts (including Vercel static deployments) support snapshot notes. Persistent notes and AI require the Node backend; see [deployment instructions](docs/deployment.md).

## Persistent notes and AI

- Stable live links with synchronized title/body, collaborator carets and presence.
- Separate owner, editor and viewer capabilities enforced by the backend; rotate invitation links to revoke old access.
- SQLite persistence, 30-day expiry with owner extension, bounded recovery history, snapshot conversion and deletion.
- IndexedDB drafts and reconnection through Hocuspocus/Yjs. Markdown source is a read-only preview in live mode to avoid overwriting concurrent edits; create a snapshot to edit source.
- OpenAI (default) or Anthropic BYOK, manual model selection, streaming proposals, cancellation, preview, guarded replacement, insertion and copy. Keys stay in browser/server memory for the request and are never stored in notes, URLs, history or the database. Chosen text and keys pass through the backend to the provider; provider usage is charged to the key owner.
- A proposal cannot replace text if the document has changed since generation began. In that case, insert at the current cursor or copy the proposal.

Recent live-note links are kept on this device, including management access for notes you own. Protect the owner link; anyone holding it can delete the note or replace invitation links. Live notes do not inherit snapshot password encryption.

Run `pnpm dev` for the frontend and backend, `pnpm dev:web` for frontend-only development, `pnpm test:server` for backend tests, and `pnpm start` to serve the production build and APIs. Node 24 or newer is required.

## The URL format

This is the project's real storage format, so it is versioned from the first
release. The envelope is base64url-encoded into the fragment:

```
byte 0       format version (currently 1)
byte 1       flags — bit 0 set means the payload is encrypted
bytes 2..n   plaintext:  gzip(utf-8 JSON)
             encrypted:  salt(16) ‖ iv(12) ‖ AES-GCM(gzip(utf-8 JSON))
```

Two decisions worth recording:

- **The version byte comes first.** One byte now means the encoding can change
  later without invalidating links people have already bookmarked or shared.
  A payload claiming a version this build does not know is reported as such,
  rather than as a corrupt link.
- **Compress, then encrypt.** Ciphertext is indistinguishable from noise and
  will not compress, so the reverse order would roughly triple the length of
  every protected note.

Compression uses the platform's `CompressionStream`, and encoding a plain
`btoa` over `Uint8Array` — no compression or base64 dependency is shipped.

### Note content is untrusted input

A note arrives as JSON from a URL a stranger may have written. It is parsed
through Tiptap's schema, which discards nodes, marks and attributes the editor
does not define — that is what makes it safe to render. **Never render a note's
content as raw HTML** (`dangerouslySetInnerHTML` or equivalent): doing so would
turn any shared link into stored XSS.

## Stack

React 19 · Vite 8 · TypeScript 7 · Tailwind CSS 4 · shadcn/ui (Radix) ·
lucide-react · Tiptap 3 · lowlight · Biome · Vitest · vite-plugin-pwa

Tests cover the parts where a mistake would be invisible or destructive: the
URL codec, the encryption round trip, damaged-link handling, the note history
store, and the markdown conversion.
