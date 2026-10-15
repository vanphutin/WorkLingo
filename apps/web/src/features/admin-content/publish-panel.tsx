import { useAdminContent } from './i18n';

import React, { useState } from 'react';

import type { ContentStatus, PublishContentImportResult } from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';

export interface PublishPanelProps {
  readonly importId: string;
  readonly draftRevision: number;
  readonly sourceHash: string;
  readonly canPublish: boolean;
  readonly isAudioReady: boolean;
  readonly status: ContentStatus;
  readonly selectedAudioArtifacts?: Readonly<Record<string, string>>;
  readonly publishedVersion?: number | null;
  readonly publishedLessonId?: string | null;
  readonly publishedLessonVersionId?: string | null;
  readonly onPublished?: (result: PublishContentImportResult) => void;
  readonly onArchive?: () => void;
}

export function PublishPanel({
  importId,
  draftRevision,
  sourceHash,
  canPublish,
  isAudioReady,
  status,
  selectedAudioArtifacts = {},
  publishedVersion,
  publishedLessonId,
  publishedLessonVersionId,
  onPublished,
  onArchive,
}: PublishPanelProps) {
  const { t, number, label, message } = useAdminContent();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<unknown>(null);

  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<unknown>(null);

  const handlePublish = async () => {
    if (isPublishing || !canPublish || !isAudioReady) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const result = await apiClient.publishContentImport(importId, {
        expectedDraftRevision: draftRevision,
        expectedSourceHash: sourceHash,
        idempotencyKey: `pub-${importId}-${draftRevision}`,
        selectedAudioArtifacts: { ...selectedAudioArtifacts },
      });

      onPublished?.(result);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setPublishError(err);
      } else {
        setPublishError('Unable to publish the lesson.');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleArchive = async () => {
    if (isArchiving || !publishedLessonVersionId) return;

    setIsArchiving(true);
    setArchiveError(null);

    try {
      await apiClient.archiveLessonVersion(publishedLessonVersionId);
      onArchive?.();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setArchiveError(err);
      } else {
        setArchiveError('Unable to archive the lesson version.');
      }
    } finally {
      setIsArchiving(false);
    }
  };

  if (status === 'PUBLISHED' || status === 'ARCHIVED') {
    return (
      <div className="publish-panel-container" role="region" aria-label={t('publishDetails')}>
        <div className="published-card">
          <div className="published-header">
            <h3>{t('publishedTitle')}</h3>
            <span className={`status-pill pill-${status.toLowerCase()}`}>{label(status)}</span>
          </div>

          <div className="published-details">
            <p>{t('publishedVersion', { version: publishedVersion !== null && publishedVersion !== undefined ? number(publishedVersion) : t('notAvailable') })}</p>
            {publishedLessonId && <p>{t('lessonId', { id: publishedLessonId })}</p>}
            <p className="immutable-notice">{t('immutableNotice')}</p>
          </div>

          {Boolean(archiveError) && (
            <div className="alert alert-error" role="alert">
              {message(archiveError)}
            </div>
          )}

          {status === 'PUBLISHED' && publishedLessonVersionId && (
            <div className="published-actions">
              <button
                type="button"
                className="btn btn-secondary btn-archive"
                disabled={isArchiving}
                onClick={handleArchive}
              >
                {isArchiving ? t('archiving') : t('archiveVersion')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isReadyToPublish = canPublish && isAudioReady;

  return (
    <div className="publish-panel-container" role="region" aria-label={t('publishRegion')}>
      <div className="publish-card">
        <h3>{t('publishingRequirements')}</h3>
        <p className="publish-desc">{t('publishingHelp')}</p>

        <div className="readiness-checklist">
          <div className={`readiness-item ${canPublish ? 'is-ready' : 'not-ready'}`}>
            <span className="readiness-icon">{canPublish ? '✓' : '✗'}</span>
            <div className="readiness-info">
              <strong>{t('formatValidation')}</strong>
              <p>{canPublish ? t('formatReady') : t('formatNotReady')}</p>
            </div>
          </div>

          <div className={`readiness-item ${isAudioReady ? 'is-ready' : 'not-ready'}`}>
            <span className="readiness-icon">{isAudioReady ? '✓' : '✗'}</span>
            <div className="readiness-info">
              <strong>{t('simulationAudio')}</strong>
              <p>{isAudioReady ? t('audioReady') : t('audioNotReady')}</p>
            </div>
          </div>
        </div>

        <div className="publish-revision-info">
          <span>{t('draftRevision')} <strong>{number(draftRevision)}</strong></span>
          <span className="hash-label">{t('sourceHash')}<code>{sourceHash.slice(0, 8)}</code></span>
        </div>

        {Boolean(publishError) && (
          <div className="alert alert-error" role="alert">
            {message(publishError)}
          </div>
        )}

        <div className="publish-action-row">
          <button
            type="button"
            className="btn btn-primary btn-publish"
            disabled={!isReadyToPublish || isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? t('publishing') : t('publishLesson')}
          </button>
        </div>
      </div>
    </div>
  );
}
