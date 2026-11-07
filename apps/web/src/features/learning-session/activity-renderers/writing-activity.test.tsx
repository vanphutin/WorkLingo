import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseLessonSource } from '@worklingo/content-format';

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
  it('discloses unscored practice without promising AI grading', async () => {
    vi.mocked(apiClient.getActivityDraft).mockResolvedValue(null);
    render(<WritingActivity activity={{...activity,payload:{...activity.payload,practiceMode:'unscored'}}} sessionId="session" value="Hello" onChange={vi.fn()}/>);
    expect(screen.getByText('Unscored practice: your writing is saved without AI grading.')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved'));
  });
  beforeEach(() => {
    vi.mocked(apiClient.getActivityDraft).mockReset();
    vi.mocked(apiClient.saveActivityDraft).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('requires active recall without exposing target phrases in a vocabulary lesson', async () => {
    vi.mocked(apiClient.getActivityDraft).mockResolvedValue(null);
    render(
      <WritingActivity
        activity={{ ...activity, foundationCategory: 'vocabulary' }}
        sessionId="00000000-0000-4000-8000-000000000020"
        value=""
        onChange={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved'));
    expect(screen.queryByText('on track')).not.toBeInTheDocument();
    expect(screen.getByText(/recall 1 target phrase/i)).toBeVisible();
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
    expect(screen.getByRole('status')).toHaveTextContent('Draft saved');
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
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved'));

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
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Draft saved'));

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

// Speaking cards are deliberately rendered through WritingActivity as a counterfactual
// word-counter check; these tests do not invoke or emulate the evaluator.
const shortCounterCases: readonly [string,string,number][] = [
  [
    "mg01-l1-s1",
    "Hello. I'm Lucy from Los Angeles. You are Leo.",
    9
  ],
  [
    "mg01-l2-s1",
    "Hello. I'm Emma from London. E-M-M-A.",
    6
  ],
  [
    "mg01-l2-w1",
    "I'm Mia from Los Angeles. M-I-A.",
    6
  ],
  [
    "mg01-l3-s1",
    "Hello. I'm Sam from New York. You are Kim.",
    9
  ],
  [
    "mg01-l3-w1",
    "Hello. I'm Eva from London. You are Noah.",
    8
  ],
  [
    "mg01-l4-s1",
    "Hello. I'm Mia from London. You are Jo.",
    8
  ],
  [
    "mg01-l4-w1",
    "Hello. I'm Ben from New York. You are Lucy.",
    9
  ],
  [
    "mg02-l1-s1",
    "This is a bag. That's a book. Two pens.",
    9
  ],
  [
    "mg02-l3-s1",
    "This is a book. That's a bag. Two pens.",
    9
  ],
  [
    "mg02-l4-s1",
    "This is a pen. That's a book. Two bags.",
    9
  ]
];
describe('Beginner content word counter',()=>{
 afterEach(cleanup);
 for(const [slug,answer,count] of shortCounterCases){
  for(const [style,response] of [
   ['ASCII contraction',answer],
   ['Unicode apostrophe',answer.replaceAll("'",'’')],
   ['whitespace', '  '+answer.replaceAll(' ',' \n\t')+'  '],
   ['punctuation',answer.replaceAll('.', '!')],
  ] as const) it(slug+' counts '+style+' against its actual authored minimum',async()=>{
   vi.mocked(apiClient.getActivityDraft).mockResolvedValue(null);
   const raw=readFileSync(path.resolve(process.cwd(),'../../content/beginner/pilot',slug.slice(0,7)+'.lesson.txt'),'utf8');
   const authored=parseLessonSource(raw).document.activities.find(a=>a.slug===slug)!;
   render(<WritingActivity activity={{...activity,slug,payload:{prompt:authored.prompt!,minWords:authored.minWords!}}} sessionId='00000000-0000-4000-8000-000000000020' value={response} onChange={vi.fn()}/>);
   await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Draft saved'));
   expect(document.getElementById('writing-help')).toHaveTextContent(count+'/'+count+' words');
   expect(screen.getByRole('textbox')).toHaveValue(response);
  });
 }
});
