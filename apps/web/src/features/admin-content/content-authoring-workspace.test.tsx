import '@testing-library/jest-dom/vitest';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContentImportDto } from '@worklingo/contracts';

import type * as ApiClientModule from '../../lib/api/api-client';
import { ApiError, apiClient } from '../../lib/api/api-client';
import { ContentAuthoringWorkspace } from './content-authoring-workspace';

vi.mock('../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      updateContentSource: vi.fn(),
      validateContentImport: vi.fn(),
      getContentPreview: vi.fn(),
      listContentAudioArtifacts: vi.fn(),
      publishContentImport: vi.fn(),
      archiveLessonVersion: vi.fn(),
    },
  };
});

describe('ContentAuthoringWorkspace', () => {
  const initialImport: ContentImportDto = {
    id: '11111111-1111-4111-8111-111111111111',
    lessonId: null,
    lessonVersionId: null,
    rawSource: 'FORMAT: WorkLingoLesson/1.0\n[LESSON]\nslug: test-lesson',
    sourceHash: 'hash-initial',
    status: 'DRAFT',
    draftRevision: 1,
    parserVersion: '1.0.0',
    validationHash: null,
    createdById: '22222222-2222-4222-8222-222222222222',
    updatedById: '22222222-2222-4222-8222-222222222222',
    createdAt: '2026-10-04T00:00:00.000Z',
    updatedAt: '2026-10-04T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('debounces autosave after user typing and updates status to Saved', async () => {
    vi.mocked(apiClient.updateContentSource).mockResolvedValueOnce({
      ...initialImport,
      rawSource: 'Updated source text',
      draftRevision: 2,
    });

    render(<ContentAuthoringWorkspace initialImport={initialImport} debounceMs={500} />);

    const textarea = screen.getByRole('textbox', { name: /lesson source editor/i });
    fireEvent.change(textarea, { target: { value: 'Updated source text' } });

    // Immediately after typing, autosave has not fired yet
    expect(apiClient.updateContentSource).not.toHaveBeenCalled();

    // Advance timer past debounce threshold inside act
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(apiClient.updateContentSource).toHaveBeenCalledTimes(1);
    expect(apiClient.updateContentSource).toHaveBeenCalledWith(
      initialImport.id,
      {
        rawSource: 'Updated source text',
        expectedDraftRevision: 1,
      },
    );

    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });

  it('handles 409 revision conflict by preserving local work and displaying conflict alert', async () => {
    vi.mocked(apiClient.updateContentSource).mockRejectedValueOnce(
      new ApiError({
        code: 'DRAFT_REVISION_CONFLICT',
        message: 'Draft revision mismatch',
        status: 409,
      }),
    );

    render(<ContentAuthoringWorkspace initialImport={initialImport} debounceMs={500} />);

    const textarea = screen.getByRole('textbox', { name: /lesson source editor/i });
    fireEvent.change(textarea, { target: { value: 'Local changes with conflict' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/conflict/i);
    // Crucial: local changes must be preserved in the textarea!
    expect(textarea).toHaveValue('Local changes with conflict');
  });

  it('validates source on demand and clicking issue highlights position', async () => {
    vi.useRealTimers(); // real timers for explicit click interaction

    vi.mocked(apiClient.validateContentImport).mockResolvedValueOnce({
      importId: initialImport.id,
      draftRevision: 1,
      sourceHash: 'hash-1',
      status: 'DRAFT',
      canPublish: false,
      issues: [
        {
          code: 'VAL_MISSING_TITLE',
          severity: 'error',
          message: 'Lesson title is required',
          range: {
            start: { line: 2, column: 1, offset: 28 },
            end: { line: 2, column: 8, offset: 35 },
          },
        },
      ],
      issuesTruncated: false,
    });

    render(<ContentAuthoringWorkspace initialImport={initialImport} debounceMs={500} />);

    fireEvent.click(screen.getByRole('tab', { name: /^validation/i }));
    const validateButton = screen.getByRole('button', { name: /validate/i });
    fireEvent.click(validateButton);

    expect(await screen.findByText('Lesson title is required')).toBeInTheDocument();

    const issueButton = screen.getByRole('button', { name: /lesson title is required/i });
    fireEvent.click(issueButton);

    const textarea = screen.getByRole('textbox', {
      name: /lesson source editor/i,
    }) as HTMLTextAreaElement;

    // Focused and selection moved
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe(28);
  });

  it('switches to preview tab and loads preview and audio controls', async () => {
    vi.useRealTimers();

    vi.mocked(apiClient.getContentPreview).mockResolvedValueOnce({
      importId: initialImport.id,
      draftRevision: 1,
      sourceHash: 'hash-initial',
      status: 'VALIDATED',
      canPublish: true,
      issues: [],
      normalizedDraft: {
        slug: 'test-lesson',
        title: 'Preview Lesson Title',
        level: 'A2',
        durationMinutes: 10,
        objective: 'Test objective preview',
        contentBlocks: [],
        wordBanks: [],
        activities: [],
      },
    });

    vi.mocked(apiClient.listContentAudioArtifacts).mockResolvedValue([]);

    render(<ContentAuthoringWorkspace initialImport={initialImport} />);

    const previewTab = screen.getByRole('tab', { name: /^preview/i });
    fireEvent.click(previewTab);

    expect(await screen.findByText('Preview Lesson Title')).toBeInTheDocument();
    expect(
      screen.getByText('Simulation audio — not a release voice'),
    ).toBeInTheDocument();
  });

  it('switches to publish tab, publishes lesson, and switches workspace to read-only', async () => {
    vi.useRealTimers();

    vi.mocked(apiClient.validateContentImport).mockResolvedValueOnce({
      importId: initialImport.id,
      draftRevision: 1,
      sourceHash: 'hash-initial',
      status: 'VALIDATED',
      canPublish: true,
      issues: [],
      issuesTruncated: false,
    });

    vi.mocked(apiClient.listContentAudioArtifacts).mockResolvedValue([]);
    vi.mocked(apiClient.getContentPreview).mockResolvedValue({
      importId: initialImport.id,
      draftRevision: 1,
      sourceHash: 'hash-initial',
      status: 'VALIDATED',
      canPublish: true,
      issues: [],
      normalizedDraft: {
        slug: 'test-lesson',
        title: 'Preview Lesson Title',
        level: 'A2',
        durationMinutes: 10,
        objective: 'Test objective preview',
        contentBlocks: [],
        wordBanks: [],
        activities: [],
      },
    });

    vi.mocked(apiClient.publishContentImport).mockResolvedValueOnce({
      importId: initialImport.id,
      lessonId: '88888888-8888-4888-8888-888888888888',
      lessonVersionId: '99999999-9999-4999-8999-999999999999',
      version: 1,
      status: 'PUBLISHED',
      publishedAt: '2026-10-04T00:00:00.000Z',
    });

    render(<ContentAuthoringWorkspace initialImport={initialImport} />);

    // First validate
    fireEvent.click(screen.getByRole('button', { name: /validate/i }));
    await screen.findByText('VALIDATED');

    // Switch to publish tab
    const publishTab = screen.getByRole('tab', { name: /^publish/i });
    fireEvent.click(publishTab);

    const publishBtn = await screen.findByRole('button', { name: /publish lesson/i });
    fireEvent.click(publishBtn);

    expect(await screen.findByText(/Published Version: 1/i)).toBeInTheDocument();

    // Switch back to editor tab and verify textarea is readonly
    const sourceTab = screen.getByRole('tab', { name: /source/i });
    fireEvent.click(sourceTab);

    const textarea = screen.getByRole('textbox', {
      name: /lesson source editor/i,
    }) as HTMLTextAreaElement;
    expect(textarea).toHaveAttribute('readonly');
  });
});
