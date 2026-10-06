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
  publishedVersion,
  publishedLessonId,
  publishedLessonVersionId,
  onPublished,
  onArchive,
}: PublishPanelProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const handlePublish = async () => {
    if (isPublishing || !canPublish || !isAudioReady) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const result = await apiClient.publishContentImport(importId, {
        expectedDraftRevision: draftRevision,
        expectedSourceHash: sourceHash,
        idempotencyKey: `pub-${importId}-${draftRevision}`,
      });

      onPublished?.(result);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setPublishError(err.message);
      } else {
        setPublishError('Lỗi xảy ra trong quá trình phát hành bài học');
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
        setArchiveError(err.message);
      } else {
        setArchiveError('Lỗi khi lưu trữ phiên bản bài học');
      }
    } finally {
      setIsArchiving(false);
    }
  };

  if (status === 'PUBLISHED' || status === 'ARCHIVED') {
    return (
      <div className="publish-panel-container" role="region" aria-label="Publish details">
        <div className="published-card">
          <div className="published-header">
            <h3>Phiên bản bài học phát hành</h3>
            <span className={`status-pill pill-${status.toLowerCase()}`}>{status}</span>
          </div>

          <div className="published-details">
            <p>Published Version: {publishedVersion ?? 'N/A'}</p>
            {publishedLessonId && <p>Lesson ID: {publishedLessonId}</p>}
            <p className="immutable-notice">
              Phiên bản này là bất biến (immutable). Người học trong phiên hiện tại sẽ không bị ảnh hưởng bởi bản thảo mới.
            </p>
          </div>

          {archiveError && (
            <div className="alert alert-error" role="alert">
              {archiveError}
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
                {isArchiving ? 'Đang lưu trữ...' : 'Archive Version'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isReadyToPublish = canPublish && isAudioReady;

  return (
    <div className="publish-panel-container" role="region" aria-label="Publish panel">
      <div className="publish-card">
        <h3>Điều kiện phát hành bài học</h3>
        <p className="publish-desc">
          Bài học cần vượt qua kiểm tra cú pháp định dạng và tạo đủ âm thanh mô phỏng trước khi có thể phát hành cho học viên.
        </p>

        <div className="readiness-checklist">
          <div className={`readiness-item ${canPublish ? 'is-ready' : 'not-ready'}`}>
            <span className="readiness-icon">{canPublish ? '✓' : '✗'}</span>
            <div className="readiness-info">
              <strong>Kiểm tra định dạng (Validation)</strong>
              <p>{canPublish ? 'Hợp lệ và sẵn sàng phát hành' : 'Bản thảo còn lỗi hoặc chưa được kiểm tra'}</p>
            </div>
          </div>

          <div className={`readiness-item ${isAudioReady ? 'is-ready' : 'not-ready'}`}>
            <span className="readiness-icon">{isAudioReady ? '✓' : '✗'}</span>
            <div className="readiness-info">
              <strong>Âm thanh mô phỏng (Audio)</strong>
              <p>{isAudioReady ? 'Tất cả các đoạn audio đã sẵn sàng' : 'Còn đoạn audio chưa được tạo'}</p>
            </div>
          </div>
        </div>

        <div className="publish-revision-info">
          <span>Draft Revision: <strong>{draftRevision}</strong></span>
          <span className="hash-label">Source Hash: <code>{sourceHash.slice(0, 8)}</code></span>
        </div>

        {publishError && (
          <div className="alert alert-error" role="alert">
            {publishError}
          </div>
        )}

        <div className="publish-action-row">
          <button
            type="button"
            className="btn btn-primary btn-publish"
            disabled={!isReadyToPublish || isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? 'Đang phát hành...' : 'Publish Lesson'}
          </button>
        </div>
      </div>
    </div>
  );
}
