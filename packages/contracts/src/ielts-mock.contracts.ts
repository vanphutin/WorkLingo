import { z } from 'zod';

export const ieltsMockModeSchema = z.enum(['LEARNING', 'PRACTICE', 'EXAM_SIMULATION']);
export const ieltsMockVariantSchema = z.enum(['ACADEMIC', 'GENERAL_TRAINING']);
const mockBandSchema = z.number().min(0).max(9).refine((value) => Number.isInteger(value * 2), 'Mock band must use whole or half bands');
const answerPolicySchema = z.object({ acceptedAnswers: z.array(z.string().min(1).max(160)).min(1).max(12), caseSensitive: z.boolean(), maxWords: z.number().int().min(1).max(10).nullable() }).strict();
const questionObjectSchema = z.object({
  id: z.uuid(), order: z.number().int().min(1).max(40), type: z.enum(['multiple_choice', 'matching', 'gap_fill', 'short_answer']),
  prompt: z.string().min(3).max(1000), options: z.array(z.string().min(1).max(300)).max(12), answerPolicy: answerPolicySchema,
  competencyTags: z.array(z.string().min(2).max(80)).min(1).max(8), explanation: z.string().min(10).max(1200),
}).strict();
const questionSchema = questionObjectSchema.readonly();
const conversionSchema = z.array(z.object({ rawScore: z.number().int().min(0).max(40), mockBand: mockBandSchema }).strict()).length(41).superRefine((rows, context) => rows.forEach((row, index) => {
  if (row.rawScore !== index) context.addIssue({ code: 'custom', path: [index, 'rawScore'], message: 'Conversion must cover raw scores 0 through 40 in order' });
  if (index > 0 && row.mockBand < rows[index - 1]!.mockBand) context.addIssue({ code: 'custom', path: [index, 'mockBand'], message: 'Conversion bands must not decrease' });
}));
const criteriaSchema = z.enum(['task_achievement', 'task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy']);

export const ieltsMockContentSchema = z.object({
  schemaVersion: z.literal(1), variant: ieltsMockVariantSchema, title: z.string().min(3).max(160), disclosure: z.string().min(20).max(300), allowedModes: z.array(ieltsMockModeSchema).min(1).max(3),
  listening: z.object({ durationMinutes: z.literal(30), conversion: conversionSchema, parts: z.array(z.object({ part: z.number().int().min(1).max(4), audioAssetId: z.uuid().nullable(), questions: z.array(questionSchema).length(10) }).strict()).length(4) }).strict().superRefine((section, context) => {
    const questions = section.parts.flatMap((part) => part.questions); if (questions.length !== 40 || questions.some((item, index) => item.order !== index + 1)) context.addIssue({ code: 'custom', path: ['parts'], message: 'Listening requires 40 contiguous questions' });
  }),
  reading: z.object({ durationMinutes: z.literal(60), conversion: conversionSchema, passages: z.array(z.object({ section: z.number().int().min(1).max(3), title: z.string().min(3).max(160), passage: z.string().min(100).max(20_000), questions: z.array(questionSchema).min(13).max(14) }).strict()).length(3) }).strict().superRefine((section, context) => {
    const questions = section.passages.flatMap((passage) => passage.questions); if (questions.length !== 40 || questions.some((item, index) => item.order !== index + 1)) context.addIssue({ code: 'custom', path: ['passages'], message: 'Academic Reading requires 40 contiguous questions' });
  }),
  writing: z.object({ durationMinutes: z.literal(60), tasks: z.array(z.object({ task: z.union([z.literal(1), z.literal(2)]), title: z.string().min(3).max(160), prompt: z.string().min(20).max(4000), minimumWords: z.union([z.literal(150), z.literal(250)]), weight: z.union([z.literal(1), z.literal(2)]), criteria: z.array(criteriaSchema).length(4), competencyTags: z.array(z.string().min(2).max(80)).min(1) }).strict()).length(2) }).strict().superRefine((section, context) => {
    const [one, two] = section.tasks; if (one?.task !== 1 || one.minimumWords !== 150 || one.weight !== 1 || one.criteria.includes('task_response')) context.addIssue({ code: 'custom', path: ['tasks', 0], message: 'Writing Task 1 policy is invalid' });
    if (two?.task !== 2 || two.minimumWords !== 250 || two.weight !== 2 || two.criteria.includes('task_achievement')) context.addIssue({ code: 'custom', path: ['tasks', 1], message: 'Writing Task 2 policy is invalid' });
  }),
  speaking: z.object({ durationMinutes: z.object({ minimum: z.literal(11), maximum: z.literal(14) }).strict(), parts: z.array(z.object({ part: z.union([z.literal(1), z.literal(2), z.literal(3)]), title: z.string().min(3).max(160), prompts: z.array(z.string().min(3).max(1000)).min(1).max(12), preparationSeconds: z.number().int().nonnegative().max(60), responseSeconds: z.number().int().positive().max(600), competencyTags: z.array(z.string().min(2).max(80)).min(1) }).strict()).length(3) }).strict().superRefine((section, context) => {
    if (section.parts.some((part, index) => part.part !== index + 1)) context.addIssue({ code: 'custom', path: ['parts'], message: 'Speaking requires ordered Parts 1, 2 and 3' });
  }),
}).strict().superRefine((content, context) => {
  if (content.variant !== 'ACADEMIC') context.addIssue({ code: 'custom', path: ['variant'], message: 'Phase 8 publishes Academic mocks only' });
  if (new Set(content.allowedModes).size !== content.allowedModes.length) context.addIssue({ code: 'custom', path: ['allowedModes'], message: 'Mock modes must be unique' });
}).readonly();
export type IeltsMockContent = z.infer<typeof ieltsMockContentSchema>;

const conversion = Array.from({ length: 41 }, (_, rawScore) => ({ rawScore, mockBand: Math.round(rawScore / 40 * 18) / 2 }));
const question = (order: number, prefix: string) => ({ id: crypto.randomUUID(), order, type: 'short_answer' as const, prompt: `${prefix} question ${order}`, options: [], answerPolicy: { acceptedAnswers: [`answer ${order}`], caseSensitive: false, maxWords: 2 }, competencyTags: [`${prefix.toLowerCase()}_detail`], explanation: `The authored evidence for ${prefix} question ${order} supports this answer.` });
export const INITIAL_IELTS_ACADEMIC_MOCK: IeltsMockContent = ieltsMockContentSchema.parse({
  schemaVersion: 1, variant: 'ACADEMIC', title: 'Synthetic IELTS Academic Full Mock', disclosure: 'Mock estimate — not an official IELTS result or Test Report Form.', allowedModes: ['LEARNING', 'PRACTICE', 'EXAM_SIMULATION'],
  listening: { durationMinutes: 30, conversion, parts: Array.from({ length: 4 }, (_, index) => ({ part: index + 1, audioAssetId: null, questions: Array.from({ length: 10 }, (__, offset) => question(index * 10 + offset + 1, 'Listening')) })) },
  reading: { durationMinutes: 60, conversion, passages: [14, 13, 13].map((count, index) => ({ section: index + 1, title: `Academic passage ${index + 1}`, passage: `This is a synthetic copyright-safe academic passage for local verification. `.repeat(8), questions: Array.from({ length: count }, (__, offset) => question((index === 0 ? 0 : index === 1 ? 14 : 27) + offset + 1, 'Reading')) })) },
  writing: { durationMinutes: 60, tasks: [
    { task: 1, title: 'Academic Writing Task 1', prompt: 'Summarise the main features of the synthetic workplace training chart and make relevant comparisons.', minimumWords: 150, weight: 1, criteria: ['task_achievement', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy'], competencyTags: ['writing_task_1'] },
    { task: 2, title: 'Academic Writing Task 2', prompt: 'Discuss whether employers should dedicate working time to language learning and support your position.', minimumWords: 250, weight: 2, criteria: ['task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy'], competencyTags: ['writing_task_2'] },
  ] },
  speaking: { durationMinutes: { minimum: 11, maximum: 14 }, parts: [
    { part: 1, title: 'Introduction and interview', prompts: ['Describe how you use English at work.'], preparationSeconds: 0, responseSeconds: 240, competencyTags: ['speaking_part_1'] },
    { part: 2, title: 'Long turn', prompts: ['Describe a workplace skill you learned and explain why it mattered.'], preparationSeconds: 60, responseSeconds: 120, competencyTags: ['speaking_part_2'] },
    { part: 3, title: 'Discussion', prompts: ['How might workplace learning change in the future?'], preparationSeconds: 0, responseSeconds: 300, competencyTags: ['speaking_part_3'] },
  ] },
});

const skillResultSchema = z.object({ status: z.enum(['SCORED', 'PENDING_EVALUATION', 'ESTIMATED_FEEDBACK', 'TEACHER_REVIEWED']), rawScore: z.number().int().min(0).max(40).nullable(), mockBand: mockBandSchema.nullable() }).strict();
export const ieltsMockReportSchema = z.object({
  attemptId: z.uuid(), status: z.enum(['EVALUATION_PENDING', 'COMPLETED']), disclosure: z.string().min(20), skills: z.object({ listening: skillResultSchema, reading: skillResultSchema, writing: skillResultSchema, speaking: skillResultSchema }).strict(), overallMockBand: mockBandSchema.nullable(), strengths: z.array(z.string()), gaps: z.array(z.string()), nextActions: z.array(z.string()), completedAt: z.iso.datetime().nullable(),
}).strict().superRefine((report, context) => {
  const complete = report.skills.listening.mockBand !== null && report.skills.reading.mockBand !== null && report.skills.writing.status === 'TEACHER_REVIEWED' && report.skills.writing.mockBand !== null && report.skills.speaking.status === 'TEACHER_REVIEWED' && report.skills.speaking.mockBand !== null;
  if (report.overallMockBand !== null && !complete) context.addIssue({ code: 'custom', path: ['overallMockBand'], message: 'Overall mock band requires four completed skill bands and reviewed productive skills' });
  if (report.status === 'COMPLETED' && (!complete || report.completedAt === null)) context.addIssue({ code: 'custom', path: ['status'], message: 'Completed report requires all reviewed skill bands' });
}).readonly();
export type IeltsMockReportDto = z.infer<typeof ieltsMockReportSchema>;

const mockVersionSummarySchema = z.object({ id: z.uuid(), version: z.number().int().positive(), status: z.enum(['PUBLISHED', 'ARCHIVED']), publishedAt: z.iso.datetime(), archivedAt: z.iso.datetime().nullable() }).strict();
export const adminIeltsMockSchema = z.object({ id: z.uuid(), slug: z.string(), status: z.enum(['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED']), draftRevision: z.number().int().positive(), draft: ieltsMockContentSchema, currentPublishedVersion: mockVersionSummarySchema.nullable(), versions: z.array(mockVersionSummarySchema), updatedAt: z.iso.datetime() }).strict();
export type AdminIeltsMockDto = z.infer<typeof adminIeltsMockSchema>;
export const saveIeltsMockDraftSchema = z.object({ expectedRevision: z.number().int().positive(), idempotencyKey: z.uuid(), content: ieltsMockContentSchema }).strict();
export const ieltsMockCommandSchema = z.object({ expectedRevision: z.number().int().positive(), idempotencyKey: z.uuid() }).strict();
export const ieltsMockValidationSchema = z.object({ mockTestId: z.uuid(), draftRevision: z.number().int().positive(), status: z.enum(['DRAFT', 'VALIDATED']), canPublish: z.boolean(), issues: z.array(z.object({ path: z.string(), message: z.string() }).strict()) }).strict();
export const publishIeltsMockResultSchema = z.object({ mockTestId: z.uuid(), mockTestVersionId: z.uuid(), version: z.number().int().positive(), publishedAt: z.iso.datetime() }).strict();

export const ieltsMockCatalogSchema = z.object({ eligible: z.boolean(), lockedReason: z.enum(['BAND_PATHWAY_REQUIRED', 'MOCK_NOT_PUBLISHED']).nullable(), mocks: z.array(z.object({ id: z.uuid(), title: z.string(), variant: ieltsMockVariantSchema, version: z.number().int().positive(), allowedModes: z.array(ieltsMockModeSchema), activeAttemptId: z.uuid().nullable() }).strict()) }).strict();
export const startIeltsMockAttemptSchema = z.object({ clientAttemptId: z.uuid(), mockTestId: z.uuid(), mode: ieltsMockModeSchema }).strict();
export const saveIeltsMockResponsesSchema = z.object({ expectedRevision: z.number().int().positive(), responses: z.record(z.string(), z.string().max(20_000)) }).strict();
export const submitIeltsMockSectionSchema = z.object({ expectedRevision: z.number().int().positive(), section: z.enum(['LISTENING', 'READING', 'WRITING', 'SPEAKING']) }).strict();
const learnerQuestionSchema = questionObjectSchema.omit({ answerPolicy: true, explanation: true });
export const ieltsMockAttemptSchema = z.object({
  id: z.uuid(), mockTestVersionId: z.uuid(), mockTestVersion: z.number().int().positive(), title: z.string(), mode: ieltsMockModeSchema,
  status: z.enum(['IN_PROGRESS', 'SUBMITTED', 'EVALUATION_PENDING', 'COMPLETED']), currentSection: z.enum(['LISTENING', 'READING', 'WRITING', 'SPEAKING', 'COMPLETE']), revision: z.number().int().positive(),
  responses: z.record(z.string(), z.string()), submittedSections: z.array(z.string()), sectionStartedAt: z.iso.datetime(), sectionDeadlineAt: z.iso.datetime(), startedAt: z.iso.datetime(), submittedAt: z.iso.datetime().nullable(),
  sectionContent: z.object({ listening: z.array(learnerQuestionSchema), reading: z.array(learnerQuestionSchema), writing: z.array(z.object({ task: z.number(), title: z.string(), prompt: z.string(), minimumWords: z.number() }).strict()), speaking: z.array(z.object({ part: z.number(), title: z.string(), prompts: z.array(z.string()), preparationSeconds: z.number(), responseSeconds: z.number() }).strict()) }).strict(),
}).strict();
export type IeltsMockAttemptDto = z.infer<typeof ieltsMockAttemptSchema>;

const rubricScoresSchema = z.tuple([mockBandSchema, mockBandSchema, mockBandSchema, mockBandSchema]);
export const reviewIeltsMockAttemptSchema = z.object({ expectedRevision: z.number().int().positive(), idempotencyKey: z.uuid(), writingTask1: rubricScoresSchema, writingTask2: rubricScoresSchema, speaking: rubricScoresSchema, strengths: z.array(z.string().min(3).max(300)).max(12), gaps: z.array(z.string().min(3).max(300)).max(12), nextActions: z.array(z.string().min(3).max(300)).min(1).max(12) }).strict();
