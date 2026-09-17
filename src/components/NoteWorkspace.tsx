import type { JSONContent } from "@tiptap/core";
import { useEditor } from "@tiptap/react";
import { Lock, LockOpen, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createExtensions } from "@/editor/extensions";
import { markdownFormattingLosses } from "@/editor/markdown-mode";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { assessUrl } from "@/lib/budget";
import { encodeNote, type NoteDoc } from "@/lib/codec";
import { deriveKey, randomBytes, SALT_BYTES } from "@/lib/crypto";
import { downloadText, pickTextFile, slugify } from "@/lib/files";
import {
  clearHistory,
  forgetNote,
  type HistoryEntry,
  readHistory,
  rememberNote,
} from "@/lib/history";
import type { Lock as LockState } from "@/lib/lock";
import { isBlank } from "@/lib/note";
import {
  readSidebarPreference,
  storeSidebarPreference,
} from "@/lib/sidebar-preference";
import { navigateToNote, noteUrl, writeUrl } from "@/lib/url";
import {
  readWritingPreferences,
  storeWritingPreferences,
} from "@/lib/writing-preferences";
import { AboutModal } from "./AboutModal";
import { EditorSurface } from "./EditorSurface";
import { HistoryDrawer } from "./HistoryDrawer";
import { LockModal } from "./LockModal";
import { ShareModal } from "./ShareModal";
import { ShortcutsModal } from "./ShortcutsModal";
import { StatusBar } from "./StatusBar";
import { TopBar } from "./TopBar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WritingPreferencesModal } from "./WritingPreferencesModal";

interface Props {
  initialDoc: NoteDoc;
  initialLock: LockState | null;
}

/** Cheap identity for "has anything changed since the last save?". */
function signature(title: string, content: JSONContent): string {
  return JSON.stringify([title, content]);
}

const HOTKEY_OPTIONS = {
  enableOnFormTags: true,
  enableOnContentEditable: true,
  preventDefault: true,
  /**
   * Match on `event.key`, not `event.code`.
   *
   * `code` identifies a physical key position, so a code-based binding for
   * "S" fires on whatever key sits where QWERTY puts S — the wrong key
   * entirely on Dvorak, Colemak or AZERTY. These shortcuts are about the
   * character the user sees printed on the key.
   */
  useKey: true,
} as const;

export function NoteWorkspace({ initialDoc, initialLock }: Props) {
  const [title, setTitle] = useState(initialDoc.title);
  const [content, setContent] = useState<JSONContent>(initialDoc.content);
  const [lock, setLock] = useState<LockState | null>(initialLock);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [payload, setPayload] = useState(() =>
    window.location.hash.replace(/^#/, ""),
  );
  const [entries, setEntries] = useState<HistoryEntry[]>(readHistory);
  const [counts, setCounts] = useState({ words: 0, characters: 0 });
  const [focusMode, setFocusMode] = useState(false);
  const headingTarget = useRef<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(readSidebarPreference);
  useEffect(() => storeSidebarPreference(sidebarVisible), [sidebarVisible]);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferences, setPreferences] = useState(readWritingPreferences);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [markdownLosses, setMarkdownLosses] = useState<string[]>([]);
  const [savedSignature, setSavedSignature] = useState(() =>
    signature(initialDoc.title, initialDoc.content),
  );

  const [aboutOpen, setAboutOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const editor = useEditor({
    extensions: createExtensions({ editable: true }),
    content: initialDoc.content,
    immediatelyRender: false,
    autofocus: isBlank(initialDoc) ? "start" : false,
    editorProps: {
      attributes: {
        "aria-label": "Note body",
        class: "min-h-[60vh] focus:outline-none",
      },
    },
    onCreate: ({ editor: instance }) => {
      setCounts({
        words: instance.storage.characterCount.words(),
        characters: instance.storage.characterCount.characters(),
      });
    },
    onUpdate: ({ editor: instance }) => {
      setContent(instance.getJSON());
      setCounts({
        words: instance.storage.characterCount.words(),
        characters: instance.storage.characterCount.characters(),
      });
    },
  });

  useEffect(() => {
    storeWritingPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!editor || !preferences.typewriter || markdown !== null) return;
    const centerCaret = () => {
      if (!editor.isFocused) return;
      const main = editor.view.dom.closest("main");
      if (!main) return;
      const caret = editor.view.coordsAtPos(editor.state.selection.head);
      const bounds = main.getBoundingClientRect();
      main.scrollBy({
        top: caret.top - bounds.top - bounds.height / 2,
        behavior: "instant",
      });
    };
    editor.on("selectionUpdate", centerCaret);
    editor.on("update", centerCaret);
    return () => {
      editor.off("selectionUpdate", centerCaret);
      editor.off("update", centerCaret);
    };
  }, [editor, preferences.typewriter, markdown]);

  const toggleMarkdown = () => {
    if (!editor) return;
    if (markdown !== null) {
      setMarkdown(null);
      return;
    }
    setMarkdownLosses(markdownFormattingLosses(editor.getJSON()));
    setMarkdown(editor.getMarkdown());
  };
  const changeMarkdown = (source: string) => {
    if (!editor) return;
    try {
      editor.commands.setContent(source, {
        contentType: "markdown",
        emitUpdate: true,
      });
      setMarkdown(source);
      setMarkdownLosses([]);
    } catch {
      toast.error("Could not parse Markdown. Your previous note is preserved.");
    }
  };

  useDocumentTitle(title.trim() ? `${title.trim()} · QuickJot` : "QuickJot");

  const save = useCallback(
    async (
      options: { push?: boolean; lockOverride?: LockState | null } = {},
    ) => {
      if (!editor) return null;

      const activeLock =
        "lockOverride" in options ? options.lockOverride : lock;
      const doc: NoteDoc = {
        id: initialDoc.id,
        title,
        content: editor.getJSON(),
      };
      const next = await encodeNote(doc, activeLock ?? undefined);

      writeUrl(next, "edit", { push: options.push ?? false });
      setPayload(next);
      setSavedAt(Date.now());

      // Track what was actually written, not what the decoder produced.
      // Tiptap normalises a loaded document (registering TextAlign adds an
      // explicit `textAlign` attribute, for one), so comparing the editor's
      // JSON against the decoded JSON would leave the note looking permanently
      // unsaved after its first save.
      setContent(doc.content);
      setSavedSignature(signature(doc.title, doc.content));

      // A note with neither a title nor a word in it is not worth remembering.
      if (!isBlank(doc)) {
        setEntries(
          rememberNote(doc, next, {
            encrypted: Boolean(activeLock),
            chars: noteUrl(next).length,
          }),
        );
      }

      return next;
    },
    [editor, title, lock, initialDoc.id],
  );

  const currentSignature = useMemo(
    () => signature(title, content),
    [title, content],
  );
  const debouncedSignature = useDebouncedValue(currentSignature, 700);
  const dirty = currentSignature !== savedSignature;

  /**
   * Autosave. Only fires once typing has settled *and* something actually
   * differs from the last save, so opening a note no longer immediately
   * rewrites its own URL the way the previous build did.
   */
  useEffect(() => {
    if (!dirty) return;
    if (debouncedSignature !== currentSignature) return;
    void save();
  }, [debouncedSignature, currentSignature, dirty, save]);

  const saveExplicitly = useCallback(async () => {
    const next = await save({ push: true });
    if (!next) return;
    toast.success("Saved to the link", {
      description:
        "This URL now holds the whole note. Copy it to keep or share.",
    });
  }, [save]);

  const goToNote = useCallback(
    async (nextPayload: string) => {
      if (dirty) await save();
      setHistoryOpen(false);
      navigateToNote(nextPayload);
    },
    [dirty, save],
  );

  const protectNote = useCallback(
    async (passphrase: string) => {
      const salt = randomBytes(SALT_BYTES);
      const key = await deriveKey(passphrase, salt);
      const nextLock: LockState = { key, salt };
      setLock(nextLock);
      await save({ lockOverride: nextLock });
      toast.success("Note protected", {
        description:
          "The link now carries ciphertext only. Share the passphrase separately.",
        icon: <Lock className="size-4" />,
      });
    },
    [save],
  );

  const removeProtection = useCallback(async () => {
    setLock(null);
    await save({ lockOverride: null });
    toast("Protection removed", {
      description: "Anyone with the link can read this note again.",
      icon: <LockOpen className="size-4" />,
    });
  }, [save]);

  const exportMarkdown = useCallback(() => {
    if (!editor) return;
    const heading = title.trim() ? `# ${title.trim()}\n\n` : "";
    downloadText(
      `${slugify(title)}.md`,
      `${heading}${editor.getMarkdown()}`,
      "text/markdown",
    );
  }, [editor, title]);

  const exportHtml = useCallback(() => {
    if (!editor) return;
    const name = title.trim() || "QuickJot note";
    const page = [
      "<!doctype html>",
      '<html lang="en"><head><meta charset="utf-8">',
      `<title>${escapeHtml(name)}</title>`,
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<style>body{max-width:42rem;margin:3rem auto;padding:0 1.25rem;font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#18181b}pre{background:#f4f4f5;padding:1rem;border-radius:8px;overflow-x:auto}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}ul[data-type="taskList"]{list-style:none;padding-left:0}ul[data-type="taskList"] li{display:flex;align-items:flex-start;gap:.65rem}ul[data-type="taskList"] li>div{flex:1}ul[data-type="taskList"] li p{margin:0}li[data-checked="true"]>div>p{text-decoration:line-through}blockquote{margin-inline:0;padding-inline-start:1rem;border-inline-start:3px solid #d4d4d8;color:#52525b}</style>',
      "</head><body>",
      title.trim() ? `<h1>${escapeHtml(title.trim())}</h1>` : "",
      editor.getHTML(),
      "</body></html>",
    ].join("\n");

    downloadText(`${slugify(title)}.html`, page, "text/html");
  }, [editor, title]);

  const importFile = useCallback(async () => {
    const file = await pickTextFile(
      ".md,.markdown,.txt,.html,.htm,text/markdown,text/html,text/plain",
    );
    if (!file || !editor) return;

    setMarkdown(null);
    const asHtml = /\.html?$/i.test(file.name);
    editor.commands.setContent(file.text, {
      contentType: asHtml ? "html" : "markdown",
      emitUpdate: true,
    });

    if (!title.trim())
      setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    toast.success(`Imported ${file.name}`, {
      description: "Saving it into the link now.",
    });
  }, [editor, title]);

  useHotkeys("mod+s", () => void saveExplicitly(), HOTKEY_OPTIONS, [
    saveExplicitly,
  ]);
  useHotkeys("mod+shift+s", () => setShareOpen(true), HOTKEY_OPTIONS);
  useHotkeys(
    "mod+shift+h",
    () => setHistoryOpen((open) => !open),
    HOTKEY_OPTIONS,
  );
  useHotkeys(
    "mod+shift+f",
    () => setFocusMode((value) => !value),
    HOTKEY_OPTIONS,
  );
  useHotkeys("mod+/", () => setShortcutsOpen(true), HOTKEY_OPTIONS);
  /**
   * Escape leaves focus mode — but it is also how every dialog, sheet and
   * dropdown dismisses itself. So this binding is only live while focus mode
   * is on, it never calls preventDefault, and it stands down while a layer is
   * open so the topmost thing closes first.
   */
  useHotkeys(
    "escape",
    () => {
      if (document.querySelector('[role="dialog"]')) return;
      setFocusMode(false);
    },
    { ...HOTKEY_OPTIONS, preventDefault: false, enabled: focusMode },
    [focusMode],
  );

  const navigateToHeading = (pos: number) => {
    setMarkdown(null);
    if (sidebarOpen) {
      headingTarget.current = pos;
      setSidebarOpen(false);
      return;
    }
    requestAnimationFrame(() => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .setTextSelection(pos + 1)
        .run();
      const element = editor.view.nodeDOM(pos);
      if (element instanceof HTMLElement)
        element.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };
  const sidebar = (
    <WorkspaceSidebar
      editor={editor}
      title={title}
      markdownMode={markdown !== null}
      onModeChange={(source) => {
        setSidebarOpen(false);
        if (source !== (markdown !== null)) toggleMarkdown();
      }}
      onHistory={() => {
        setSidebarOpen(false);
        setHistoryOpen(true);
      }}
      onNewNote={() => void goToNote("")}
      onPreferences={() => {
        setSidebarOpen(false);
        setPreferencesOpen(true);
      }}
      onShortcuts={() => {
        setSidebarOpen(false);
        setShortcutsOpen(true);
      }}
      onNavigate={navigateToHeading}
      preferences={preferences}
      onPreferencesChange={setPreferences}
    />
  );

  const editUrl = noteUrl(payload, "edit");
  const budget = assessUrl(editUrl.length);

  return (
    <div
      className={`qj-workspace flex h-dvh bg-muted/50 p-2 sm:p-3 ${focusMode ? "qj-workspace-focus" : ""}`}
    >
      {
        <aside
          aria-label="Editor sidebar"
          id="editor-sidebar"
          inert={!sidebarVisible || focusMode}
          aria-hidden={!sidebarVisible || focusMode}
          data-open={sidebarVisible && !focusMode}
          className="qj-desktop-sidebar qj-no-print hidden shrink-0 overflow-hidden lg:block"
        >
          <div className="qj-sidebar-inner h-full w-[252px] pr-3">
            {sidebar}
          </div>
        </aside>
      }
      <div className="qj-main-panel bg-background flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-xs">
        {!focusMode && (
          <TopBar
            title={title}
            encrypted={Boolean(lock)}
            onAbout={() => setAboutOpen(true)}
            sidebarExpanded={sidebarVisible}
            onSave={() => void saveExplicitly()}
            onShare={() => setShareOpen(true)}
            onHistory={() => setHistoryOpen(true)}
            onLock={() => setLockOpen(true)}
            onExportMarkdown={exportMarkdown}
            onExportHtml={exportHtml}
            onImport={() => void importFile()}
            onShortcuts={() => setShortcutsOpen(true)}
            onFocusMode={() => setFocusMode(true)}
            onSidebarToggle={() => {
              if (window.matchMedia("(min-width: 1024px)").matches)
                setSidebarVisible((value) => !value);
              else setSidebarOpen(true);
            }}
            onMarkdownMode={toggleMarkdown}
            onWritingPreferences={() => setPreferencesOpen(true)}
            markdownMode={markdown !== null}
          />
        )}

        <main className="qj-editor-scroll min-h-0 flex-1 overflow-y-auto [overscroll-behavior:contain]">
          <div
            className={`qj-writing mx-auto pt-4 sm:pt-8 ${preferences.dimInactive ? "qj-dim-inactive" : ""}`}
            data-font={preferences.font}
            style={
              {
                maxWidth: { narrow: 600, comfortable: 760, wide: 1040 }[
                  preferences.width
                ],
                "--qj-font-size": `${preferences.fontSize}px`,
                "--qj-line-height": preferences.lineHeight,
              } as React.CSSProperties
            }
          >
            <EditorSurface
              editor={editor}
              title={title}
              onTitleChange={setTitle}
              markdown={markdown}
              onMarkdownChange={changeMarkdown}
              markdownLosses={markdownLosses}
            />
          </div>
        </main>

        {focusMode ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Leave focus mode"
                onClick={() => setFocusMode(false)}
                className="qj-no-print fixed right-6 bottom-6 z-40 rounded-full opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100"
              >
                <Minimize2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave focus mode (Esc)</TooltipContent>
          </Tooltip>
        ) : (
          <div className="qj-no-print">
            <StatusBar
              dirty={dirty}
              budget={budget}
              savedAt={savedAt}
              words={counts.words}
              characters={counts.characters}
              encrypted={Boolean(lock)}
            />
          </div>
        )}
      </div>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[290px] gap-0 rounded-r-2xl p-0"
          onCloseAutoFocus={(event) => {
            if (headingTarget.current === null) return;
            event.preventDefault();
            const pos = headingTarget.current;
            headingTarget.current = null;
            navigateToHeading(pos);
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Editor sidebar</SheetTitle>
            <SheetDescription>
              Editor modes, document outline, and writing preferences.
            </SheetDescription>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
      <WritingPreferencesModal
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        value={preferences}
        onChange={setPreferences}
      />

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        editUrl={editUrl}
        readUrl={noteUrl(payload, "read")}
        encrypted={Boolean(lock)}
      />

      <LockModal
        open={lockOpen}
        onOpenChange={setLockOpen}
        isLocked={Boolean(lock)}
        onProtect={protectNote}
        onRemove={removeProtection}
      />

      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <HistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={entries}
        currentId={initialDoc.id}
        onOpenNote={(next) => void goToNote(next)}
        onNewNote={() => void goToNote("")}
        onForget={(id) => setEntries(forgetNote(id))}
        onClearAll={() => setEntries(clearHistory())}
      />
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
