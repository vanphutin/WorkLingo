import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../../lib/api/api-client';
import { apiClient, type LearnerActivityDto } from '../../../lib/api/api-client';
import { WritingActivity } from './writing-activity';

vi.mock('../../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getActivityDraft: vi.fn(),
      saveActivityDraft: vi.fn(),
    },
  };
});

const activity: LearnerActivityDto = {
  id: '00000000-0000-4000-8000-000000000010',
  slug: 'write-status-update',
  activityType: 'writing',
  learningBlock: 'respond',
  skills: ['writing'],
  content: [],
  languageBlocks: [],
  payload: {
    prompt: 'Write a project status update.',
    minWords: 5,
    requiredPhrases: ['on track'],
  },
};

describe('WritingActivity', () => {
  beforeEach(() => {
    vi.mocked(apiClient.getActivityDraft).mockReset();
    vi.mocked(apiClient.saveActivityDraft).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('restores the latest server draft and its revision', async () => {
    const onChange = vi.fn();
    vi.mocked(apiClient.getActivityDraft).mockResolvedValue({
      sessionId: '00000000-0000-4000-8000-000000000020',
      activityId: activity.id,
      text: 'The launch remains on track.',
      revision: 3,
      updatedAt: '2026-10-08T08:00:00.000Z',
    });

    render(
      <WritingActivity
        activity={activity}
        sessionId="00000000-0000-4000-8000-000000000020"
        value=""
        onChange={onChange}
      />,
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('The launch remains on track.'));
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu bản nháp');
    expect(screen.getByText('on track')).toBeInTheDocument();
  });

  it('debounces autosave and sends the optimistic draft revision', async () => {
    vi.mocked(apiClient.getActivityDraft).mockResolvedValue(null);
    vi.mocked(apiClient.saveActivityDraft).mockResolvedValue({
      sessionId: '00000000-0000-4000-8000-000000000020',
      activityId: activity.id,
      text: 'We are on track today.',
      revision: 1,
      updatedAt: '2026-10-08T08:00:00.000Z',
    });

    function ControlledWritingActivity() {
      const [value, setValue] = useState('');
      return (
        <WritingActivity
          activity={activity}
          sessionId="00000000-0000-4000-8000-000000000020"
          value={value}
          onChange={setValue}
          autosaveDelayMs={10}
        />
      );
    }
    render(<ControlledWritingActivity />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã lưu bản nháp'));

    fireEvent.change(screen.getByLabelText(/your written response/i), {
      target: { value: 'We are on track today.' },
    });
    expect(apiClient.saveActivityDraft).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(apiClient.saveActivityDraft).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000020',
        activity.id,
        { expectedRevision: 0, text: 'We are on track today.' },
      );
    });
  });

  it('serializes overlapping autosaves so newer text uses the saved revision', async () => {
    vi.mocked(apiClient.getActivityDraft).mockResolvedValue(null);
    let resolveFirstSave!: (value: Awaited<ReturnType<typeof apiClient.saveActivityDraft>>) => void;
    vi.mocked(apiClient.saveActivityDraft)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstSave = resolve; }))
      .mockResolvedValueOnce({
        sessionId: '00000000-0000-4000-8000-000000000020',
        activityId: activity.id,
        text: 'We are on track and ready.',
        revision: 2,
        updatedAt: '2026-10-08T08:00:02.000Z',
      });

    function ControlledWritingActivity() {
      const [value, setValue] = useState('');
      return (
        <WritingActivity
          activity={activity}
          sessionId="00000000-0000-4000-8000-000000000020"
          value={value}
          onChange={setValue}
          autosaveDelayMs={10}
        />
      );
    }
    render(<ControlledWritingActivity />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã lưu bản nháp'));

    const textarea = screen.getByLabelText(/your written response/i);
    fireEvent.change(textarea, { target: { value: 'We are on track.' } });
    await waitFor(() => expect(apiClient.saveActivityDraft).toHaveBeenCalledTimes(1));
    fireEvent.change(textarea, { target: { value: 'We are on track and ready.' } });

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(apiClient.saveActivityDraft).toHaveBeenCalledTimes(1);

    await act(async () => resolveFirstSave({
      sessionId: '00000000-0000-4000-8000-000000000020',
      activityId: activity.id,
      text: 'We are on track.',
      revision: 1,
      updatedAt: '2026-10-08T08:00:01.000Z',
    }));

    await waitFor(() => expect(apiClient.saveActivityDraft).toHaveBeenCalledTimes(2));
    expect(apiClient.saveActivityDraft).toHaveBeenLastCalledWith(
      '00000000-0000-4000-8000-000000000020',
      activity.id,
      { expectedRevision: 1, text: 'We are on track and ready.' },
    );
  });
});
