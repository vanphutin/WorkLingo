'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EvaluationDto } from '@worklingo/contracts';

import { ApiError, apiClient } from '../../lib/api/api-client';

const isPending = (evaluation: EvaluationDto): boolean =>
  evaluation.status === 'queued' || evaluation.status === 'processing';

export function useEvaluation(attemptId: string | null, pollIntervalMs = 1_000) {
  const [evaluation, setEvaluation] = useState<EvaluationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setEvaluation(null);
    setError(null);
    if (!attemptId) return () => { active = false; };

    const load = async (): Promise<void> => {
      try {
        const next = await apiClient.getEvaluation(attemptId);
        if (!active) return;
        setEvaluation(next);
        if (isPending(next)) timer = setTimeout(() => void load(), pollIntervalMs);
      } catch (caught) {
        if (active) setError(caught instanceof ApiError ? caught.message : 'Không thể tải đánh giá.');
      }
    };
    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [attemptId, pollIntervalMs, refreshKey]);

  const retry = useCallback(async () => {
    if (!attemptId || isRetrying) return;
    setIsRetrying(true);
    setError(null);
    try {
      const retried = await apiClient.retryEvaluation(attemptId);
      setEvaluation(retried);
      if (isPending(retried)) setRefreshKey((current) => current + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Không thể thử lại đánh giá.');
    } finally {
      setIsRetrying(false);
    }
  }, [attemptId, isRetrying]);

  return { error, evaluation, isRetrying, retry };
}
