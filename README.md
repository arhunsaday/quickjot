# QuickJot

A notepad with no server. You write a note, and the whole thing — text,
formatting, title — is compressed and encoded into the page's own URL. Share
the link and you have shared the document; there is no database, no account and
nothing stored anywhere on your behalf.

The payload lives in the URL **fragment**, which browsers never transmit, so
even the host serving the app never sees a note.

## Features

- **Rich text editing** — headings, lists, quotes, code blocks with syntax
  highlighting, links, highlight, alignment, sub/superscript.
- **`/` command menu** for inserting blocks, and a formatting bar that appears
  when you select text. No permanent toolbar in the way of the writing.
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
- **Installable PWA**, fully offline. It has no backend to be offline from.
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

Because every note is a URL against the app shell, any static host works as
long as unknown paths fall back to `index.html`.

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
