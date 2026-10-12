'use client';

import React, { useEffect, useState } from 'react';
import type { AdminAuditEventDto } from '@worklingo/contracts';

import { adminAuditClient } from '../../lib/api/admin-audit-client';
import './audit.css';

export function AuditWorkspace() {
  const [events, setEvents] = useState<readonly AdminAuditEventDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterResourceId, setFilterResourceId] = useState('');

  const loadEvents = async (cursor?: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const page = await adminAuditClient.getEvents({
        action: filterAction.trim() || undefined,
        cursor,
        limit: 25,
        resourceId: filterResourceId.trim() || undefined,
        resourceType: filterResourceType.trim() || undefined,
      });

      setEvents(page.items);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load audit events',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const handleApplyFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadEvents();
  };

  const handleResetFilters = async () => {
    setFilterAction('');
    setFilterResourceType('');
    setFilterResourceId('');
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const page = await adminAuditClient.getEvents({ limit: 25 });
      setEvents(page.items);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load audit events',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!nextCursor) return;
    await loadEvents(nextCursor);
  };

  return (
    <div className="audit-container">
      <header className="audit-header">
        <div>
          <h1>Audit Event Browser</h1>
          <p className="node-meta">
            Immutable, privacy-safe record of administrative curriculum changes and operations.
          </p>
        </div>
      </header>

      {errorMessage && (
        <div className="curriculum-alert curriculum-alert-error" role="alert">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={() => loadEvents()}
          >
            Retry
          </button>
        </div>
      )}

      <form onSubmit={handleApplyFilters} className="audit-filters-card">
        <div className="audit-filters-grid">
          <div className="audit-filter-item">
            <label htmlFor="filter-action">Action</label>
            <input
              id="filter-action"
              type="text"
              className="audit-filter-input"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              placeholder="e.g. PUBLISH_PATH, CREATE_MISSION"
            />
          </div>
          <div className="audit-filter-item">
            <label htmlFor="filter-resource-type">Resource Type</label>
            <input
              id="filter-resource-type"
              type="text"
              className="audit-filter-input"
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              placeholder="e.g. LearningPath, Level, Mission"
            />
          </div>
          <div className="audit-filter-item">
            <label htmlFor="filter-resource-id">Resource ID</label>
            <input
              id="filter-resource-id"
              type="text"
              className="audit-filter-input"
              value={filterResourceId}
              onChange={(e) => setFilterResourceId(e.target.value)}
              placeholder="UUID or resource identifier"
            />
          </div>
        </div>
        <div className="audit-filters-actions">
          <button
            type="submit"
            className="action-button action-button-primary"
            disabled={isLoading}
          >
            Apply Filters
          </button>
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={handleResetFilters}
            disabled={isLoading}
          >
            Reset
          </button>
        </div>
      </form>

      {isLoading && events.length === 0 ? (
        <div role="status">
          <p>Loading audit events…</p>
        </div>
      ) : events.length === 0 ? (
        <div className="audit-card">
          <p>No audit events match the specified criteria.</p>
        </div>
      ) : (
        <div className="audit-events-list">
          {events.map((event) => (
            <article key={event.id} className="audit-card">
              <div className="audit-card-top">
                <span className="audit-action-badge">{event.action}</span>
                <span className="audit-timestamp">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="audit-card-body">
                <div className="audit-meta-item">
                  <strong>Actor:</strong>
                  <span>{event.actorDisplayName}</span>
                </div>
                <div className="audit-meta-item">
                  <strong>Resource:</strong>
                  <span>
                    {event.resourceType} ({event.resourceId})
                  </span>
                </div>
              </div>
              {(event.oldState || event.newState || event.metadata) && (
                <div className="audit-diff-section">
                  <details className="audit-diff-details">
                    <summary>View Change Payload &amp; Metadata</summary>
                    <pre style={{ margin: '0.5rem 0', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(
                        {
                          metadata: event.metadata,
                          newState: event.newState,
                          oldState: event.oldState,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="audit-pagination">
        <span className="node-meta">
          Showing {events.length} event{events.length === 1 ? '' : 's'}
        </span>
        <div className="curriculum-actions">
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={handleNextPage}
            disabled={!nextCursor || isLoading}
          >
            Next Page
          </button>
        </div>
      </div>
    </div>
  );
}
