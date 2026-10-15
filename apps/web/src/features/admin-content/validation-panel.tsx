'use client';

import type { adminContentMessages } from '../../i18n/messages/adminContent';

import { useAdminContent } from './i18n';

import React from 'react';

import type { ContentIssueDto } from '@worklingo/contracts';

const issueKeys: Readonly<Record<string, keyof typeof adminContentMessages.en>> = {
  "VAL_MISSING_CONTENT_REF": "issueMissingContent",
  "VAL_MISSING_LANGUAGE_BLOCK_REF": "issueMissingLanguageBlock",
  "VAL_MISSING_AUDIO_REF": "issueMissingAudio",
  "PARSE_UNSUPPORTED_FORMAT": "issueUnsupportedFormat",
  "PARSE_UNCLOSED_SECTION": "issueUnclosedSection",
  "PARSE_MISMATCHED_SECTION": "issueMismatchedSection",
  "PARSE_UNCLOSED_MULTILINE": "issueUnclosedMultiline",
  "PARSE_UNKNOWN_FIELD": "issueUnknownField",
  "PARSE_DUPLICATE_FIELD": "issueDuplicateField",
  "PARSE_INVALID_IDENTIFIER": "issueInvalidIdentifier",
  "PARSE_UNKNOWN_SECTION": "issueUnknownSection",
  "PARSE_UNSUPPORTED_SECTION": "issueUnsupportedSection",
  "PARSE_INVALID_FOUNDATION": "issueInvalidFoundation",
  "PARSE_SYNTAX_ERROR": "issueSyntax",
  "PARSE_UNEXPECTED_CONTENT": "issueUnexpectedContent",
  "VAL_LIMIT_EXCEEDED": "issueLimit",
  "VAL_MISSING_LESSON": "issueMissingLesson",
  "VAL_REQUIRED_FIELD": "issueRequiredField",
  "VAL_DUPLICATE_SLUG": "issueDuplicateSlug",
  "VAL_EMPTY_SECTION": "issueEmptySection",
  "VAL_INVALID_ENUM": "issueInvalidEnum",
  "VAL_MISSING_ACTIVITY_SKILL": "issueMissingSkill",
  "VAL_INCOMPATIBLE_BLOCK": "issueIncompatibleBlock",
  "VAL_INSUFFICIENT_OPTIONS": "issueOptions",
  "VAL_INVALID_ANSWER": "issueAnswer",
  "WARN_RECOMMENDED_EXPLANATION": "issueExplanation",
  "WARN_RECOMMENDED_EVIDENCE": "issueEvidence",
  "VAL_INVALID_EVIDENCE": "issueInvalidEvidence",
  "VAL_MISSING_SKILL_COVERAGE": "issueSkillCoverage",
  "WARN_UNUSED_CONTENT": "issueUnusedContent",
  "WARN_UNUSED_AUDIO_SCRIPT": "issueUnusedAudio",
  "WARN_UNUSED_LANGUAGE_BLOCK": "issueUnusedLanguage",
  "VAL_INCOMPLETE_TEMPLATE": "issueIncompleteTemplate",
  "VAL_FOUNDATION_REQUIRED": "issueFoundationRequired",
  "VAL_OBJECTIVE_REQUIRED": "issueObjectiveRequired",
  "VAL_OBJECTIVE_REF": "issueObjectiveRef",
  "VAL_ASSESSMENT_REQUIRED": "issueAssessment"
};

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
  const { t, locale, number } = useAdminContent();
  const isStale = lastValidatedRevision !== null && lastValidatedRevision !== currentDraftRevision;
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="validation-panel" role="region" aria-label={t('validationRegion')}>
      <div className="validation-panel-header">
        <div className="header-left">
          <h3>{t('validationTitle')}</h3>
          {lastValidatedRevision !== null ? (
            <span
              className={`validation-status-pill ${
                isStale ? 'status-stale' : canPublish ? 'status-valid' : 'status-invalid'
              }`}
            >
              {isStale ? t('validationStale') : canPublish ? t('valid') : t('issuesFound')}
            </span>
          ) : (
            <span className="validation-status-pill status-unvalidated">{t('unvalidated')}</span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-validate"
          onClick={onValidate}
          disabled={isValidating}
        >
          {isValidating ? t('validating') : t('validateDraft')}
        </button>
      </div>

      <div className="validation-summary" role="status" aria-live="polite">
        {issues.length === 0 ? (
          lastValidatedRevision !== null ? (
            <p className="no-issues-msg">{t('noIssues')}</p>
          ) : (
            <p className="no-issues-msg">{t('validateHelp')}</p>
          )
        ) : (
          <p className="issues-count-msg">
            {t('issueCounts', { errors: errors.length, warnings: warnings.length })}
          </p>
        )}
      </div>

      {issues.length > 0 && (
        <ul className="issues-list" aria-label={t('validationIssues')}>
          {issues.map((issue, index) => {
            const isError = issue.severity === 'error';
            const severity = t(isError ? 'errorSeverity' : 'warningSeverity');
            const issueText = locale === 'en' ? issue.message : t(issueKeys[issue.code] ?? 'validationIssue');
            return (
              <li key={`${issue.code}-${index}`} className="issue-item-wrapper">
                <button
                  type="button"
                  className={`issue-item ${isError ? 'issue-error' : 'issue-warning'}`}
                  onClick={() => onSelectIssue(issue)}
                  aria-label={t('issueAria', { severity, message: issueText, line: issue.range.start.line })}
                >
                  <div className="issue-meta">
                    <span className={`issue-severity-badge severity-${issue.severity}`}>
                      {severity}
                    </span>
                    <span className="issue-position">
                      {t('issuePosition', { line: number(issue.range.start.line), column: number(issue.range.start.column) })}
                    </span>
                    <span className="issue-code">{issue.code}</span>
                  </div>
                  <div className="issue-message">{issueText}</div>
                  {issue.suggestion && (
                    <div className="issue-suggestion">{t('suggestion', { suggestion: locale === 'en' ? issue.suggestion : t('validationSuggestion') })}</div>
                  )}
                </button>
                {locale === 'vi' ? <details><summary>{t('technicalDetails')}</summary><p lang="en">{issue.message}</p>{issue.suggestion ? <p lang="en">{issue.suggestion}</p> : null}</details> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
