import '@testing-library/jest-dom/vitest';
import React from 'react';
import { webcrypto } from 'node:crypto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseLessonSource } from '@worklingo/content-format';
import { NarrationEditor } from './narration-editor';
vi.mock('../audio/browser-speech-controls', () => ({ BrowserSpeechControls: () => null }));
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const source = `FORMAT: WorkLingoLesson/1.0\n[AUDIO_SCRIPT letter]\nscript:\n<<<\nFrom: May\nTo: Team\n\nHello team.\n>>>\n[/AUDIO_SCRIPT]\n`;
describe('NarrationEditor', () => {
  it('requires explicit review before applying an email body suggestion', async () => {
    const apply = vi.fn().mockResolvedValue(true);
    render(<NarrationEditor source={source} onApply={apply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest email body' }));
    expect(screen.getByLabelText('Text to speak')).toHaveValue('Hello team.');
    const save = screen.getByRole('button', { name: 'Save reviewed narration' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(save);
    await waitFor(() => expect(apply).toHaveBeenCalledOnce());
    const script = parseLessonSource(apply.mock.calls[0]![0]).document.audioScripts[0]!;
    expect(script.script).toBe('From: May\nTo: Team\n\nHello team.');
    expect(script.spokenText).toBe('Hello team.');
    expect(script.speechReview).toMatch(/^[a-f0-9]{64}$/);
  });
  it('blocks applying speech that removes a listening evidence line', () => {
    const evidence = source + '[CONTENT mail]\ntype: email\ntext:\n<<<\nFrom: May\n>>>\n[/CONTENT]\n[ACTIVITY listen]\nactivity_type: listening\naudio_ref: letter\nEVIDENCE: mail:1\n[/ACTIVITY]';
    render(<NarrationEditor source={evidence} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Suggest email body' }));
    expect(screen.getByRole('alert')).toHaveTextContent('listen');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Save reviewed narration' })).toBeDisabled();
  });
  it('keeps published versions read only', () => {
    render(<NarrationEditor source={source} readOnly onApply={vi.fn()} />);
    expect(screen.getByLabelText('Text to speak')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save reviewed narration' })).not.toBeInTheDocument();
  });
});
