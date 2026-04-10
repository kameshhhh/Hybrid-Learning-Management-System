import React from 'react';
import type { Block } from '../types';
import { TextBlock } from './TextBlock';
import { HeadingBlock } from './HeadingBlock';
import { DividerBlock } from './DividerBlock';
import { ListBlock } from './ListBlock';
import { ImageBlock } from './ImageBlock';
import { VideoBlock } from './VideoBlock';
import { MCQBlock } from './MCQBlock';
import { TableBlock } from './TableBlock';
import { TaskBlock } from './TaskBlock';

interface BlockRendererProps {
  block: Block;
  isEditable?: boolean;
  isStudent?: boolean;
  onUpdate?: (content: any, meta?: any) => void;
  onProgress?: (percentage: number, position: number) => void;
  onComplete?: (data?: any) => void;
  chapterId?: string;
  skillId?: string;
  initialPosition?: number;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ 
  block, 
  isEditable, 
  isStudent,
  onUpdate,
  onProgress,
  onComplete,
  chapterId,
  skillId,
  initialPosition
}) => {
  const commonProps = {
    id: block.id,
    isEditable,
    isStudent,
    onUpdate,
  };

  switch (block.type) {
    case 'text':
      return <TextBlock {...commonProps} content={block.content} />;
    case 'heading':
      return <HeadingBlock {...commonProps} content={block.content} />;
    case 'divider':
      return <DividerBlock />;
    case 'list':
      return <ListBlock {...commonProps} content={block.content} />;
    case 'image':
      return <ImageBlock {...commonProps} content={block.content} />;
    case 'video':
      return (
        <VideoBlock 
          {...commonProps} 
          content={block.content} 
          meta={block.meta as any} 
          onProgress={onProgress}
          onComplete={onComplete}
          chapterId={chapterId}
          skillId={skillId}
          initialPosition={initialPosition}
        />
      );
    case 'table':
      return <TableBlock {...commonProps} content={block.content} />;
    case 'mcq':
      return (
        <MCQBlock 
          {...commonProps} 
          content={block.content} 
          onComplete={(score) => onComplete?.({ score })}
        />
      );
    case 'task':
    case 'assessment':
      return (
        <TaskBlock 
          {...commonProps} 
          content={block.content}
          onComplete={onComplete}
          skillId={skillId}
        />
      );
    // Add other blocks as they are implemented
    default:
      return (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm italic">
          Unsupported block type: {block.type}
        </div>
      );
  }
};
