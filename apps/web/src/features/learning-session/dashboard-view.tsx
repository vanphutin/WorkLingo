'use client';

import React, { useRef, useState } from 'react';

import type { LearnerProgressDto } from '../../lib/api/api-client';

interface DashboardViewProps {
  readonly progress: LearnerProgressDto | null;
  readonly nextMissionTitle?: string;
  readonly onStartSession: (
    durationMinutes: number,
    clientSessionId: string,
  ) => Promise<void>;
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly onRetry?: () => void;
}

export function DashboardView({
  progress,
  nextMissionTitle = 'Introduce yourself to a new colleague',
  onStartSession,
  isLoading = false,
  error = null,
  onRetry,
}: DashboardViewProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const pendingSessionId = useRef<string | null>(null);

  const handleStart = async () => {
    try {
      setIsStarting(true);
      setStartError(null);
      const clientSessionId = pendingSessionId.current ?? crypto.randomUUID();
      pendingSessionId.current = clientSessionId;
      await onStartSession(selectedDuration, clientSessionId);
      pendingSessionId.current = null;
    } catch (err) {
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
          Structured 60-minute workplace sessions covering listening, speaking, reading, and writing.
        </p>
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
                disabled={isStarting}
              >
                <option value={60}>60 minutes (Foundation default)</option>
                <option value={45} disabled>
                  45 minutes (available in Increment 3)
                </option>
                <option value={90} disabled>
                  90 minutes (available in Increment 3)
                </option>
                <option value={120} disabled>
                  120 minutes (available in Increment 3)
                </option>
                <option value={150} disabled>
                  150 minutes (available in Increment 3)
                </option>
              </select>
            </div>

            <button
              type="button"
              className="primary-action-button"
              onClick={handleStart}
              disabled={isStarting}
            >
              {isStarting ? 'Starting session…' : 'Start 60-Minute Session'}
            </button>
          </div>
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
