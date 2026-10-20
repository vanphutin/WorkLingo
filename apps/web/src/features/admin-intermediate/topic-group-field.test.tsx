import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { topicGroupClient } from '../../lib/api/topic-group-client';
import { ApiError } from '../../lib/api/api-client';
import { TopicGroupField } from './topic-group-field';
import { LocaleProvider } from '../../i18n/provider';

const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const groups = [
  { id, name: 'Nhà hàng', nameEn: 'Restaurants', aliases: ['Restaurant', 'restaurent', 'Nha hang'], description: '', revision: 1, lessonCount: 1 },
  { id: other, name: 'Khách sạn', nameEn: 'Hotels', aliases: [], description: '', revision: 1, lessonCount: 0 },
];
const catalog = { groups, lessons: [{ importId: id, title: 'Lesson', status: 'DRAFT' as const, groupId: id, revision: 3 }] };
function Field({ importId }: { importId?: string }) {
  const [value, onChange] = useState('');
  return <TopicGroupField value={value} onChange={onChange} {...(importId ? { importId } : {})} />;
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState(null, '', '/'); });
describe('Topic selection inside the lesson editor', () => {
  it('preselects a known topic from the group workspace Add lesson link', async () => {
    window.history.replaceState(null, '', `/?topicGroupId=${id}`);
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    render(<Field />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Lesson topic' })).toHaveValue(id));
  });
  it('searches Vietnamese, English and spelling aliases but selects the same stable ID', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    const assign = vi.spyOn(topicGroupClient, 'assign');
    render(<Field />);
    const select = await screen.findByRole('combobox', { name: 'Lesson topic' });
    for (const query of ['nha hang', 'restaurant', 'restaurent']) {
      fireEvent.change(screen.getByRole('searchbox', { name: 'Find a topic' }), { target: { value: query } });
      expect(screen.getByRole('option', { name: 'Restaurants' })).toBeVisible();
      expect(screen.queryByRole('option', { name: 'Hotels' })).not.toBeInTheDocument();
    }
    fireEvent.change(select, { target: { value: id } });
    expect(select).toHaveValue(id); expect(assign).not.toHaveBeenCalled();
  });
  it('shows only Vietnamese topic names in the Vietnamese interface while searching English aliases', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    render(<LocaleProvider initialLocale="vi"><Field /></LocaleProvider>);
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Tìm chủ đề' }), { target: { value: 'restaurant' } });
    expect(screen.getByRole('option', { name: 'Nhà hàng' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Restaurants/ })).not.toBeInTheDocument();
  });
  it('loads a saved lesson assignment and saves only its taxonomy revision', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    const assign = vi.spyOn(topicGroupClient, 'assign').mockResolvedValue({ ...catalog, lessons: [{ ...catalog.lessons[0]!, groupId: other, revision: 4 }] });
    render(<Field importId={id} />);
    const select = await screen.findByRole('combobox', { name: 'Lesson topic' });
    await waitFor(() => expect(select).toHaveValue(id));
    fireEvent.change(select, { target: { value: other } });
    await waitFor(() => expect(assign).toHaveBeenCalledWith(id, { groupId: other, expectedRevision: 3 }));
    await waitFor(() => expect(select).toHaveValue(other));
  });
  it('keeps the current assignment after a stale-write conflict and offers reload', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    vi.spyOn(topicGroupClient, 'assign').mockRejectedValue(new ApiError({ code: 'TOPIC_GROUP_REVISION_CONFLICT', message: 'stale', status: 409 }));
    render(<Field importId={id} />);
    const select = await screen.findByRole('combobox', { name: 'Lesson topic' });
    await waitFor(() => expect(select).toHaveValue(id));
    fireEvent.change(select, { target: { value: other } });
    expect(await screen.findByRole('alert')).toHaveTextContent('changed');
    expect(select).toHaveValue(id);
    expect(screen.getByRole('button', { name: 'Reload saved data' })).toBeVisible();
  });
  it('shows a retry without making content authoring dependent on catalog availability', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockRejectedValue(new Error('offline'));
    render(<Field />);
    expect(await screen.findByText('Topics could not be loaded. You can still save an ungrouped lesson.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
});
