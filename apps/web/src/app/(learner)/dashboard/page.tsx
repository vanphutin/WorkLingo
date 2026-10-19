'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

import type { CurriculumRoadmapDto, DashboardOverview, EngagementSummaryDto, LearnerDashboardAnalytics, ProgramContextDto } from '@worklingo/contracts';
import { DashboardView } from '../../../features/learning-session/dashboard-view';
import {
  apiClient,
  type LearnerProgressDto,
  type SessionAvailabilityDto,
} from '../../../lib/api/api-client';
import { engagementClient } from '../../../lib/api/engagement-client';
import { learnerDashboardClient } from '../../../lib/api/learner-dashboard-client';
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
  const [analytics, setAnalytics] = useState<LearnerDashboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [engagement, setEngagement] = useState<EngagementSummaryDto | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [engagementError, setEngagementError] = useState<string | null>(null);
  const [topics, setTopics] = useState<DashboardOverview['topics']>();
  const alive = useRef(false);
  const generation = useRef(0);
  const overviewRequest = useRef<Promise<DashboardOverview> | null>(null);
  const overviewAbort = useRef<AbortController | null>(null);
  const coreFailures = useRef({ progress: false, availability: false });

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      setAnalytics(await learnerDashboardClient.getAnalytics());
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load dashboard insights');
    } finally {
      setAnalyticsLoading(false);
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
    const version = ++generation.current;
    setIsLoading(true); setError(null); setAnalyticsLoading(true); setRoadmapLoading(true); setEngagementLoading(true);
    coreFailures.current = { progress: false, availability: false };
    // React can replay mount effects; reuse the same in-flight request without caching learner data.
    if (!overviewRequest.current) {
      overviewAbort.current = new AbortController();
      overviewRequest.current = learnerDashboardClient.getOverview(overviewAbort.current.signal);
    }
    const pending = overviewRequest.current;
    try {
      const result = await pending;
      if (!alive.current || version !== generation.current) return;
      setProgramContext(result.programContext);
      setProgress(result.progress.status === 'ready' ? result.progress.data : null);
      setAvailability(result.availability.status === 'ready' ? result.availability.data : null);
      if (result.programContext.activeProgram) {
        coreFailures.current = { progress: result.progress.status === 'error', availability: result.availability.status === 'error' && result.programContext.activeProgram.slug !== 'intermediate' };
        if (result.progress.status === 'error') setError(result.progress.error.code);
        else if (result.availability.status === 'error' && result.programContext.activeProgram.slug !== 'intermediate') setError(result.availability.error.code);
      }
      setAnalytics(result.analytics.status === 'ready' ? result.analytics.data : null);
      setAnalyticsError(result.analytics.status === 'error' ? result.analytics.error.code : null);
      setRoadmap(result.roadmap.status === 'ready' ? result.roadmap.data : null);
      setRoadmapError(result.roadmap.status === 'error' ? result.roadmap.error.code : null);
      setEngagement(result.engagement.status === 'ready' ? result.engagement.data : null);
      setEngagementError(result.engagement.status === 'error' ? result.engagement.error.code : null);
      setTopics(result.topics);
    } catch (failure) {
      if (alive.current && version === generation.current) setError(failure instanceof Error ? failure.message : 'Failed to load dashboard');
    } finally {
      if (overviewRequest.current === pending) { overviewRequest.current = null; overviewAbort.current = null; }
      if (alive.current && version === generation.current) {
        setIsLoading(false); setAnalyticsLoading(false); setRoadmapLoading(false); setEngagementLoading(false);
      }
    }
  };

  const retryCore = async () => {
    const failed = coreFailures.current;
    if (!failed.progress && !failed.availability) return loadData();
    const version = ++generation.current;
    setIsLoading(true); setError(null);
    const matches = (context: ProgramContextDto) => context.activeProgram?.id === programContext?.activeProgram?.id
      && context.enrollment?.id === programContext?.enrollment?.id && context.enrollment?.revision === programContext?.enrollment?.revision;
    try {
      const before = await learningProgramClient.getContext();
      if (!alive.current || version !== generation.current) return;
      if (!matches(before)) return loadData();
      const [nextProgress, nextAvailability] = await Promise.allSettled([
        failed.progress ? apiClient.getProgress() : Promise.resolve(progress),
        failed.availability ? apiClient.getSessionAvailability() : Promise.resolve(availability),
      ]);
      const after = await learningProgramClient.getContext();
      if (!alive.current || version !== generation.current) return;
      if (!matches(after)) return loadData();
      if (nextProgress.status === 'fulfilled') setProgress(nextProgress.value);
      if (nextAvailability.status === 'fulfilled') setAvailability(nextAvailability.value);
      coreFailures.current = { progress: nextProgress.status === 'rejected', availability: nextAvailability.status === 'rejected' };
      const failure = nextProgress.status === 'rejected' ? nextProgress : nextAvailability.status === 'rejected' ? nextAvailability : null;
      if (failure) setError(failure.reason instanceof Error ? failure.reason.message : 'Failed to load dashboard');
    } catch (failure) {
      if (alive.current && version === generation.current) {
        coreFailures.current = { progress: false, availability: false };
        setError(failure instanceof Error ? failure.message : 'Failed to load dashboard');
      }
    } finally {
      if (alive.current && version === generation.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    alive.current = true;
    void loadData();
    return () => {
      alive.current = false; generation.current++;
      const controller = overviewAbort.current;
      // Allow the synchronous StrictMode setup to reuse the pending request; abort a real unmount.
      queueMicrotask(() => { if (!alive.current) controller?.abort(); });
    };
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
      activeProgramSlug={programContext ? programContext.activeProgram?.slug ?? null : undefined}
      currentLevelCode={programContext ? programContext.enrollment?.currentLevel?.code ?? null : undefined}
      availableDurations={availability?.availableDurations ?? []}
      nextMissionTitle={availability?.mission.title}
      onStartSession={handleStartSession}
      isLoading={isLoading}
      error={error}
      onRetry={retryCore}
      initialTopics={topics?.status === 'ready' ? topics.data : undefined}
      topicsFailed={topics?.status === 'error'}
      engagement={engagement}
      engagementLoading={engagementLoading}
      engagementError={engagementError}
      onRetryEngagement={loadEngagement}
      onUpdateTarget={handleUpdateTarget}
      roadmap={roadmap}
      roadmapLoading={roadmapLoading}
      roadmapError={roadmapError}
      onRetryRoadmap={loadRoadmap}
      analytics={analytics}
      analyticsLoading={analyticsLoading}
      analyticsError={analyticsError}
      onRetryAnalytics={loadAnalytics}
    />
  );
}
