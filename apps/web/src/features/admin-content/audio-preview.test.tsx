import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import { apiClient } from '../../lib/api/api-client';
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

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('AudioPreview', () => {
  it('displays simulation label, existing ready artifact, and audio player with authorized url', async () => {
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
        simulationLabel: 'Audio mô phỏng — chưa phải giọng đọc phát hành',
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
      await screen.findByText('Audio mô phỏng — chưa phải giọng đọc phát hành'),
    ).toBeInTheDocument();

    expect(screen.getByText('audio-dialogue-1')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
    expect(screen.getByText('fake-tts')).toBeInTheDocument();
    expect(screen.getByText('fake-neutral')).toBeInTheDocument();

    const audioEl = screen.getByTestId('audio-player-audio-dialogue-1') as HTMLAudioElement;
    expect(audioEl).toBeInTheDocument();
    expect(audioEl.src).toContain('/audio/22222222-2222-4222-8222-222222222222/content');
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
          simulationLabel: 'Audio mô phỏng — chưa phải giọng đọc phát hành',
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
        }),
      );
    });

    await waitFor(() => {
      expect(apiClient.getJob).toHaveBeenCalledTimes(2);
      expect(screen.getByText('READY')).toBeInTheDocument();
    });
  });
});
