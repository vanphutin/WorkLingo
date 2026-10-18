import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type NextLink from 'next/link';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentImportDto } from '@worklingo/contracts';
import AdminLayout from '../../app/(admin)/layout';
import { apiClient } from '../../lib/api/api-client';
import { IntermediateLessonEditor } from '../admin-intermediate/intermediate-lesson-editor';
import { createIntermediateLessonDraft, serializeIntermediateLesson } from '../admin-intermediate/lesson-model';

const { navigate, router } = vi.hoisted(() => ({ navigate: vi.fn(), router: { push: vi.fn(), replace: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/programs/intermediate/grammar/11111111-1111-4111-8111-111111111111',
}));

// Match Next Link's separate cancellable onNavigate event, rather than treating it as onClick.
// Modified clicks, downloads, new targets and external links do not trigger SPA navigation.
vi.mock('next/link', () => ({ default: function LinkStub({ href, onClick, onNavigate, ...props }: ComponentProps<typeof NextLink>) {
  if (typeof href !== 'string') throw new Error('This fixture expects string destinations.');
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault(); // Suppress jsdom's native browsing; only model the client transition below.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
      || (props.target && props.target !== '_self') || props.download !== undefined || !href.startsWith('/')) return;
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; } });
    if (!prevented) navigate(href);
  }} />;
} }));

const ID = '11111111-1111-4111-8111-111111111111';
function record(rawSource?: string): ContentImportDto {
  const draft = createIntermediateLessonDraft('grammar');
  draft.title = 'Existing lesson';
  return {
    id: ID, lessonId: null, lessonVersionId: null,
    rawSource: rawSource ?? serializeIntermediateLesson('grammar', draft), sourceHash: 'hash',
    status: 'DRAFT', draftRevision: 7, parserVersion: '1.0.0', validationHash: null,
    createdById: ID, updatedById: ID, createdAt: '2026-10-18T00:00:00Z', updatedAt: '2026-10-18T00:00:00Z',
  };
}
function shell(showEditor = true) {
  return <AdminLayout>{showEditor ? <IntermediateLessonEditor category="grammar" importId={ID} /> : <p>Other admin content</p>}</AdminLayout>;
}
function linkFor(surface: 'sidebar' | 'breadcrumb' | 'brand' | 'editor' | 'advanced') {
  if (surface === 'sidebar') return within(screen.getByRole('navigation', { name: 'Admin workspace' })).getByRole('link', { name: 'Reading' });
  if (surface === 'breadcrumb') return within(screen.getByRole('navigation', { name: 'Breadcrumbs' })).getByRole('link', { name: 'Intermediate' });
  if (surface === 'brand') return screen.getByRole('link', { name: 'WorkLingo Admin' });
  if (surface === 'advanced') return screen.getByRole('link', { name: 'Validation, audio and publishing' });
  return screen.getByRole('link', { name: 'Back to Grammar lessons' });
}
function makeDirty() {
  fireEvent.change(screen.getByLabelText('Lesson title'), { target: { value: 'Keep my unsaved edits' } });
}
beforeEach(() => {
  vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
    id: ID, email: 'admin@worklingo.test', displayName: 'Admin User', onboardingStatus: null, roles: ['CONTENT_ADMIN'],
  });
  vi.spyOn(apiClient, 'getContentImport').mockResolvedValue(record());
  vi.spyOn(apiClient, 'updateContentSource').mockImplementation(async (_id, input) => ({ ...record(input.rawSource), draftRevision: 8 }));
  vi.spyOn(window, 'confirm').mockReturnValue(false);
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); navigate.mockReset(); router.push.mockReset(); router.replace.mockReset();
});

describe('Admin navigation guard with the real layout and Intermediate editor', () => {
  it.each(['sidebar', 'breadcrumb', 'brand', 'editor', 'advanced'] as const)('cancel blocks dirty %s navigation and retains the input, prompting once', async (surface) => {
    render(shell());
    await screen.findByDisplayValue('Existing lesson');
    makeDirty();
    fireEvent.click(linkFor(surface));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Leave this lesson and discard those changes?');
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Lesson title')).toHaveValue('Keep my unsaved edits');
  });

  it.each([
    ['sidebar', '/admin/programs/intermediate/reading'],
    ['breadcrumb', '/admin/programs/intermediate'],
    ['brand', '/admin'],
    ['editor', '/admin/programs/intermediate/grammar'],
    ['advanced', `/admin/content/${ID}`],
  ] as const)('confirm allows dirty %s navigation exactly once', async (surface, destination) => {
    vi.mocked(window.confirm).mockReturnValue(true);
    render(shell());
    await screen.findByDisplayValue('Existing lesson');
    makeDirty();
    fireEvent.click(linkFor(surface));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(destination);
  });

  it('does not prompt for a clean draft through sidebar or breadcrumbs', async () => {
    render(shell());
    await screen.findByDisplayValue('Existing lesson');
    fireEvent.click(linkFor('sidebar'));
    fireEvent.click(linkFor('breadcrumb'));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(navigate.mock.calls).toEqual([['/admin/programs/intermediate/reading'], ['/admin/programs/intermediate']]);
  });

  it('clears the dirty registration after a successful save', async () => {
    render(shell());
    await screen.findByDisplayValue('Existing lesson');
    makeDirty();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Revision 8');
    fireEvent.click(linkFor('sidebar'));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/admin/programs/intermediate/reading');
  });

  it('unregisters an unmounted dirty editor while the admin shell stays mounted', async () => {
    const view = render(shell());
    await screen.findByDisplayValue('Existing lesson');
    makeDirty();
    view.rerender(shell(false));
    expect(screen.getByText('Other admin content')).toBeVisible();
    fireEvent.click(linkFor('sidebar'));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/admin/programs/intermediate/reading');
  });

  it('keeps guarding dirty edits after a save failure', async () => {
    vi.mocked(apiClient.updateContentSource).mockRejectedValue(new Error('offline'));
    render(shell());
    await screen.findByDisplayValue('Existing lesson');
    makeDirty();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByRole('alert');
    fireEvent.click(linkFor('breadcrumb'));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Lesson title')).toHaveValue('Keep my unsaved edits');
  });

  it('retains browser beforeunload protection while dirty', async () => {
    render(shell());
    await screen.findByDisplayValue('Existing lesson');
    makeDirty();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('leaves modified link clicks to native browser behavior without a prompt', async () => {
    render(shell());
    await screen.findByDisplayValue('Existing lesson');
    makeDirty();
    fireEvent.click(linkFor('sidebar'), { ctrlKey: true });
    expect(window.confirm).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
