import { z } from 'zod';

import { learningSkillSchema } from './learning-session.contracts.ts';

export const ieltsBandStageCodeSchema = z.enum([
  'foundation_to_3', 'band_3_to_4', 'band_4_to_5', 'band_5_to_6',
  'band_6_to_7', 'band_7_to_8', 'band_8_to_9',
]);
export type IeltsBandStageCode = z.infer<typeof ieltsBandStageCodeSchema>;

export const ieltsProficiencyDescriptorSchema = z.enum([
  'insufficient_evidence', 'emerging', 'developing', 'secure', 'advanced',
]);
export const ieltsEvidenceConfidenceSchema = z.enum(['none', 'low', 'medium', 'high']);

const bandRangeSchema = z.object({
  from: z.number().min(0).max(9),
  to: z.number().min(0).max(9),
}).strict().refine((range) => range.to > range.from, 'Target band range must increase');

const competencySchema = z.object({
  code: z.string().regex(/^[a-z0-9_]+$/),
  skill: learningSkillSchema,
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(600),
}).strict().readonly();

const remediationSchema = z.object({
  skill: learningSkillSchema,
  title: z.string().min(3).max(120),
  action: z.string().min(10).max(600),
}).strict().readonly();

export const ieltsBandStageSchema = z.object({
  code: ieltsBandStageCodeSchema,
  order: z.number().int().min(1).max(7),
  title: z.string().min(3).max(120),
  targetBand: bandRangeSchema,
  learningOutcomes: z.array(z.string().min(10).max(400)).min(1).max(12),
  prerequisiteStageCodes: z.array(ieltsBandStageCodeSchema).max(6),
  lessonCategories: z.array(z.string().min(2).max(80)).min(1).max(12),
  competencies: z.array(competencySchema).min(4).max(24),
  recommendedActivities: z.array(z.string().min(3).max(180)).min(1).max(16),
  assessmentCriteria: z.array(z.string().min(10).max(400)).min(1).max(12),
  remediationPaths: z.array(remediationSchema).length(4),
  suggestedPracticeFormats: z.array(z.string().min(3).max(160)).min(1).max(12),
  exitCriteria: z.object({
    minimumCompletedSessions: z.number().int().min(1).max(100),
    minimumSamplesPerSkill: z.number().int().min(1).max(100),
    minimumCorrectRate: z.number().min(0.5).max(1),
  }).strict(),
}).strict().superRefine((stage, context) => {
  const skills = learningSkillSchema.options;
  const competencySkills = new Set(stage.competencies.map((item) => item.skill));
  const remediationSkills = new Set(stage.remediationPaths.map((item) => item.skill));
  for (const skill of skills) {
    if (!competencySkills.has(skill)) context.addIssue({ code: 'custom', path: ['competencies'], message: `Missing ${skill} competency` });
    if (!remediationSkills.has(skill)) context.addIssue({ code: 'custom', path: ['remediationPaths'], message: `Missing ${skill} remediation` });
  }
  if (new Set(stage.competencies.map((item) => item.code)).size !== stage.competencies.length) {
    context.addIssue({ code: 'custom', path: ['competencies'], message: 'Competency codes must be unique within a stage' });
  }
}).readonly();
export type IeltsBandStage = z.infer<typeof ieltsBandStageSchema>;

export const ieltsBandCurriculumContentSchema = z.object({
  schemaVersion: z.literal(1),
  stages: z.array(ieltsBandStageSchema).length(7),
}).strict().superRefine((content, context) => {
  const codes = content.stages.map((stage) => stage.code);
  if (new Set(codes).size !== content.stages.length) {
    context.addIssue({ code: 'custom', path: ['stages'], message: 'Stage codes must be unique' });
  }
  content.stages.forEach((stage, index) => {
    if (stage.order !== index + 1) context.addIssue({ code: 'custom', path: ['stages', index, 'order'], message: 'Stage order must be contiguous' });
    const expectedPrerequisite = index === 0 ? [] : [content.stages[index - 1]!.code];
    if (stage.prerequisiteStageCodes.length !== expectedPrerequisite.length || stage.prerequisiteStageCodes[0] !== expectedPrerequisite[0]) {
      context.addIssue({ code: 'custom', path: ['stages', index, 'prerequisiteStageCodes'], message: 'Each stage must depend only on the immediately preceding stage' });
    }
    if (index > 0 && stage.targetBand.from !== content.stages[index - 1]!.targetBand.to) {
      context.addIssue({ code: 'custom', path: ['stages', index, 'targetBand'], message: 'Target ranges must be contiguous' });
    }
  });
}).readonly();
export type IeltsBandCurriculumContent = z.infer<typeof ieltsBandCurriculumContentSchema>;

const skills = ['listening', 'reading', 'writing', 'speaking'] as const;
const stageDefinitions = [
  ['foundation_to_3', 'Foundation to 3.0', 0, 3, 'Build reliable core English for familiar situations.'],
  ['band_3_to_4', '3.0 to 4.0', 3, 4, 'Communicate basic meaning and process simple texts more accurately.'],
  ['band_4_to_5', '4.0 to 5.0', 4, 5, 'Develop sentence control, useful vocabulary, main-idea comprehension and clear expression.'],
  ['band_5_to_6', '5.0 to 6.0', 5, 6, 'Handle varied IELTS input, structured writing and more coherent speaking.'],
  ['band_6_to_7', '6.0 to 7.0', 6, 7, 'Strengthen academic language, paraphrasing, argument and task fulfilment.'],
  ['band_7_to_8', '7.0 to 8.0', 7, 8, 'Increase flexibility, error control and understanding of nuanced meaning.'],
  ['band_8_to_9', '8.0 to 9.0', 8, 9, 'Refine precision, depth, natural expression and stable performance.'],
] as const;

export const INITIAL_IELTS_BAND_CURRICULUM = ieltsBandCurriculumContentSchema.parse({
  schemaVersion: 1,
  stages: stageDefinitions.map(([code, title, from, to, outcome], index) => ({
    code, order: index + 1, title, targetBand: { from, to }, learningOutcomes: [outcome],
    prerequisiteStageCodes: index === 0 ? [] : [stageDefinitions[index - 1]![0]],
    lessonCategories: ['language_control', 'task_strategy', 'workplace_transfer'],
    competencies: skills.map((skill) => ({ code: `${code}_${skill}`, skill, title: `${title} ${skill}`, description: `${outcome} Apply this capability consistently in ${skill} practice.` })),
    recommendedActivities: ['Guided analysis', 'Targeted practice', 'Integrated timed practice'],
    assessmentCriteria: ['Use multiple completed server-evaluated samples across all four skills.'],
    remediationPaths: skills.map((skill) => ({ skill, title: `Strengthen ${skill}`, action: `Review errors, repeat targeted ${skill} practice, and transfer the language into a new context.` })),
    suggestedPracticeFormats: ['Targeted skill practice', 'Four-skill integrated session', 'Spaced error review'],
    exitCriteria: { minimumCompletedSessions: index < 2 ? 2 : 3, minimumSamplesPerSkill: index < 2 ? 2 : 3, minimumCorrectRate: Math.min(0.65 + index * 0.04, 0.89) },
  })),
});

const versionSummarySchema = z.object({
  id: z.uuid(), version: z.number().int().positive(), status: z.enum(['PUBLISHED', 'ARCHIVED']),
  publishedAt: z.iso.datetime(), archivedAt: z.iso.datetime().nullable(),
}).strict();
export const adminIeltsBandCurriculumSchema = z.object({
  id: z.uuid(), status: z.enum(['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED']),
  draftRevision: z.number().int().positive(), draft: ieltsBandCurriculumContentSchema,
  currentPublishedVersion: versionSummarySchema.nullable(), versions: z.array(versionSummarySchema),
  updatedAt: z.iso.datetime(),
}).strict();
export type AdminIeltsBandCurriculumDto = z.infer<typeof adminIeltsBandCurriculumSchema>;
export const saveIeltsBandCurriculumDraftSchema = z.object({
  expectedRevision: z.number().int().positive(), idempotencyKey: z.uuid(), content: ieltsBandCurriculumContentSchema,
}).strict();
export type SaveIeltsBandCurriculumDraftInput = z.infer<typeof saveIeltsBandCurriculumDraftSchema>;
export const ieltsBandCurriculumCommandSchema = z.object({ expectedRevision: z.number().int().positive(), idempotencyKey: z.uuid() }).strict();
export type IeltsBandCurriculumCommandInput = z.infer<typeof ieltsBandCurriculumCommandSchema>;
export const ieltsBandCurriculumValidationSchema = z.object({
  curriculumId: z.uuid(), draftRevision: z.number().int().positive(), status: z.enum(['DRAFT', 'VALIDATED']),
  canPublish: z.boolean(), issues: z.array(z.object({ code: z.string(), path: z.string(), message: z.string() }).strict()),
}).strict();
export type IeltsBandCurriculumValidation = z.infer<typeof ieltsBandCurriculumValidationSchema>;
export const publishIeltsBandCurriculumResultSchema = z.object({
  curriculumId: z.uuid(), curriculumVersionId: z.uuid(), version: z.number().int().positive(), publishedAt: z.iso.datetime(),
}).strict();
export type PublishIeltsBandCurriculumResult = z.infer<typeof publishIeltsBandCurriculumResultSchema>;

export const ieltsTargetBandSchema = z.number().int().min(3).max(9);
export const startIeltsBandPathwaySchema = z.object({ clientJourneyId: z.uuid(), targetBand: ieltsTargetBandSchema }).strict();
export const updateIeltsBandTargetSchema = z.object({ expectedRevision: z.number().int().positive(), targetBand: ieltsTargetBandSchema }).strict();
export const evaluateIeltsBandPathwaySchema = z.object({ expectedRevision: z.number().int().positive() }).strict();

const skillProficiencySchema = z.object({
  skill: learningSkillSchema, descriptor: ieltsProficiencyDescriptorSchema,
  confidence: ieltsEvidenceConfidenceSchema, sampleCount: z.number().int().nonnegative(),
}).strict();
export const ieltsBandPathwaySchema = z.object({
  journeyId: z.uuid(), curriculumVersionId: z.uuid(), curriculumVersion: z.number().int().positive(),
  currentStageCode: ieltsBandStageCodeSchema, currentStageTitle: z.string(), targetBand: ieltsTargetBandSchema,
  revision: z.number().int().positive(), startedAt: z.iso.datetime(), completedAt: z.iso.datetime().nullable(),
  proficiency: z.array(skillProficiencySchema).length(4),
  practicePerformance: z.object({ completedSessions: z.number().int().nonnegative(), evaluatedBlocks: z.number().int().nonnegative(), recentCorrectRate: z.number().min(0).max(1).nullable() }).strict(),
  unmetCriteria: z.array(z.string()), remediation: z.array(remediationSchema),
  recommendedPracticeFormats: z.array(z.string()), canAdvance: z.boolean(),
}).strict();
export type IeltsBandPathwayDto = z.infer<typeof ieltsBandPathwaySchema>;

export const ieltsBandPathwayAvailabilitySchema = z.object({
  eligible: z.boolean(), lockedReason: z.enum(['BRIDGE_REQUIRED', 'CURRICULUM_NOT_PUBLISHED']).nullable(),
  targetBands: z.array(ieltsTargetBandSchema), journey: ieltsBandPathwaySchema.nullable(),
}).strict();
export type IeltsBandPathwayAvailabilityDto = z.infer<typeof ieltsBandPathwayAvailabilitySchema>;
