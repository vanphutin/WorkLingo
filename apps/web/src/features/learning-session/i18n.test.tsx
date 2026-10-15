import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient, type LearnerActivityDto } from '../../lib/api/api-client';
import { WritingActivity } from './activity-renderers/writing-activity';
import { EvaluationFeedback } from './evaluation-feedback';
import { DashboardView } from './dashboard-view';
import { ReadingActivity } from './activity-renderers/reading-activity';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const activity: LearnerActivityDto = {
  id: '00000000-0000-4000-8000-000000000010', slug: 'write-update',
  activityType: 'writing', learningBlock: 'respond', skills: ['writing'],
  content: [], languageBlocks: [],
  payload: { prompt: 'Write a project status update.', minWords: 5, requiredPhrases: ['on track'] },
};

it('uses consistent English system labels while preserving the writing prompt and phrase', async () => {
  vi.spyOn(apiClient, 'getActivityDraft').mockResolvedValue(null);
  render(<WritingActivity activity={activity} sessionId="session" value="" onChange={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Writing goals' })).toBeInTheDocument();
  expect(await screen.findByText('Draft saved')).toBeInTheDocument();
  expect(screen.getByText('Write a project status update.')).toHaveAttribute('lang', 'en');
  expect(screen.getByText('on track')).toHaveAttribute('lang', 'en');
});

it('uses English evaluation system copy by default', () => {
  render(<EvaluationFeedback evaluation={{ status: 'queued' } as never} />);
  expect(screen.getByRole('heading', { name: 'Teacher AI is analyzing' })).toBeInTheDocument();
});

function Switch() {
  const { locale, setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale(locale === 'en' ? 'vi' : 'en')}>Switch language</button>;
}

it('switches language during an unsaved writing draft without replacing the editor or changing lesson content', async () => {
  vi.spyOn(apiClient, 'getActivityDraft').mockResolvedValue(null);
  vi.spyOn(apiClient, 'saveActivityDraft').mockResolvedValue({
    sessionId: 'session', activityId: activity.id, text: 'We are on track.', revision: 1,
    updatedAt: '2026-10-14T08:00:00.000Z',
  });
  function Writing() {
    const [text, setText] = useState('');
    return <WritingActivity activity={activity} sessionId="session" value={text} onChange={setText} autosaveDelayMs={100} />;
  }
  render(<LocaleProvider initialLocale="en"><Switch /><Writing /></LocaleProvider>);
  await screen.findByText('Draft saved');
  const editor = screen.getByRole('textbox', { name: 'Your written response:' });
  fireEvent.change(editor, { target: { value: 'We are on track.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
  expect(screen.getByRole('textbox', { name: 'Bài viết của bạn:' })).toBe(editor);
  expect(editor).toHaveValue('We are on track.');
  expect(screen.getByRole('heading', { name: 'Mục tiêu bài viết' })).toBeInTheDocument();
  expect(screen.getByText('Viết ít nhất 5 từ và dùng ngôn ngữ phù hợp với công việc.')).toBeInTheDocument();
  expect(screen.getByText('Write a project status update.')).toHaveAttribute('lang', 'en');
  expect(screen.getByText('on track')).toHaveAttribute('lang', 'en');
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã lưu bản nháp'));
  expect(apiClient.getActivityDraft).toHaveBeenCalledTimes(1);
  expect(apiClient.saveActivityDraft).toHaveBeenCalledWith('session', activity.id, { text: 'We are on track.', expectedRevision: 0 });
});

it('formats dashboard statistics in Vietnamese without translating the lesson title', () => {
  render(<LocaleProvider initialLocale="vi"><DashboardView onStartSession={vi.fn()} nextMissionTitle="Introduce yourself" progress={{
    currentLevelCode: 'FOUNDATION_1', completedActivities: 1234, activityAttempts: 2000,
    sessions: { completed: 0, inProgress: 0, paused: 0 },
  } as never} /></LocaleProvider>);
  expect(screen.getByText('1.234')).toBeInTheDocument();
  expect(screen.getByText('2.000')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Introduce yourself' })).toHaveAttribute('lang', 'en');
});

it('keeps reading passages, questions and answer options unchanged in Vietnamese UI', () => {
  render(<LocaleProvider initialLocale="vi"><ReadingActivity activity={{ ...activity,
    activityType: 'reading', payload: { prompt: 'Read the status email.', questions: [{ slug: 'q', prompt: 'When is the meeting?', options: ['Monday', 'Tuesday'] }] },
    content: [{ slug: 'email', text: 'The meeting is on Monday.' }],
  }} value={{ answerIndexes: [0] }} onChange={vi.fn()} /></LocaleProvider>);
  expect(screen.getByRole('region', { name: 'Đoạn văn đọc' })).toBeInTheDocument();
  expect(screen.getByText('The meeting is on Monday.')).toHaveAttribute('lang', 'en');
  expect(screen.getByRole('radio', { name: 'Monday' })).toBeChecked();
  expect(screen.getByText('When is the meeting?')).toHaveAttribute('lang', 'en');
});

it('localizes draft API errors in Vietnamese without losing the writing response', async () => {
  vi.spyOn(apiClient, 'getActivityDraft').mockRejectedValue({ code: 'UNAUTHORIZED', status: 401 });
  render(<LocaleProvider initialLocale="vi"><WritingActivity activity={activity} sessionId="session" value="My saved response" onChange={vi.fn()} /></LocaleProvider>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
  expect(screen.getByRole('textbox')).toHaveValue('My saved response');
});
