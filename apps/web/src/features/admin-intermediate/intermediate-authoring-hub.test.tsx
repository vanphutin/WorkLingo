import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../i18n/provider';
import { apiClient } from '../../lib/api/api-client';
import { IntermediateAuthoringHub } from './intermediate-authoring-hub';

vi.mock('../../lib/api/api-client', () => ({ apiClient: { listContentImports: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('Intermediate authoring hub', () => {
  it('keeps seven separate Add lesson and list links available while loading or offline', async () => {
    vi.mocked(apiClient.listContentImports).mockRejectedValue(new Error('offline'));
    render(<IntermediateAuthoringHub />);
    expect(screen.getByRole('link', { name: 'Topics and lessons' })).toHaveAttribute('href', '/admin/programs/intermediate/topic-groups');
    expect(screen.queryByRole('link', { name: 'Add a topic lesson' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Earlier category tools'));
    for (const [slug, label] of [['grammar', 'Grammar'], ['pronunciation', 'Pronunciation'], ['vocabulary', 'Vocabulary'], ['reading', 'Reading'], ['listening', 'Listening'], ['speaking', 'Speaking'], ['writing', 'Writing']] as const) {
      const card = screen.getByRole('article', { name: label });
      expect(within(card).getByRole('link', { name: `Add lesson: ${label}` })).toHaveAttribute('href', `/admin/programs/intermediate/${slug}/new`);
      expect(within(card).getByRole('link', { name: `View lessons: ${label}` })).toHaveAttribute('href', `/admin/programs/intermediate/${slug}`);
    }
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load lesson counts');
    expect(screen.getByRole('link', { name: 'Shared library and unclassified lessons' })).toHaveAttribute('href', '/admin/content');
    vi.mocked(apiClient.listContentImports).mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findAllByText('0 lessons')).toHaveLength(7);
  });

  it('translates category names and accessible add links into Vietnamese', async () => {
    vi.mocked(apiClient.listContentImports).mockResolvedValue([]);
    render(<LocaleProvider initialLocale="vi"><IntermediateAuthoringHub /></LocaleProvider>);
    expect(screen.getByRole('link', { name: 'Chủ đề & bài học' })).toHaveAttribute('href', '/admin/programs/intermediate/topic-groups');
    fireEvent.click(screen.getByText('Công cụ chuyên mục trước đây'));
    expect(screen.getByRole('link', { name: 'Thêm bài học: Ngữ pháp' })).toHaveAttribute('href', '/admin/programs/intermediate/grammar/new');
    expect(screen.getByRole('link', { name: 'Xem bài học: Phát âm' })).toHaveAttribute('href', '/admin/programs/intermediate/pronunciation');
    expect(await screen.findAllByText('0 bài học')).toHaveLength(7);
  });
});
