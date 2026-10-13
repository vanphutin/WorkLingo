'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import type { CurriculumRoadmapDto, EngagementSummaryDto, ProgramContextDto } from '@worklingo/contracts';
import { DashboardView } from '../../../features/learning-session/dashboard-view';
import {
  apiClient,
  type LearnerProgressDto,
  type SessionAvailabilityDto,
} from '../../../lib/api/api-client';
import { engagementClient } from '../../../lib/api/engagement-client';
import { learningProgramClient } from '../../../lib/api/learning-program-client';

export default function DashboardPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<LearnerProgressDto | null>(null);
  const [programContext, setProgramContext] = useState<ProgramContextDto | null>(null);
  const [availability, setAvailability] = useState<SessionAvailabilityDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<CurriculumRoadmapDto | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(true);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  const [engagement, setEngagement] = useState<EngagementSummaryDto | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [engagementError, setEngagementError] = useState<string | null>(null);

  const loadProgressAndAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [progressData, availabilityData, contextData] = await Promise.all([
        apiClient.getProgress(),
        apiClient.getSessionAvailability(),
        learningProgramClient.getContext(),
      ]);
      setProgress(progressData);
      setAvailability(availabilityData);
      setProgramContext(contextData);
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

  const loadRoadmap = async () => {
    try {
      setRoadmapLoading(true);
      setRoadmapError(null);
      setRoadmap(await apiClient.getCurriculumRoadmap());
    } catch (err) {
      setRoadmapError(err instanceof Error ? err.message : 'Failed to load curriculum roadmap');
    } finally {
      setRoadmapLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.allSettled([
      loadProgressAndAvailability(),
      loadEngagement(),
      loadRoadmap(),
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
      activeProgramName={programContext?.activeProgram?.name}
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
      roadmap={roadmap}
      roadmapLoading={roadmapLoading}
      roadmapError={roadmapError}
      onRetryRoadmap={loadRoadmap}
    />
  );
}
