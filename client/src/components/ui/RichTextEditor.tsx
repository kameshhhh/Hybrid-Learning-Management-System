import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 mb-2 bg-slate-50 border border-slate-200 rounded-t-lg">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${editor.isActive('bold') ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        type="button"
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${editor.isActive('italic') ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        type="button"
      >
        Italic
      </button>
      <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        type="button"
      >
        Bullet List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        type="button"
      >
        Ordered List
      </button>
      <div className="w-px h-4 bg-slate-200 mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        type="button"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 rounded text-xs font-bold transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
        type="button"
      >
        H2
      </button>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  content, 
  onChange, 
  placeholder = "Write theory content here...",
  className = "" 
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none min-h-[150px] p-4 text-sm focus:outline-none bg-white border border-t-0 border-slate-200 rounded-b-lg'
      }
    }
  });

  // CRITICAL: Sync editor content when it changes via external props (e.g. Merge Function)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className={`w-full ${className}`}>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
