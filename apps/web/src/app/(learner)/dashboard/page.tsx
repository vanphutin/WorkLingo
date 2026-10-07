'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { DashboardView } from '../../../features/learning-session/dashboard-view';
import {
  apiClient,
  type LearnerProgressDto,
  type SessionAvailabilityDto,
} from '../../../lib/api/api-client';

export default function DashboardPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<LearnerProgressDto | null>(null);
  const [availability, setAvailability] = useState<SessionAvailabilityDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [progressData, availabilityData] = await Promise.all([
        apiClient.getProgress(),
        apiClient.getSessionAvailability(),
      ]);
      setProgress(progressData);
      setAvailability(availabilityData);
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
      availableDurations={availability?.availableDurations ?? []}
      nextMissionTitle={availability?.mission.title ?? 'Introduce yourself to a new colleague'}
      onStartSession={handleStartSession}
      isLoading={isLoading}
      error={error}
      onRetry={loadData}
    />
  );
}
