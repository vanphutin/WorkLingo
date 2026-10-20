import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ieltsOrientationClient } from '../../lib/api/ielts-orientation-client';
import { OrientationPlayer } from './orientation-player';

vi.mock('../../lib/api/ielts-orientation-client', () => ({ ieltsOrientationClient: { getStatus: vi.fn(), updateProgress: vi.fn() } }));

class Utterance {
  constructor(readonly text: string) {}
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Orientation narration replay', () => {
  it('keeps the same named voice when returning to a previously played slide', async () => {
    const voices = ['a', 'b', 'c'].map((id) => ({ voiceURI: id, name: id, lang: 'en-GB', localService: true, default: false } as SpeechSynthesisVoice));
    const played: string[] = [];
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => voices, cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), paused: false,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      speak: (utterance: Utterance) => { played.push(utterance.voice?.voiceURI ?? 'missing'); },
    } });
    const versionId = '11111111-1111-4111-8111-111111111111';
    const progress = { orientationVersionId: versionId, currentSlideIndex: 0, revision: 1, answers: [], completedAt: null };
    vi.mocked(ieltsOrientationClient.getStatus).mockResolvedValue({ state: 'in_progress', reasons: [], progress, presentation: {
      id: versionId, orientationId: '22222222-2222-4222-8222-222222222222', title: 'Orientation', version: 1,
      slides: ['first', 'second', 'third'].map((id) => ({ id, slug: id, title: id, body: id, transcript: `${id} narration`, imageUrl: null, audioUrl: null, question: null })),
    } });
    vi.mocked(ieltsOrientationClient.updateProgress).mockImplementation(async (input) => ({
      progress: { ...progress, revision: input.expectedRevision + 1, currentSlideIndex: input.targetSlideIndex }, answerFeedback: null,
    }));
    render(<OrientationPlayer />);
    fireEvent.click(await screen.findByRole('button', { name: 'Play preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: 'second' });
    fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await screen.findByRole('heading', { name: 'first' });
    fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
    expect(played).toEqual(['a', 'b', 'a']);
  });
});
