import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { topicGroupClient } from '../../lib/api/topic-group-client';
import { TopicGroupWorkspace } from './topic-group-workspace';
import { LocaleProvider } from '../../i18n/provider';

const id = '11111111-1111-4111-8111-111111111111';
const lessonId = '22222222-2222-4222-8222-222222222222';
const group = { id, name: 'Restaurant', description: 'Dining at work', revision: 1, lessonCount: 2 };
const catalog = { groups: [group], lessons: [
  { importId: lessonId, title: 'Book a table', status: 'DRAFT' as const, groupId: id, revision: 0 },
  { importId: '33333333-3333-4333-8333-333333333333', title: 'Order dinner', status: 'PUBLISHED' as const, groupId: id, revision: 2 },
] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Intermediate topic group workspace', () => {
  it('requires choosing a topic before exposing Add lesson', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    render(<TopicGroupWorkspace />);
    await screen.findByRole('button', { name: 'Restaurant (2)' });
    expect(screen.queryByRole('link', { name: 'Add lesson' })).not.toBeInTheDocument();
    expect(screen.getByText('Choose a topic to view its lessons or add a new lesson.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Restaurant (2)' }));
    expect(screen.getByRole('link', { name: 'Add lesson' })).toHaveAttribute('href', `/admin/programs/intermediate/topics/new?topicGroupId=${id}`);
  });
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
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Travel', nameEn: null, aliases: [], description: 'Business trips' }));
  });
  it('moves a lesson using its group revision and preserves errors for retry', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue(catalog);
    const assign = vi.spyOn(topicGroupClient, 'assign').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(catalog);
    render(<TopicGroupWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurant (2)' }));
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
  it('finds a bilingual topic through an alias and edits its registered names', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue({ ...catalog, groups: [{ ...group, name: 'Nhà hàng', nameEn: 'Restaurants', aliases: ['restaurent'] }] });
    const update = vi.spyOn(topicGroupClient, 'update').mockResolvedValue(group);
    render(<TopicGroupWorkspace />);
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Find a topic' }), { target: { value: 'restaurent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restaurants (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit topic' }));
    expect(screen.getByLabelText('English name')).toHaveValue('Restaurants');
    expect(screen.getByLabelText('Other names (one per line)')).toHaveValue('restaurent');
    fireEvent.change(screen.getByLabelText('English name'), { target: { value: 'Restaurant' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save topic' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(id, { name: 'Nhà hàng', nameEn: 'Restaurant', aliases: ['restaurent'], description: 'Dining at work', expectedRevision: 1 }));
  });
  it('shows Vietnamese names alone on Vietnamese category menus and assignment options', async () => {
    vi.spyOn(topicGroupClient, 'catalog').mockResolvedValue({ ...catalog, groups: [{ ...group, name: 'Nhà hàng', nameEn: 'Restaurants', aliases: ['restaurant'] }] });
    render(<LocaleProvider initialLocale="vi"><TopicGroupWorkspace /></LocaleProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Nhà hàng (2)' }));
    expect(screen.getByRole('heading', { name: 'Nhà hàng' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Restaurants/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'Nhà hàng' })).toHaveLength(2);
  });
});
