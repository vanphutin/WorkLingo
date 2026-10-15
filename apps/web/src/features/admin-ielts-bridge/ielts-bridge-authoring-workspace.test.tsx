import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ieltsBridgeStageTypes, type AdminIeltsBridgeModuleDto } from '@worklingo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adminIeltsBridgeClient } from '../../lib/api/admin-ielts-bridge-client';
import { IeltsBridgeAuthoringWorkspace } from './ielts-bridge-authoring-workspace';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

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
  afterEach(cleanup);
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

  it('requires confirmation before archiving a published module', async () => {
    vi.mocked(adminIeltsBridgeClient.list).mockResolvedValue([{
      ...moduleDto, status: 'PUBLISHED', currentPublishedVersion: {
        id: crypto.randomUUID(), version: 1, status: 'PUBLISHED', publishedAt: new Date().toISOString(),
      },
    }]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<IeltsBridgeAuthoringWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Archive release' }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(adminIeltsBridgeClient.archive).not.toHaveBeenCalled();
  });
});
