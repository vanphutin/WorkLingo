'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import type { EngagementSummaryDto } from '@worklingo/contracts';
import { DashboardView } from '../../../features/learning-session/dashboard-view';
import {
  apiClient,
  type LearnerProgressDto,
  type SessionAvailabilityDto,
} from '../../../lib/api/api-client';
import { engagementClient } from '../../../lib/api/engagement-client';

export default function DashboardPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<LearnerProgressDto | null>(null);
  const [availability, setAvailability] = useState<SessionAvailabilityDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [engagement, setEngagement] = useState<EngagementSummaryDto | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [engagementError, setEngagementError] = useState<string | null>(null);

  const loadProgressAndAvailability = async () => {
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

  const loadEngagement = async () => {
    try {
      setEngagementLoading(true);
      setEngagementError(null);
      const data = await engagementClient.getSummary();
      setEngagement(data);
    } catch (err) {
      setEngagementError(err instanceof Error ? err.message : 'Failed to load engagement data');
    } finally {
      setEngagementLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.allSettled([
      loadProgressAndAvailability(),
      loadEngagement(),
    ]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleUpdateTarget = async (targetDays: number) => {
    const updated = await engagementClient.updateWeeklyTarget(targetDays);
    setEngagement(updated);
  };

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
      onRetry={loadProgressAndAvailability}
      engagement={engagement}
      engagementLoading={engagementLoading}
      engagementError={engagementError}
      onRetryEngagement={loadEngagement}
      onUpdateTarget={handleUpdateTarget}
    />
  );
}
