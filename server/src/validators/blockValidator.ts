import { z } from 'zod';

/**
 * STRICT BLOCK SCHEMAS
 * These match the architecture defined in the implementation plan.
 */

const BaseBlockSchema = z.object({
  id: z.string(),
  v: z.number().default(1),
  orderIndex: z.number(),
  meta: z.record(z.string(), z.any()).default({}),
});

export const TextBlockSchema = BaseBlockSchema.extend({
  type: z.literal('text'),
  content: z.object({
    html: z.string().max(50000),
  }),
});

export const HeadingBlockSchema = BaseBlockSchema.extend({
  type: z.literal('heading'),
  content: z.object({
    text: z.string().max(200),
    level: z.enum(['1', '2', '3']).or(z.number().min(1).max(3)),
  }),
});

export const ImageBlockSchema = BaseBlockSchema.extend({
  type: z.literal('image'),
  content: z.object({
    url: z.string().url(),
    caption: z.string().max(500).optional(),
  }),
});

export const VideoBlockSchema = BaseBlockSchema.extend({
  type: z.literal('video'),
  content: z.object({
    url: z.string(),
    provider: z.enum(['upload', 'youtube']).default('upload'),
    thumbnailUrl: z.string().url().optional(),
  }),
  meta: z.object({
    isLocked: z.boolean().default(false),
    requiredWatch: z.number().min(0).max(100).default(90),
  }).default({ isLocked: false, requiredWatch: 90 }),
});

export const TableBlockSchema = BaseBlockSchema.extend({
  type: z.literal('table'),
  content: z.object({
    rows: z.array(z.array(z.string())).max(20), // Max 20 rows
    hasHeader: z.boolean().default(false),
  }).refine(data => data.rows.every(row => row.length <= 10), {
    message: "Tables are limited to 10 columns"
  }),
});

export const MCQBlockSchema = BaseBlockSchema.extend({
  type: z.literal('mcq'),
  content: z.object({
    questions: z.array(z.object({
      q: z.string().max(500),
      opt: z.array(z.string()).min(2).max(6),
      correct: z.number().min(0),
    })).min(1).max(20),
  }),
});

export const TaskBlockSchema = BaseBlockSchema.extend({
  type: z.literal('task'),
  content: z.object({
    title: z.string().max(200),
    desc: z.string().max(2000),
    maxMarks: z.number().min(1),
    passingMarks: z.number().min(1).optional(),
  }),
});

export const AssessmentBlockSchema = BaseBlockSchema.extend({
  type: z.literal('assessment'),
  content: z.object({
    criteria: z.array(z.object({
      label: z.string().max(200),
      max: z.number().min(1),
      type: z.enum(['M', 'J']), // Marks / Judgement
    })).min(1).max(20),
  }),
});

export const ListBlockSchema = BaseBlockSchema.extend({
  type: z.literal('list'),
  content: z.object({
    items: z.array(z.string().max(500)).max(50),
    type: z.enum(['bullet', 'numbered']).default('bullet'),
  }),
});

export const DividerBlockSchema = BaseBlockSchema.extend({
  type: z.literal('divider'),
  content: z.object({}),
});

/**
 * DISCRIMINATED UNION FOR ALL BLOCKS
 */
export const BlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  HeadingBlockSchema,
  ImageBlockSchema,
  VideoBlockSchema,
  TableBlockSchema,
  MCQBlockSchema,
  TaskBlockSchema,
  AssessmentBlockSchema,
  ListBlockSchema,
  DividerBlockSchema,
]);

export const ChapterBlocksSchema = z.array(BlockSchema);

export type Block = z.infer<typeof BlockSchema>;
