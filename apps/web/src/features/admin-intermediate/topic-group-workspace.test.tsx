import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { topicGroupClient } from '../../lib/api/topic-group-client';
import { TopicGroupWorkspace } from './topic-group-workspace';

const id = '11111111-1111-4111-8111-111111111111';
const lessonId = '22222222-2222-4222-8222-222222222222';
const group = { id, name: 'Restaurant', description: 'Dining at work', revision: 1, lessonCount: 2 };
const catalog = { groups: [group], lessons: [
  { importId: lessonId, title: 'Book a table', status: 'DRAFT' as const, groupId: id, revision: 0 },
  { importId: '33333333-3333-4333-8333-333333333333', title: 'Order dinner', status: 'PUBLISHED' as const, groupId: id, revision: 2 },
] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Intermediate topic group workspace', () => {
  it('shows multiple lessons within a group with separate edit links and publication states', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    render(<TopicGroupWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurant (2)' }));
    expect(screen.getByRole('link', { name: 'Book a table' })).toHaveAttribute('href', `/admin/programs/intermediate/topics/${lessonId}`);
    expect(screen.getByRole('link', { name: 'Order dinner' })).toBeVisible();
    expect(screen.getByText('Draft')).toBeVisible();
    expect(screen.getByText('Published')).toBeVisible();
  });
  it('creates a group independently of lesson publication', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    const create = vi.spyOn(topicGroupClient, 'create').mockResolvedValue(group);
    render(<TopicGroupWorkspace />);
    await screen.findByRole('button', { name: 'Restaurant (2)' });
    fireEvent.click(screen.getByRole('button', { name: 'Add topic' }));
    fireEvent.change(screen.getByLabelText('Topic name'), { target: { value: 'Travel' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Business trips' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save topic' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Travel', description: 'Business trips' }));
  });
  it('moves a lesson using its group revision and preserves errors for retry', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    const assign = vi.spyOn(topicGroupClient, 'assign').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(catalog);
    render(<TopicGroupWorkspace />);
    const select = await screen.findByRole('combobox', { name: 'Topic for Book a table' });
    fireEvent.change(select, { target: { value: '' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('could not');
    expect(select).toHaveValue(id);
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(2));
    expect(assign).toHaveBeenLastCalledWith(lessonId, { groupId: null, expectedRevision: 0 });
  });
  it('confirms group deletion explicitly and never calls lesson deletion', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    const remove = vi.spyOn(topicGroupClient, 'remove').mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TopicGroupWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurant (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete topic' }));
    expect(remove).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete topic' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(id, { expectedRevision: 1 }));
  });
});
