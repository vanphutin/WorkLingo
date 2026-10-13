import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ieltsOrientationClient } from '../../lib/api/ielts-orientation-client';
import { OrientationPlayer } from './orientation-player';

vi.mock('../../lib/api/ielts-orientation-client', () => ({ ieltsOrientationClient: { getStatus: vi.fn(), start: vi.fn(), updateProgress: vi.fn() } }));
vi.mock('../audio/browser-speech-controls', () => ({ BrowserSpeechControls: ({ text }: { text: string }) => <button type="button">Read transcript: {text}</button> }));

const versionId = '11111111-1111-4111-8111-111111111111';
const presentation = { id: versionId, orientationId: '22222222-2222-4222-8222-222222222222', title: 'IELTS Orientation', version: 1, slides: [
  { id: '33333333-3333-4333-8333-333333333333', slug: 'welcome', title: 'Welcome', body: 'Welcome body', transcript: 'Welcome transcript', imageUrl: null, audioUrl: null, question: null },
  { id: '44444444-4444-4444-8444-444444444444', slug: 'check', title: 'Knowledge check', body: 'Check body', transcript: 'Check transcript', imageUrl: null, audioUrl: null, question: { slug: 'skills-check', prompt: 'How many skills?', options: ['Two', 'Four'] } },
  { id: '55555555-5555-4555-8555-555555555555', slug: 'ready', title: 'Ready', body: 'Ready body', transcript: 'Ready transcript', imageUrl: null, audioUrl: null, question: null },
] };
const progress = { orientationVersionId: versionId, currentSlideIndex: 1, revision: 2, answers: [], completedAt: null };

describe('OrientationPlayer', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'in_progress', reasons: [], presentation, progress }); });
  afterEach(cleanup);

  it('resumes the pinned slide, exposes captions and gates advancement on an answer', async () => {
    vi.mocked(ieltsOrientationClient.updateProgress).mockResolvedValue({ progress: { ...progress, currentSlideIndex: 2, revision: 3, answers: [{ questionSlug: 'skills-check', selectedIndex: 1, correct: true, answeredAt: new Date().toISOString() }] }, answerFeedback: { questionSlug: 'skills-check', correct: true, explanation: 'Four skills.' } });
    render(<OrientationPlayer />);
    expect(await screen.findByRole('heading', { name: 'Knowledge check' })).not.toBeNull();
    expect(screen.getByText('Check transcript')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByLabelText('Four'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(ieltsOrientationClient.updateProgress).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 2, targetSlideIndex: 2, answer: { questionSlug: 'skills-check', selectedIndex: 1 } })));
  });

  it('requires an explicit final completion write', async () => {
    vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'in_progress', reasons: [], presentation, progress: { ...progress, currentSlideIndex: 2, revision: 5 } });
    vi.mocked(ieltsOrientationClient.updateProgress).mockResolvedValue({ progress: { ...progress, currentSlideIndex: 2, revision: 6, completedAt: new Date().toISOString() }, answerFeedback: null });
    render(<OrientationPlayer />);
    fireEvent.click(await screen.findByRole('button', { name: 'Complete orientation' }));
    await waitFor(() => expect(ieltsOrientationClient.updateProgress).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 5, targetSlideIndex: 2, complete: true })));
    expect(await screen.findByText('IELTS Orientation complete')).not.toBeNull();
  });
});
