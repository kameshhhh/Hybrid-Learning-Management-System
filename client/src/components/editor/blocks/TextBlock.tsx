import React from 'react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

interface TextBlockProps {
  content: { html: string };
  isEditable?: boolean;
  onUpdate?: (content: any) => void;
}

export const TextBlock: React.FC<TextBlockProps> = ({ content, isEditable, onUpdate }) => {
  if (isEditable) {
    return (
      <div className="w-full">
        <RichTextEditor 
          content={content.html || ''} 
          onChange={(html) => onUpdate?.({ html })}
          placeholder="Start typing or use '/' for commands..."
          className="border-none bg-transparent"
        />
      </div>
    );
  }

  return (
    <div 
      className="prose prose-slate max-w-none text-slate-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: content.html }}
    />
  );
};
