import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ieltsBridgeStageTypes, type AdminIeltsBridgeModuleDto } from '@worklingo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminIeltsBridgeClient } from '../../lib/api/admin-ielts-bridge-client';
import { IeltsBridgeAuthoringWorkspace } from './ielts-bridge-authoring-workspace';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

const lifecycle = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('../../lib/api/admin-content-lifecycle-client', () => ({ adminContentLifecycleClient: lifecycle }));

function LocaleToggle() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('en')}>Switch to English</button>;
}

vi.mock('../../lib/api/admin-ielts-bridge-client', () => ({
  adminIeltsBridgeClient: {
    list: vi.fn(), create: vi.fn(), updateDraft: vi.fn(), validate: vi.fn(), publish: vi.fn(), archive: vi.fn(),
  },
}));

const moduleDto: AdminIeltsBridgeModuleDto = {
  id: '11111111-1111-4111-8111-111111111111', slug: 'reading-true-false-not-given', status: 'DRAFT',
  draftRevision: 1, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString(),
  draft: {
    title: 'Reading TFNG', description: 'Separate contradiction from missing information.', skill: 'reading',
    questionType: 'reading_true_false_not_given', required: true,
    stages: ieltsBridgeStageTypes.map((type, index) => ({
      slug: type.replaceAll('_', '-'), type, title: `Stage ${index + 1}`, instruction: 'Use complete evidence.',
      strategySteps: ['Read the whole claim.'], timeLimitSeconds: type === 'timed_practice' ? 120 : null,
      task: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
        ? { kind: 'single_choice' as const, prompt: 'Choose one.', options: ['TRUE', 'FALSE', 'NOT GIVEN'], answerIndex: 2 }
        : { kind: 'instruction' as const },
      feedback: ['analysed_example', 'easy_practice', 'increased_practice', 'independent_practice', 'timed_practice'].includes(type)
        ? { correct: 'Correct.', incorrect: 'Check the evidence.' } : null,
    })),
  },
};

describe('IeltsBridgeAuthoringWorkspace', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValue([moduleDto]);
    vi.mocked(adminIeltsBridgeClient.updateDraft).mockResolvedValue({ ...moduleDto, draftRevision: 2 });
    vi.mocked(adminIeltsBridgeClient.validate).mockResolvedValue({
      moduleId: moduleDto.id, draftRevision: 2, status: 'VALIDATED', canPublish: true, issues: [],
    });
  });

  it('localizes taxonomy and task controls without replacing authored stage content or edits', async () => {
    render(<LocaleProvider initialLocale="vi"><LocaleToggle /><IeltsBridgeAuthoringWorkspace /></LocaleProvider>);
    const title = await screen.findByLabelText('Tiêu đề giai đoạn');
    fireEvent.change(title, { target: { value: 'Keep my English guidance' } });
    expect(screen.getByLabelText('Kỹ năng').getAttribute('value')).toBe('Đọc');
    expect(screen.getByRole('option', { name: 'Chỉ hướng dẫn' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(await screen.findByLabelText('Stage title')).toBe(title);
    expect((title as HTMLInputElement).value).toBe('Keep my English guidance');
    expect((screen.getByLabelText('Instruction') as HTMLTextAreaElement).value).toBe('Use complete evidence.');
    expect(adminIeltsBridgeClient.list).toHaveBeenCalledTimes(1);
  });

  it('localizes answerable task editors and preserves English prompts, choices and feedback', async () => {
    render(<LocaleProvider initialLocale="vi"><IeltsBridgeAuthoringWorkspace /></LocaleProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /Stage 3$/ }));
    expect((screen.getByLabelText('Đề bài') as HTMLTextAreaElement).value).toBe('Choose one.');
    expect((screen.getByLabelText('Các lựa chọn, mỗi dòng một lựa chọn') as HTMLTextAreaElement).value).toBe('TRUE\nFALSE\nNOT GIVEN');
    expect(screen.getByLabelText('Phản hồi khi trả lời sai').getAttribute('lang')).toBe('en');
    fireEvent.change(screen.getByLabelText('Loại bài tập'), { target: { value: 'spoken_response' } });
    expect(screen.getByLabelText('Thời gian chuẩn bị (giây)')).not.toBeNull();
    expect(screen.getByLabelText('Câu trả lời mẫu')).not.toBeNull();
    expect(screen.getByRole('option', { name: 'Nói: phạm vi ngữ pháp' }).getAttribute('value')).toBe('speaking_grammar_range');
  });

  it('creates a complete ten-stage draft for a selected taxonomy item', async () => {
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValue([]);
    vi.mocked(adminIeltsBridgeClient.create).mockResolvedValue(moduleDto);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create module' }));
    await waitFor(() => expect(adminIeltsBridgeClient.create).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: null,
      content: expect.objectContaining({ questionType: 'listening_form_completion', stages: expect.arrayContaining([]) }),
    })));
    const input = vi.mocked(adminIeltsBridgeClient.create).mock.calls[0]?.[0];
    expect(input?.content.stages).toHaveLength(10);
  });

  it('edits the selected stage and saves with optimistic revision', async () => {
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.change(await screen.findByLabelText('Stage title'), { target: { value: 'Understand TFNG' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(adminIeltsBridgeClient.updateDraft).toHaveBeenCalledWith(
      moduleDto.id,
      expect.objectContaining({
        expectedRevision: 1,
        content: expect.objectContaining({ stages: expect.arrayContaining([expect.objectContaining({ title: 'Understand TFNG' })]) }),
      }),
    ));
  });

  it('shows validation issues and enables publish only after validation succeeds', async () => {
    vi.mocked(adminIeltsBridgeClient.validate)
      .mockResolvedValueOnce({ moduleId: moduleDto.id, draftRevision: 1, status: 'DRAFT', canPublish: false, issues: [
        { code: 'INVALID_CONTENT', path: 'stages.7.timeLimitSeconds', message: 'Timed practice needs a limit.' },
      ] })
      .mockResolvedValueOnce({ moduleId: moduleDto.id, draftRevision: 1, status: 'VALIDATED', canPublish: true, issues: [] });
    vi.mocked(adminIeltsBridgeClient.publish).mockResolvedValue({
      moduleId: moduleDto.id, moduleVersionId: crypto.randomUUID(), version: 1, publishedAt: new Date().toISOString(),
    });
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Validate draft' }));
    expect(await screen.findByText('Timed practice needs a limit.')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Publish version' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Validate draft' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish version' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Publish version' }));
    await waitFor(() => expect(adminIeltsBridgeClient.publish).toHaveBeenCalledWith(moduleDto.id, expect.objectContaining({ expectedRevision: 1 })));
  });

  it('requires named confirmation before archiving a published module', async () => {
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValue([{
      ...moduleDto, status: 'PUBLISHED', currentPublishedVersion: {
        id: crypto.randomUUID(), version: 1, status: 'PUBLISHED', publishedAt: new Date().toISOString(),
      },
    }]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Archive module: Reading TFNG' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Reading TFNG'));
    expect(lifecycle.remove).not.toHaveBeenCalled();
  });

  it('creates another module with the same question type and selects its independent draft', async () => {
    vi.mocked(adminIeltsBridgeClient.create).mockResolvedValue({ ...moduleDto, id: 'second', slug: 'second', draft: { ...moduleDto.draft, title: 'Additional TFNG' } });
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.change(await screen.findByLabelText('Module title'), { target: { value: 'Unsaved original TFNG' } });
    fireEvent.change(screen.getAllByLabelText('Question type')[0]!, { target: { value: moduleDto.draft.questionType } });
    fireEvent.click(screen.getByRole('button', { name: 'Create module' }));
    await waitFor(() => expect((screen.getByLabelText('Module title') as HTMLInputElement).value).toBe('Additional TFNG'));
    expect(adminIeltsBridgeClient.create).toHaveBeenCalledWith(expect.objectContaining({ content: expect.objectContaining({ questionType: moduleDto.draft.questionType }) }));
    fireEvent.click(screen.getByRole('button', { name: /Unsaved original TFNG$/ }));
    expect((screen.getByLabelText('Module title') as HTMLInputElement).value).toBe('Unsaved original TFNG');
  });

  it('removes a never-published draft with its revision and refreshes selection', async () => {
    const other = { ...moduleDto, id: 'second', draft: { ...moduleDto.draft, title: 'Other module' } };
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValueOnce([moduleDto, other]).mockResolvedValue([other]);
    lifecycle.remove.mockResolvedValue({ id: moduleDto.id, action: 'deleted' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete module: Reading TFNG' }));
    await waitFor(() => expect((screen.getByLabelText('Module title') as HTMLInputElement).value).toBe('Other module'));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Reading TFNG'));
    expect(lifecycle.remove).toHaveBeenCalledWith('bridge', moduleDto.id, { expectedRevision: 1, expectedAction: 'deleted', idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(screen.queryByRole('button', { name: /Reading TFNG$/ })).toBeNull();
  });

  it('preserves another module’s dirty edits when removal refreshes the list', async () => {
    const other = { ...moduleDto, id: 'second', draft: { ...moduleDto.draft, title: 'Other module' } };
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValueOnce([moduleDto, other]).mockResolvedValue([moduleDto]);
    lifecycle.remove.mockResolvedValue({ id: other.id, action: 'deleted' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.change(await screen.findByLabelText('Module title'), { target: { value: 'Unsaved TFNG' } });
    fireEvent.click(screen.getByRole('button', { name: /Other module$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete module: Other module' }));
    await waitFor(() => expect((screen.getByLabelText('Module title') as HTMLInputElement).value).toBe('Unsaved TFNG'));
    expect(screen.getByRole('button', { name: 'Validate draft' }).hasAttribute('disabled')).toBe(true);
  });

  it('archives a previously published module even when its current publication is empty', async () => {
    const history = { id: crypto.randomUUID(), version: 1, status: 'ARCHIVED' as const, publishedAt: new Date().toISOString() };
    const other = { ...moduleDto, id: 'second', draft: { ...moduleDto.draft, title: 'Other module' } };
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValueOnce([other, { ...moduleDto, versions: [history] }]).mockResolvedValue([other]);
    lifecycle.remove.mockResolvedValue({ id: moduleDto.id, action: 'archived' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.change(await screen.findByLabelText('Module title'), { target: { value: 'Unsaved other module' } });
    fireEvent.click(screen.getByRole('button', { name: /Reading TFNG$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive module: Reading TFNG' }));
    await waitFor(() => expect((screen.getByLabelText('Module title') as HTMLInputElement).value).toBe('Unsaved other module'));
    expect(lifecycle.remove).toHaveBeenCalledWith('bridge', moduleDto.id, { expectedRevision: 1, expectedAction: 'archived', idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  });

  it('retains the selected draft and reports a failed removal', async () => {
    lifecycle.remove.mockRejectedValue(new Error('Removal unavailable'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete module: Reading TFNG' }));
    expect(await screen.findByRole('alert')).not.toBeNull();
    expect((screen.getByLabelText('Module title') as HTMLInputElement).value).toBe('Reading TFNG');
    expect(adminIeltsBridgeClient.list).toHaveBeenCalledTimes(1);
  });

  it('keeps remaining local drafts accessible if refresh fails after a successful removal', async () => {
    const other = { ...moduleDto, id: 'second', draft: { ...moduleDto.draft, title: 'Other module' } };
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValueOnce([moduleDto, other]).mockRejectedValue(new Error('Refresh unavailable'));
    lifecycle.remove.mockResolvedValue({ id: moduleDto.id, action: 'deleted' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete module: Reading TFNG' }));
    expect(await screen.findByRole('alert')).not.toBeNull();
    expect((screen.getByLabelText('Module title') as HTMLInputElement).value).toBe('Other module');
    expect(screen.queryByRole('button', { name: /Reading TFNG$/ })).toBeNull();
  });

  it.each(['deleted', 'archived'] as const)('reuses the receipt after a lost %s response', async (expectedAction) => {
    const record = expectedAction === 'archived' ? { ...moduleDto, versions: [{ id: crypto.randomUUID(), version: 1, status: 'ARCHIVED' as const, publishedAt: new Date().toISOString() }] } : moduleDto;
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValueOnce([record]).mockResolvedValue([]);
    lifecycle.remove.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ id: record.id, action: expectedAction });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<IeltsBridgeAuthoringWorkspace />);
    const buttonName = `${expectedAction === 'deleted' ? 'Delete' : 'Archive'} module: Reading TFNG`;
    fireEvent.click(await screen.findByRole('button', { name: buttonName }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: buttonName }));
    await screen.findByText('No Bridge modules yet');
    expect(lifecycle.remove).toHaveBeenCalledTimes(2);
    const firstInput = lifecycle.remove.mock.calls[0]![2];
    expect(firstInput).toEqual({ expectedRevision: 1, expectedAction, idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(lifecycle.remove.mock.calls[1]).toEqual(['bridge', record.id, firstInput]);
  });

  it('starts a new removal receipt when a saved revision changes', async () => {
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValueOnce([moduleDto]).mockResolvedValue([]);
    lifecycle.remove.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ id: moduleDto.id, action: 'deleted' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete module: Reading TFNG' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Draft saved.');
    fireEvent.click(screen.getByRole('button', { name: 'Delete module: Reading TFNG' }));
    await screen.findByText('No Bridge modules yet');
    expect(lifecycle.remove.mock.calls[1]![2]).toEqual({ expectedRevision: 2, expectedAction: 'deleted', idempotencyKey: expect.any(String) });
    expect(lifecycle.remove.mock.calls[1]![2].idempotencyKey).not.toBe(lifecycle.remove.mock.calls[0]![2].idempotencyKey);
  });
});
