'use client';

import React from 'react';

import type { ContentIssueDto } from '@worklingo/contracts';

export interface ValidationPanelProps {
  readonly isValidating: boolean;
  readonly canPublish: boolean;
  readonly issues: readonly ContentIssueDto[];
  readonly lastValidatedRevision: number | null;
  readonly currentDraftRevision: number;
  readonly onValidate: () => void;
  readonly onSelectIssue: (issue: ContentIssueDto) => void;
}

export function ValidationPanel({
  isValidating,
  canPublish,
  issues,
  lastValidatedRevision,
  currentDraftRevision,
  onValidate,
  onSelectIssue,
}: ValidationPanelProps) {
  const isStale = lastValidatedRevision !== null && lastValidatedRevision !== currentDraftRevision;
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="validation-panel" role="region" aria-label="Validation panel">
      <div className="validation-panel-header">
        <div className="header-left">
          <h3>Validation</h3>
          {lastValidatedRevision !== null ? (
            <span
              className={`validation-status-pill ${
                isStale ? 'status-stale' : canPublish ? 'status-valid' : 'status-invalid'
              }`}
            >
              {isStale ? 'Modified since validation' : canPublish ? 'Valid' : 'Issues found'}
            </span>
          ) : (
            <span className="validation-status-pill status-unvalidated">Unvalidated</span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-validate"
          onClick={onValidate}
          disabled={isValidating}
        >
          {isValidating ? 'Validating…' : 'Validate Draft'}
        </button>
      </div>

      <div className="validation-summary" role="status" aria-live="polite">
        {issues.length === 0 ? (
          lastValidatedRevision !== null ? (
            <p className="no-issues-msg">✓ No issues detected. Draft is ready for audio/publish.</p>
          ) : (
            <p className="no-issues-msg">Click Validate to check format syntax and lesson structure.</p>
          )
        ) : (
          <p className="issues-count-msg">
            {errors.length} {errors.length === 1 ? 'error' : 'errors'}, {warnings.length}{' '}
            {warnings.length === 1 ? 'warning' : 'warnings'}
          </p>
        )}
      </div>

      {issues.length > 0 && (
        <ul className="issues-list" aria-label="Validation issues">
          {issues.map((issue, index) => {
            const isError = issue.severity === 'error';
            return (
              <li key={`${issue.code}-${index}`} className="issue-item-wrapper">
                <button
                  type="button"
                  className={`issue-item ${isError ? 'issue-error' : 'issue-warning'}`}
                  onClick={() => onSelectIssue(issue)}
                  aria-label={`${issue.severity}: ${issue.message} at line ${issue.range.start.line}`}
                >
                  <div className="issue-meta">
                    <span className={`issue-severity-badge severity-${issue.severity}`}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <span className="issue-position">
                      L{issue.range.start.line}:{issue.range.start.column}
                    </span>
                    <span className="issue-code">{issue.code}</span>
                  </div>
                  <div className="issue-message">{issue.message}</div>
                  {issue.suggestion && (
                    <div className="issue-suggestion">Suggestion: {issue.suggestion}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
