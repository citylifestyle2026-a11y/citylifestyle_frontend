import { useEffect, useMemo, memo, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaCode,
  FaUndo,
  FaRedo,
} from "react-icons/fa";

/**
 * Toolbar button. Kept outside the main component so it isn't redefined
 * on every render, and memoized since its props change only when the
 * editor's active/enabled state actually changes.
 */
const ToolbarButton = memo(function ToolbarButton({
  onClick,
  isActive,
  isDisabled,
  label,
  children,
}) {
  return (
    <button
      type="button"
      className={`richTextEditor__toolbarBtn${
        isActive ? " richTextEditor__toolbarBtn--active" : ""
      }`}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
});

function Toolbar({ editor }) {
  // Each handler is memoized so ToolbarButton's onClick prop stays stable
  // across re-renders that don't affect that specific command.
  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleUnderline = useCallback(
    () => editor?.chain().focus().toggleUnderline().run(),
    [editor]
  );
  const toggleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const toggleH1 = useCallback(
    () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    [editor]
  );
  const toggleH2 = useCallback(
    () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    [editor]
  );
  const toggleBulletList = useCallback(
    () => editor?.chain().focus().toggleBulletList().run(),
    [editor]
  );
  const toggleOrderedList = useCallback(
    () => editor?.chain().focus().toggleOrderedList().run(),
    [editor]
  );
  const toggleBlockquote = useCallback(
    () => editor?.chain().focus().toggleBlockquote().run(),
    [editor]
  );
  const toggleCodeBlock = useCallback(
    () => editor?.chain().focus().toggleCodeBlock().run(),
    [editor]
  );
  const undo = useCallback(() => editor?.chain().focus().undo().run(), [editor]);
  const redo = useCallback(() => editor?.chain().focus().redo().run(), [editor]);

  if (!editor) return null;

  return (
    <div className="richTextEditor__toolbar">
      <ToolbarButton onClick={toggleBold} isActive={editor.isActive("bold")} label="Bold">
        <FaBold />
      </ToolbarButton>
      <ToolbarButton onClick={toggleItalic} isActive={editor.isActive("italic")} label="Italic">
        <FaItalic />
      </ToolbarButton>
      <ToolbarButton
        onClick={toggleUnderline}
        isActive={editor.isActive("underline")}
        label="Underline"
      >
        <FaUnderline />
      </ToolbarButton>
      <ToolbarButton onClick={toggleStrike} isActive={editor.isActive("strike")} label="Strikethrough">
        <FaStrikethrough />
      </ToolbarButton>

      <span className="richTextEditor__toolbarDivider" />

      <ToolbarButton
        onClick={toggleH1}
        isActive={editor.isActive("heading", { level: 1 })}
        label="Heading 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={toggleH2}
        isActive={editor.isActive("heading", { level: 2 })}
        label="Heading 2"
      >
        H2
      </ToolbarButton>

      <span className="richTextEditor__toolbarDivider" />

      <ToolbarButton
        onClick={toggleBulletList}
        isActive={editor.isActive("bulletList")}
        label="Bullet List"
      >
        <FaListUl />
      </ToolbarButton>
      <ToolbarButton
        onClick={toggleOrderedList}
        isActive={editor.isActive("orderedList")}
        label="Ordered List"
      >
        <FaListOl />
      </ToolbarButton>
      <ToolbarButton
        onClick={toggleBlockquote}
        isActive={editor.isActive("blockquote")}
        label="Blockquote"
      >
        <FaQuoteRight />
      </ToolbarButton>
      <ToolbarButton
        onClick={toggleCodeBlock}
        isActive={editor.isActive("codeBlock")}
        label="Code Block"
      >
        <FaCode />
      </ToolbarButton>

      <span className="richTextEditor__toolbarDivider" />

      <ToolbarButton onClick={undo} isDisabled={!editor.can().undo()} label="Undo">
        <FaUndo />
      </ToolbarButton>
      <ToolbarButton onClick={redo} isDisabled={!editor.can().redo()} label="Redo">
        <FaRedo />
      </ToolbarButton>
    </div>
  );
}

/**
 * Reusable rich text editor built on Tiptap.
 * Fully controlled: renders `value` (HTML string) and reports every change
 * back via `onChange` as an HTML string.
 */
function RichTextEditor({ value, onChange, placeholder }) {
  // Extensions array is created once — passing a new array/object on every
  // render would make Tiptap tear down and rebuild the editor unnecessarily.
  const extensions = useMemo(
    () => [
      StarterKit,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder || "",
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const editor = useEditor({
    extensions,
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
  });

  // Keep the editor in sync when `value` changes from outside (e.g. parent
  // resets the form). Skipped while the user is actively typing so we don't
  // fight the cursor position or re-trigger onUpdate in a loop.
  useEffect(() => {
    if (!editor) return;
    const isSame = value === editor.getHTML();
    if (!isSame && !editor.isFocused) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  // Placeholder text can change independently of the extensions array.
  useEffect(() => {
    if (!editor) return;
    editor.extensionManager.extensions.forEach((extension) => {
      if (extension.name === "placeholder") {
        extension.options.placeholder = placeholder || "";
      }
    });
  }, [placeholder, editor]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div className="richTextEditor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="richTextEditor__content" />
    </div>
  );
}

export default memo(RichTextEditor);
