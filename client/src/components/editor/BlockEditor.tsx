import React, { useState } from 'react';
import { Reorder } from 'framer-motion';
import { Plus, Command, Trash2, GripVertical, Type, Heading, List, Image, Video, Table, CheckSquare, ListTodo, HelpCircle, Combine } from 'lucide-react';
import type { Block, BlockType } from './types';
import { BlockRenderer } from './blocks/BlockRenderer';
import { Button } from '@/components/ui/Button';
import { useHistory } from '@/hooks/useHistory';
import toast from 'react-hot-toast';
import { Undo2, Redo2 } from 'lucide-react';

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ blocks, onChange }) => {
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const { pushState, undo, redo, canUndo, canRedo } = useHistory(blocks);
  const lastBlocksRef = React.useRef(blocks);

  // Sync external changes into history (Debounced for performance / group typing)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(blocks) !== JSON.stringify(lastBlocksRef.current)) {
        pushState(blocks);
        lastBlocksRef.current = blocks;
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [blocks, pushState]);

  // Keyboard Listeners for Undo/Redo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const prevState = undo();
        if (prevState) onChange(prevState);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        const nextState = redo();
        if (nextState) onChange(nextState);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const nextState = redo();
        if (nextState) onChange(nextState);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, onChange]);

  const addBlock = (type: BlockType, index: number) => {
    const newBlock: Block = {
      id: crypto.randomUUID(),
      v: 1,
      type,
      content: getDefaultContent(type),
      meta: {},
      orderIndex: blocks.length,
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    onChange(newBlocks.map((b, i) => ({ ...b, orderIndex: i })));
    setActiveMenu(null);
  };

  const removeBlock = (id: string, type: string) => {
    if (window.confirm(`Are you sure you want to delete this ${type} block?`)) {
      onChange(blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, orderIndex: i })));
      toast.success("Block removed");
    }
  };

  const updateBlock = (id: string, content: any, meta?: any) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content, meta: meta || b.meta } : b));
  };

  const mergeUp = (idx: number) => {
    if (idx <= 0) return;
    const target = blocks[idx - 1];
    const source = blocks[idx];

    // Helper: Strip HTML for captions
    const stripHtml = (html: string) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
    };

    // Helper: Extract content as HTML from any block
    const getBlockContentAsHtml = (block: any) => {
      switch (block.type) {
        case 'text': return block.content.html;
        case 'heading': {
          const l = block.content.level || 1;
          // Using H1/H2 tags which match our prose configuration
          return `<h${l}>${block.content.text}</h${l}>`;
        }
        case 'list': return `<ul>${block.content.items.map((i: string) => `<li>${i}</li>`).join('')}</ul>`;
        case 'image': return `<p><i>Image: ${block.content.caption || 'No caption'}</i></p>`;
        case 'video': return `<p><i>Video: ${block.content.caption || 'No title'}</i></p>`;
        case 'table': {
          const rows = block.content.rows || [];
          const hasHeader = block.content.hasHeader;
          const tableHtml = `
            <table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid #e2e8f0;">
              <tbody>
                ${rows.map((row: any[], rIdx: number) => `
                  <tr>
                    ${row.map((cell: any) => {
            const val = typeof cell === 'object' 
              ? (cell.type === 'image' ? `<img src="${cell.value}" style="max-height: 50px; display: block;" />` : (cell.value || '')) 
              : (cell || '');
            const style = "border: 1px solid #e2e8f0; padding: 8px; text-align: left;";
            return rIdx === 0 && hasHeader
              ? `<th style="${style} background: #f8fafc; font-weight: bold;">${val}</th>`
              : `<td style="${style}">${val}</td>`;
          }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
          return tableHtml;
        }
        default: return typeof block.content === 'string' ? block.content : '<p>Content</p>';
      }
    };

    let newContent = { ...target.content };
    let newType = target.type;

    // L1: MEDIA TARGET (Merge Source into Caption)
    if (target.type === 'image' || target.type === 'video') {
      const sourceText = source.type === 'text' ? stripHtml(source.content.html) :
        source.type === 'heading' ? source.content.text :
          source.type === 'list' ? source.content.items.join(', ') : "";
      const addition = source.type === 'heading' ? `Fig: ${source.content.text}` : sourceText;
      newContent.caption = newContent.caption ? `${newContent.caption} ${addition}` : addition;
    }
    // L2: SAME TYPE MERGING (Native)
    else if (target.type === source.type && (target.type === 'text' || target.type === 'list')) {
      if (target.type === 'text') {
        newContent.html = target.content.html + source.content.html;
      } else if (target.type === 'list') {
        newContent.items = [...target.content.items, ...source.content.items];
      }
    }
    // L3: CONVERT ALL TO TEXT (Robust Fallback)
    else {
      newType = 'text';
      const targetHtml = getBlockContentAsHtml(target);
      const sourceHtml = getBlockContentAsHtml(source);
      newContent = { html: `${targetHtml}<p>&nbsp;</p>${sourceHtml}` };
    }

    const newBlocks = [...blocks];
    newBlocks[idx - 1] = { ...target, type: newType, content: newContent };
    newBlocks.splice(idx, 1);
    onChange(newBlocks.map((b, i) => ({ ...b, orderIndex: i })));
    toast.success("Blocks merged successfully!");
  };

  const getDefaultContent = (type: BlockType) => {
    switch (type) {
      case 'text': return { html: '' };
      case 'heading': return { text: '', level: 1 };
      case 'list': return { items: [''], type: 'bullet' };
      case 'image': return { url: '', caption: '' };
      case 'video': return { url: '', provider: 'upload' };
      case 'table': return {
        rows: [
          [{ type: 'text', value: '' }, { type: 'text', value: '' }],
          [{ type: 'text', value: '' }, { type: 'text', value: '' }]
        ],
        hasHeader: true
      };
      case 'task': return { title: 'New Task', description: '', maxMarks: 10 };
      case 'assessment': return { title: 'New Assessment', questions: [] };
      case 'mcq': return { questions: [{ q: 'Question?', opt: ['Yes', 'No'], correct: 0 }] };
      case 'divider': return {};
      default: return {};
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Curriculum Structure</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { const s = undo(); if (s) onChange(s); }}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all ${canUndo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-200'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={() => { const s = redo(); if (s) onChange(s); }}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all ${canRedo ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-200'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>

      <Reorder.Group axis="y" values={blocks} onReorder={onChange} className="space-y-4">
        {blocks.map((block, idx) => (
          <Reorder.Item
            key={block.id}
            value={block}
            className="group relative"
          >
            <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 items-center">
              <div className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <GripVertical size={18} />
              </div>
              {idx > 0 && (
                <button
                  onClick={() => mergeUp(idx)}
                  className="p-1.5 hover:bg-blue-50 hover:text-blue-500 rounded-lg text-slate-300 transition-colors"
                  title="Merge with block above"
                >
                  <Combine size={14} />
                </button>
              )}
            </div>

            <div className="bg-white/40 hover:bg-white/60 backdrop-blur-sm border border-transparent hover:border-slate-100 rounded-2xl p-4 transition-all duration-300 relative">
              {/* Fixed visible delete button */}
              <button
                onClick={() => removeBlock(block.id, block.type)}
                className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center bg-white border border-slate-100 shadow-sm rounded-full text-slate-300 hover:text-red-500 hover:border-red-100 hover:shadow-md transition-all z-20 opacity-0 group-hover:opacity-100"
                title="Delete Block"
              >
                <Trash2 size={14} />
              </button>
              <BlockRenderer
                block={block}
                isEditable
                onUpdate={(content, meta) => updateBlock(block.id, content, meta)}
              />
            </div>

            {/* Insertion Menu */}
            <div className="h-4 relative flex items-center justify-center translate-y-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <div className="h-px bg-slate-100 w-full absolute" />
              <button
                onClick={() => setActiveMenu(activeMenu === idx ? null : idx)}
                className={`bg-white border border-slate-200 p-1 rounded-full text-slate-400 hover:text-blue-500 hover:border-blue-200 shadow-sm transition-all transform hover:scale-110 relative z-20 ${activeMenu === idx ? 'rotate-45' : ''}`}
              >
                <Plus size={16} />
              </button>

              {activeMenu === idx && (
                <div className="absolute bottom-10 flex flex-wrap gap-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-200 w-[max-content] max-w-sm z-[100]">
                  <MenuButton icon={<Type size={14} />} label="Text" onClick={() => addBlock('text', idx)} />
                  <MenuButton icon={<Heading size={14} />} label="Heading" onClick={() => addBlock('heading', idx)} />
                  <MenuButton icon={<List size={14} />} label="List" onClick={() => addBlock('list', idx)} />
                  <MenuButton icon={<Image size={14} />} label="Image" onClick={() => addBlock('image', idx)} />
                  <MenuButton icon={<Video size={14} />} label="Video" onClick={() => addBlock('video', idx)} />
                  <MenuButton icon={<Table size={14} />} label="Table" onClick={() => addBlock('table', idx)} />
                  <MenuButton icon={<CheckSquare size={14} />} label="Task Block" onClick={() => addBlock('task', idx)} />
                  <MenuButton icon={<HelpCircle size={14} />} label="MCQ" onClick={() => addBlock('mcq', idx)} />
                  <MenuButton icon={<ListTodo size={14} />} label="Assessment" onClick={() => addBlock('assessment', idx)} />
                  <MenuButton icon={<Plus size={14} className="rotate-45" />} label="Divider" onClick={() => addBlock('divider', idx)} />
                </div>
              )}
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* Initial state empty button */}
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-100 rounded-[3rem]">
          <div className="p-4 bg-slate-50 rounded-3xl text-slate-300 mb-4">
            <Command size={48} />
          </div>
          <p className="text-slate-400 font-medium mb-6">Start your lesson by adding a block</p>
          <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => addBlock('text', -1)}>
            Add First Block
          </Button>
        </div>
      )}
    </div>
  );
};

const MenuButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
  >
    <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-500">
      {icon}
    </div>
    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{label}</span>
  </button>
);
