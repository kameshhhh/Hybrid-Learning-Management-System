import React from 'react';

interface HeadingBlockProps {
  content: { text: string; level: number };
  isEditable?: boolean;
  onUpdate?: (content: any) => void;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({ content, isEditable, onUpdate }) => {
  const level = content.level || 1;
  const Tag = `h${level}` as any;

  const classes = {
    1: "text-3xl font-extrabold text-slate-900 tracking-tight mb-4",
    2: "text-2xl font-bold text-slate-800 tracking-tight mb-3",
    3: "text-xl font-bold text-slate-700 mb-2"
  }[level as 1|2|3];

  if (isEditable) {
    return (
      <Tag className={`${classes} outline-none focus:ring-0`} contentEditable suppressContentEditableWarning onBlur={(e: any) => onUpdate?.({ ...content, text: e.currentTarget.textContent || '' })}>
        {content.text || `Heading ${level}`}
      </Tag>
    );
  }

  return <Tag className={classes}>{content.text}</Tag>;
};
