import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { INITIAL_IELTS_BAND_CURRICULUM, type AdminIeltsBandCurriculumDto } from '@worklingo/contracts';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { adminIeltsBandClient } from '../../lib/api/admin-ielts-band-client';
import { BandCurriculumWorkspace } from './band-curriculum-workspace';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function LocaleToggle() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('en')}>Switch to English</button>;
}
vi.mock('../../lib/api/admin-ielts-band-client', () => ({ adminIeltsBandClient: { get: vi.fn(), save: vi.fn(), validate: vi.fn(), publish: vi.fn() } }));
const dto: AdminIeltsBandCurriculumDto = { id: crypto.randomUUID(), status: 'DRAFT', draftRevision: 1, draft: INITIAL_IELTS_BAND_CURRICULUM, currentPublishedVersion: null, versions: [], updatedAt: new Date().toISOString() };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
beforeEach(() => {
  vi.mocked(adminIeltsBandClient.get).mockResolvedValue(dto);
  vi.mocked(adminIeltsBandClient.save).mockImplementation(async (input) => ({ ...dto, draft: input.content, draftRevision: 2 }));
});

it('edits labeled fields without JSON and retains the mounted draft across a locale switch', async () => {
  render(<LocaleProvider initialLocale="vi"><LocaleToggle /><BandCurriculumWorkspace /></LocaleProvider>);
  const title = await screen.findByLabelText('Tiêu đề giai đoạn');
  fireEvent.change(title, { target: { value: 'My unsaved English title' } });
  fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
  expect(screen.getByLabelText('Stage title')).toBe(title);
  expect((title as HTMLInputElement).value).toBe('My unsaved English title');
  expect(screen.queryByLabelText('Stage definition JSON')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(adminIeltsBandClient.save).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1, content: expect.objectContaining({ stages: expect.arrayContaining([expect.objectContaining({ title: 'My unsaved English title' })]) }) })));
});

it('retains edits across stage navigation and saves all seven stages with unchanged topology and values', async () => {
  render(<BandCurriculumWorkspace />);
  fireEvent.change(await screen.findByLabelText('Stage title'), { target: { value: 'Edited first stage' } });
  fireEvent.click(screen.getByRole('button', { name: '3.0 to 4.0' }));
  fireEvent.change(screen.getByLabelText('Stage title'), { target: { value: 'Edited second stage' } });
  fireEvent.click(screen.getByRole('button', { name: 'Edited first stage' }));
  expect((screen.getByLabelText('Stage title') as HTMLInputElement).value).toBe('Edited first stage');
  expect((screen.getByLabelText('Stage code') as HTMLInputElement).readOnly).toBe(true);
  expect((screen.getByLabelText('Target band from') as HTMLInputElement).readOnly).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(adminIeltsBandClient.save).toHaveBeenCalledOnce());
  const content = vi.mocked(adminIeltsBandClient.save).mock.calls[0]![0].content;
  expect(content).toEqual({ ...dto.draft, stages: dto.draft.stages.map((stage, index) => index < 2 ? { ...stage, title: index === 0 ? 'Edited first stage' : 'Edited second stage' } : stage) });
  expect(screen.getByRole('link', { name: 'Author lesson content' }).getAttribute('href')).toBe('/admin/content');
});

it('edits nested competencies, remediation, and array rows while preserving untouched fields', async () => {
  render(<BandCurriculumWorkspace />);
  await screen.findByLabelText('Stage title');
  fireEvent.change(screen.getAllByLabelText('Competency description')[0]!, { target: { value: 'A revised listening competency description.' } });
  fireEvent.change(screen.getAllByLabelText('Remediation action')[0]!, { target: { value: 'A revised listening remediation action.' } });
  const outcomes = screen.getByRole('group', { name: 'Learning outcomes' });
  fireEvent.click(within(outcomes).getByRole('button', { name: 'Add item' }));
  const rows = within(outcomes).getAllByRole('textbox');
  fireEvent.change(rows[1]!, { target: { value: 'An additional measurable learning outcome.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(adminIeltsBandClient.save).toHaveBeenCalledOnce());
  const stage = vi.mocked(adminIeltsBandClient.save).mock.calls[0]![0].content.stages[0]!;
  const original = dto.draft.stages[0]!;
  expect(stage).toEqual({ ...original, learningOutcomes: [...original.learningOutcomes, 'An additional measurable learning outcome.'], competencies: original.competencies.map((item, index) => index === 0 ? { ...item, description: 'A revised listening competency description.' } : item), remediationPaths: original.remediationPaths.map((item, index) => index === 0 ? { ...item, action: 'A revised listening remediation action.' } : item) });
});

it('shows local schema errors without sending invalid content or losing the entered value', async () => {
  render(<LocaleProvider initialLocale="vi"><BandCurriculumWorkspace /></LocaleProvider>);
  fireEvent.change(await screen.findByLabelText('Tiêu đề giai đoạn'), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Định nghĩa giai đoạn không hợp lệ.');
  expect(screen.getByText('stages.0.title')).not.toBeNull();
  expect(adminIeltsBandClient.save).not.toHaveBeenCalled();
  expect((screen.getByLabelText('Tiêu đề giai đoạn') as HTMLInputElement).value).toBe('x');
});

it('imports a validated curriculum and exports every untouched value', async () => {
  render(<BandCurriculumWorkspace />);
  await screen.findByLabelText('Stage title');
  fireEvent.click(screen.getByText('Advanced JSON import / export'));
  const source = screen.getByLabelText('Curriculum JSON') as HTMLTextAreaElement;
  const imported = { ...dto.draft, stages: dto.draft.stages.map((stage, index) => index === 1 ? { ...stage, title: 'Imported second stage' } : stage) };
  fireEvent.change(source, { target: { value: JSON.stringify(imported) } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply JSON' }));
  fireEvent.click(screen.getByRole('button', { name: 'Imported second stage' }));
  expect((screen.getByLabelText('Stage title') as HTMLInputElement).value).toBe('Imported second stage');
  fireEvent.click(screen.getByRole('button', { name: 'Export draft / discard JSON' }));
  expect(JSON.parse(source.value)).toEqual(imported);
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(adminIeltsBandClient.save).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1, content: imported })));
});

it('retains unapplied JSON across stage and locale switches and blocks mutation until discard', async () => {
  vi.mocked(adminIeltsBandClient.validate).mockResolvedValue({ curriculumId: dto.id, draftRevision: 2, status: 'VALIDATED', canPublish: true, issues: [] });
  render(<LocaleProvider initialLocale="vi"><LocaleToggle /><BandCurriculumWorkspace /></LocaleProvider>);
  await screen.findByLabelText('Tiêu đề giai đoạn');
  fireEvent.click(screen.getByRole('button', { name: 'Lưu và kiểm tra' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất bản phiên bản' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByText('Nhập / xuất JSON nâng cao'));
  const source = screen.getByLabelText('JSON chương trình') as HTMLTextAreaElement;
  fireEvent.change(source, { target: { value: '{unapplied raw input' } });
  fireEvent.click(screen.getByRole('button', { name: '3.0 to 4.0' }));
  fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));
  expect(screen.getByLabelText('Curriculum JSON')).toBe(source);
  expect(source.value).toBe('{unapplied raw input');
  for (const name of ['Save draft', 'Save & validate', 'Publish version']) {
    const button = screen.getByRole('button', { name });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
  }
  expect(adminIeltsBandClient.save).toHaveBeenCalledTimes(1);
  expect(adminIeltsBandClient.validate).toHaveBeenCalledTimes(1);
  expect(adminIeltsBandClient.publish).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Apply JSON' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Invalid JSON');
  expect(source.value).toBe('{unapplied raw input');
  fireEvent.click(screen.getByRole('button', { name: 'Export draft / discard JSON' }));
  expect(JSON.parse(source.value)).toEqual(dto.draft);
  expect(screen.getByRole('button', { name: 'Save draft' }).hasAttribute('disabled')).toBe(false);
  expect(screen.getByRole('button', { name: 'Publish version' }).hasAttribute('disabled')).toBe(true);
});

it.each(['stage count', 'order', 'range', 'prerequisites', 'shifted contiguous ranges'] as const)('rejects imported topology changes: %s', async (change) => {
  render(<BandCurriculumWorkspace />);
  await screen.findByLabelText('Stage title');
  fireEvent.click(screen.getByText('Advanced JSON import / export'));
  const source = screen.getByLabelText('Curriculum JSON') as HTMLTextAreaElement;
  const content = JSON.parse(JSON.stringify(dto.draft));
  if (change === 'stage count') content.stages.pop();
  if (change === 'order') content.stages[0].order = 2;
  if (change === 'range') content.stages[0].targetBand.to = 2;
  if (change === 'prerequisites') content.stages[1].prerequisiteStageCodes = [];
  if (change === 'shifted contiguous ranges') {
    content.stages[0].targetBand.to = 2.5;
    content.stages[1].targetBand.from = 2.5;
  }
  const raw = JSON.stringify(content);
  fireEvent.change(source, { target: { value: raw } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply JSON' }));
  expect(await screen.findByRole('alert')).not.toBeNull();
  expect(source.value).toBe(raw);
  expect((screen.getByLabelText('Stage title') as HTMLInputElement).value).toBe('Foundation to 3.0');
  expect(screen.getByRole('button', { name: 'Save draft' }).hasAttribute('disabled')).toBe(true);
  expect(adminIeltsBandClient.save).not.toHaveBeenCalled();
});

it('loads the canonical seven-stage template as unapplied input before validation', async () => {
  render(<BandCurriculumWorkspace />);
  fireEvent.change(await screen.findByLabelText('Stage title'), { target: { value: 'Keep until applied' } });
  fireEvent.click(screen.getByText('Advanced JSON import / export'));
  fireEvent.click(screen.getByRole('button', { name: 'Load curriculum template' }));
  expect(JSON.parse((screen.getByLabelText('Curriculum JSON') as HTMLTextAreaElement).value)).toEqual(INITIAL_IELTS_BAND_CURRICULUM);
  expect((screen.getByLabelText('Stage title') as HTMLInputElement).value).toBe('Keep until applied');
  expect(screen.getByRole('button', { name: 'Save & validate' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Apply JSON' }));
  expect((screen.getByLabelText('Stage title') as HTMLInputElement).value).toBe('Foundation to 3.0');
  expect(screen.getByRole('button', { name: 'Save & validate' }).hasAttribute('disabled')).toBe(false);
  expect(adminIeltsBandClient.save).not.toHaveBeenCalled();
});
