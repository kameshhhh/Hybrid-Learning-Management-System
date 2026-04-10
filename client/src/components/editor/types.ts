export type BlockType = 'text' | 'heading' | 'image' | 'video' | 'table' | 'task' | 'mcq' | 'assessment' | 'list' | 'divider';

export interface Block {
  id: string;
  v: number;
  type: BlockType;
  content: any;
  meta: Record<string, any>;
  orderIndex: number;
}
