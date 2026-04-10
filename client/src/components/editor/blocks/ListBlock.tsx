import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ListBlockProps {
  content: { items: string[]; type: 'bullet' | 'numbered' };
  isEditable?: boolean;
  onUpdate?: (content: any) => void;
}

export const ListBlock: React.FC<ListBlockProps> = ({ content, isEditable, onUpdate }) => {
  const Tag = content.type === 'numbered' ? 'ol' : 'ul';
  const listClass = content.type === 'numbered' ? 'list-decimal ml-6' : 'list-disc ml-6';

  const updateItem = (index: number, value: string) => {
    const newItems = [...content.items];
    newItems[index] = value;
    onUpdate?.({ ...content, items: newItems });
  };

  const addItem = () => {
    onUpdate?.({ ...content, items: [...content.items, ''] });
  };

  const removeItem = (index: number) => {
    onUpdate?.({ ...content, items: content.items.filter((_, i) => i !== index) });
  };

  if (isEditable) {
    return (
      <div className="space-y-2">
        {content.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 group">
            <span className="text-slate-400 text-sm w-4">{content.type === 'numbered' ? `${idx + 1}.` : '•'}</span>
            <input 
              type="text" 
              value={item} 
              onChange={(e) => updateItem(idx, e.target.value)}
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-700 outline-none"
              placeholder="List item..."
            />
            <button onClick={() => removeItem(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addItem} className="text-slate-400 h-8 gap-1 pl-1">
          <Plus size={14} /> Add item
        </Button>
      </div>
    );
  }

  return (
    <Tag className={`${listClass} space-y-2 text-slate-700`}>
      {content.items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </Tag>
  );
};
