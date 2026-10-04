'use client';

import React, { use, useCallback, useEffect, useState } from 'react';

import { SessionShell } from '../../../../features/learning-session/session-shell';
import {
  apiClient,
  type LearnerActivityDto,
  type LearningSessionDto,
} from '../../../../lib/api/api-client';

export default function SessionPage({
  params,
}: {
  readonly params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  const [session, setSession] = useState<LearningSessionDto | null>(null);
  const [currentActivity, setCurrentActivity] = useState<LearnerActivityDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivityForSession = useCallback(
    async (sessionData: LearningSessionDto) => {
      const allActivityIds = sessionData.plan.blocks.flatMap((b) => b.activityIds);
      const checkpointIndex = sessionData.currentCheckpoint;

      if (checkpointIndex >= allActivityIds.length || sessionData.status === 'completed') {
        setCurrentActivity(null);
        return;
      }

      const activityId = allActivityIds[checkpointIndex];
      if (activityId) {
        const activity = await apiClient.getActivity(sessionData.id, activityId);
        setCurrentActivity(activity);
      }
    },
    [],
  );

  const initSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let sessionData = await apiClient.getSession(sessionId);

      if (sessionData.status === 'planned') {
        sessionData = await apiClient.startSession(sessionId);
      }

      setSession(sessionData);
      await loadActivityForSession(sessionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, loadActivityForSession]);

  useEffect(() => {
    void initSession();
  }, [initSession]);

  const handleSubmitAttempt = async (
    activityId: string,
    response: Record<string, unknown>,
    clientAttemptId: string,
  ) => {
    if (!session) {
      throw new Error('Session is not ready');
    }

    const attempt = await apiClient.submitAttempt(activityId, {
      sessionId: session.id,
      clientAttemptId,
      response,
    });

    // Refresh session to get updated checkpoint and status
    const updatedSession = await apiClient.getSession(session.id);
    setSession(updatedSession);
    await loadActivityForSession(updatedSession);
    return attempt;
  };

  const handlePauseSession = async () => {
    if (!session) return;
    const updated = await apiClient.pauseSession(session.id);
    setSession(updated);
  };

  const handleResumeSession = async () => {
    if (!session) return;
    const updated = await apiClient.resumeSession(session.id);
    setSession(updated);
  };

  if (isLoading) {
    return (
      <main className="session-loading-container" aria-busy="true">
        <div className="status-card" role="status">
          <p>Preparing your 60-minute session…</p>
        </div>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="session-error-container">
        <div className="status-card error-card" role="alert">
          <h2>Unable to load session</h2>
          <p>{error ?? 'Session not found'}</p>
          <button type="button" className="retry-button" onClick={() => void initSession()}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  const allActivityIds = session.plan.blocks.flatMap((b) => b.activityIds);
  const isCompleted =
    session.currentCheckpoint >= allActivityIds.length || session.status === 'completed';

  return (
    <SessionShell
      session={session}
      currentActivity={currentActivity}
      onSubmitAttempt={handleSubmitAttempt}
      onPauseSession={handlePauseSession}
      onResumeSession={handleResumeSession}
      isCompleted={isCompleted}
    />
  );
}
