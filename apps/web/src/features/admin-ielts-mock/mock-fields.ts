import { INITIAL_IELTS_ACADEMIC_MOCK } from '@worklingo/contracts';
import type { FieldSpec } from '../admin-authoring/structured-fields';

export function newMockTemplate() {
  const content = JSON.parse(JSON.stringify(INITIAL_IELTS_ACADEMIC_MOCK)) as Record<string, unknown>;
  content.title = 'New Academic mock — draft example';
  content.allowedModes = ['PRACTICE', 'EXAM_SIMULATION'];
  // Every new paper owns fresh question IDs; authored media is supplied separately.
  const listening = content.listening as { parts: { questions: { id: string }[] }[] };
  const reading = content.reading as { passages: { questions: { id: string }[] }[] };
  for (const section of [...listening.parts, ...reading.passages]) for (const question of section.questions) question.id = crypto.randomUUID();
  return content;
}
const text = (en: string, vi: string, multiline = false): FieldSpec => ({ type: 'text', label: [en, vi], multiline });
const number = (en: string, vi: string): FieldSpec => ({ type: 'number', label: [en, vi] });
const strings = (en: string, vi: string, itemEn: string, itemVi: string, options?: readonly string[]): FieldSpec => ({ type: 'array', label: [en, vi], create: () => options?.[0] ?? '', item: { type: 'text', label: [itemEn, itemVi], ...(options ? { options } : {}) } });
const tags = () => strings('Competency tags', 'Nhãn năng lực', 'Competency tag', 'Nhãn năng lực');
const modes = ['PRACTICE', 'EXAM_SIMULATION'];
const questionTemplate = () => ({ id: crypto.randomUUID(), order: 1, type: 'short_answer', prompt: '', options: [], answerPolicy: { acceptedAnswers: [''], caseSensitive: false, maxWords: null }, competencyTags: [''], explanation: '' });
const questions: FieldSpec = { type: 'array', label: ['Questions', 'Câu hỏi'], create: questionTemplate, item: { type: 'object', label: ['Question', 'Câu hỏi chi tiết'], fields: {
  id: text('Question ID', 'ID câu hỏi'), order: number('Question order', 'Thứ tự câu hỏi'), type: { type: 'text', label: ['Question type', 'Dạng câu hỏi'], options: ['multiple_choice', 'matching', 'gap_fill', 'short_answer'] },
  prompt: text('Question prompt', 'Đề câu hỏi', true), options: strings('Answer options', 'Lựa chọn trả lời', 'Option', 'Lựa chọn'),
  answerPolicy: { type: 'object', label: ['Answer policy', 'Quy tắc đáp án'], fields: {
    acceptedAnswers: strings('Accepted answers', 'Đáp án được chấp nhận', 'Accepted answer', 'Đáp án'), caseSensitive: { type: 'boolean', label: ['Case sensitive', 'Phân biệt chữ hoa'] }, maxWords: { type: 'number', nullable: true, label: ['Maximum words (empty for unlimited)', 'Số từ tối đa (để trống nếu không giới hạn)'] },
  } }, competencyTags: tags(), explanation: text('Answer explanation', 'Giải thích đáp án', true),
} } };
const conversion: FieldSpec = { type: 'array', label: ['Score conversion', 'Quy đổi điểm'], create: () => ({ rawScore: 0, mockBand: 0 }), item: { type: 'object', label: ['Conversion row', 'Dòng quy đổi'], fields: { rawScore: number('Raw score', 'Điểm thô'), mockBand: number('Mock band', 'Band thi thử') } } };
const qualification: FieldSpec = { type: 'object', label: ['Qualification evidence (version 2)', 'Bằng chứng thẩm định (phiên bản 2)'], create: () => ({ reviewedBy: '', reviewedAt: '', evidenceRevision: '', qualifiedModes: ['PRACTICE'] }), fields: {
  reviewedBy: text('Reviewed by', 'Người thẩm định'), reviewedAt: text('Reviewed at (ISO date)', 'Thời điểm thẩm định (ISO)'), evidenceRevision: text('Evidence revision', 'Phiên bản bằng chứng'), qualifiedModes: strings('Qualified modes', 'Chế độ đã thẩm định', 'Qualified mode', 'Chế độ đã thẩm định', modes),
} };

export function mockFields(version: unknown): FieldSpec {
  return { type: 'object', label: ['Mock paper fields', 'Các trường đề thi thử'], fields: {
    schemaVersion: { type: 'number', label: ['Schema version', 'Phiên bản định dạng'], options: [1, 2] },
    variant: { type: 'text', label: ['Variant', 'Loại đề'], options: ['ACADEMIC'] }, title: text('Paper title', 'Tên đề thi'), disclosure: text('Result disclosure', 'Thông báo về kết quả', true),
    allowedModes: strings('Allowed modes', 'Chế độ cho phép', 'Mode', 'Chế độ', version === 2 ? modes : ['LEARNING', ...modes]),
    listening: { type: 'object', collapsible: true, label: ['Listening', 'Nghe'], fields: {
      durationMinutes: number('Listening duration (minutes)', 'Thời lượng Nghe (phút)'),
      parts: { type: 'array', label: ['Listening parts', 'Các phần Nghe'], create: () => ({ part: 1, audioAssetId: null, questions: [] }), item: { type: 'object', label: ['Listening part', 'Phần Nghe'], fields: {
        part: number('Part number', 'Số phần'), audioAssetId: { type: 'text', nullable: true, label: ['Audio asset ID', 'ID tệp âm thanh'] }, transcript: text('Transcript (optional)', 'Lời thoại (tùy chọn)', true), questions,
      } } }, conversion,
    } },
    reading: { type: 'object', collapsible: true, label: ['Reading', 'Đọc'], fields: {
      durationMinutes: number('Reading duration (minutes)', 'Thời lượng Đọc (phút)'),
      passages: { type: 'array', label: ['Reading passages', 'Các bài Đọc'], create: () => ({ section: 1, title: '', passage: '', questions: [] }), item: { type: 'object', label: ['Reading passage', 'Bài Đọc'], fields: {
        section: number('Section number', 'Số bài'), title: text('Passage title', 'Tên bài đọc'), passage: text('Passage text', 'Nội dung bài đọc', true), questions,
      } } }, conversion,
    } },
    writing: { type: 'object', collapsible: true, label: ['Writing', 'Viết'], fields: {
      durationMinutes: number('Writing duration (minutes)', 'Thời lượng Viết (phút)'), tasks: { type: 'array', label: ['Writing tasks', 'Các bài Viết'], create: () => ({ task: 1, title: '', prompt: '', minimumWords: 150, weight: 1, criteria: ['task_achievement', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy'], competencyTags: [''] }), item: { type: 'object', label: ['Writing task', 'Bài Viết'], fields: {
        task: number('Task number', 'Số bài viết'), title: text('Task title', 'Tên bài viết'), prompt: text('Writing prompt', 'Đề bài Viết', true), minimumWords: number('Minimum words', 'Số từ tối thiểu'), weight: number('Score weight', 'Trọng số điểm'), criteria: strings('Assessment criteria', 'Tiêu chí đánh giá', 'Criterion', 'Tiêu chí', ['task_achievement', 'task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy']), competencyTags: tags(),
      } } },
    } },
    speaking: { type: 'object', collapsible: true, label: ['Speaking', 'Nói'], fields: {
      durationMinutes: { type: 'object', label: ['Speaking duration (minutes)', 'Thời lượng Nói (phút)'], fields: { minimum: number('Minimum minutes', 'Số phút tối thiểu'), maximum: number('Maximum minutes', 'Số phút tối đa') } },
      parts: { type: 'array', label: ['Speaking parts', 'Các phần Nói'], create: () => ({ part: 1, title: '', prompts: [''], preparationSeconds: 0, responseSeconds: 60, competencyTags: [''] }), item: { type: 'object', label: ['Speaking part', 'Phần Nói'], fields: {
        part: number('Speaking part number', 'Số phần Nói'), title: text('Speaking title', 'Tên phần Nói'), prompts: strings('Speaking prompts', 'Đề phần Nói', 'Speaking prompt', 'Đề bài Nói'), preparationSeconds: number('Preparation seconds', 'Số giây chuẩn bị'), responseSeconds: number('Response seconds', 'Số giây trả lời'), competencyTags: tags(),
      } } },
    } },
    ...(version === 2 ? { qualification } : {}),
  } };
}
