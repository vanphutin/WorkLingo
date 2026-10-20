import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentImportDto } from '@worklingo/contracts';
import type { IntermediateCategory } from '@worklingo/content-format';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';
import { ApiError, apiClient } from '../../lib/api/api-client';
import { createIntermediateLessonDraft, serializeIntermediateLesson } from './lesson-model';
import { IntermediateLessonEditor } from './intermediate-lesson-editor';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
function record(category: IntermediateCategory = 'grammar', overrides: Partial<ContentImportDto> = {}): ContentImportDto {
  const draft = createIntermediateLessonDraft(category);
  draft.title = 'Existing lesson';
  return {
    id: ID, lessonId: null, lessonVersionId: null,
    rawSource: serializeIntermediateLesson(category, draft), sourceHash: 'hash',
    status: 'DRAFT', draftRevision: 7, parserVersion: '1.0.0', validationHash: null,
    createdById: OTHER, updatedById: OTHER, createdAt: '2026-10-18T00:00:00Z', updatedAt: '2026-10-18T00:00:00Z',
    ...overrides,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
}
function LanguageSwitch() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('vi')}>Switch language</button>;
}

beforeEach(() => {
  vi.spyOn(apiClient, 'getContentImport').mockResolvedValue(record());
  vi.spyOn(apiClient, 'createContentImport').mockResolvedValue(record());
  vi.spyOn(apiClient, 'updateContentSource').mockImplementation(async (id, input) => record('grammar', {
    id, rawSource: input.rawSource, draftRevision: input.expectedDraftRevision + 1,
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); push.mockReset(); localStorage.clear(); });

describe('IntermediateLessonEditor', () => {
  it.each([
    ['grammar', 'Grammar focus', 'Grammar pattern'],
    ['pronunciation', 'Pronunciation focus', 'Pronunciation / IPA'],
    ['vocabulary', 'Vocabulary focus', 'Expression'],
    ['reading', 'Reading focus', 'Reading text'],
    ['listening', 'Listening focus', 'Dialogue'],
    ['speaking', 'Speaking focus', 'Speaking prompt'],
    ['writing', 'Writing focus', 'Writing prompt'],
  ] as const)('makes %s inputs primary with optional supporting activities', (category, heading, label) => {
    render(<IntermediateLessonEditor category={category} />);
    const primary = screen.getByRole('region', { name: heading });
    expect(within(primary).getByRole('textbox', { name: label })).toBeVisible();
    const disclosure = screen.getByText('Supporting activities');
    expect(disclosure.closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('textbox', { name: /source|json/i })).not.toBeInTheDocument();
    fireEvent.click(disclosure);
    expect(screen.getByRole('textbox', { name: 'Activate prompt' })).toBeVisible();
  });

  it.each(['grammar', 'pronunciation', 'vocabulary', 'reading', 'listening', 'speaking', 'writing'] as const)(
    'creates a private %s draft with explicit metadata and its own destination', async (category) => {
      render(<IntermediateLessonEditor category={category} />);
      change('Lesson title', 'Negotiating deadlines');
      fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
      await waitFor(() => expect(push).toHaveBeenCalledWith(`/admin/programs/intermediate/${category}/${ID}`));
      const source = vi.mocked(apiClient.createContentImport).mock.calls[0]![0];
      expect(source).toContain('program: intermediate');
      expect(source).toContain(`category: ${category}`);
      expect(source).toContain('authoring_template: intermediate-form-v1');
      expect(source).toContain('title: Negotiating deadlines');
      expect(apiClient.updateContentSource).not.toHaveBeenCalled();
    },
  );

  it('edits only the selected ID and advances the saved revision', async () => {
    render(<IntermediateLessonEditor category="grammar" importId={ID} />);
    await screen.findByDisplayValue('Existing lesson');
    change('Lesson title', 'Revised lesson');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Revision 8');
    expect(apiClient.updateContentSource).toHaveBeenCalledWith(ID, {
      expectedDraftRevision: 7, rawSource: expect.stringContaining('title: Revised lesson'),
    });
    change('Lesson title', 'Second revision');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Revision 9');
    expect(vi.mocked(apiClient.updateContentSource).mock.calls[1]![1].expectedDraftRevision).toBe(8);
    expect(screen.getByRole('link', { name: /validation, audio and publishing/i })).toHaveAttribute('href', `/admin/content/${ID}`);
  });

  it('preserves dirty fields and the original revision on conflict, without retrying', async () => {
    vi.mocked(apiClient.updateContentSource).mockRejectedValue(new ApiError({ status: 409, code: 'DRAFT_REVISION_CONFLICT', message: 'internal diagnostic' }));
    render(<IntermediateLessonEditor category="grammar" importId={ID} />);
    await screen.findByDisplayValue('Existing lesson');
    change('Lesson title', 'Keep my work');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/another session/i);
    expect(screen.getByLabelText('Lesson title')).toHaveValue('Keep my work');
    expect(screen.getByText('Revision 7')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.queryByText('internal diagnostic')).not.toBeInTheDocument();
    expect(apiClient.updateContentSource).toHaveBeenCalledTimes(1);
  });

  it('refuses structured resaving of unsupported source and links to the entire original', async () => {
    const original = `${record().rawSource}\n[CONTENT custom-extra]\ntype: email\ntext:\n<<<\nDo not discard this.\n>>>\n[/CONTENT]\n`;
    vi.mocked(apiClient.getContentImport).mockResolvedValue(record('grammar', { rawSource: original }));
    render(<IntermediateLessonEditor category="grammar" importId={ID} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/advanced editor/i);
    expect(screen.getByRole('link', { name: 'Open advanced editor' })).toHaveAttribute('href', `/admin/content/${ID}`);
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(apiClient.updateContentSource).not.toHaveBeenCalled();
  });

  it('rejects a wrong-category record', async () => {
    vi.mocked(apiClient.getContentImport).mockResolvedValue(record('reading'));
    render(<IntermediateLessonEditor category="grammar" importId={ID} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/different category/i);
    expect(screen.queryByRole('textbox', { name: 'Lesson title' })).not.toBeInTheDocument();
  });

  it('ignores a previous ID fetch after switching records', async () => {
    const old = deferred<ContentImportDto>();
    vi.mocked(apiClient.getContentImport).mockImplementation((id) => id === ID ? old.promise : Promise.resolve(record('grammar', { id: OTHER, rawSource: record().rawSource.replace('Existing lesson', 'New record') })));
    const view = render(<IntermediateLessonEditor category="grammar" importId={ID} />);
    view.rerender(<IntermediateLessonEditor category="grammar" importId={OTHER} />);
    await screen.findByDisplayValue('New record');
    change('Lesson title', 'New dirty work');
    await act(async () => { old.resolve(record()); });
    expect(screen.getByLabelText('Lesson title')).toHaveValue('New dirty work');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(apiClient.updateContentSource).toHaveBeenCalledWith(OTHER, expect.anything()));
  });

  it('blocks the previous form immediately when the category changes and ignores its fetch', async () => {
    const old = deferred<ContentImportDto>();
    vi.mocked(apiClient.getContentImport).mockReturnValueOnce(old.promise).mockResolvedValueOnce(record('writing'));
    const view = render(<IntermediateLessonEditor category="grammar" importId={ID} />);
    view.rerender(<IntermediateLessonEditor category="writing" importId={ID} />);
    await screen.findByRole('region', { name: 'Writing focus' });
    await act(async () => { old.resolve(record('grammar')); });
    expect(screen.getByRole('region', { name: 'Writing focus' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Grammar focus' })).not.toBeInTheDocument();
  });

  it('ignores a create response after unmount, avoiding a late redirect', async () => {
    const create = deferred<ContentImportDto>();
    vi.mocked(apiClient.createContentImport).mockReturnValue(create.promise);
    const view = render(<IntermediateLessonEditor category="grammar" />);
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    view.unmount();
    await act(async () => { create.resolve(record()); });
    expect(push).not.toHaveBeenCalled();
  });

  it.each(['PUBLISHED', 'ARCHIVED'] as const)('keeps %s source read-only', async (status) => {
    vi.mocked(apiClient.getContentImport).mockResolvedValue(record('grammar', { status }));
    render(<IntermediateLessonEditor category="grammar" importId={ID} />);
    await screen.findByDisplayValue('Existing lesson');
    expect(screen.getByLabelText('Lesson title')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });

  it('edits independent reading/listening questions, options, answers and evidence', async () => {
    render(<IntermediateLessonEditor category="reading" />);
    change('Reading text', 'A deadline was agreed.');
    const reading = screen.getByRole('group', { name: 'Reading question 1' });
    fireEvent.change(within(reading).getByLabelText('Question'), { target: { value: 'What was agreed?' } });
    fireEvent.change(within(reading).getByLabelText('Option 1'), { target: { value: 'A deadline' } });
    fireEvent.change(within(reading).getByLabelText('Option 2'), { target: { value: 'A price' } });
    fireEvent.change(within(reading).getByLabelText('Correct answer'), { target: { value: '1' } });
    fireEvent.change(within(reading).getByLabelText('Evidence line'), { target: { value: '2' } });
    fireEvent.click(within(reading).getByRole('button', { name: 'Add option' }));
    expect(within(reading).getByLabelText('Option 3')).toBeVisible();
    fireEvent.click(screen.getByText('Supporting activities'));
    change('Dialogue', 'An (nam): Hello.\nLan (nữ): Hi.');
    const listening = screen.getByRole('group', { name: 'Listening question 1' });
    fireEvent.change(within(listening).getByLabelText('Question'), { target: { value: 'Who says hello?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    const source = vi.mocked(apiClient.createContentImport).mock.calls[0]![0];
    expect(source).toContain('What was agreed?');
    expect(source).toContain('Who says hello?');
    expect(source).toContain('An (nam): Hello.');
  });

  it('keeps edits when switching English to Vietnamese and localizes controls', async () => {
    render(<LocaleProvider initialLocale="en"><LanguageSwitch /><IntermediateLessonEditor category="writing" /></LocaleProvider>);
    change('Lesson title', 'My unsaved title');
    change('Writing prompt', 'Write an email.');
    fireEvent.click(screen.getByText('Switch language'));
    expect(await screen.findByRole('button', { name: 'Tạo bản nháp' })).toBeVisible();
    expect(screen.getByLabelText('Tên bài học')).toHaveValue('My unsaved title');
    expect(screen.getByLabelText('Đề bài viết')).toHaveValue('Write an email.');
    expect(screen.getByRole('region', { name: 'Trọng tâm viết' })).toBeVisible();
  });

  it('shows a private failure message and preserves local edits after save failure', async () => {
    vi.mocked(apiClient.updateContentSource).mockRejectedValue(new Error('secret database detail'));
    render(<IntermediateLessonEditor category="grammar" importId={ID} />);
    await screen.findByDisplayValue('Existing lesson');
    change('Lesson title', 'Keep after error');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('alert')).not.toHaveTextContent('secret database detail');
    expect(screen.getByLabelText('Lesson title')).toHaveValue('Keep after error');
    expect(screen.getByText('Revision 7')).toBeVisible();
  });
});

it('ignores a stale save result after moving to another record', async () => {
  const pending = deferred<ContentImportDto>();
  vi.mocked(apiClient.updateContentSource).mockReturnValue(pending.promise);
  vi.mocked(apiClient.getContentImport).mockImplementation(async (id) => record('grammar', { id, rawSource: record().rawSource.replace('Existing lesson', id === ID ? 'First lesson' : 'Second lesson') }));
  const view = render(<IntermediateLessonEditor category="grammar" importId={ID} />);
  await screen.findByDisplayValue('First lesson');
  change('Lesson title', 'First pending edit');
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  view.rerender(<IntermediateLessonEditor category="grammar" importId={OTHER} />);
  await screen.findByDisplayValue('Second lesson');
  change('Lesson title', 'Second unsaved edit');
  await act(async () => { pending.resolve(record('grammar', { draftRevision: 99 })); });
  expect(screen.getByLabelText('Lesson title')).toHaveValue('Second unsaved edit');
  expect(screen.getByText('Revision 7')).toBeVisible();
  expect(screen.queryByText('Revision 99')).not.toBeInTheDocument();
});

it('rejects source delimiters locally without exposing serializer internals or losing edits', async () => {
  render(<IntermediateLessonEditor category="reading" />);
  change('Reading text', '[ACTIVITY injected]');
  fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/check unique lowercase slugs/i);
  expect(screen.getByLabelText('Reading text')).toHaveValue('[ACTIVITY injected]');
  expect(apiClient.createContentImport).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});
