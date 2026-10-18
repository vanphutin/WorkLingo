import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAudioRecorder } from './use-audio-recorder';
import { LocaleProvider, useLocalePreference } from '../../i18n/provider';

class FakeMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  static latest: FakeMediaRecorder | null = null;
  readonly mimeType: string;
  state: RecordingState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(readonly stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? 'audio/webm';
    FakeMediaRecorder.latest = this;
  }

  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.();
  }
}

function RecorderHarness() {
  const recorder = useAudioRecorder();
  return (
    <div>
      <p>{recorder.status}</p>
      <button type="button" onClick={() => void recorder.start()}>start</button>
      <button type="button" onClick={recorder.stop}>stop</button>
      <button type="button" onClick={recorder.discard}>discard</button>
      {recorder.previewUrl ? <audio aria-label="preview" src={recorder.previewUrl} /> : null}
      {recorder.error ? <p role="alert">{recorder.error}</p> : null}
    </div>
  );
}

function SwitchLocale() {
  const { locale, setLocale } = useLocalePreference();
  return <button onClick={() => void setLocale(locale === 'en' ? 'vi' : 'en')}>switch language</button>;
}

describe('useAudioRecorder', () => {
  const stopTrack = vi.fn();
  const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;

  beforeEach(() => {
    stopTrack.mockReset();
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    // Preserve the URL constructor used by browser cookies; mock only media object URLs.
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:preview-1');
      static revokeObjectURL = vi.fn();
    });
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('requests the microphone only after an explicit action and releases tracks on stop', async () => {
    render(<RecorderHarness />);
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await waitFor(() => expect(screen.getByText('recording')).toBeInTheDocument());
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });

    fireEvent.click(screen.getByRole('button', { name: 'stop' }));
    await waitFor(() => expect(screen.getByText('preview')).toBeInTheDocument());
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('preview')).toHaveAttribute('src', 'blob:preview-1');
  });
  it('releases a permission stream that arrives after the recorder was unmounted', async () => {
    let resolve!: (value: MediaStream) => void;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise(value => { resolve = value; }));
    const view = render(<RecorderHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    view.unmount();
    await act(async () => resolve(stream));
    expect(stopTrack).toHaveBeenCalledOnce();
  });

  it('revokes preview URLs when discarding a recording', async () => {
    render(<RecorderHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await screen.findByText('recording');
    fireEvent.click(screen.getByRole('button', { name: 'stop' }));
    await screen.findByText('preview');

    fireEvent.click(screen.getByRole('button', { name: 'discard' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('releases the microphone and suppresses preview creation when unmounted mid-recording', async () => {
    const { unmount } = render(<RecorderHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await screen.findByText('recording');

    unmount();

    expect(stopTrack).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('surfaces microphone denial as an actionable error', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    render(<RecorderHarness />);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'start' })));
    expect(await screen.findByRole('alert')).toHaveTextContent(/microphone|permission/i);
  });

  it('keeps the microphone recording and preview alive across locale changes', async () => {
    render(<LocaleProvider initialLocale="en"><SwitchLocale /><RecorderHarness /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    await screen.findByText('recording');
    const recorder = FakeMediaRecorder.latest;
    fireEvent.click(screen.getByRole('button', { name: 'switch language' }));
    expect(screen.getByText('recording')).toBeInTheDocument();
    expect(FakeMediaRecorder.latest).toBe(recorder);
    expect(stopTrack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'stop' }));
    await screen.findByText('preview');
    const preview = screen.getByLabelText('preview');
    fireEvent.click(screen.getByRole('button', { name: 'switch language' }));
    expect(screen.getByLabelText('preview')).toBe(preview);
    expect(preview).toHaveAttribute('src', 'blob:preview-1');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('retranslates an existing microphone error without requesting permission again', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    render(<LocaleProvider initialLocale="en"><SwitchLocale /><RecorderHarness /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'start' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Microphone permission was denied.');
    fireEvent.click(screen.getByRole('button', { name: 'switch language' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Quyền truy cập micro đã bị từ chối.');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });
});
