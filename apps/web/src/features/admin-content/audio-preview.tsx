import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AudioArtifactDto } from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';

export interface AudioScriptItem {
  readonly slug: string;
  readonly speaker?: string | undefined;
  readonly script: string;
}

export interface AudioPreviewProps {
  readonly importId: string;
  readonly draftRevision: number;
  readonly audioScripts?: readonly AudioScriptItem[] | undefined;
  readonly pollIntervalMs?: number | undefined;
  readonly onAudioStateChange?: (() => void) | undefined;
}

export function AudioPreview({
  importId,
  draftRevision,
  audioScripts = [],
  pollIntervalMs = 1000,
  onAudioStateChange,
}: AudioPreviewProps) {
  const [artifacts, setArtifacts] = useState<AudioArtifactDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingSlugs, setGeneratingSlugs] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchArtifacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await apiClient.listContentAudioArtifacts(importId);
      if (isMountedRef.current) {
        setArtifacts(list);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setErrorMessage(err instanceof ApiError ? err.message : 'Không thể tải danh sách âm thanh');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [importId]);

  useEffect(() => {
    void fetchArtifacts();
  }, [fetchArtifacts]);

  const pollJobUntilDone = useCallback(
    async (jobId: string) => {
      let isDone = false;
      while (!isDone && isMountedRef.current) {
        const job = await apiClient.getJob(jobId);
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          isDone = true;
          break;
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }
    },
    [pollIntervalMs],
  );

  const handleGenerate = async (slug: string) => {
    setGeneratingSlugs((prev) => ({ ...prev, [slug]: true }));
    setErrorMessage(null);

    try {
      const result = await apiClient.generateAudio(importId, {
        audioScriptSlug: slug,
        idempotencyKey: `gen-${importId}-${slug}-${draftRevision}`,
      });

      if (result.jobId) {
        await pollJobUntilDone(result.jobId);
      }

      await fetchArtifacts();
      onAudioStateChange?.();
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setErrorMessage(
          err instanceof ApiError ? err.message : 'Lỗi khi tạo âm thanh mô phỏng',
        );
      }
    } finally {
      if (isMountedRef.current) {
        setGeneratingSlugs((prev) => ({ ...prev, [slug]: false }));
      }
    }
  };

  const safeArtifacts = Array.isArray(artifacts) ? artifacts : [];
  const scriptsToDisplay =
    Array.isArray(audioScripts) && audioScripts.length > 0
      ? audioScripts
      : safeArtifacts.map((a) => ({
          slug: a.audioScriptSlug,
          speaker: undefined,
          script: `[Script: ${a.audioScriptSlug}]`,
        }));

  return (
    <div className="audio-preview-panel" role="region" aria-label="Audio controls">
      <div className="audio-simulation-banner" role="note">
        <strong>Audio mô phỏng — chưa phải giọng đọc phát hành</strong>
        <p>
          Các tệp âm thanh này được tổng hợp mô phỏng để kiểm tra định dạng và luồng học. Giọng đọc phát hành sẽ được cập nhật ở phân đoạn sau.
        </p>
      </div>

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          {errorMessage}
        </div>
      )}

      {isLoading && artifacts.length === 0 ? (
        <p className="loading-text">Đang tải danh sách âm thanh...</p>
      ) : scriptsToDisplay.length === 0 ? (
        <p className="empty-text">Bài học không khai báo đoạn audio nào.</p>
      ) : (
        <div className="audio-scripts-grid">
          {scriptsToDisplay.map((item) => {
            const artifact = artifacts.find((a) => a.audioScriptSlug === item.slug);
            const isGenerating = generatingSlugs[item.slug];
            const currentStatus = isGenerating ? 'GENERATING' : (artifact?.status ?? 'MISSING');

            return (
              <div key={item.slug} className="audio-item-card">
                <div className="audio-item-header">
                  <div className="audio-meta">
                    <h4 className="audio-slug">{item.slug}</h4>
                    {item.speaker && <span className="audio-speaker">{item.speaker}</span>}
                  </div>
                  <span className={`audio-status-pill status-${currentStatus.toLowerCase()}`}>
                    {currentStatus}
                  </span>
                </div>

                <p className="audio-script-excerpt">{item.script}</p>

                {artifact?.status === 'READY' && (
                  <div className="audio-player-wrapper">
                    <audio
                      controls
                      data-testid={`audio-player-${item.slug}`}
                      src={apiClient.getAudioArtifactContentUrl(artifact.id)}
                    />
                  </div>
                )}

                {artifact?.status === 'FAILED' && artifact.failureSummary && (
                  <p className="audio-failure-text" role="alert">
                    {artifact.failureSummary}
                  </p>
                )}

                <div className="audio-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-generate-audio"
                    disabled={isGenerating}
                    onClick={() => handleGenerate(item.slug)}
                  >
                    {isGenerating
                      ? 'Đang xử lý...'
                      : artifact?.status === 'READY'
                        ? 'Tạo lại Audio'
                        : artifact?.status === 'FAILED'
                          ? 'Thử lại Audio'
                          : 'Generate Audio'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
