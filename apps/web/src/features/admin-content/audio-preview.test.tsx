import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import type * as AudioSettingsClientModule from '../../lib/api/audio-settings-client';
import { apiClient } from '../../lib/api/api-client';
import { audioSettingsClient } from '../../lib/api/audio-settings-client';
import { AudioPreview } from './audio-preview';

vi.mock('../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      listContentAudioArtifacts: vi.fn(),
      generateAudio: vi.fn(),
      getJob: vi.fn(),
      getAudioArtifactContentUrl: vi.fn(),
    },
  };
});

vi.mock('../../lib/api/audio-settings-client', async (importOriginal) => {
  const actual = await importOriginal<typeof AudioSettingsClientModule>();
  return {
    ...actual,
    audioSettingsClient: { getAdminSettings: vi.fn() },
  };
});

vi.mock('../audio/browser-speech-controls', () => ({
  BrowserSpeechControls: () => <div>Browser preview</div>,
}));

beforeEach(() => {
  vi.mocked(audioSettingsClient.getAdminSettings).mockResolvedValue({
    defaultVoiceId: 'fake-neutral', providerId: 'fake-tts',
    providers: [{
      available: true, defaultVoiceId: 'fake-neutral', displayName: 'Simulation audio',
      id: 'fake-tts', simulation: true, supportedLocales: ['en-US'],
    }],
  });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('AudioPreview', () => {
  it('labels simulation artifacts as diagnostic tones and does not expose them in an audio player', async () => {
    vi.mocked(apiClient.listContentAudioArtifacts).mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        contentImportId: '11111111-1111-4111-8111-111111111111',
        audioScriptSlug: 'audio-dialogue-1',
        scriptHash: 'hash-s1',
        adapterName: 'fake-tts',
        voiceConfig: { voiceId: 'fake-neutral' },
        mimeType: 'audio/wav',
        byteSize: 1024,
        checksum: 'chk-1',
        storageKey: 'audio/1.wav',
        status: 'READY',
        failureSummary: null,
        simulationLabel: 'Simulation audio — not a release voice',
        createdAt: '2026-10-04T00:00:00.000Z',
        updatedAt: '2026-10-04T00:00:00.000Z',
      },
    ]);

    vi.mocked(apiClient.getAudioArtifactContentUrl).mockReturnValue(
      'http://localhost:3000/api/v1/admin/content-imports/11111111-1111-4111-8111-111111111111/audio/22222222-2222-4222-8222-222222222222/content',
    );

    render(
      <AudioPreview
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={1}
        audioScripts={[
          {
            slug: 'audio-dialogue-1',
            speaker: 'Alex and Taylor',
            script: 'Alex: Could we extend the sprint deadline?',
          },
        ]}
      />,
    );

    expect(
      await screen.findByText('Simulation audio — not a release voice'),
    ).toBeInTheDocument();

    expect(screen.getByText('audio-dialogue-1')).toBeInTheDocument();
    expect(screen.getAllByText('Ready')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /fake-tts.*fake-neutral/i })).toBeInTheDocument();

    expect(screen.queryByTestId(
      'audio-player-audio-dialogue-1-22222222-2222-4222-8222-222222222222',
    )).not.toBeInTheDocument();
    expect(screen.getByText(/diagnostic tone, not speech/i)).toBeInTheDocument();
    expect(apiClient.getAudioArtifactContentUrl).not.toHaveBeenCalled();
  });

  it('triggers generate audio, polls job by status until completion, and refreshes artifact list', async () => {
    vi.mocked(apiClient.listContentAudioArtifacts)
      .mockResolvedValueOnce([]) // initially empty
      .mockResolvedValueOnce([
        {
          id: '33333333-3333-4333-8333-333333333333',
          contentImportId: '11111111-1111-4111-8111-111111111111',
          audioScriptSlug: 'audio-dialogue-1',
          scriptHash: 'hash-s1',
          adapterName: 'fake-tts',
          voiceConfig: { voiceId: 'fake-neutral' },
          mimeType: 'audio/wav',
          byteSize: 1024,
          checksum: 'chk-1',
          storageKey: 'audio/2.wav',
          status: 'READY',
          failureSummary: null,
          simulationLabel: 'Simulation audio — not a release voice',
          createdAt: '2026-10-04T00:00:00.000Z',
          updatedAt: '2026-10-04T00:00:00.000Z',
        },
      ]);

    vi.mocked(apiClient.generateAudio).mockResolvedValueOnce({
      jobId: 'job-12345678-1234-1234-1234-123456789012',
      status: 'PENDING',
      audioScriptSlug: 'audio-dialogue-1',
    });

    vi.mocked(apiClient.getJob)
      .mockResolvedValueOnce({
        id: 'job-12345678-1234-1234-1234-123456789012',
        type: 'AUDIO_GENERATION',
        status: 'RUNNING',
        payload: {},
        result: null,
        error: null,
        errorCode: null,
        retryable: false,
        createdAt: '2026-10-04T00:00:00.000Z',
        updatedAt: '2026-10-04T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        id: 'job-12345678-1234-1234-1234-123456789012',
        type: 'AUDIO_GENERATION',
        status: 'COMPLETED',
        payload: {},
        result: { artifactId: '33333333-3333-4333-8333-333333333333' },
        error: null,
        errorCode: null,
        retryable: false,
        createdAt: '2026-10-04T00:00:00.000Z',
        updatedAt: '2026-10-04T00:00:00.000Z',
      });

    vi.mocked(apiClient.getAudioArtifactContentUrl).mockReturnValue(
      'http://localhost:3000/api/v1/admin/content-imports/11111111-1111-4111-8111-111111111111/audio/33333333-3333-4333-8333-333333333333/content',
    );

    render(
      <AudioPreview
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={1}
        pollIntervalMs={10}
        audioScripts={[
          {
            slug: 'audio-dialogue-1',
            speaker: 'Alex and Taylor',
            script: 'Alex: Could we extend the sprint deadline?',
          },
        ]}
      />,
    );

    const generateBtn = await screen.findByRole('button', { name: /generate audio/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(apiClient.generateAudio).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        expect.objectContaining({
          audioScriptSlug: 'audio-dialogue-1',
          idempotencyKey: expect.stringContaining('audio-dialogue-1'),
          providerId: 'fake-tts',
          voiceId: 'fake-neutral',
        }),
      );
    });

    await waitFor(() => {
      expect(apiClient.getJob).toHaveBeenCalledTimes(2);
      expect(screen.getAllByText('Ready')).toHaveLength(2);
    });
  });

  it('keeps candidates separate and reports an explicit READY selection', async () => {
    const onSelection = vi.fn();
    const onReady = vi.fn();
    vi.mocked(apiClient.listContentAudioArtifacts).mockResolvedValueOnce([
      {
        id: '22222222-2222-4222-8222-222222222222',
        contentImportId: '11111111-1111-4111-8111-111111111111',
        audioScriptSlug: 'audio-dialogue-1', scriptHash: 'hash-s1', adapterName: 'fake-tts',
        voiceConfig: { voice: 'fake-neutral' }, mimeType: 'audio/wav', byteSize: 100,
        checksum: 'one', storageKey: 'one.wav', status: 'READY', failureSummary: null,
        createdAt: '2026-10-04T00:00:00.000Z', updatedAt: '2026-10-04T00:00:00.000Z',
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        contentImportId: '11111111-1111-4111-8111-111111111111',
        audioScriptSlug: 'audio-dialogue-1', scriptHash: 'hash-s1', adapterName: 'azure-speech',
        voiceConfig: { voice: 'en-US-JennyNeural' }, mimeType: 'audio/wav', byteSize: 120,
        checksum: 'two', storageKey: 'two.wav', status: 'READY', failureSummary: null,
        createdAt: '2026-10-04T00:01:00.000Z', updatedAt: '2026-10-04T00:01:00.000Z',
      },
    ]);
    render(
      <AudioPreview
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={1}
        audioScripts={[{ slug: 'audio-dialogue-1', script: 'Hello team' }]}
        onSelectedAudioArtifactsChange={onSelection}
        onAudioReadinessChange={onReady}
      />,
    );
    const choices = await screen.findAllByRole('radio');
    expect(choices).toHaveLength(2);
    expect(screen.queryByTestId(
      'audio-player-audio-dialogue-1-22222222-2222-4222-8222-222222222222',
    )).not.toBeInTheDocument();
    expect(screen.getByTestId(
      'audio-player-audio-dialogue-1-33333333-3333-4333-8333-333333333333',
    )).toBeInTheDocument();
    fireEvent.click(choices[1]!);
    expect(onSelection).toHaveBeenLastCalledWith({
      'audio-dialogue-1': '33333333-3333-4333-8333-333333333333',
    });
    expect(onReady).toHaveBeenLastCalledWith(true);
  });

  it('stops bounded polling and offers an actionable retry state', async () => {
    vi.mocked(apiClient.listContentAudioArtifacts).mockResolvedValue([]);
    vi.mocked(apiClient.generateAudio).mockResolvedValue({
      audioScriptSlug: 'audio-dialogue-1',
      jobId: '44444444-4444-4444-8444-444444444444',
      status: 'PENDING',
    });
    vi.mocked(apiClient.getJob).mockResolvedValue({
      createdAt: '2026-10-04T00:00:00.000Z', error: null, errorCode: null,
      id: '44444444-4444-4444-8444-444444444444', payload: {}, result: null,
      retryable: false, status: 'RUNNING', type: 'AUDIO_GENERATION',
      updatedAt: '2026-10-04T00:00:00.000Z',
    });
    render(
      <AudioPreview
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={1}
        maxPollAttempts={2}
        pollIntervalMs={1}
        audioScripts={[{ slug: 'audio-dialogue-1', script: 'Hello team' }]}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /generate audio/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/taking too long/i);
    expect(apiClient.getJob).toHaveBeenCalledTimes(2);
  });
});
