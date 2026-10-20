import type { FieldSpec } from '../admin-authoring/structured-fields';

const context = () => ({ slug: `ielts-context-${crypto.randomUUID()}`, title: '' });
const pack = () => ({ slug: `ielts-pack-${crypto.randomUUID()}`, difficulty: 'developing', curriculumRevisionId: '', focusChunkSlugs: Array.from({ length: 12 }, (_, i) => `ielts-phrase-${i + 1}`), contexts: [context(), context()] });
export const newTopicTemplate = () => ({ schemaVersion: 1, title: '', description: '', packs: [pack()] });
export const topicFields: FieldSpec = { type: 'object', label: ['Topic fields', 'Các trường chủ đề'], fields: {
  title: { type: 'text', label: ['Topic title', 'Tên chủ đề'] },
  description: { type: 'text', multiline: true, label: ['Description', 'Mô tả'] },
  packs: { type: 'array', label: ['Packs', 'Gói học liệu'], create: pack, item: { type: 'object', label: ['Vocabulary pack', 'Gói từ vựng'], fields: {
    slug: { type: 'text', label: ['Pack slug', 'Mã gói'] },
    difficulty: { type: 'text', label: ['Difficulty', 'Độ khó'], options: ['foundation', 'developing', 'competent', 'advanced'] },
    curriculumRevisionId: { type: 'text', label: ['Published curriculum revision ID', 'ID phiên bản giáo trình đã xuất bản'] },
    focusChunkSlugs: { type: 'array', label: ['Focus phrases', 'Cụm từ trọng tâm'], help: ['Use at least 12 unique phrase slugs from the published lesson; replace examples with real references.', 'Dùng ít nhất 12 mã cụm từ riêng biệt trong bài học đã xuất bản; thay mã ví dụ bằng mã thật.'], create: () => '', item: { type: 'text', label: ['Phrase slug', 'Mã cụm từ'] } },
    contexts: { type: 'array', label: ['Contexts', 'Ngữ cảnh'], create: context, item: { type: 'object', label: ['Context', 'Ngữ cảnh học'], fields: {
      slug: { type: 'text', label: ['Context slug', 'Mã ngữ cảnh'] }, title: { type: 'text', label: ['Context title', 'Tên ngữ cảnh'] },
    } } },
  } } },
} };
