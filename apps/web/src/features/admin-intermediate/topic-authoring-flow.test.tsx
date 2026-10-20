import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NewTopicPage from '../../app/(admin)/admin/programs/intermediate/topics/new/page';
import TopicsPage from '../../app/(admin)/admin/programs/intermediate/topics/page';
import { TopicLessonEntry } from './topic-lesson-entry';
import { topicGroupClient } from '../../lib/api/topic-group-client';
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock('./intermediate-lesson-editor', () => ({ IntermediateLessonEditor: ({ initialTopicGroupId }: { initialTopicGroupId: string }) => <p>Editor for {initialTopicGroupId}</p> }));
const id = '11111111-1111-4111-8111-111111111111';
const root = '/admin/programs/intermediate/topic-groups';
afterEach(() => { cleanup(); vi.restoreAllMocks(); replace.mockReset(); });
describe('Topic-first authoring entry rules', () => {
  it.each([undefined, '', 'bad', [id, id]])('redirects a direct add URL without a single valid topic ID: %s', async value => {
    await expect(NewTopicPage({ searchParams: Promise.resolve({ topicGroupId: value }) })).rejects.toThrow(`REDIRECT:${root}`);
  });
  it('routes the old lesson index into the unified workspace', () => {
    expect(() => TopicsPage()).toThrow(`REDIRECT:${root}`);
  });
  it('validates a topic exists before exposing a new lesson editor', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue({ groups: [{ id, name: 'Restaurant', description: '', revision: 1, lessonCount: 0 }], lessons: [] });
    const page = await NewTopicPage({ searchParams: Promise.resolve({ topicGroupId: id }) });
    expect(page.type).toBe(TopicLessonEntry);
    render(page);
    expect(await screen.findByText(`Editor for ${id}`)).toBeVisible();
  });
  it('returns to topic selection for a deleted topic without showing the editor', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue({ groups: [], lessons: [] });
    render(<TopicLessonEntry groupId={id} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(root));
    expect(screen.queryByText(`Editor for ${id}`)).not.toBeInTheDocument();
  });
});
