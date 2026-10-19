import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as ApiClientModule from '../../lib/api/api-client';
import { ApiError, apiClient } from '../../lib/api/api-client';
import { PublishPanel } from './publish-panel';
import { LocaleProvider } from '../../i18n/provider';
import type { VocabularyPublicationReview } from '@worklingo/contracts';

vi.mock('../../lib/api/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClientModule>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      publishContentImport: vi.fn(),
      getVocabularyPublicationReview: vi.fn(),
      archiveLessonVersion: vi.fn(),
    },
  };
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('PublishPanel', () => {
  it('requires a deliberate meaning choice and sends that choice with the publication', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const candidateId = '22222222-2222-4222-8222-222222222222';
    const review: VocabularyPublicationReview = { importId: id, draftRevision: 1, sourceHash: 'hash-1', reviewHash: 'review-1', topic: { id, name: 'Customer support', nameEn: null },
      entries: [{ sourceSlug: 'book', sourceBankSlug: 'topic-bank', expression: 'book', meaning: 'đặt bàn', pronunciation: '/bʊk/', candidates: [{ id: candidateId, expression: 'book', meaning: 'sách', pronunciation: '/bʊk/', originBankName: 'Restaurant words', contextCount: 1,
        contexts: [{ lessonId: id, lessonVersionId: id, lessonTitle: 'Restaurant lesson', topicGroupId: id, topicName: 'Restaurant', topicNameEn: null }] }] }] };
    vi.mocked(apiClient.getVocabularyPublicationReview).mockResolvedValue(review);
    vi.mocked(apiClient.publishContentImport).mockRejectedValue(new ApiError({ code: 'NETWORK_ERROR', status: 0, message: 'offline' }));
    render(<PublishPanel importId={id} draftRevision={1} sourceHash="hash-1" canPublish isAudioReady status="VALIDATED" vocabularyReviewRequired />);
    const publish = screen.getByRole('button', { name: 'Publish Lesson' });
    expect(publish).toBeDisabled();
    const reuse = await screen.findByRole('radio', { name: 'Use existing meaning: sách' });
    expect(reuse).not.toBeChecked();
    expect(screen.getByText(/Restaurant lesson/)).toBeVisible();
    fireEvent.click(reuse); expect(publish).toBeEnabled(); fireEvent.click(publish);
    await screen.findByRole('alert');
    const first = vi.mocked(apiClient.publishContentImport).mock.calls[0]![1];
    expect(first.vocabularyReview).toEqual({ reviewHash: 'review-1', choices: [{ sourceSlug: 'book', action: 'reuse', languageBlockId: candidateId }] });
    fireEvent.click(publish);
    await waitFor(() => expect(apiClient.publishContentImport).toHaveBeenCalledTimes(2));
    expect(vi.mocked(apiClient.publishContentImport).mock.calls[1]![1].idempotencyKey).toBe(first.idempotencyKey);
    fireEvent.click(screen.getByRole('radio', { name: 'Create a new meaning: đặt bàn' }));
    fireEvent.click(publish);
    await waitFor(() => expect(apiClient.publishContentImport).toHaveBeenCalledTimes(3));
    const third = vi.mocked(apiClient.publishContentImport).mock.calls[2]![1];
    expect(third.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(third.vocabularyReview?.choices).toEqual([{ sourceSlug: 'book', action: 'new' }]);
  });
  it.each(['en', 'vi'] as const)('explains a vocabulary identity conflict in %s instead of claiming a stale draft', async locale => {
    vi.mocked(apiClient.publishContentImport).mockRejectedValueOnce(new ApiError({ code: 'LANGUAGE_BLOCK_IDENTITY_CONFLICT', message: 'private details', status: 409 }));
    render(<LocaleProvider initialLocale={locale}><PublishPanel importId="11111111-1111-4111-8111-111111111111" draftRevision={1}
      sourceHash="hash-1" canPublish isAudioReady status="VALIDATED" /></LocaleProvider>);
    fireEvent.click(screen.getByRole('button', { name: locale === 'vi' ? 'Xuất bản bài học' : 'Publish Lesson' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(locale === 'vi' ? /mã từ vựng.*bộ từ khác/i : /vocabulary identifier.*another word bank/i);
    expect(screen.getByRole('alert')).not.toHaveTextContent(/private details|reload and try again|tải lại rồi thử lại/i);
  });
  it('disables publish button if validation or audio is not ready', () => {
    const { rerender } = render(
      <PublishPanel
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={1}
        sourceHash="hash-1"
        canPublish={false}
        isAudioReady={true}
        status="DRAFT"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Lesson publishing requirements' }))
      .toBeInTheDocument();

    const publishBtn = screen.getByRole('button', { name: /publish lesson/i });
    expect(publishBtn).toBeDisabled();

    // Now valid but audio not ready
    rerender(
      <PublishPanel
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={1}
        sourceHash="hash-1"
        canPublish={true}
        isAudioReady={false}
        status="VALIDATED"
      />,
    );

    expect(screen.getByRole('button', { name: /publish lesson/i })).toBeDisabled();
  });

  it('publishes lesson when valid and audio is ready, preventing double clicks', async () => {
    const onPublished = vi.fn();

    vi.mocked(apiClient.publishContentImport).mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                importId: '11111111-1111-4111-8111-111111111111',
                lessonId: '88888888-8888-4888-8888-888888888888',
                lessonVersionId: '99999999-9999-4999-8999-999999999999',
                version: 2,
                status: 'PUBLISHED',
                publishedAt: '2026-10-04T00:00:00.000Z',
              }),
            50,
          );
        }),
    );

    render(
      <PublishPanel
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={3}
        sourceHash="hash-3"
        canPublish={true}
        isAudioReady={true}
        selectedAudioArtifacts={{ 'complaint-call': '77777777-7777-4777-8777-777777777777' }}
        status="VALIDATED"
        onPublished={onPublished}
      />,
    );

    const publishBtn = screen.getByRole('button', { name: /publish lesson/i });
    expect(publishBtn).toBeEnabled();

    // Click twice rapidly to test double-click prevention
    fireEvent.click(publishBtn);
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(apiClient.publishContentImport).toHaveBeenCalledTimes(1);
      expect(apiClient.publishContentImport).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        {
          expectedDraftRevision: 3,
          expectedSourceHash: 'hash-3',
          idempotencyKey: expect.stringContaining('pub-11111111-1111-4111-8111-111111111111-3'),
          selectedAudioArtifacts: {
            'complaint-call': '77777777-7777-4777-8777-777777777777',
          },
        },
      );
      expect(onPublished).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 2,
          status: 'PUBLISHED',
        }),
      );
    });
  });

  it('displays conflict message on 409 without crashing or resetting', async () => {
    vi.mocked(apiClient.publishContentImport).mockRejectedValueOnce(
      new ApiError({
        code: 'CONFLICT',
        message: 'Draft revision has changed on server',
        status: 409,
      }),
    );

    render(
      <PublishPanel
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={1}
        sourceHash="hash-1"
        canPublish={true}
        isAudioReady={true}
        status="VALIDATED"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /publish lesson/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /information has changed.*reload and try again/i,
    );
  });

  it('displays published version info and archive button when already published, offering no delete button', async () => {
    const onArchive = vi.fn();
    vi.mocked(apiClient.archiveLessonVersion).mockResolvedValueOnce({
      id: '99999999-9999-4999-8999-999999999999',
      status: 'ARCHIVED',
    });

    render(
      <PublishPanel
        importId="11111111-1111-4111-8111-111111111111"
        draftRevision={3}
        sourceHash="hash-3"
        canPublish={false}
        isAudioReady={true}
        status="PUBLISHED"
        publishedVersion={2}
        publishedLessonVersionId="99999999-9999-4999-8999-999999999999"
        onArchive={onArchive}
      />,
    );

    expect(screen.getByText(/Published Version: 2/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();

    const archiveBtn = screen.getByRole('button', { name: /archive version/i });
    expect(archiveBtn).toBeInTheDocument();

    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(apiClient.archiveLessonVersion).toHaveBeenCalledWith(
        '99999999-9999-4999-8999-999999999999',
      );
      expect(onArchive).toHaveBeenCalled();
    });
  });
});
