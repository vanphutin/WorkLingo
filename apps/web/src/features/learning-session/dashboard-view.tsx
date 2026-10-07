'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import type { LearnerProgressDto } from '../../lib/api/api-client';

interface DashboardViewProps {
  readonly progress: LearnerProgressDto | null;
  readonly nextMissionTitle?: string;
  readonly availableDurations?: readonly number[];
  readonly onStartSession: (
    durationMinutes: number,
    clientSessionId: string,
  ) => Promise<void>;
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
}

const ALL_DURATIONS = [45, 60, 90, 120, 150] as const;
const DEFAULT_DURATIONS = [45, 60] as const;

function getDurationLabel(duration: number, isAvailable: boolean): string {
  if (!isAvailable) {
    return `${duration} minutes (Not enough practice available)`;
  }
  if (duration === 60) return '60 minutes (Foundation default)';
  if (duration === 45) return '45 minutes (Express)';
  if (duration === 90) return '90 minutes (Deep Dive)';
  if (duration === 120) return '120 minutes (Intensive)';
  if (duration === 150) return '150 minutes (Mastery)';
  return `${duration} minutes`;
}

export function DashboardView({
  progress,
  nextMissionTitle = 'Introduce yourself to a new colleague',
  availableDurations = DEFAULT_DURATIONS,
  onStartSession,
  isLoading = false,
  error = null,
  onRetry,
}: DashboardViewProps) {
  const [availabilityOverride, setAvailabilityOverride] = useState<{
    source: readonly number[];
    durations: readonly number[];
  } | null>(null);
  const availableDurationsState = availabilityOverride?.source === availableDurations
    ? availabilityOverride.durations : availableDurations;
  const [preferredDuration, setSelectedDuration] = useState<number>(60);
  const selectedDuration = availableDurationsState.includes(preferredDuration)
    ? preferredDuration
    : availableDurationsState.includes(60) ? 60 : availableDurationsState[0] ?? 60;
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const pendingSessionId = useRef<{ id: string; duration: number } | null>(null);
  useEffect(() => {
    if (pendingSessionId.current?.duration !== selectedDuration) pendingSessionId.current = null;
  }, [selectedDuration]);

  const handleStart = async () => {
    if (isStarting || !availableDurationsState.includes(selectedDuration)) return;
    try {
      setIsStarting(true);
      setStartError(null);
      const clientSessionId = pendingSessionId.current?.duration === selectedDuration
        ? pendingSessionId.current.id : crypto.randomUUID();
      pendingSessionId.current = { id: clientSessionId, duration: selectedDuration };
      await onStartSession(selectedDuration, clientSessionId);
      pendingSessionId.current = null;
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 422) {
        pendingSessionId.current = null;
      }
      if (
        err &&
        typeof err === 'object' &&
        'availableDurations' in err &&
        Array.isArray((err as { availableDurations?: unknown }).availableDurations)
      ) {
        pendingSessionId.current = null;
        const freshAvailable = (err as { availableDurations: number[] }).availableDurations;
        setAvailabilityOverride({ source: availableDurations, durations: freshAvailable });
      }
      setStartError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="dashboard-container" aria-busy="true">
        <div className="status-card" role="status">
          <p className="loading-indicator">Loading your dashboard and learning progress…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-container">
        <div className="status-card error-card" role="alert">
          <h2>Unable to load dashboard</h2>
          <p className="error-message">{error}</p>
          {onRetry && (
            <button type="button" className="retry-button" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-container">
      <header className="dashboard-header">
        <span className="eyebrow">Workplace English — Foundation Slice</span>
        <h1 className="dashboard-title">Learner Dashboard</h1>
        <p className="dashboard-subtitle">
          Structured workplace sessions covering listening, speaking, reading, and writing.
        </p>
        <Link href="/mastery">View Mastery Map, Memory Health and Error Bank</Link>
      </header>

      {startError && (
        <div className="form-error" role="alert">
          {startError}
        </div>
      )}

      <div className="dashboard-grid">
        <section className="dashboard-card next-mission-card" aria-labelledby="mission-heading">
          <span className="card-tag">Current Mission</span>
          <h2 id="mission-heading" className="mission-title">
            {nextMissionTitle}
          </h2>
          <p className="mission-description">
            Practice essential workplace introductions with simulated colleagues, decode email
            messages, listen to team announcements, and write professional follow-ups.
          </p>

          <div className="session-launcher">
            <div className="field-group">
              <label htmlFor="session-duration-select" className="field-label">
                Session duration:
              </label>
              <select
                id="session-duration-select"
                className="field-select"
                value={selectedDuration}
                onChange={(e) => {
                  pendingSessionId.current = null;
                  setSelectedDuration(Number(e.target.value));
                }}
                disabled={isStarting || availableDurationsState.length === 0}
              >
                {ALL_DURATIONS.map((duration) => {
                  const isAvailable = availableDurationsState.includes(duration);
                  return (
                    <option key={duration} value={duration} disabled={!isAvailable}>
                      {getDurationLabel(duration, isAvailable)}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              className="primary-action-button"
              onClick={handleStart}
              disabled={isStarting || !availableDurationsState.includes(selectedDuration)}
            >
              {isStarting ? 'Starting session…' : `Start ${selectedDuration}-Minute Session`}
            </button>
          </div>
          {availableDurationsState.length === 0 && (
            <p role="status">No sessions are available yet. Please check again later.</p>
          )}
        </section>

        <section className="dashboard-card progress-card" aria-labelledby="progress-heading">
          <span className="card-tag">Progress Summary</span>
          <h2 id="progress-heading" className="section-title">
            Your Learning Journey
          </h2>

          <div className="progress-stats">
            <div className="stat-item">
              <span className="stat-label">Current Level</span>
              <strong className="stat-value">{progress?.currentLevelCode ?? 'FOUNDATION_1'}</strong>
            </div>

            <div className="stat-item">
              <span className="stat-label">Completed Activities</span>
              <strong className="stat-value">{progress?.completedActivities ?? 0}</strong>
            </div>

            <div className="stat-item">
              <span className="stat-label">Total Attempts</span>
              <strong className="stat-value">{progress?.activityAttempts ?? 0}</strong>
            </div>

            <div className="stat-item">
              <span className="stat-label">Completed Sessions</span>
              <strong className="stat-value">{progress?.sessions.completed ?? 0}</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
