import { describe, expect, it, vi } from 'vitest';
import CategoryPage from '../../app/(admin)/admin/programs/intermediate/[category]/page';
import NewLessonPage from '../../app/(admin)/admin/programs/intermediate/[category]/new/page';
import EditLessonPage from '../../app/(admin)/admin/programs/intermediate/[category]/[importId]/page';
import { IntermediateCategoryWorkspace } from './intermediate-category-workspace';
import { IntermediateLessonEditor } from './intermediate-lesson-editor';

vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));

describe('Intermediate category routes', () => {
  it.each(['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'])('awaits params and connects the %s list, new and edit routes', async (category) => {
    const list = await CategoryPage({ params: Promise.resolve({ category }) });
    expect(list.type).toBe(IntermediateCategoryWorkspace);
    expect(list.props).toEqual({ category });
    const create = await NewLessonPage({ params: Promise.resolve({ category }) });
    expect(create.type).toBe(IntermediateLessonEditor);
    expect(create.props).toEqual({ category });
    const edit = await EditLessonPage({ params: Promise.resolve({ category, importId: 'existing-id' }) });
    expect(edit.type).toBe(IntermediateLessonEditor);
    expect(edit.props).toEqual({ category, importId: 'existing-id' });
    expect(edit.key).toBe(`${category}:existing-id`);
  });

  it.each(['unknown', 'Grammar', 'beginner', ''])('rejects invalid category %s before rendering a list or form', async (category) => {
    await expect(CategoryPage({ params: Promise.resolve({ category }) })).rejects.toThrow('NOT_FOUND');
    await expect(NewLessonPage({ params: Promise.resolve({ category }) })).rejects.toThrow('NOT_FOUND');
    await expect(EditLessonPage({ params: Promise.resolve({ category, importId: 'existing-id' }) })).rejects.toThrow('NOT_FOUND');
  });
});
