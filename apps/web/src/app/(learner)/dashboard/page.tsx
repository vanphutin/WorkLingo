'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { DashboardView } from '../../../features/learning-session/dashboard-view';
import { apiClient, type LearnerProgressDto } from '../../../lib/api/api-client';

export default function DashboardPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<LearnerProgressDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getProgress();
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleStartSession = async (durationMinutes: number, clientSessionId: string) => {
    const session = await apiClient.createSession(clientSessionId, durationMinutes);
    router.push(`/sessions/${session.id}`);
  };

  return (
    <DashboardView
      progress={progress}
      nextMissionTitle="Introduce yourself to a new colleague"
      onStartSession={handleStartSession}
      isLoading={isLoading}
      error={error}
      onRetry={loadData}
    />
  );
}
