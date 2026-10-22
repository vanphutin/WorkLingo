'use client';
import { AdminPageHeader } from '../admin-experience/admin-patterns';

import { useAdminAudit } from './i18n';

import React, { useEffect, useState } from 'react';
import type { AdminAuditEventDto } from '@worklingo/contracts';

import { adminAuditClient } from '../../lib/api/admin-audit-client';
import './audit.css';

export function AuditWorkspace() {
  const { t, date, message: displayMessage } = useAdminAudit();
  const [events, setEvents] = useState<readonly AdminAuditEventDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<unknown>(null);

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
      setErrorMessage(err);
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
      setErrorMessage(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!nextCursor) return;
    await loadEvents(nextCursor);
  };

  return (
    <div className="audit-container operations-experience">
      <AdminPageHeader title={t('title')} description={t('help')} />

      {Boolean(errorMessage) && (
        <div className="curriculum-alert curriculum-alert-error" role="alert">
          <span>{displayMessage(errorMessage)}</span>
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={() => loadEvents()}
          >{t('retry')}</button>
        </div>
      )}

      <form onSubmit={handleApplyFilters} className="audit-filters-card">
        <div className="audit-filters-grid">
          <div className="audit-filter-item">
            <label htmlFor="filter-action">{t('action')}</label>
            <input
              id="filter-action"
              type="text"
              className="audit-filter-input"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              placeholder={t('actionPlaceholder')}
            />
          </div>
          <div className="audit-filter-item">
            <label htmlFor="filter-resource-type">{t('resourceType')}</label>
            <input
              id="filter-resource-type"
              type="text"
              className="audit-filter-input"
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              placeholder={t('resourcePlaceholder')}
            />
          </div>
          <div className="audit-filter-item">
            <label htmlFor="filter-resource-id">{t('resourceId')}</label>
            <input
              id="filter-resource-id"
              type="text"
              className="audit-filter-input"
              value={filterResourceId}
              onChange={(e) => setFilterResourceId(e.target.value)}
              placeholder={t('idPlaceholder')}
            />
          </div>
        </div>
        <div className="audit-filters-actions">
          <button
            type="submit"
            className="action-button action-button-primary"
            disabled={isLoading}
          >{t('applyFilters')}</button>
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={handleResetFilters}
            disabled={isLoading}
          >{t('reset')}</button>
        </div>
      </form>

      {isLoading && events.length === 0 ? (
        <div role="status">
          <p>{t('loading')}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="audit-card">
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className="audit-events-list">
          {events.map((event) => (
            <article key={event.id} className="audit-card">
              <div className="audit-card-top">
                <span className="audit-action-badge">{event.action}</span>
                <span className="audit-timestamp">
                  {date(event.createdAt)}
                </span>
              </div>
              <div className="audit-card-body">
                <div className="audit-meta-item">
                  <strong>{t('actor')}</strong>
                  <span>{event.actorDisplayName}</span>
                </div>
                <div className="audit-meta-item">
                  <strong>{t('resource')}</strong>
                  <span>
                    {event.resourceType} ({event.resourceId})
                  </span>
                </div>
              </div>
              {(event.oldState || event.newState || event.metadata) && (
                <div className="audit-diff-section">
                  <details className="audit-diff-details">
                    <summary>{t('payload')}</summary>
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
          {t('count', { count: events.length })}
        </span>
        <div className="curriculum-actions">
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={handleNextPage}
            disabled={!nextCursor || isLoading}
          >{t('nextPage')}</button>
        </div>
      </div>
    </div>
  );
}
