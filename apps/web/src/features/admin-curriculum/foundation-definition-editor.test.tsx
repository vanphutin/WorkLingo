import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api/api-client';
import { curriculumFoundationClient } from '../../lib/api/curriculum-foundation-client';
import { FoundationDefinitionEditor } from './foundation-definition-editor';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

function SwitchLocale() {
  const { setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale('en')}>Switch English</button>;
}

const missionId = '11111111-1111-4111-8111-111111111111';
const draft = {
  missionId, revision: 2, status: 'VALIDATED' as const, publishedRevisions: [],
  definition: { category: 'grammar' as const, prerequisiteRevisionIds: [], objectives: [{
    slug: 'request-details', statement: 'Understand request details.', skills: ['reading' as const], required: true,
    evidence: [{ lessonVersionId: '22222222-2222-4222-8222-222222222222', activitySlug: 'read-request', languageBlockSlugs: ['could-you'] }],
  }] },
};

describe('FoundationDefinitionEditor', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(curriculumFoundationClient, 'getDraft').mockResolvedValue(draft); });
  afterEach(cleanup);

  it('localizes prerequisite revision metadata without translating its authored title', async () => {
    render(<LocaleProvider initialLocale="vi"><FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[{ id: 'prerequisite-id', label: 'English lesson · revision 2', title: 'English lesson', revision: 2 }]} /></LocaleProvider>);
    expect(await screen.findByRole('checkbox', { name: 'English lesson · bản sửa đổi 2' })).toBeInTheDocument();
  });

  it('localizes mapping validation and preserves the unsaved objective when switching locale', async () => {
    render(<LocaleProvider initialLocale="vi"><SwitchLocale /><FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[]} /></LocaleProvider>);
    const statement = await screen.findByLabelText('Nội dung mục tiêu');
    fireEvent.change(statement, { target: { value: 'My English educational objective' } });
    fireEvent.change(screen.getByLabelText('Minh chứng mục tiêu: hoạt động'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp Foundation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cần mã hoạt động cho minh chứng của mục tiêu 1.');
    fireEvent.click(screen.getByRole('button', { name: 'Switch English' }));
    const englishStatement = await screen.findByLabelText('Objective statement');
    expect(englishStatement).toBe(statement);
    expect(englishStatement).toHaveValue('My English educational objective');
    expect(screen.getByLabelText('Objective evidence activity')).toHaveValue('');
  });

  it('shows actionable mapping errors and labelled mobile-friendly controls', async () => {
    render(<FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[]} />);
    expect(await screen.findByRole('heading', { name: /foundation definition/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/objective evidence activity/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save foundation draft/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/activity slug is required/i);
    expect(screen.getByLabelText(/foundation category/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close foundation editor/i })).toBeInTheDocument();
  });

  it('adds another objective with independent skill and evidence controls', async () => {
    render(<FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[]} />);
    await screen.findByRole('heading', { name: /foundation definition/i });
    fireEvent.click(screen.getByRole('button', { name: /add objective/i }));
    expect(screen.getByRole('group', { name: /objective 2/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/objective 2 speaking/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/objective 2 evidence 1 activity/i)).toBeInTheDocument();
  });

  it('adds multiple evidence mappings to one objective', async () => {
    render(<FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[]} />);
    const group = await screen.findByRole('group', { name: /objective 1/i });
    fireEvent.click(screen.getByRole('button', { name: /add evidence mapping to objective 1/i }));
    expect(group).toHaveTextContent(/Evidence 2/i);
    expect(screen.getByLabelText(/objective 1 evidence 2 activity/i)).toBeInTheDocument();
  });

  it('preserves unsaved fields after stale save and offers refresh', async () => {
    vi.spyOn(curriculumFoundationClient, 'saveDraft').mockRejectedValue(new ApiError({ code: 'STALE_REVISION', message: 'Revision changed', status: 409 }));
    render(<FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[]} />);
    const statement = await screen.findByLabelText(/objective statement/i);
    fireEvent.change(statement, { target: { value: 'My unsaved objective' } });
    fireEvent.click(screen.getByRole('button', { name: /save foundation draft/i }));
    expect(await screen.findByText(/server has a newer revision/i)).toBeInTheDocument();
    expect(statement).toHaveValue('My unsaved objective');
    expect(screen.getByRole('button', { name: /refresh server draft/i })).toBeInTheDocument();
  });

  it('offers retry after initial load failure', async () => {
    vi.mocked(curriculumFoundationClient.getDraft).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(draft);
    render(<FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[]} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    fireEvent.click(screen.getByRole('button', { name: /retry loading/i }));
    expect(await screen.findByText(/revision 2/i)).toBeInTheDocument();
  });

  it('waits for publish response and guards duplicate submissions', async () => {
    let resolvePublish!: (value: never) => void;
    vi.spyOn(curriculumFoundationClient, 'publishDraft').mockReturnValue(new Promise((resolve) => { resolvePublish = resolve; }));
    render(<FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[]} />);
    await screen.findByText(/Workplace requests/i);
    fireEvent.click(screen.getByRole('button', { name: /publish foundation revision/i }));
    expect(screen.getByRole('button', { name: /publishing/i })).toBeDisabled();
    expect(screen.queryByText(/published successfully/i)).not.toBeInTheDocument();
    resolvePublish({
      id: '33333333-3333-4333-8333-333333333333', missionId, revision: 2,
      status: 'PUBLISHED', ...draft.definition,
    } as never);
    await waitFor(() => expect(screen.getByText(/published successfully/i)).toBeInTheDocument());
  });

  it('disables validation and publication when the loaded draft is edited', async () => {
    render(<FoundationDefinitionEditor missionId={missionId} missionTitle="Workplace requests" prerequisiteOptions={[]} />);
    const statement = await screen.findByLabelText(/objective statement/i);
    expect(screen.getByRole('button', { name: /publish foundation revision/i })).toBeEnabled();
    fireEvent.change(statement, { target: { value: 'Unsaved revision' } });
    expect(screen.getByRole('button', { name: /publish foundation revision/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /validate foundation draft/i })).toBeDisabled();
  });
});
