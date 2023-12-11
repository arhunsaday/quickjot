import { Button, Flex, Group, Text, TextInput } from "@mantine/core";
import {
  useClipboard,
  useDebouncedValue,
  useDocumentTitle,
} from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { Link, RichTextEditor } from "@mantine/tiptap";
import Placeholder from "@tiptap/extension-placeholder";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./components/ThemeToggle";
import { formatTimestamp, placeholderContent, unzipurl, zipurl } from "./utils";

export function Editor() {
  const clipboard = useClipboard({ timeout: 500 });

  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  let keydownFlag = useRef(false);

  // Parse URL for initial content and title
  const queryParams = new URLSearchParams(window.location.search);
  const initialContent = window.location.hash
    ? unzipurl(window.location.hash.substring(1))
    : "";
  const initialTitle = queryParams.get("title") || "";

  // Set document title
  const [title, setTitle] = useState(initialTitle);
  useDocumentTitle(title);

  // Save editor content to URL
  function saveEditorToURL(editor: any, keydownFlag: boolean) {
    if (!keydownFlag) keydownFlag = true;
    let state = zipurl(editor?.getHTML() || "");
    window.history.pushState(
      null,
      "",
      `?title=${encodeURIComponent(title)}#${state}`
    );
    setLastSavedTime(Date.now());
  }

  // Configure editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholderContent }),
      Link,
    ],
    content: initialContent,
  });

  const [content, setContent] = useState("");
  const [debouncedContent] = useDebouncedValue(content, 1000);

  // Update content state whenever the editor's content changes
  useEffect(() => {
    if (!editor) return;

    const handleContentUpdate = () => {
      setContent(editor.getHTML());
    };

    editor.on("update", handleContentUpdate);

    return () => {
      editor.off("update", handleContentUpdate);
    };
  }, [editor]);

  // Save editor content to URL when debounced content changes
  useEffect(() => {
    saveEditorToURL(editor, keydownFlag.current);
  }, [debouncedContent, editor, title]);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
      <RichTextEditor editor={editor}>
        <Flex justify="space-between" p="md" pb={0}>
          <Group>
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              placeholder="Document Title"
            />
            <Button
              onClick={() => {
                saveEditorToURL(editor, keydownFlag.current);
                notifications.show({
                  title: "Saved",
                  message:
                    "Your document has been saved to the URL. You can now share it with others.",
                });
              }}
            >
              Save to URL
            </Button>
            <Button
              variant="light"
              onClick={() => {
                saveEditorToURL(editor, keydownFlag.current);
                clipboard.copy(window.location);
                notifications.show({
                  title: "Copied",
                  message:
                    "Your document URL has been copied to your clipboard. You can now share it with others.",
                });
              }}
            >
              Share note
            </Button>
          </Group>
          <ThemeToggle />
        </Flex>

        <RichTextEditor.Toolbar sticky>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Underline />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
            <RichTextEditor.Highlight />
            <RichTextEditor.Code />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Blockquote />
            <RichTextEditor.Hr />
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <RichTextEditor.Subscript />
            <RichTextEditor.Superscript />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.AlignLeft />
            <RichTextEditor.AlignCenter />
            <RichTextEditor.AlignJustify />
            <RichTextEditor.AlignRight />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>

        <RichTextEditor.Content style={{ minHeight: "80vh" }} />

        <Flex justify="flex-end" p="sm">
          <Text color="gray">
            {lastSavedTime
              ? `Last saved: ${formatTimestamp(lastSavedTime)}`
              : "Not saved yet"}
          </Text>
        </Flex>
      </RichTextEditor>
    </div>
  );
}
