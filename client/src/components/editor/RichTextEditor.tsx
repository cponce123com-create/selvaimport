import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Image as ImageIcon,
  Minus,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-6 bg-border mx-0.5" />;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const { toast } = useToast();
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ImageExt.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full mx-auto" },
      }),
      Placeholder.configure({
        placeholder: "Escribe el contenido de la pagina...",
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] px-5 py-4 text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const handleImageUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !editor) return;
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", files[0]);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error al subir imagen");
        const data = await res.json();
        editor.chain().focus().setImage({ src: data.url, alt: "Imagen" }).run();
        toast({ title: "Imagen insertada" });
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor, toast]
  );

  if (!editor) return null;

  return (
    <div className="border rounded-xl overflow-hidden bg-background" data-testid="rich-text-editor">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 bg-muted/50 border-b">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Negrita"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Cursiva"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Subrayado"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Titulo 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Titulo 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Titulo 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Lista con vinetas"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Alinear izquierda"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Centrar"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Alinear derecha"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Enlace">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Linea separadora"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          title="Insertar imagen"
        >
          {uploadingImage ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageUpload(e.target.files)}
      />
    </div>
  );
}
