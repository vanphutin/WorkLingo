import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BrowserSpeechControls } from './browser-speech-controls';

vi.mock('./use-browser-speech', () => ({
  useBrowserSpeech: () => ({
    error: null, pauseOrResume: vi.fn(), play: vi.fn(), resolvedVoice: null,
    status: 'idle', stop: vi.fn(), supported: false, voices: [],
  }),
}));

afterEach(cleanup);

describe('BrowserSpeechControls', () => {
  it('explains unsupported browsers and disables playback', () => {
    render(<BrowserSpeechControls lang="en-US" text="Preview this sentence" />);
    expect(screen.getByText(/not supported/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /stop/i })).toBeDisabled();
  });
});
