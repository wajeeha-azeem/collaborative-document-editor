"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { WithTooltip } from "@/components/with-tooltip";
import { cn } from "@/lib/utils";

type EditorToolbarProps = {
  editor: Editor | null;
};

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return (
      <div
        className="flex flex-wrap gap-1 border-b border-border/70 bg-mist/60 p-2.5"
        aria-hidden
      />
    );
  }

  return (
    <div
      className="flex flex-wrap gap-1 border-b border-border/70 bg-mist/70 p-2 sm:p-2.5"
      role="toolbar"
      aria-label="Text formatting"
    >
      <ToolbarButton
        label="Bold"
        pressed={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        pressed={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        pressed={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        label="Heading 1"
        pressed={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        pressed={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 />
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        label="Bullet list"
        pressed={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        pressed={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
    </div>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 w-px self-stretch bg-border" aria-hidden />;
}

type ToolbarButtonProps = {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({
  label,
  pressed,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <WithTooltip label={label}>
      <Button
        type="button"
        size="icon"
        variant={pressed ? "default" : "ghost"}
        aria-label={label}
        aria-pressed={pressed}
        className={cn("size-8", pressed && "shadow-none")}
        onClick={onClick}
      >
        {children}
      </Button>
    </WithTooltip>
  );
}
