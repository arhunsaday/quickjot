import StarterKit from "@tiptap/starter-kit";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useClipboard, useDebouncedValue } from "@mantine/hooks";
import { placeholderContent, zipurl, unzipurl, formatTimestamp } from "./utils";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ActionIcon,
  Button,
  Flex,
  Group,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { ThemeToggle } from "./components/ThemeToggle";

export function Editor() {
  const clipboard = useClipboard({ timeout: 500 });

  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  let keydownFlag = useRef(false);

  // Save editor content to URL
  function saveEditorToURL(editor: any, keydownFlag: boolean) {
    if (!keydownFlag) keydownFlag = true;
    let state = zipurl(editor?.getHTML() || "");
    window.location.hash = state;
    setLastSavedTime(Date.now());
  }

  // Initial content from URL
  const initialContent = window.location.hash
    ? unzipurl(window.location.hash.substring(1))
    : "";

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
  const [debouncedContent] = useDebouncedValue(content, 1000); // 1000ms debounce time

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
  }, [debouncedContent, editor]);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
      <RichTextEditor editor={editor}>
        <Flex justify="space-between" p="md">
          <Group>
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
            <Text>
              {lastSavedTime
                ? `Last saved: ${formatTimestamp(lastSavedTime)}`
                : "Not saved yet"}
            </Text>
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
      </RichTextEditor>
    </div>
  );
}
