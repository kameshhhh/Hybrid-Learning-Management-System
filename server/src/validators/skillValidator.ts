import { z } from 'zod';
import { preparedBySchema, externalLinksSchema, skillCoverageSchema } from './courseContentValidator';

// Skill creation schema
export const createSkillSchema = z.object({
  skillCode: z.string()
    .min(1, 'Skill code is required')
    .max(20, 'Skill code must be less than 20 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Skill code can only contain letters, numbers, spaces, and hyphens'),

  name: z.string()
    .min(1, 'Skill name is required')
    .max(200, 'Skill name must be less than 200 characters'),

  description: z.string()
    .min(5, 'Description must be at least 5 characters')
    .max(5000, 'Description must be less than 5000 characters'),

  durationWeeks: z.number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 week')
    .max(52, 'Duration cannot exceed 52 weeks'),

  facultyIds: z.array(z.string()).optional(),
  primaryFacultyId: z.string().optional(),

  // New Comprehensive Fields
  preparedBy: preparedBySchema.optional(),
  externalLinks: externalLinksSchema.optional(),
  standardsFollowed: z.array(z.string()).optional(),
  skillCoverage: skillCoverageSchema.optional(),
  totalDays: z.number().int().min(1).optional(),
  totalHours: z.number().int().min(1).optional(),
  overallOutcome: z.string().optional(),
  relevance: z.string().optional(),
});

// Skill update schema
export const updateSkillSchema = z.object({
  name: z.string()
    .min(1, 'Skill name is required')
    .max(200, 'Skill name must be less than 200 characters')
    .optional(),

  description: z.string()
    .min(5, 'Description must be at least 5 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),

  durationWeeks: z.number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 week')
    .max(52, 'Duration cannot exceed 52 weeks')
    .optional(),

  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'active', 'archived']).optional(),

  // New Comprehensive Fields
  preparedBy: preparedBySchema.optional(),
  externalLinks: externalLinksSchema.optional(),
  standardsFollowed: z.array(z.string()).optional(),
  skillCoverage: skillCoverageSchema.optional(),
  totalDays: z.number().int().min(1).optional(),
  totalHours: z.number().int().min(1).optional(),
  overallOutcome: z.string().optional(),
  relevance: z.string().optional(),
});

// Skill approval schema
export const approveSkillSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .optional()
}).refine(data => {
  if (data.status === 'rejected' && !data.rejectionReason) {
    return false;
  }
  return true;
}, {
  message: 'Rejection reason is required when rejecting a skill',
  path: ['rejectionReason']
});

// Skill list query schema
export const skillListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'active', 'archived', 'all']).default('all'),
  search: z.string().optional(),
  facultyId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'skillCode', 'durationWeeks']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
