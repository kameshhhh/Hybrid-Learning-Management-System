import { z } from 'zod';

// Course Level Fields
export const preparedBySchema = z.array(z.object({
  name: z.string(),
  role: z.string().optional(),
  organization: z.string().optional(),
}));

export const externalLinksSchema = z.array(z.object({
  label: z.string(),
  url: z.string().url(),
}));

export const skillCoverageSchema = z.object({
  safety: z.boolean(),
  equipmentHandling: z.boolean(),
  processTypes: z.array(z.string()),
  testingInspection: z.boolean(),
  repairMaintenance: z.boolean(),
  fabrication: z.boolean(),
});

// Day Level Content
export const scheduleItemSchema = z.object({
  timeStart: z.string(),
  timeEnd: z.string(),
  sessionType: z.enum(['Theory', 'Hands-on', 'Practical', 'Assessment', 'Break', 'Viva']),
  mode: z.string().optional(),
  topic: z.string(),
});

export const theorySchema = z.object({
  introduction: z.string(),
  definitions: z.array(z.string()),
  concepts: z.array(z.string()),
  explanation: z.string(),
  workingPrinciple: z.string().optional(),
  notes: z.string().optional(),
});

export const materialsSchema = z.object({
  tools: z.array(z.string()),
  equipment: z.array(z.string()),
  consumables: z.array(z.string()),
});

export const safetySchema = z.object({
  precautions: z.array(z.string()),
  hazards: z.object({
    electrical: z.array(z.string()),
    fire: z.array(z.string()),
    radiation: z.array(z.string()),
    mechanical: z.array(z.string()),
    chemical: z.array(z.string()),
  }),
  doList: z.array(z.string()),
  dontList: z.array(z.string()),
});

export const taskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string(),
  objective: z.string(),
  toolsRequired: z.array(z.string()),
  procedure: z.array(z.string()),
  expectedOutcome: z.string(),
});

export const diagramSchema = z.object({
  url: z.string(),
  description: z.string(),
  labels: z.array(z.string()).optional(),
});

export const faultAnalysisSchema = z.object({
  types: z.array(z.string()),
  causes: z.array(z.string()),
  effects: z.array(z.string()),
  detectionMethods: z.array(z.string()),
});

export const technicalKnowledgeSchema = z.object({
  concepts: z.array(z.string()),
  classifications: z.array(z.string()),
  parameters: z.object({
    current: z.string().optional(),
    voltage: z.string().optional(),
    temperature: z.string().optional(),
    distance: z.string().optional(),
    speed: z.string().optional(),
  }),
  techniques: z.array(z.string()),
});

export const testingMeasurementSchema = z.object({
  name: z.string(),
  definition: z.string(),
  purpose: z.string(),
  method: z.string(),
  steps: z.array(z.string()),
  resultInterpretation: z.string(),
});

export const maintenanceRepairSchema = z.object({
  objective: z.string(),
  procedures: z.array(z.string()),
  inspectionSteps: z.array(z.string()),
  replacementSteps: z.array(z.string()),
  safety: z.array(z.string()),
});

export const mcqDataSchema = z.object({
  totalQuestions: z.number().optional(),
  maxScore: z.number().optional(),
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()), // A, B, C, D
    correctAnswerIndex: z.number().min(0).max(3),
  })),
});

export const checklistConfigSchema = z.object({
  criteria: z.array(z.string()),
  type: z.enum(['pass_fail', 'marks']),
});

// Full Day Content Wrapper
export const dayContentSchema = z.object({
  objective: z.array(z.string()).optional(),
  outcome: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  schedule: z.array(scheduleItemSchema).optional(),
  theory: theorySchema.optional(),
  materials: materialsSchema.optional(),
  safety: safetySchema.optional(),
  tasks: z.array(taskSchema).optional(),
  practicalTasks: z.array(taskSchema).optional(),
  procedures: z.array(z.string()).optional(),
  resultsInterpretation: z.array(z.string()).optional(),
  diagrams: z.array(diagramSchema).optional(),
  faultAnalysis: faultAnalysisSchema.optional(),
  technicalKnowledge: technicalKnowledgeSchema.optional(),
  testingMeasurements: z.array(testingMeasurementSchema).optional(),
  maintenanceRepair: maintenanceRepairSchema.optional(),
  checklistConfig: checklistConfigSchema.optional(),
  mcqData: mcqDataSchema.optional(),
});
